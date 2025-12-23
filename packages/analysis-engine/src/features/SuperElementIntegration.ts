// @ts-nocheck
/**
 * SuperElementIntegration.ts
 * 
 * Integration layer for using super elements with the main solver.
 * 
 * This module provides:
 * 1. Integration of super elements into global stiffness matrix
 * 2. Recovery of internal displacements after solving
 * 3. Full analysis workflow with substructuring
 * 
 * Workflow:
 * 1. Create super elements from repetitive substructures (trusses, floors)
 * 2. Build reduced global model (only boundary nodes + regular members)
 * 3. Assemble and solve reduced system
 * 4. Recover internal displacements for each super element
 */

import {
  SubstructureManager,
  SuperElement,
  SparseMatrixBuilder,
  MatrixUtils,
  conjugateGradient,
  type NodeCoord,
  type SolverNode,
  type SolverMember,
  type SolverSupport,
  type NodalLoad,
} from '..';

// ============================================================================
// TYPES
// ============================================================================

export interface SuperElementAnalysisInput {
  /** Regular nodes (not part of super elements) */
  nodes: SolverNode[];
  /** Regular members (not part of super elements) */
  members: SolverMember[];
  /** Supports */
  supports: SolverSupport[];
  /** Loads */
  loads: NodalLoad[];
  /** Super elements to include */
  superElements: SuperElement[];
}

export interface SuperElementAnalysisResult {
  /** Success status */
  success: boolean;
  /** Raw displacement array */
  displacements: number[];
  /** Nodal displacements by node ID */
  nodalDisplacements: Map<string, {
    dx: number; dy: number; dz: number;
    rx: number; ry: number; rz: number;
  }>;
  /** Reactions by node ID (at supported nodes) */
  nodalReactions: Map<string, {
    fx: number; fy: number; fz: number;
    mx: number; my: number; mz: number;
  }>;
  /** Recovered internal displacements for each super element */
  superElementResults: Map<string, {
    boundaryDisplacements: number[];
    internalDisplacements: number[];
  }>;
  /** Solver convergence info */
  solverInfo: {
    iterations: number;
    residualNorm: number;
    converged: boolean;
  };
  /** Performance timing */
  timing: {
    assembly: number;
    solve: number;
    recovery: number;
    total: number;
  };
}

// ============================================================================
// HYBRID SOLVER WITH SUPER ELEMENTS
// ============================================================================

/**
 * Solver that integrates super elements with the global stiffness matrix.
 * 
 * This provides the main benefit of substructuring:
 * - Reduced problem size (fewer DOFs to solve)
 * - Reuse of condensed matrices for repetitive structures
 * - Full recovery of internal displacements
 */
export class HybridSuperElementSolver {
  private substructureManager: SubstructureManager;

  constructor(substructureManager?: SubstructureManager) {
    this.substructureManager = substructureManager || new SubstructureManager();
  }

