import * as math from 'mathjs';
import type { Matrix } from 'mathjs';
import { MatrixUtils, type NodeCoord } from './MatrixUtils';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Node data for solver
 */
export interface SolverNode {
  id: string;
  x: number;
  y: number;
  z: number;
}

/**
 * Member data for solver
 */
export interface SolverMember {
  id: string;
  startNodeId: string;
  endNodeId: string;
  // Section properties
  E: number;   // Elastic modulus (Pa or kN/m²)
  A: number;   // Cross-sectional area (m²)
  Iy: number;  // Moment of inertia about y-axis (m⁴)
  Iz: number;  // Moment of inertia about z-axis (m⁴)
  G?: number;  // Shear modulus (optional)
  J?: number;  // Torsional constant (optional)
  beta?: number; // Roll angle about member axis (radians)
}

/**
 * Support constraint
 * 6 DOFs per node: [dx, dy, dz, rx, ry, rz]
 */
export interface SolverSupport {
  nodeId: string;
  // True = fixed (constrained), False = free
  dx: boolean;
  dy: boolean;
  dz: boolean;
  rx: boolean;
  ry: boolean;
  rz: boolean;
}

/**
 * Solver configuration
 */
export interface SolverConfig {
  nodes: SolverNode[];
  members: SolverMember[];
  supports: SolverSupport[];
}

/**
 * Nodal load (forces and moments at a node)
 */
export interface NodalLoad {
  nodeId: string;
  fx?: number;  // Force in X (kN)
  fy?: number;  // Force in Y (kN)
  fz?: number;  // Force in Z (kN)
  mx?: number;  // Moment about X (kN-m)
  my?: number;  // Moment about Y (kN-m)
  mz?: number;  // Moment about Z (kN-m)
}

/**
 * Solution result
 */
export interface SolverResult {
  // Nodal displacements (size: numDOFs)
  displacements: number[];
  
  // Reaction forces at supports (size: numDOFs, non-zero only at constrained DOFs)
  reactions: number[];
  
  // Displacement by node: { nodeId: { dx, dy, dz, rx, ry, rz } }
  nodalDisplacements: Map<string, {
    dx: number;
    dy: number;
    dz: number;
    rx: number;
    ry: number;
    rz: number;
  }>;
  
  // Reactions by node: { nodeId: { fx, fy, fz, mx, my, mz } }
  nodalReactions: Map<string, {
    fx: number;
    fy: number;
    fz: number;
    mx: number;
    my: number;
    mz: number;
  }>;
}

// ============================================================================
// SOLVER CLASS
// ============================================================================

/**
 * Structural Analysis Solver using Direct Stiffness Method
 * 
 * Assembles the global stiffness matrix and solves for nodal displacements.
 * 
 * DOF Convention (6 DOFs per node):
 * - DOF 0: Translation in X (dx)
 * - DOF 1: Translation in Y (dy)
 * - DOF 2: Translation in Z (dz)
 * - DOF 3: Rotation about X (rx)
 * - DOF 4: Rotation about Y (ry)
 * - DOF 5: Rotation about Z (rz)
 * 
 * Global DOF numbering:
 * Node 0: DOFs 0-5
 * Node 1: DOFs 6-11
 * Node n: DOFs (n*6) to (n*6 + 5)
 */
export class Solver {
  private nodes: Map<string, SolverNode>;
  private nodeIndexMap: Map<string, number>;  // nodeId -> node index (0, 1, 2, ...)
  private members: SolverMember[];
  private supports: Map<string, SolverSupport>;
  
  private numNodes: number;
  private numDOFs: number;  // Total DOFs = numNodes * 6
  
  private globalK: Matrix | null = null;
  private isAssembled: boolean = false;
  
