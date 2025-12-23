/**
 * SparseSolver.ts
 * 
 * High-performance structural solver using sparse matrices and iterative methods.
 * Automatically chooses between dense and sparse solvers based on problem size.
 * 
 * Benefits over dense solver:
 * - Memory: O(nnz) vs O(n²) - huge savings for sparse systems
 * - Speed: O(nnz × iterations) vs O(n³) for direct methods
 * - Scalability: Can solve 10,000+ DOF systems easily
 */

import * as math from 'mathjs';
import type { Matrix } from 'mathjs';
import { MatrixUtils, type NodeCoord } from '../MatrixUtils';
import type { SolverNode, SolverMember, SolverSupport, SolverConfig, NodalLoad, SolverResult } from '../Solver';
import { SparseMatrixBuilder, csrExtractSubmatrix, csrMatVec, csrPrintInfo, type CSRMatrix } from './SparseMatrix';
import { conjugateGradient, type CGOptions, type CGResult } from './ConjugateGradient';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Threshold for choosing sparse vs dense solver
 * Sparse becomes beneficial around 100+ nodes (600+ DOFs)
 */
const SPARSE_THRESHOLD_DOFS = 300;

/**
 * SparseSolver configuration
 */
export interface SparseSolverConfig extends SolverConfig {
  /** Force sparse solver even for small problems */
  forceSparse?: boolean;
  /** Force dense solver even for large problems */
  forceDense?: boolean;
  /** CG solver options */
  cgOptions?: CGOptions;
}

/**
 * Extended solver result with performance info
 */
export interface SparseSolverResult extends SolverResult {
  /** Solver type used */
  solverType: 'sparse-cg' | 'dense-lu';
  /** Time spent in each phase (ms) */
  timing: {
    assembly: number;
    solve: number;
    total: number;
  };
  /** CG convergence info (if sparse solver used) */
  cgInfo?: {
    iterations: number;
    residualNorm: number;
    converged: boolean;
  };
  /** Matrix statistics */
  matrixStats?: {
    size: number;
    nnz: number;
    density: number;
    memorySavedMB: number;
  };
}

// ============================================================================
// SPARSE SOLVER CLASS
// ============================================================================

/**
 * Sparse Matrix Structural Solver
 * 
 * Uses Dictionary of Keys (DOK) for efficient assembly,
 * converts to CSR for fast matrix-vector products,
 * and solves using Preconditioned Conjugate Gradient.
 */
export class SparseSolver {
  private nodes: Map<string, SolverNode>;
  private nodeIndexMap: Map<string, number>;
  private members: SolverMember[];
  private supports: Map<string, SolverSupport>;
  
  private numNodes: number;
  private numDOFs: number;
  
  // Sparse matrix storage
  private sparseK: SparseMatrixBuilder | null = null;
  private csrK: CSRMatrix | null = null;
  private isAssembled: boolean = false;
  
  // Configuration
  private forceSparse: boolean;
  private forceDense: boolean;
  private cgOptions: CGOptions;
  
  constructor(config: SparseSolverConfig) {
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
    
    // Configuration
    this.forceSparse = config.forceSparse ?? false;
    this.forceDense = config.forceDense ?? false;
    this.cgOptions = config.cgOptions ?? {};
  }
  
  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================
  
  /**
   * Assemble the global stiffness matrix in sparse format
   * 
   * Uses Dictionary of Keys (DOK) for efficient incremental assembly,
   * then converts to CSR for computation.
   */
  assembleSparse(): CSRMatrix {
    if (this.isAssembled && this.csrK) {
      return this.csrK;
    }
    
    // Initialize sparse builder
    this.sparseK = new SparseMatrixBuilder(this.numDOFs);
    
    // Loop through all members
    for (const member of this.members) {
      const startNode = this.nodes.get(member.startNodeId);
      const endNode = this.nodes.get(member.endNodeId);
      
      if (!startNode || !endNode) {
        console.warn(`Member ${member.id}: Missing node(s), skipping`);
        continue;
      }
      
      const nodeA: NodeCoord = { x: startNode.x, y: startNode.y, z: startNode.z };
      const nodeB: NodeCoord = { x: endNode.x, y: endNode.y, z: endNode.z };
      
      const L = MatrixUtils.getMemberLength(nodeA, nodeB);
      
      if (L < 1e-10) {
        console.warn(`Member ${member.id}: Zero length, skipping`);
        continue;
      }
      
      // Calculate local stiffness matrix (12x12)
      const kLocal = MatrixUtils.getLocalStiffnessMatrix(
        member.E,
        member.Iy,
        member.Iz,
        member.A,
        L,
        member.G,
        member.J
      );
      
      // Calculate transformation matrix (12x12)
      const R = MatrixUtils.getRotationMatrix(nodeA, nodeB, member.beta ?? 0);
      const T = MatrixUtils.getTransformationMatrix(R);
      
      // Transform to global: k_global = T^T * k_local * T
      const kGlobal = MatrixUtils.transformToGlobal(kLocal, T);
      const kGlobalArr = kGlobal.toArray() as number[][];
      
      // Get global DOF mapping
      const startNodeIndex = this.nodeIndexMap.get(member.startNodeId)!;
      const endNodeIndex = this.nodeIndexMap.get(member.endNodeId)!;
      const dofMap = this.getMemberDOFMapping(startNodeIndex, endNodeIndex);
      
      // Add to sparse matrix using optimized submatrix addition
      this.sparseK.addSubmatrix(kGlobalArr, dofMap);
    }
    
    // Convert to CSR for computation
    this.csrK = this.sparseK.toCSR();
    this.isAssembled = true;
    
    return this.csrK;
  }
  
