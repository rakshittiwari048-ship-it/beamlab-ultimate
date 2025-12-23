/**
 * math/index.ts
 * 
 * Sparse matrix and iterative solver exports
 */

// Sparse Matrix
export {
  SparseMatrixBuilder,
  csrMatVec,
  csrGetDiagonal,
  csrGet,
  csrExtractSubmatrix,
  csrPrintInfo,
  type CSRMatrix,
  type SparseStats,
} from './SparseMatrix';

// Iterative Solvers
export {
  conjugateGradient,
  conjugateGradientWithFallback,
  biCGSTAB,
  type CGOptions,
  type CGResult,
} from './ConjugateGradient';

// Sparse Structural Solver
export {
  SparseSolver,
  createSparseSolver,
  type SparseSolverConfig,
  type SparseSolverResult,
} from './SparseSolver';