  /**
   * Create a new Solver instance
   * @param config - Solver configuration with nodes, members, and supports
   */
  constructor(config: SolverConfig) {
    // Build node map and index map
    this.nodes = new Map();
    this.nodeIndexMap = new Map();
    
    config.nodes.forEach((node, index) => {
      this.nodes.set(node.id, node);
      this.nodeIndexMap.set(node.id, index);
    });
    
    this.members = config.members;
    
    // Build support map
    this.supports = new Map();
    config.supports.forEach(support => {
      this.supports.set(support.nodeId, support);
    });
    
    this.numNodes = this.nodes.size;
    this.numDOFs = this.numNodes * 6;
  }
  
  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================
  
  /**
   * Assemble the global stiffness matrix
   * 
   * Process:
   * 1. Initialize zero-filled GlobalK matrix (Size: Nodes * 6)
   * 2. Loop through all Members:
   *    - Calculate k_local (12x12 local stiffness matrix)
   *    - Calculate T (12x12 transformation matrix)
   *    - k_global = T^T * k_local * T
   *    - Map k_global indices to Global Node DOF indices
   *    - Add to GlobalK
   * 
   * @returns The assembled global stiffness matrix
   */
  assemble(): Matrix {
    if (this.isAssembled && this.globalK) {
      return this.globalK;
    }
    
    // Step 1: Initialize zero-filled global stiffness matrix
    const K: number[][] = Array(this.numDOFs)
      .fill(null)
      .map(() => Array(this.numDOFs).fill(0));
    
    // Step 2: Loop through all members
    for (const member of this.members) {
      // Get node coordinates
      const startNode = this.nodes.get(member.startNodeId);
      const endNode = this.nodes.get(member.endNodeId);
      
      if (!startNode || !endNode) {
        console.warn(`Member ${member.id}: Missing node(s), skipping`);
        continue;
      }
      
      const nodeA: NodeCoord = { x: startNode.x, y: startNode.y, z: startNode.z };
      const nodeB: NodeCoord = { x: endNode.x, y: endNode.y, z: endNode.z };
      
      // Step 2a: Calculate member length
      const L = MatrixUtils.getMemberLength(nodeA, nodeB);
      
      if (L < 1e-10) {
        console.warn(`Member ${member.id}: Zero length, skipping`);
        continue;
      }
      
      // Step 2b: Calculate local stiffness matrix (12x12)
      const kLocal = MatrixUtils.getLocalStiffnessMatrix(
        member.E,
        member.Iy,
        member.Iz,
        member.A,
        L,
        member.G,
        member.J
      );
      
      // Step 2c: Calculate transformation matrix (12x12)
      const R = MatrixUtils.getRotationMatrix(nodeA, nodeB, member.beta ?? 0);
      const T = MatrixUtils.getTransformationMatrix(R);
      
      // Step 2d: Transform to global coordinates: k_global = T^T * k_local * T
      const kGlobal = MatrixUtils.transformToGlobal(kLocal, T);
      const kGlobalArr = kGlobal.toArray() as number[][];
      
      // Step 2e: Get global DOF indices for this member
      const startNodeIndex = this.nodeIndexMap.get(member.startNodeId)!;
      const endNodeIndex = this.nodeIndexMap.get(member.endNodeId)!;
      
      // DOF mapping: member DOFs [0-5] -> start node, [6-11] -> end node
      const dofMap = this.getMemberDOFMapping(startNodeIndex, endNodeIndex);
      
      // Step 2f: Add member stiffness to global matrix
      for (let i = 0; i < 12; i++) {
        const globalI = dofMap[i];
        for (let j = 0; j < 12; j++) {
          const globalJ = dofMap[j];
          K[globalI][globalJ] += kGlobalArr[i][j];
        }
      }
    }
    
    // Convert to mathjs matrix
    this.globalK = math.matrix(K);
    this.isAssembled = true;
    
    return this.globalK;
  }
  
  /**
   * Get the global DOF index for a specific node and local DOF
   * 
   * @param nodeId - Node ID
   * @param localDOF - Local DOF (0-5: dx, dy, dz, rx, ry, rz)
   * @returns Global DOF index
   */
  getGlobalDOF(nodeId: string, localDOF: number): number {
    const nodeIndex = this.nodeIndexMap.get(nodeId);
    if (nodeIndex === undefined) {
      throw new Error(`Node ${nodeId} not found`);
    }
    if (localDOF < 0 || localDOF > 5) {
      throw new Error(`Local DOF must be 0-5, got ${localDOF}`);
    }
    return nodeIndex * 6 + localDOF;
  }
  