  /**
   * Solve the structural system using appropriate solver
   * 
   * Automatically chooses between:
   * - Sparse CG: For large systems (faster, less memory)
   * - Dense LU: For small systems (more robust for ill-conditioned)
   */
  solve(loads: NodalLoad[], supports?: SolverSupport[]): SparseSolverResult {
    const startTotal = performance.now();
    
    // Assemble matrix
    const startAssembly = performance.now();
    this.assembleSparse();
    const assemblyTime = performance.now() - startAssembly;
    
    // Build force vector
    const F = this.buildForceVector(loads);
    
    // Get active supports
    const activeSupports = supports 
      ? this.buildSupportMap(supports) 
      : this.supports;
    
    // Identify DOFs
    const { freeDOFs, constrainedDOFs } = this.identifyConstrainedDOFs(activeSupports);
    
    if (freeDOFs.length === 0) {
      throw new Error('No free DOFs - structure is fully constrained');
    }
    
    // Choose solver based on problem size
    const useSparse = this.shouldUseSparse(freeDOFs.length);
    
    let u: number[];
    let solverType: 'sparse-cg' | 'dense-lu';
    let cgInfo: SparseSolverResult['cgInfo'];
    let matrixStats: SparseSolverResult['matrixStats'];
    
    const startSolve = performance.now();
    
    if (useSparse) {
      // Extract reduced CSR matrix for free DOFs
      const K_reduced = csrExtractSubmatrix(this.csrK!, freeDOFs, freeDOFs);
      const F_reduced = new Float64Array(freeDOFs.map(dof => F[dof]));
      
      // Log matrix info
      csrPrintInfo(K_reduced, 'Reduced Stiffness Matrix');
      
      // Solve with Conjugate Gradient
      const cgResult = conjugateGradient(K_reduced, F_reduced, {
        tolerance: 1e-8,
        maxIterations: freeDOFs.length * 3,
        usePreconditioner: true,
        ...this.cgOptions,
      });
      
      if (!cgResult.converged) {
        console.warn(`CG did not converge after ${cgResult.iterations} iterations, residual: ${cgResult.residualNorm}`);
        // Could fall back to dense solver here if needed
      }
      
      // Expand solution to full DOF vector
      u = Array(this.numDOFs).fill(0);
      for (let i = 0; i < freeDOFs.length; i++) {
        u[freeDOFs[i]] = cgResult.x[i];
      }
      
      solverType = 'sparse-cg';
      cgInfo = {
        iterations: cgResult.iterations,
        residualNorm: cgResult.residualNorm,
        converged: cgResult.converged,
      };
      
      const stats = this.sparseK!.getStats();
      matrixStats = {
        size: this.numDOFs,
        nnz: stats.nnz,
        density: stats.density,
        memorySavedMB: (stats.denseMemoryBytes - stats.memoryBytes) / (1024 * 1024),
      };
      
    } else {
      // Use dense solver for small systems
      const K = this.csrToDense(this.csrK!);
      
      // Extract reduced matrices
      const K_reduced: number[][] = Array(freeDOFs.length)
        .fill(null)
        .map(() => Array(freeDOFs.length).fill(0));
      
      for (let i = 0; i < freeDOFs.length; i++) {
        for (let j = 0; j < freeDOFs.length; j++) {
          K_reduced[i][j] = K[freeDOFs[i]][freeDOFs[j]];
        }
      }
      
      const F_reduced = freeDOFs.map(dof => F[dof]);
      
      // Solve with LU decomposition
      const K_matrix = math.matrix(K_reduced);
      const F_matrix = math.matrix(F_reduced);
      const u_reduced = math.lusolve(K_matrix, F_matrix) as Matrix;
      const u_arr = (u_reduced.toArray() as number[][]).flat();
      
      // Expand solution
      u = Array(this.numDOFs).fill(0);
      for (let i = 0; i < freeDOFs.length; i++) {
        u[freeDOFs[i]] = u_arr[i];
      }
      
      solverType = 'dense-lu';
    }
    
    const solveTime = performance.now() - startSolve;
    
    // Calculate reactions
    const reactions = this.calculateReactions(u, constrainedDOFs, freeDOFs);
    
    // Build result maps
    const nodalDisplacements = this.buildNodalDisplacements(u);
    const nodalReactions = this.buildNodalReactions(reactions);
    
    const totalTime = performance.now() - startTotal;
    
    return {
      displacements: u,
      reactions,
      nodalDisplacements,
      nodalReactions,
      solverType,
      timing: {
        assembly: assemblyTime,
        solve: solveTime,
        total: totalTime,
      },
      cgInfo,
      matrixStats,
    };
  }
  
