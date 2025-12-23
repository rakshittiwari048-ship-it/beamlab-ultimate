/**
 * SubstructureManager.ts
 * 
 * Implements Static Condensation (Guyan Reduction) for creating Super Elements.
 * This allows complex substructures (like roof trusses) to be condensed into
 * simple 2-node matrix elements, dramatically reducing problem size.
 * 
 * Key Concepts:
 * - Master DOFs: Boundary nodes that connect to the rest of the structure
 * - Slave DOFs: Internal nodes that can be condensed out
 * - Static Condensation: K_condensed = Kmm - Kmi * Kii^(-1) * Kim
 * 
 * Benefits:
 * - Reduces 10,000 node problems to ~100 nodes
 * - Preserves exact static behavior at boundary nodes
 * - Can be computed once and reused for multiple load cases
 * - Enables efficient analysis of repetitive substructures
 * 
 * Usage:
 * ```typescript
 * const manager = new SubstructureManager();
 * 
 * // Create a super element from selected members
 * const superElement = manager.createSuperElement({
 *   id: 'roof-truss-1',
 *   nodes: selectedNodes,
 *   members: selectedMembers,
 *   boundaryNodeIds: ['n1', 'n2'],  // Nodes connecting to main structure
 * });
 * 
 * // Use in global analysis
 * globalSolver.addSuperElement(superElement);
 * ```
 */

import * as math from 'mathjs';
import type { Matrix } from 'mathjs';
import { MatrixUtils, type NodeCoord } from '../MatrixUtils';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Node data for substructure
 */
export interface SubstructureNode {
  id: string;
  x: number;
  y: number;
  z: number;
}

/**
 * Member data for substructure
 */
export interface SubstructureMember {
  id: string;
  startNodeId: string;
  endNodeId: string;
  E: number;   // Elastic modulus
  A: number;   // Cross-sectional area
  Iy: number;  // Moment of inertia about y
  Iz: number;  // Moment of inertia about z
  G?: number;  // Shear modulus
  J?: number;  // Torsional constant
  beta?: number; // Roll angle
}

/**
 * Input for creating a super element
 */
export interface CreateSuperElementInput {
  /** Unique identifier for this super element */
  id: string;
  /** All nodes in the substructure */
  nodes: SubstructureNode[];
  /** All members in the substructure */
  members: SubstructureMember[];
  /** Node IDs that connect to the rest of the structure (boundary nodes) */
  boundaryNodeIds: string[];
  /** Optional: Name for display */
  name?: string;
  /** Optional: Retain specific internal nodes (don't condense) */
  retainedInternalNodeIds?: string[];
}

/**
 * A condensed super element that replaces a complex substructure
 */
export interface SuperElement {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Boundary node IDs (in order) */
  boundaryNodeIds: string[];
  /** Boundary node coordinates */
  boundaryNodes: SubstructureNode[];
  /** Condensed stiffness matrix (size: boundaryDOFs x boundaryDOFs) */
  condensedK: number[][];
  /** Number of boundary DOFs */
  numBoundaryDOFs: number;
  /** Original statistics */
  originalStats: {
    numNodes: number;
    numMembers: number;
    numTotalDOFs: number;
    numInternalDOFs: number;
    numBoundaryDOFs: number;
    reductionRatio: number;  // e.g., 0.95 = 95% reduction
  };
  /** Transformation data for recovering internal displacements */
  recovery: {
    /** Transformation matrix: u_internal = T * u_boundary */
    T: number[][];
    /** Internal node IDs (in order) */
    internalNodeIds: string[];
  };
  /** Timestamp */
  createdAt: Date;
}

/**
 * Result of applying a super element in analysis
 */
export interface SuperElementResult {
  superElementId: string;
  /** Displacements at boundary nodes */
  boundaryDisplacements: Map<string, {
    dx: number; dy: number; dz: number;
    rx: number; ry: number; rz: number;
  }>;
  /** Recovered displacements at internal nodes */
  internalDisplacements: Map<string, {
    dx: number; dy: number; dz: number;
    rx: number; ry: number; rz: number;
  }>;
  /** Forces at boundary nodes */
  boundaryForces: Map<string, {
    fx: number; fy: number; fz: number;
    mx: number; my: number; mz: number;
  }>;
}