  /**
   * Get the assembled global stiffness matrix
   * Calls assemble() if not already assembled
   */
  getGlobalStiffnessMatrix(): Matrix {
    if (!this.isAssembled) {
      this.assemble();
    }
    return this.globalK!;
  }
  
  /**
   * Get constraint (boundary condition) vector
   * Returns array of booleans: true = constrained, false = free
   */
  getConstraints(): boolean[] {
    const constraints = Array(this.numDOFs).fill(false);
    
    for (const [nodeId, support] of this.supports) {
      const nodeIndex = this.nodeIndexMap.get(nodeId);
      if (nodeIndex === undefined) continue;
      
      const baseIdx = nodeIndex * 6;
      constraints[baseIdx + 0] = support.dx;
      constraints[baseIdx + 1] = support.dy;
      constraints[baseIdx + 2] = support.dz;
      constraints[baseIdx + 3] = support.rx;
      constraints[baseIdx + 4] = support.ry;
      constraints[baseIdx + 5] = support.rz;
    }
    
    return constraints;
  }
  
  /**
   * Get indices of free (unconstrained) DOFs
   */
  getFreeDOFs(): number[] {
    const constraints = this.getConstraints();
    const freeDOFs: number[] = [];
    
    for (let i = 0; i < this.numDOFs; i++) {
      if (!constraints[i]) {
        freeDOFs.push(i);
      }
    }
    
    return freeDOFs;
  }
  
  /**
   * Get indices of constrained (fixed) DOFs
   */
  getConstrainedDOFs(): number[] {
    const constraints = this.getConstraints();
    const constrainedDOFs: number[] = [];
    
    for (let i = 0; i < this.numDOFs; i++) {
      if (constraints[i]) {
        constrainedDOFs.push(i);
      }
    }
    
    return constrainedDOFs;
  }
  
  /**
   * Get total number of DOFs
   */
  getNumDOFs(): number {
    return this.numDOFs;
  }
  
  /**
   * Get number of nodes
   */
  getNumNodes(): number {
    return this.numNodes;
  }
  
  /**
   * Print the global stiffness matrix for debugging
   */
  printGlobalK(precision: number = 2): void {
    if (!this.globalK) {
      console.log('Global stiffness matrix not assembled yet');
      return;
    }
    MatrixUtils.printMatrix(this.globalK, 'Global Stiffness Matrix [K]', precision);
  }
  