  /**
   * Solve with super elements
   */
  async solve(input: SuperElementAnalysisInput): Promise<SuperElementAnalysisResult> {
    console.log('[HybridSolver] Starting analysis with super elements');
    
    const startTime = performance.now();
    let assemblyTime = 0;
    let solveTime = 0;
    let recoveryTime = 0;
    
    // Build node index map for all nodes
    const nodeIndexMap = new Map<string, number>();
    input.nodes.forEach((node, idx) => nodeIndexMap.set(node.id, idx));
    
    const numNodes = input.nodes.length;
    const numDOFs = numNodes * 6;
    
    console.log(`[HybridSolver] Reduced model: ${numNodes} nodes, ${numDOFs} DOFs`);
    console.log(`[HybridSolver] Super elements: ${input.superElements.length}`);
    
    // Calculate original size (for comparison)
    const originalDOFs = input.superElements.reduce(
      (sum, el) => sum + el.originalStats.numTotalDOFs,
      numDOFs
    );
    console.log(`[HybridSolver] Original would be: ${originalDOFs} DOFs`);
    console.log(`[HybridSolver] Reduction: ${((1 - numDOFs/originalDOFs) * 100).toFixed(1)}%`);
    
    // ASSEMBLY PHASE
    const assemblyStart = performance.now();
    
    // Build global stiffness matrix using sparse builder
    const builder = new SparseMatrixBuilder(numDOFs);
    
    // 1. Add regular member contributions
    this.addMemberContributions(builder, input.nodes, input.members, nodeIndexMap);
    
    // 2. Add super element contributions
    for (const superElement of input.superElements) {
      this.addSuperElementContribution(builder, superElement, nodeIndexMap);
    }
    
    // 3. Build load vector
    const F = new Array(numDOFs).fill(0);
    for (const load of input.loads) {
      const nodeIdx = nodeIndexMap.get(load.nodeId);
      if (nodeIdx === undefined) continue;
      
      const baseDOF = nodeIdx * 6;
      if (load.fx) F[baseDOF + 0] += load.fx;
      if (load.fy) F[baseDOF + 1] += load.fy;
      if (load.fz) F[baseDOF + 2] += load.fz;
      if (load.mx) F[baseDOF + 3] += load.mx;
      if (load.my) F[baseDOF + 4] += load.my;
      if (load.mz) F[baseDOF + 5] += load.mz;
    }
    
    // 4. Collect fixed DOFs for boundary conditions
    const fixedDOFs = new Set<number>();
    for (const support of input.supports) {
      const nodeIdx = nodeIndexMap.get(support.nodeId);
      if (nodeIdx === undefined) continue;
      
      const baseDOF = nodeIdx * 6;
      if (support.dx) fixedDOFs.add(baseDOF + 0);
      if (support.dy) fixedDOFs.add(baseDOF + 1);
      if (support.dz) fixedDOFs.add(baseDOF + 2);
      if (support.rx) fixedDOFs.add(baseDOF + 3);
      if (support.ry) fixedDOFs.add(baseDOF + 4);
      if (support.rz) fixedDOFs.add(baseDOF + 5);
    }
    
    // Apply boundary conditions using penalty method (large number on diagonal)
    const PENALTY = 1e20;
    for (const dof of fixedDOFs) {
      builder.set(dof, dof, PENALTY);
      F[dof] = 0; // Fixed displacement = 0
    }
    
    // Convert to CSR format for solving
    const csrK = builder.toCSR();
    
    assemblyTime = performance.now() - assemblyStart;
    console.log(`[HybridSolver] Assembly: ${assemblyTime.toFixed(1)}ms`);
    
    // SOLVE PHASE
    const solveStart = performance.now();
    
    // Use Conjugate Gradient solver
    const cgResult = conjugateGradient(csrK, F, {
      tolerance: 1e-10,
      maxIterations: 5000,
      usePreconditioner: true,
    });
    
    if (!cgResult.converged) {
      console.warn(`[HybridSolver] CG did not converge after ${cgResult.iterations} iterations`);
    }
    
    const displacements = cgResult.x;
    
    solveTime = performance.now() - solveStart;
    console.log(`[HybridSolver] Solve: ${solveTime.toFixed(1)}ms (${cgResult.iterations} iterations)`);
    
    // RECOVERY PHASE
    const recoveryStart = performance.now();
    
    // Recover internal displacements for each super element
    const superElementResults = new Map<string, {
      boundaryDisplacements: number[];
      internalDisplacements: number[];
    }>();
    
    for (const superElement of input.superElements) {
      const boundaryDisplacements = this.extractBoundaryDisplacements(
        superElement,
        displacements,
        nodeIndexMap
      );
      
      const internalDisplacements = this.substructureManager.recoverInternalDisplacements(
        superElement,
        boundaryDisplacements
      );
      
      superElementResults.set(superElement.id, {
        boundaryDisplacements,
        internalDisplacements,
      });
    }
    
    recoveryTime = performance.now() - recoveryStart;
    
    const totalTime = performance.now() - startTime;
    console.log(`[HybridSolver] Total: ${totalTime.toFixed(1)}ms`);
    
    // Build displacement map
    const nodalDisplacements = new Map<string, {
      dx: number; dy: number; dz: number;
      rx: number; ry: number; rz: number;
    }>();
    
    for (const [nodeId, nodeIdx] of nodeIndexMap) {
      const baseDOF = nodeIdx * 6;
      nodalDisplacements.set(nodeId, {
        dx: displacements[baseDOF + 0] || 0,
        dy: displacements[baseDOF + 1] || 0,
        dz: displacements[baseDOF + 2] || 0,
        rx: displacements[baseDOF + 3] || 0,
        ry: displacements[baseDOF + 4] || 0,
        rz: displacements[baseDOF + 5] || 0,
      });
    }
    
    return {
      success: cgResult.converged,
      displacements,
      nodalDisplacements,
      nodalReactions: new Map(), // Would need to calculate K*u at supports
      superElementResults,
      solverInfo: {
        iterations: cgResult.iterations,
        residualNorm: cgResult.residualNorm,
        converged: cgResult.converged,
      },
      timing: {
        assembly: assemblyTime,
        solve: solveTime,
        recovery: recoveryTime,
        total: totalTime,
      },
    };
  }