/**
 * Configuration for substructure operations
 */
export interface SubstructureConfig {
  /** Tolerance for matrix conditioning check */
  conditioningTolerance?: number;
  /** Use sparse matrix operations for large substructures */
  useSparse?: boolean;
  /** Threshold for sparse operations (number of internal DOFs) */
  sparseThreshold?: number;
}

// ============================================================================
// SUBSTRUCTURE MANAGER
// ============================================================================

/**
 * Manages substructure creation, static condensation, and super elements.
 * 
 * Static Condensation Process:
 * 1. Identify boundary (master) and internal (slave) DOFs
 * 2. Assemble substructure stiffness matrix
 * 3. Partition: K = [[Kii, Kim], [Kmi, Kmm]]
 * 4. Condense: K* = Kmm - Kmi * inv(Kii) * Kim
 * 5. Store transformation: T = -inv(Kii) * Kim
 * 
 * Recovery of internal displacements:
 * - u_internal = T * u_boundary
 */
export class SubstructureManager {
  private superElements: Map<string, SuperElement> = new Map();
  private config: Required<SubstructureConfig>;

  constructor(config: SubstructureConfig = {}) {
    this.config = {
      conditioningTolerance: config.conditioningTolerance ?? 1e-10,
      useSparse: config.useSparse ?? true,
      sparseThreshold: config.sparseThreshold ?? 500,
    };
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Create a super element from a substructure
   * 
   * This is the main entry point for static condensation.
   * Takes a group of members and condenses internal DOFs.
   */
  createSuperElement(input: CreateSuperElementInput): SuperElement {
    const startTime = performance.now();
    
    // Validate input
    this.validateInput(input);
    
    // Build node index maps
    const { nodeMap, boundaryIndices, internalIndices } = this.buildNodeMaps(
      input.nodes,
      input.boundaryNodeIds,
      input.retainedInternalNodeIds
    );
    
    const numNodes = input.nodes.length;
    const numDOFs = numNodes * 6;
    const numBoundaryDOFs = boundaryIndices.length * 6;
    const numInternalDOFs = internalIndices.length * 6;
    
    console.log(`[SubstructureManager] Creating super element "${input.id}"`);
    console.log(`  Nodes: ${numNodes} (${boundaryIndices.length} boundary, ${internalIndices.length} internal)`);
    console.log(`  DOFs: ${numDOFs} → ${numBoundaryDOFs} (${((1 - numBoundaryDOFs/numDOFs) * 100).toFixed(1)}% reduction)`);
    
    // Assemble substructure stiffness matrix
    const K = this.assembleSubstructureStiffness(input.nodes, input.members, nodeMap);
    
    // Get DOF indices
    const boundaryDOFs = this.getNodeDOFs(boundaryIndices);
    const internalDOFs = this.getNodeDOFs(internalIndices);
    
    // Perform static condensation
    const { condensedK, T } = this.staticCondensation(K, boundaryDOFs, internalDOFs);
    
    // Build super element
    const boundaryNodes = boundaryIndices.map(idx => input.nodes[idx]);
    
    const superElement: SuperElement = {
      id: input.id,
      name: input.name || `SuperElement-${input.id}`,
      boundaryNodeIds: input.boundaryNodeIds,
      boundaryNodes,
      condensedK,
      numBoundaryDOFs,
      originalStats: {
        numNodes,
        numMembers: input.members.length,
        numTotalDOFs: numDOFs,
        numInternalDOFs,
        numBoundaryDOFs,
        reductionRatio: 1 - numBoundaryDOFs / numDOFs,
      },
      recovery: {
        T,
        internalNodeIds: internalIndices.map(idx => input.nodes[idx].id),
      },
      createdAt: new Date(),
    };
    
    // Store for later use
    this.superElements.set(input.id, superElement);
    
    const elapsed = performance.now() - startTime;
    console.log(`[SubstructureManager] Created in ${elapsed.toFixed(1)}ms`);
    
    return superElement;
  }

  /**
   * Get a stored super element by ID
   */
  getSuperElement(id: string): SuperElement | undefined {
    return this.superElements.get(id);
  }

  /**
   * Get all stored super elements
   */
  getAllSuperElements(): SuperElement[] {
    return Array.from(this.superElements.values());
  }

  /**
   * Remove a super element
   */
  removeSuperElement(id: string): boolean {
    return this.superElements.delete(id);
  }

  /**
   * Recover internal displacements from boundary displacements
   * 
   * After solving the condensed system, use this to get
   * displacements at internal nodes.
   */
  recoverInternalDisplacements(
    superElement: SuperElement,
    boundaryDisplacements: number[]
  ): number[] {
    if (boundaryDisplacements.length !== superElement.numBoundaryDOFs) {
      throw new Error(
        `Expected ${superElement.numBoundaryDOFs} boundary DOFs, got ${boundaryDisplacements.length}`
      );
    }
    
    const T = superElement.recovery.T;
    const numInternalDOFs = T.length;
    
    // u_internal = T * u_boundary
    const internalDisplacements = new Array(numInternalDOFs).fill(0);
    
    for (let i = 0; i < numInternalDOFs; i++) {
      for (let j = 0; j < superElement.numBoundaryDOFs; j++) {
        internalDisplacements[i] += T[i][j] * boundaryDisplacements[j];
      }
    }
    
    return internalDisplacements;
  }

  /**
   * Get nodal displacements map from displacement arrays
   */
  getNodalDisplacementMaps(
    superElement: SuperElement,
    boundaryDisplacements: number[],
    internalDisplacements: number[]
  ): SuperElementResult {
    const boundaryMap = new Map<string, {
      dx: number; dy: number; dz: number;
      rx: number; ry: number; rz: number;
    }>();
    
    const internalMap = new Map<string, {
      dx: number; dy: number; dz: number;
      rx: number; ry: number; rz: number;
    }>();
    
    // Boundary nodes
    for (let i = 0; i < superElement.boundaryNodeIds.length; i++) {
      const nodeId = superElement.boundaryNodeIds[i];
      const base = i * 6;
      boundaryMap.set(nodeId, {
        dx: boundaryDisplacements[base + 0],
        dy: boundaryDisplacements[base + 1],
        dz: boundaryDisplacements[base + 2],
        rx: boundaryDisplacements[base + 3],
        ry: boundaryDisplacements[base + 4],
        rz: boundaryDisplacements[base + 5],
      });
    }
    
    // Internal nodes
    for (let i = 0; i < superElement.recovery.internalNodeIds.length; i++) {
      const nodeId = superElement.recovery.internalNodeIds[i];
      const base = i * 6;
      internalMap.set(nodeId, {
        dx: internalDisplacements[base + 0],
        dy: internalDisplacements[base + 1],
        dz: internalDisplacements[base + 2],
        rx: internalDisplacements[base + 3],
        ry: internalDisplacements[base + 4],
        rz: internalDisplacements[base + 5],
      });
    }
    
    return {
      superElementId: superElement.id,
      boundaryDisplacements: boundaryMap,
      internalDisplacements: internalMap,
      boundaryForces: new Map(), // TODO: Calculate if needed
    };
  }

  /**
   * Create a super element contribution for global assembly
   * 
   * Returns DOF mapping and stiffness contribution for the global solver.
   */
  getSuperElementContribution(
    superElement: SuperElement,
    globalNodeIndexMap: Map<string, number>
  ): {
    dofMap: number[];
    stiffness: number[][];
  } {
    // Build global DOF mapping for boundary nodes
    const dofMap: number[] = [];
    
    for (const nodeId of superElement.boundaryNodeIds) {
      const nodeIndex = globalNodeIndexMap.get(nodeId);
      if (nodeIndex === undefined) {
        throw new Error(`Boundary node ${nodeId} not found in global model`);
      }
      
      const baseDOF = nodeIndex * 6;
      for (let i = 0; i < 6; i++) {
        dofMap.push(baseDOF + i);
      }
    }
    
    return {
      dofMap,
      stiffness: superElement.condensedK,
    };
  }

  /**
   * Automatically identify boundary nodes
   * 
   * Boundary nodes are those that connect to members outside the selection.
   */
  static identifyBoundaryNodes(
    selectedMemberIds: Set<string>,
    allMembers: SubstructureMember[],
    selectedNodes: SubstructureNode[]
  ): string[] {
    const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
    const boundaryNodeIds = new Set<string>();
    
    // Find nodes that have connections outside the selection
    for (const member of allMembers) {
      const startInSelection = selectedNodeIds.has(member.startNodeId);
      const endInSelection = selectedNodeIds.has(member.endNodeId);
      const memberInSelection = selectedMemberIds.has(member.id);
      
      if (!memberInSelection) {
        // External member - nodes connecting to it are boundary nodes
        if (startInSelection) boundaryNodeIds.add(member.startNodeId);
        if (endInSelection) boundaryNodeIds.add(member.endNodeId);
      }
    }
    
    // If no external connections, use end nodes (e.g., isolated truss)
    if (boundaryNodeIds.size === 0 && selectedNodes.length >= 2) {
      // Use first and last nodes as boundary
      boundaryNodeIds.add(selectedNodes[0].id);
      boundaryNodeIds.add(selectedNodes[selectedNodes.length - 1].id);
    }
    
    return Array.from(boundaryNodeIds);
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Validate input data
   */
  private validateInput(input: CreateSuperElementInput): void {
    if (!input.id) {
      throw new Error('Super element ID is required');
    }
    
    if (!input.nodes || input.nodes.length < 2) {
      throw new Error('At least 2 nodes are required');
    }
    
    if (!input.members || input.members.length < 1) {
      throw new Error('At least 1 member is required');
    }
    
    if (!input.boundaryNodeIds || input.boundaryNodeIds.length < 1) {
      throw new Error('At least 1 boundary node is required');
    }
    
    // Check that boundary nodes exist
    const nodeIds = new Set(input.nodes.map(n => n.id));
    for (const boundaryId of input.boundaryNodeIds) {
      if (!nodeIds.has(boundaryId)) {
        throw new Error(`Boundary node ${boundaryId} not found in nodes`);
      }
    }
    
    // Check for duplicate super element ID
    if (this.superElements.has(input.id)) {
      console.warn(`Super element ${input.id} already exists, will be overwritten`);
    }
  }

  /**
   * Build node index maps separating boundary and internal nodes
   */
  private buildNodeMaps(
    nodes: SubstructureNode[],
    boundaryNodeIds: string[],
    retainedInternalNodeIds?: string[]
  ): {
    nodeMap: Map<string, number>;
    boundaryIndices: number[];
    internalIndices: number[];
  } {
    const boundarySet = new Set(boundaryNodeIds);
    const retainedSet = new Set(retainedInternalNodeIds || []);
    
    const nodeMap = new Map<string, number>();
    const boundaryIndices: number[] = [];
    const internalIndices: number[] = [];
    
    nodes.forEach((node, index) => {
      nodeMap.set(node.id, index);
      
      if (boundarySet.has(node.id) || retainedSet.has(node.id)) {
        boundaryIndices.push(index);
      } else {
        internalIndices.push(index);
      }
    });
    
    return { nodeMap, boundaryIndices, internalIndices };
  }

  /**
   * Get all DOF indices for a set of node indices
   */
  private getNodeDOFs(nodeIndices: number[]): number[] {
    const dofs: number[] = [];
    for (const nodeIdx of nodeIndices) {
      const base = nodeIdx * 6;
      for (let i = 0; i < 6; i++) {
        dofs.push(base + i);
      }
    }
    return dofs;
  }

  /**
   * Assemble the stiffness matrix for the substructure
   */
  private assembleSubstructureStiffness(
    nodes: SubstructureNode[],
    members: SubstructureMember[],
    nodeMap: Map<string, number>
  ): number[][] {
    const numDOFs = nodes.length * 6;
    
    // Initialize zero matrix
    const K: number[][] = Array(numDOFs)
      .fill(null)
      .map(() => Array(numDOFs).fill(0));
    
    // Assemble each member
    for (const member of members) {
      const startIdx = nodeMap.get(member.startNodeId);
      const endIdx = nodeMap.get(member.endNodeId);
      
      if (startIdx === undefined || endIdx === undefined) {
        console.warn(`Member ${member.id}: Node not found, skipping`);
        continue;
      }
      
      const startNode = nodes[startIdx];
      const endNode = nodes[endIdx];
      
      const nodeA: NodeCoord = { x: startNode.x, y: startNode.y, z: startNode.z };
      const nodeB: NodeCoord = { x: endNode.x, y: endNode.y, z: endNode.z };
      
      const L = MatrixUtils.getMemberLength(nodeA, nodeB);
      if (L < 1e-10) {
        console.warn(`Member ${member.id}: Zero length, skipping`);
        continue;
      }
      
      // Get local stiffness matrix
      const kLocal = MatrixUtils.getLocalStiffnessMatrix(
        member.E,
        member.Iy,
        member.Iz,
        member.A,
        L,
        member.G ?? member.E / 2.6,
        member.J ?? member.Iy + member.Iz
      );
      
      // Get transformation matrix
      const R = MatrixUtils.getRotationMatrix(nodeA, nodeB, member.beta ?? 0);
      const T = MatrixUtils.getTransformationMatrix(R);
      
      // Transform to global
      const kGlobal = MatrixUtils.transformToGlobal(kLocal, T);
      const kGlobalArr = kGlobal.toArray() as number[][];
      
      // Get DOF mapping
      const dofMap = this.getMemberDOFMapping(startIdx, endIdx);
      
      // Add to global matrix
      for (let i = 0; i < 12; i++) {
        for (let j = 0; j < 12; j++) {
          K[dofMap[i]][dofMap[j]] += kGlobalArr[i][j];
        }
      }
    }
    
    return K;
  }

  /**
   * Get DOF mapping for a member
   */
  private getMemberDOFMapping(startNodeIdx: number, endNodeIdx: number): number[] {
    const mapping: number[] = [];
    
    // Start node DOFs
    const startBase = startNodeIdx * 6;
    for (let i = 0; i < 6; i++) {
      mapping.push(startBase + i);
    }
    
    // End node DOFs
    const endBase = endNodeIdx * 6;
    for (let i = 0; i < 6; i++) {
      mapping.push(endBase + i);
    }
    
    return mapping;
  }

  /**
   * Perform static condensation
   * 
   * Partitions K into:
   *   | Kii  Kim |
   *   | Kmi  Kmm |
   * 
   * Where i = internal, m = master (boundary)
   * 
   * Condensed stiffness: K* = Kmm - Kmi * inv(Kii) * Kim
   * Transformation: T = -inv(Kii) * Kim
   */
  private staticCondensation(
    K: number[][],
    boundaryDOFs: number[],
    internalDOFs: number[]
  ): {
    condensedK: number[][];
    T: number[][];
  } {
    const ni = internalDOFs.length;  // Number of internal DOFs
    const nm = boundaryDOFs.length;  // Number of master (boundary) DOFs
    
    if (ni === 0) {
      // No internal DOFs - just extract boundary portion
      return {
        condensedK: this.extractSubmatrix(K, boundaryDOFs, boundaryDOFs),
        T: [],
      };
    }
    
    // Extract partitioned matrices
    const Kii = this.extractSubmatrix(K, internalDOFs, internalDOFs);
    const Kim = this.extractSubmatrix(K, internalDOFs, boundaryDOFs);
    const Kmi = this.extractSubmatrix(K, boundaryDOFs, internalDOFs);
    const Kmm = this.extractSubmatrix(K, boundaryDOFs, boundaryDOFs);
    
    // Convert to mathjs matrices for inversion
    const Kii_mat = math.matrix(Kii);
    const Kim_mat = math.matrix(Kim);
    const Kmi_mat = math.matrix(Kmi);
    const Kmm_mat = math.matrix(Kmm);
    
    // Check conditioning of Kii
    this.checkConditioning(Kii, 'Internal stiffness matrix');
    
    // Compute inv(Kii)
    let Kii_inv: Matrix;
    try {
      Kii_inv = math.inv(Kii_mat) as Matrix;
    } catch (error) {
      throw new Error(
        `Failed to invert internal stiffness matrix. ` +
        `The substructure may be unstable or have zero stiffness in some directions. ` +
        `Try adding more boundary nodes or checking member connectivity.`
      );
    }
    
    // Compute T = -inv(Kii) * Kim
    const T_mat = math.multiply(math.multiply(-1, Kii_inv), Kim_mat) as Matrix;
    
    // Compute K* = Kmm - Kmi * inv(Kii) * Kim
    const Kmi_Kii_inv = math.multiply(Kmi_mat, Kii_inv) as Matrix;
    const Kmi_Kii_inv_Kim = math.multiply(Kmi_Kii_inv, Kim_mat) as Matrix;
    const K_condensed = math.subtract(Kmm_mat, Kmi_Kii_inv_Kim) as Matrix;
    
    // Convert back to arrays
    const condensedK = K_condensed.toArray() as number[][];
    const T = T_mat.toArray() as number[][];
    
    // Verify symmetry of condensed matrix
    this.verifySymmetry(condensedK, 'Condensed stiffness matrix');
    
    return { condensedK, T };
  }

  /**
   * Extract a submatrix given row and column indices
   */
  private extractSubmatrix(
    matrix: number[][],
    rowIndices: number[],
    colIndices: number[]
  ): number[][] {
    const result: number[][] = Array(rowIndices.length)
      .fill(null)
      .map(() => Array(colIndices.length).fill(0));
    
    for (let i = 0; i < rowIndices.length; i++) {
      for (let j = 0; j < colIndices.length; j++) {
        result[i][j] = matrix[rowIndices[i]][colIndices[j]];
      }
    }
    
    return result;
  }

  /**
   * Check matrix conditioning
   */
  private checkConditioning(matrix: number[][], name: string): void {
    // Simple check: look for very small diagonal elements
    const n = matrix.length;
    let minDiag = Infinity;
    let maxDiag = 0;
    
    for (let i = 0; i < n; i++) {
      const diag = Math.abs(matrix[i][i]);
      minDiag = Math.min(minDiag, diag);
      maxDiag = Math.max(maxDiag, diag);
    }
    
    if (minDiag < this.config.conditioningTolerance) {
      console.warn(
        `[SubstructureManager] ${name} has very small diagonal (${minDiag.toExponential(2)}). ` +
        `May be ill-conditioned.`
      );
    }
    
    if (maxDiag > 0 && minDiag / maxDiag < 1e-12) {
      console.warn(
        `[SubstructureManager] ${name} may be poorly conditioned. ` +
        `Diagonal ratio: ${(minDiag / maxDiag).toExponential(2)}`
      );
    }
  }

  /**
   * Verify matrix symmetry
   */
  private verifySymmetry(matrix: number[][], name: string): void {
    const n = matrix.length;
    let maxAsymmetry = 0;
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const diff = Math.abs(matrix[i][j] - matrix[j][i]);
        const avg = (Math.abs(matrix[i][j]) + Math.abs(matrix[j][i])) / 2;
        if (avg > 1e-15) {
          maxAsymmetry = Math.max(maxAsymmetry, diff / avg);
        }
      }
    }
    
    if (maxAsymmetry > 1e-10) {
      console.warn(
        `[SubstructureManager] ${name} has asymmetry: ${(maxAsymmetry * 100).toFixed(4)}%`
      );
    }
  }