  /**
   * Solve the structural system: F = K × u
   * 
   * Process:
   * 1. Create the Force Vector F from loads
   * 2. Apply Boundary Conditions:
   *    - Identify DOFs constrained by supports
   *    - Partition GlobalK and F to remove constrained rows/cols (Matrix Condensation)
   * 3. Solve: u_free = inv(K_reduced) × F_reduced
   * 4. Expand u_free back to full Displacement Vector
   * 5. Calculate reactions at supports
   * 
   * @param loads - Array of nodal loads
   * @param supports - Optional: Override supports from constructor. Array of support constraints.
   * @returns Solution with displacements and reactions (Map of NodeID -> Displacement)
   */
  solve(loads: NodalLoad[], supports?: SolverSupport[]): SolverResult {
    // Ensure matrix is assembled
    if (!this.isAssembled) {
      this.assemble();
    }
    
    // Step 1: Create the Force Vector F
    const K = this.globalK!.toArray() as number[][];
    const F = this.buildForceVector(loads);
    
    // Step 2: Apply Boundary Conditions
    // Use provided supports or fall back to constructor supports
    const activeSupports = supports 
      ? this.buildSupportMap(supports) 
      : this.supports;
    
    // Identify constrained DOFs from supports
    const { freeDOFs, constrainedDOFs } = this.identifyConstrainedDOFs(activeSupports);
    
    const nf = freeDOFs.length;   // Number of free DOFs
    const nc = constrainedDOFs.length;  // Number of constrained DOFs
    
    if (nf === 0) {
      throw new Error('No free DOFs - structure is fully constrained');
    }
    
    // Partition GlobalK - Extract K_reduced (Kff)
    const K_reduced: number[][] = Array(nf).fill(null).map(() => Array(nf).fill(0));
    for (let i = 0; i < nf; i++) {
      for (let j = 0; j < nf; j++) {
        K_reduced[i][j] = K[freeDOFs[i]][freeDOFs[j]];
      }
    }
    
    // Partition F - Extract F_reduced
    const F_reduced: number[] = freeDOFs.map(dof => F[dof]);
    
    // Step 3: Solve K_reduced × u_free = F_reduced
    // Use LU decomposition (much faster than matrix inversion for large systems)
    const K_reducedMatrix = math.matrix(K_reduced);
    const F_reducedMatrix = math.matrix(F_reduced);
    
    let u_free: number[];
    try {
      // Use lusolve instead of inv+multiply (more efficient and numerically stable)
      const u_freeMatrix = math.lusolve(K_reducedMatrix, F_reducedMatrix) as Matrix;
      u_free = (u_freeMatrix.toArray() as number[][]).flat();
    } catch (e) {
      // Check if structure is actually unstable or just numerically ill-conditioned
      const errorMsg = e instanceof Error ? e.message : String(e);
      if (errorMsg.includes('Cannot find LUP decomposition') || 
          errorMsg.includes('singular') || 
          errorMsg.includes('decomposition failed')) {
        throw new Error(
          'Stiffness matrix is singular - structure may be unstable, improperly constrained, ' +
          'or contains zero-length members. Check supports and member connectivity.'
        );
      }
      throw new Error(`Matrix solution failed: ${errorMsg}`);
    }
    
    // Step 4: Expand u_free back to full Displacement Vector
    const u = Array(this.numDOFs).fill(0);
    for (let i = 0; i < nf; i++) {
      u[freeDOFs[i]] = u_free[i];
    }
    // Constrained DOFs remain 0 (prescribed displacement)
    
    // Step 5: Calculate reactions at supports: R = Kcf × u_free
    const reactions = Array(this.numDOFs).fill(0);
    
    if (nc > 0) {
      // Extract Kcf (constrained-free partition)
      const Kcf: number[][] = Array(nc).fill(null).map(() => Array(nf).fill(0));
      for (let i = 0; i < nc; i++) {
        for (let j = 0; j < nf; j++) {
          Kcf[i][j] = K[constrainedDOFs[i]][freeDOFs[j]];
        }
      }
      
      // Rc = Kcf × u_free
      const KcfMatrix = math.matrix(Kcf);
      const u_freeVector = math.matrix(u_free);
      const RcMatrix = math.multiply(KcfMatrix, u_freeVector);
      const Rc = (RcMatrix.toArray() as number[]).flat();
      
      for (let i = 0; i < nc; i++) {
        reactions[constrainedDOFs[i]] = Rc[i];
      }
    }
    
    // Build result: Map of NodeID -> Displacement { dx, dy, dz, rx, ry, rz }
    const nodalDisplacements = this.buildNodalDisplacements(u);
    const nodalReactions = this.buildNodalReactions(reactions);
    
    return {
      displacements: u,
      reactions,
      nodalDisplacements,
      nodalReactions
    };
  }
  
  /**
   * Build support map from array
   */
  private buildSupportMap(supports: SolverSupport[]): Map<string, SolverSupport> {
    const map = new Map<string, SolverSupport>();
    for (const support of supports) {
      map.set(support.nodeId, support);
    }
    return map;
  }
  