  /**
   * Add regular member stiffness contributions
   */
  private addMemberContributions(
    builder: SparseMatrixBuilder,
    nodes: SolverNode[],
    members: SolverMember[],
    nodeIndexMap: Map<string, number>
  ): void {
    for (const member of members) {
      const startIdx = nodeIndexMap.get(member.startNodeId);
      const endIdx = nodeIndexMap.get(member.endNodeId);
      
      if (startIdx === undefined || endIdx === undefined) continue;
      
      const startNode = nodes[startIdx];
      const endNode = nodes[endIdx];
      
      // Build node coordinates
      const nodeA: NodeCoord = {
        x: startNode.position.x,
        y: startNode.position.y,
        z: startNode.position.z,
      };
      const nodeB: NodeCoord = {
        x: endNode.position.x,
        y: endNode.position.y,
        z: endNode.position.z,
      };
      
      // Get member properties
      const E = member.E || 200e9;
      const A = member.A || 0.01;
      const Iy = member.Iy || 1e-4;
      const Iz = member.Iz || 1e-4;
      const G = member.G || E / 2.6;
      const J = member.J || Iy + Iz;
      const beta = member.beta || 0;
      
      // Calculate member length
      const L = MatrixUtils.getMemberLength(nodeA, nodeB);
      if (L < 1e-10) continue;
      
      // Get local stiffness matrix
      const kLocal = MatrixUtils.getLocalStiffnessMatrix(E, Iy, Iz, A, L, G, J);
      
      // Get transformation matrix
      const R = MatrixUtils.getRotationMatrix(nodeA, nodeB, beta);
      const T = MatrixUtils.getTransformationMatrix(R);
      
      // Transform to global coordinates
      const kGlobal = MatrixUtils.transformToGlobal(kLocal, T);
      const kGlobalArr = kGlobal.toArray() as number[][];
      
      // Build DOF mapping for this member
      const dofMap: number[] = [];
      const startBase = startIdx * 6;
      const endBase = endIdx * 6;
      for (let i = 0; i < 6; i++) dofMap.push(startBase + i);
      for (let i = 0; i < 6; i++) dofMap.push(endBase + i);
      
      // Add to global matrix using addSubmatrix
      builder.addSubmatrix(kGlobalArr, dofMap);
    }
  }

  /**
   * Add super element stiffness contribution
   */
  private addSuperElementContribution(
    builder: SparseMatrixBuilder,
    superElement: SuperElement,
    nodeIndexMap: Map<string, number>
  ): void {
    const condensedK = superElement.condensedK;
    const boundaryNodeIds = superElement.boundaryNodeIds;
    
    // Map super element boundary nodes to global DOFs
    const globalDOFs: number[] = [];
    for (const nodeId of boundaryNodeIds) {
      const nodeIdx = nodeIndexMap.get(nodeId);
      if (nodeIdx === undefined) {
        console.warn(`[HybridSolver] Boundary node ${nodeId} not found in global model`);
        continue;
      }
      
      const baseDOF = nodeIdx * 6;
      for (let i = 0; i < 6; i++) {
        globalDOFs.push(baseDOF + i);
      }
    }
    
    // Add condensed stiffness to global matrix
    for (let i = 0; i < globalDOFs.length; i++) {
      for (let j = 0; j < globalDOFs.length; j++) {
        if (Math.abs(condensedK[i][j]) > 1e-15) {
          builder.add(globalDOFs[i], globalDOFs[j], condensedK[i][j]);
        }
      }
    }
  }

  /**
   * Extract boundary displacements for a super element
   */
  private extractBoundaryDisplacements(
    superElement: SuperElement,
    globalDisplacements: number[],
    nodeIndexMap: Map<string, number>
  ): number[] {
    const boundaryDisplacements: number[] = [];
    
    for (const nodeId of superElement.boundaryNodeIds) {
      const nodeIdx = nodeIndexMap.get(nodeId);
      if (nodeIdx === undefined) {
        // Fill with zeros if node not found
        for (let i = 0; i < 6; i++) boundaryDisplacements.push(0);
        continue;
      }
      
      const baseDOF = nodeIdx * 6;
      for (let i = 0; i < 6; i++) {
        boundaryDisplacements.push(globalDisplacements[baseDOF + i] || 0);
      }
    }
    
    return boundaryDisplacements;
  }
}