  /**
   * Clear all stored super elements
   */
  clear(): void {
    this.superElements.clear();
  }

  /**
   * Get statistics about stored super elements
   */
  getStats(): {
    count: number;
    totalOriginalDOFs: number;
    totalCondensedDOFs: number;
    averageReduction: number;
  } {
    const elements = Array.from(this.superElements.values());
    
    if (elements.length === 0) {
      return {
        count: 0,
        totalOriginalDOFs: 0,
        totalCondensedDOFs: 0,
        averageReduction: 0,
      };
    }
    
    const totalOriginalDOFs = elements.reduce(
      (sum, el) => sum + el.originalStats.numTotalDOFs, 0
    );
    const totalCondensedDOFs = elements.reduce(
      (sum, el) => sum + el.originalStats.numBoundaryDOFs, 0
    );
    const averageReduction = elements.reduce(
      (sum, el) => sum + el.originalStats.reductionRatio, 0
    ) / elements.length;
    
    return {
      count: elements.length,
      totalOriginalDOFs,
      totalCondensedDOFs,
      averageReduction,
    };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new SubstructureManager instance
 */
export function createSubstructureManager(
  config?: SubstructureConfig
): SubstructureManager {
  return new SubstructureManager(config);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Merge multiple super elements into one
 * 
 * Useful when combining multiple condensed substructures.
 */
export function mergeSuperElements(
  elements: SuperElement[],
  newId: string,
  newName?: string
): SuperElement {
  if (elements.length === 0) {
    throw new Error('No elements to merge');
  }
  
  if (elements.length === 1) {
    return { ...elements[0], id: newId, name: newName || elements[0].name };
  }
  
  // Collect all boundary nodes (removing duplicates)
  const boundaryNodeMap = new Map<string, SubstructureNode>();
  const allBoundaryNodeIds: string[] = [];
  
  for (const el of elements) {
    for (let i = 0; i < el.boundaryNodeIds.length; i++) {
      const nodeId = el.boundaryNodeIds[i];
      if (!boundaryNodeMap.has(nodeId)) {
        boundaryNodeMap.set(nodeId, el.boundaryNodes[i]);
        allBoundaryNodeIds.push(nodeId);
      }
    }
  }
  
  const numBoundaryDOFs = allBoundaryNodeIds.length * 6;
  
  // Build merged condensed stiffness matrix
  const mergedK: number[][] = Array(numBoundaryDOFs)
    .fill(null)
    .map(() => Array(numBoundaryDOFs).fill(0));
  
  // Create node index map for merged element
  const nodeIndexMap = new Map<string, number>();
  allBoundaryNodeIds.forEach((id, idx) => nodeIndexMap.set(id, idx));
  
  // Add contributions from each element
  for (const el of elements) {
    for (let i = 0; i < el.boundaryNodeIds.length; i++) {
      const nodeI = el.boundaryNodeIds[i];
      const globalI = nodeIndexMap.get(nodeI)!;
      
      for (let j = 0; j < el.boundaryNodeIds.length; j++) {
        const nodeJ = el.boundaryNodeIds[j];
        const globalJ = nodeIndexMap.get(nodeJ)!;
        
        // Copy 6x6 block
        for (let di = 0; di < 6; di++) {
          for (let dj = 0; dj < 6; dj++) {
            const localI = i * 6 + di;
            const localJ = j * 6 + dj;
            const mergedI = globalI * 6 + di;
            const mergedJ = globalJ * 6 + dj;
            
            mergedK[mergedI][mergedJ] += el.condensedK[localI][localJ];
          }
        }
      }
    }
  }
  
  // Collect stats
  const totalOriginalDOFs = elements.reduce(
    (sum, el) => sum + el.originalStats.numTotalDOFs, 0
  );
  const totalMembers = elements.reduce(
    (sum, el) => sum + el.originalStats.numMembers, 0
  );
  const totalNodes = elements.reduce(
    (sum, el) => sum + el.originalStats.numNodes, 0
  );
  
  return {
    id: newId,
    name: newName || `Merged-${newId}`,
    boundaryNodeIds: allBoundaryNodeIds,
    boundaryNodes: allBoundaryNodeIds.map(id => boundaryNodeMap.get(id)!),
    condensedK: mergedK,
    numBoundaryDOFs,
    originalStats: {
      numNodes: totalNodes,
      numMembers: totalMembers,
      numTotalDOFs: totalOriginalDOFs,
      numInternalDOFs: totalOriginalDOFs - numBoundaryDOFs,
      numBoundaryDOFs,
      reductionRatio: 1 - numBoundaryDOFs / totalOriginalDOFs,
    },
    recovery: {
      T: [], // Cannot recover individual internal displacements after merge
      internalNodeIds: [],
    },
    createdAt: new Date(),
  };
}

/**
 * Serialize a super element for storage/transmission
 */
export function serializeSuperElement(element: SuperElement): string {
  return JSON.stringify({
    ...element,
    createdAt: element.createdAt.toISOString(),
  });
}

/**
 * Deserialize a super element
 */
export function deserializeSuperElement(json: string): SuperElement {
  const data = JSON.parse(json);
  return {
    ...data,
    createdAt: new Date(data.createdAt),
  };
}