  /**
   * Identify free and constrained DOFs from support map
   */
  private identifyConstrainedDOFs(supports: Map<string, SolverSupport>): { freeDOFs: number[]; constrainedDOFs: number[] } {
    const constraints = Array(this.numDOFs).fill(false);
    
    for (const [nodeId, support] of supports) {
      const nodeIndex = this.nodeIndexMap.get(nodeId);
      if (nodeIndex === undefined) continue;
      
      const baseIdx = nodeIndex * 6;
      constraints[baseIdx + 0] = support.dx;
      constraints[baseIdx + 1] = support.dy;
      constraints[baseIdx + 2] = support.dz;
      constraints[baseIdx + 3] = support.rx;
      constraints[baseIdx + 4] = support.ry;
      constraints[baseIdx + 5] = support.rz;
    }
    
    const freeDOFs: number[] = [];
    const constrainedDOFs: number[] = [];
    
    for (let i = 0; i < this.numDOFs; i++) {
      if (constraints[i]) {
        constrainedDOFs.push(i);
      } else {
        freeDOFs.push(i);
      }
    }
    
    return { freeDOFs, constrainedDOFs };
  }
  
  /**
   * Build the global force vector from nodal loads
   */
  private buildForceVector(loads: NodalLoad[]): number[] {
    const F = Array(this.numDOFs).fill(0);
    
    for (const load of loads) {
      const nodeIndex = this.nodeIndexMap.get(load.nodeId);
      if (nodeIndex === undefined) {
        console.warn(`Load at node ${load.nodeId}: Node not found, skipping`);
        continue;
      }
      
      const baseIdx = nodeIndex * 6;
      F[baseIdx + 0] += load.fx ?? 0;
      F[baseIdx + 1] += load.fy ?? 0;
      F[baseIdx + 2] += load.fz ?? 0;
      F[baseIdx + 3] += load.mx ?? 0;
      F[baseIdx + 4] += load.my ?? 0;
      F[baseIdx + 5] += load.mz ?? 0;
    }
    
    return F;
  }
  
  /**
   * Build nodal displacement map from displacement vector
   */
  private buildNodalDisplacements(u: number[]): Map<string, { dx: number; dy: number; dz: number; rx: number; ry: number; rz: number }> {
    const result = new Map();
    
    for (const [nodeId, nodeIndex] of this.nodeIndexMap) {
      const baseIdx = nodeIndex * 6;
      result.set(nodeId, {
        dx: u[baseIdx + 0],
        dy: u[baseIdx + 1],
        dz: u[baseIdx + 2],
        rx: u[baseIdx + 3],
        ry: u[baseIdx + 4],
        rz: u[baseIdx + 5]
      });
    }
    
    return result;
  }
  
  /**
   * Build nodal reactions map from reaction vector
   */
  private buildNodalReactions(reactions: number[]): Map<string, { fx: number; fy: number; fz: number; mx: number; my: number; mz: number }> {
    const result = new Map();
    
    for (const [nodeId, nodeIndex] of this.nodeIndexMap) {
      const baseIdx = nodeIndex * 6;
      
      // Only include if there are non-zero reactions
      const fx = reactions[baseIdx + 0];
      const fy = reactions[baseIdx + 1];
      const fz = reactions[baseIdx + 2];
      const mx = reactions[baseIdx + 3];
      const my = reactions[baseIdx + 4];
      const mz = reactions[baseIdx + 5];
      
      if (fx !== 0 || fy !== 0 || fz !== 0 || mx !== 0 || my !== 0 || mz !== 0) {
        result.set(nodeId, { fx, fy, fz, mx, my, mz });
      }
    }
    
    return result;
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  /**
   * Get DOF mapping for a member
   * Maps local member DOFs (0-11) to global DOFs
   * 
   * @param startNodeIndex - Index of start node (0, 1, 2, ...)
   * @param endNodeIndex - Index of end node
   * @returns Array of 12 global DOF indices
   */
  private getMemberDOFMapping(startNodeIndex: number, endNodeIndex: number): number[] {
    const mapping: number[] = [];
    
    // Start node DOFs (0-5 in local, mapped to global)
    for (let i = 0; i < 6; i++) {
      mapping.push(startNodeIndex * 6 + i);
    }
    
    // End node DOFs (6-11 in local, mapped to global)
    for (let i = 0; i < 6; i++) {
      mapping.push(endNodeIndex * 6 + i);
    }
    
    return mapping;
  }
}

export default Solver;