// ============================================================================
// WORKFLOW HELPERS
// ============================================================================

/**
 * Prepare a model with super elements for analysis
 * 
 * This takes a full model and creates super elements from
 * specified member groups, returning a reduced model.
 */
export function prepareModelWithSuperElements(
  allNodes: SolverNode[],
  allMembers: SolverMember[],
  supports: SolverSupport[],
  loads: NodalLoad[],
  substructureSelections: Array<{
    name: string;
    memberIds: string[];
    boundaryNodeIds: string[];
  }>
): SuperElementAnalysisInput {
  const manager = new SubstructureManager();
  
  // Collect all nodes/members in substructures
  const substructureMemberIds = new Set<string>();
  const substructureNodeIds = new Set<string>();
  const superElements: SuperElement[] = [];
  
  // Create super elements from each selection
  for (const selection of substructureSelections) {
    const selectedMembers = allMembers.filter(m => 
      selection.memberIds.includes(m.id)
    );
    
    // Get all nodes of selected members
    const nodeIds = new Set<string>();
    for (const member of selectedMembers) {
      nodeIds.add(member.startNodeId);
      nodeIds.add(member.endNodeId);
    }
    
    const selectedNodes = allNodes.filter(n => nodeIds.has(n.id));
    
    // Track which members/nodes are in substructures
    for (const id of selection.memberIds) substructureMemberIds.add(id);
    for (const id of nodeIds) substructureNodeIds.add(id);
    
    // Create super element
    const superElement = manager.createSuperElement({
      id: `super-${selection.name}`,
      name: selection.name,
      nodes: selectedNodes.map(n => ({
        id: n.id,
        x: n.position.x,
        y: n.position.y,
        z: n.position.z,
      })),
      members: selectedMembers.map(m => ({
        id: m.id,
        startNodeId: m.startNodeId,
        endNodeId: m.endNodeId,
        E: m.E || 200e9,
        A: m.A || 0.01,
        Iy: m.Iy || 1e-4,
        Iz: m.Iz || 1e-4,
        G: m.G,
        J: m.J,
        beta: m.beta,
      })),
      boundaryNodeIds: selection.boundaryNodeIds,
    });
    
    superElements.push(superElement);
  }
  
  // Build reduced model
  // Keep: boundary nodes of super elements + all non-substructure nodes
  const boundaryNodeIds = new Set<string>();
  for (const superElement of superElements) {
    for (const nodeId of superElement.boundaryNodeIds) {
      boundaryNodeIds.add(nodeId);
    }
  }
  
  const reducedNodes = allNodes.filter(n => 
    boundaryNodeIds.has(n.id) || !substructureNodeIds.has(n.id)
  );
  
  const reducedMembers = allMembers.filter(m => 
    !substructureMemberIds.has(m.id)
  );
  
  console.log(`[prepareModel] Original: ${allNodes.length} nodes, ${allMembers.length} members`);
  console.log(`[prepareModel] Reduced: ${reducedNodes.length} nodes, ${reducedMembers.length} members`);
  console.log(`[prepareModel] Super elements: ${superElements.length}`);
  
  return {
    nodes: reducedNodes,
    members: reducedMembers,
    supports,
    loads,
    superElements,
  };
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/**
 * Example: Building with repetitive floor trusses
 */
export function exampleFloorTrussBuilding() {
  // This would typically come from the model
  const allNodes: SolverNode[] = [
    // Main columns
    { id: 'c1', position: { x: 0, y: 0, z: 0 } },
    { id: 'c2', position: { x: 10, y: 0, z: 0 } },
    { id: 'c3', position: { x: 20, y: 0, z: 0 } },
    { id: 'c4', position: { x: 0, y: 0, z: 3 } },
    { id: 'c5', position: { x: 10, y: 0, z: 3 } },
    { id: 'c6', position: { x: 20, y: 0, z: 3 } },
    // Truss 1 internal nodes (between c4-c5)
    { id: 't1-1', position: { x: 2.5, y: 0, z: 3 } },
    { id: 't1-2', position: { x: 5, y: 0, z: 3.5 } },
    { id: 't1-3', position: { x: 7.5, y: 0, z: 3 } },
    // Truss 2 internal nodes (between c5-c6)
    { id: 't2-1', position: { x: 12.5, y: 0, z: 3 } },
    { id: 't2-2', position: { x: 15, y: 0, z: 3.5 } },
    { id: 't2-3', position: { x: 17.5, y: 0, z: 3 } },
  ];
  
  const allMembers: SolverMember[] = [
    // Columns
    { id: 'col1', startNodeId: 'c1', endNodeId: 'c4', E: 200e9, A: 0.01, Iy: 1e-4, Iz: 1e-4 },
    { id: 'col2', startNodeId: 'c2', endNodeId: 'c5', E: 200e9, A: 0.01, Iy: 1e-4, Iz: 1e-4 },
    { id: 'col3', startNodeId: 'c3', endNodeId: 'c6', E: 200e9, A: 0.01, Iy: 1e-4, Iz: 1e-4 },
    // Truss 1 members
    { id: 't1-m1', startNodeId: 'c4', endNodeId: 't1-1', E: 200e9, A: 0.005, Iy: 5e-5, Iz: 5e-5 },
    { id: 't1-m2', startNodeId: 't1-1', endNodeId: 't1-2', E: 200e9, A: 0.005, Iy: 5e-5, Iz: 5e-5 },
    { id: 't1-m3', startNodeId: 't1-2', endNodeId: 't1-3', E: 200e9, A: 0.005, Iy: 5e-5, Iz: 5e-5 },
    { id: 't1-m4', startNodeId: 't1-3', endNodeId: 'c5', E: 200e9, A: 0.005, Iy: 5e-5, Iz: 5e-5 },
    { id: 't1-m5', startNodeId: 'c4', endNodeId: 't1-2', E: 200e9, A: 0.003, Iy: 3e-5, Iz: 3e-5 },
    { id: 't1-m6', startNodeId: 't1-2', endNodeId: 'c5', E: 200e9, A: 0.003, Iy: 3e-5, Iz: 3e-5 },
    // Truss 2 members
    { id: 't2-m1', startNodeId: 'c5', endNodeId: 't2-1', E: 200e9, A: 0.005, Iy: 5e-5, Iz: 5e-5 },
    { id: 't2-m2', startNodeId: 't2-1', endNodeId: 't2-2', E: 200e9, A: 0.005, Iy: 5e-5, Iz: 5e-5 },
    { id: 't2-m3', startNodeId: 't2-2', endNodeId: 't2-3', E: 200e9, A: 0.005, Iy: 5e-5, Iz: 5e-5 },
    { id: 't2-m4', startNodeId: 't2-3', endNodeId: 'c6', E: 200e9, A: 0.005, Iy: 5e-5, Iz: 5e-5 },
    { id: 't2-m5', startNodeId: 'c5', endNodeId: 't2-2', E: 200e9, A: 0.003, Iy: 3e-5, Iz: 3e-5 },
    { id: 't2-m6', startNodeId: 't2-2', endNodeId: 'c6', E: 200e9, A: 0.003, Iy: 3e-5, Iz: 3e-5 },
  ];
  
  const supports: SolverSupport[] = [
    { nodeId: 'c1', dx: true, dy: true, dz: true, rx: true, ry: true, rz: true },
    { nodeId: 'c2', dx: true, dy: true, dz: true, rx: true, ry: true, rz: true },
    { nodeId: 'c3', dx: true, dy: true, dz: true, rx: true, ry: true, rz: true },
  ];
  
  const loads: NodalLoad[] = [
    { nodeId: 'c4', fz: -50000 },
    { nodeId: 'c5', fz: -100000 },
    { nodeId: 'c6', fz: -50000 },
  ];
  
  // Define substructure selections
  const substructureSelections = [
    {
      name: 'Truss-1',
      memberIds: ['t1-m1', 't1-m2', 't1-m3', 't1-m4', 't1-m5', 't1-m6'],
      boundaryNodeIds: ['c4', 'c5'],
    },
    {
      name: 'Truss-2',
      memberIds: ['t2-m1', 't2-m2', 't2-m3', 't2-m4', 't2-m5', 't2-m6'],
      boundaryNodeIds: ['c5', 'c6'],
    },
  ];
  
  // Prepare reduced model
  const reducedModel = prepareModelWithSuperElements(
    allNodes,
    allMembers,
    supports,
    loads,
    substructureSelections
  );
  
  // Solve
  const solver = new HybridSuperElementSolver();
  return solver.solve(reducedModel);
}