  /**
   * Get matrix statistics
   */
  getMatrixStats() {
    if (!this.sparseK) {
      this.assembleSparse();
    }
    return this.sparseK!.getStats();
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  private shouldUseSparse(freeDOFs: number): boolean {
    if (this.forceDense) return false;
    if (this.forceSparse) return true;
    return freeDOFs >= SPARSE_THRESHOLD_DOFS;
  }
  
  private getMemberDOFMapping(startNodeIndex: number, endNodeIndex: number): number[] {
    const dofMap: number[] = [];
    
    // Start node DOFs (0-5)
    for (let i = 0; i < 6; i++) {
      dofMap.push(startNodeIndex * 6 + i);
    }
    
    // End node DOFs (6-11)
    for (let i = 0; i < 6; i++) {
      dofMap.push(endNodeIndex * 6 + i);
    }
    
    return dofMap;
  }
  
  private buildForceVector(loads: NodalLoad[]): number[] {
    const F = Array(this.numDOFs).fill(0);
    
    for (const load of loads) {
      const nodeIndex = this.nodeIndexMap.get(load.nodeId);
      if (nodeIndex === undefined) {
        console.warn(`Load at node ${load.nodeId}: Node not found`);
        continue;
      }
      
      const baseIdx = nodeIndex * 6;
      F[baseIdx + 0] = load.fx ?? 0;
      F[baseIdx + 1] = load.fy ?? 0;
      F[baseIdx + 2] = load.fz ?? 0;
      F[baseIdx + 3] = load.mx ?? 0;
      F[baseIdx + 4] = load.my ?? 0;
      F[baseIdx + 5] = load.mz ?? 0;
    }
    
    return F;
  }
  
  private buildSupportMap(supports: SolverSupport[]): Map<string, SolverSupport> {
    const map = new Map<string, SolverSupport>();
    for (const support of supports) {
      map.set(support.nodeId, support);
    }
    return map;
  }
  
  private identifyConstrainedDOFs(supports: Map<string, SolverSupport>): {
    freeDOFs: number[];
    constrainedDOFs: number[];
  } {
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
  
  private calculateReactions(
    u: number[],
    constrainedDOFs: number[],
    freeDOFs: number[]
  ): number[] {
    const reactions = Array(this.numDOFs).fill(0);
    
    if (constrainedDOFs.length === 0 || !this.csrK) {
      return reactions;
    }
    
    // R = K * u (for constrained rows)
    const Ku = csrMatVec(this.csrK, new Float64Array(u));
    
    for (const dof of constrainedDOFs) {
      reactions[dof] = Ku[dof];
    }
    
    return reactions;
  }
  
  private csrToDense(csr: CSRMatrix): number[][] {
    const dense: number[][] = Array(csr.rows)
      .fill(null)
      .map(() => Array(csr.cols).fill(0));
    
    for (let i = 0; i < csr.rows; i++) {
      const rowStart = csr.rowPtrs[i];
      const rowEnd = csr.rowPtrs[i + 1];
      
      for (let j = rowStart; j < rowEnd; j++) {
        dense[i][csr.colIndices[j]] = csr.values[j];
      }
    }
    
    return dense;
  }
  
  private buildNodalDisplacements(u: number[]): Map<string, {
    dx: number;
    dy: number;
    dz: number;
    rx: number;
    ry: number;
    rz: number;
  }> {
    const result = new Map();
    
    for (const [nodeId, _] of this.nodes) {
      const nodeIndex = this.nodeIndexMap.get(nodeId)!;
      const baseIdx = nodeIndex * 6;
      
      result.set(nodeId, {
        dx: u[baseIdx + 0],
        dy: u[baseIdx + 1],
        dz: u[baseIdx + 2],
        rx: u[baseIdx + 3],
        ry: u[baseIdx + 4],
        rz: u[baseIdx + 5],
      });
    }
    
    return result;
  }
  
  private buildNodalReactions(reactions: number[]): Map<string, {
    fx: number;
    fy: number;
    fz: number;
    mx: number;
    my: number;
    mz: number;
  }> {
    const result = new Map();
    
    for (const [nodeId, support] of this.supports) {
      const nodeIndex = this.nodeIndexMap.get(nodeId);
      if (nodeIndex === undefined) continue;
      
      const baseIdx = nodeIndex * 6;
      
      // Only include reactions where DOF is constrained
      result.set(nodeId, {
        fx: support.dx ? reactions[baseIdx + 0] : 0,
        fy: support.dy ? reactions[baseIdx + 1] : 0,
        fz: support.dz ? reactions[baseIdx + 2] : 0,
        mx: support.rx ? reactions[baseIdx + 3] : 0,
        my: support.ry ? reactions[baseIdx + 4] : 0,
        mz: support.rz ? reactions[baseIdx + 5] : 0,
      });
    }
    
    return result;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create an appropriate solver based on problem size
 * 
 * @param config Solver configuration
 * @returns SparseSolver instance
 */
export function createSparseSolver(config: SparseSolverConfig): SparseSolver {
  return new SparseSolver(config);
}
