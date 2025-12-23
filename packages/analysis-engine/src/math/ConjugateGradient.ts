/**
 * ConjugateGradient.ts
 * 
 * Iterative solver for sparse symmetric positive-definite systems.
 * Much faster than direct methods for large sparse matrices.
 * 
 * Solves: A * x = b
 * Where A is symmetric and positive-definite (e.g., stiffness matrix)
 */

import type { CSRMatrix } from './SparseMatrix';
import { csrMatVec, csrGetDiagonal } from './SparseMatrix';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Solver options
 */
export interface CGOptions {
  /** Maximum iterations (default: 2 * matrix size) */
  maxIterations?: number;
  /** Convergence tolerance (default: 1e-6) */
  tolerance?: number;
  /** Use Jacobi preconditioner (default: true) */
  usePreconditioner?: boolean;
  /** Initial guess for x (default: zero vector) */
  initialGuess?: Float64Array | number[];
  /** Callback for iteration progress */
  onProgress?: (iteration: number, residualNorm: number) => void;
}

/**
 * Solver result
 */
export interface CGResult {
  /** Solution vector x */
  x: Float64Array;
  /** Final residual norm ||b - Ax|| */
  residualNorm: number;
  /** Number of iterations used */
  iterations: number;
  /** Whether solver converged */
  converged: boolean;
  /** Time taken in milliseconds */
  timeMs: number;
}

// ============================================================================
// VECTOR OPERATIONS (optimized for Float64Array)
// ============================================================================

/**
 * Dot product of two vectors
 */
function dot(a: Float64Array, b: Float64Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Vector norm (L2)
 */
function norm(v: Float64Array): number {
  return Math.sqrt(dot(v, v));
}

/**
 * Vector addition: result = a + scalar * b
 */
function axpy(a: Float64Array, scalar: number, b: Float64Array, result: Float64Array): void {
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] + scalar * b[i];
  }
}

/**
 * Vector copy
 */
function copy(src: Float64Array, dst: Float64Array): void {
  dst.set(src);
}

/**
 * Element-wise division: result = a ./ b (for preconditioner)
 */
function elementDivide(a: Float64Array, b: Float64Array, result: Float64Array): void {
  for (let i = 0; i < a.length; i++) {
    result[i] = b[i] !== 0 ? a[i] / b[i] : a[i];
  }
}

// ============================================================================
// CONJUGATE GRADIENT SOLVER
// ============================================================================

/**
 * Preconditioned Conjugate Gradient Solver
 * 
 * Algorithm (Jacobi-preconditioned):
 * 1. r₀ = b - A*x₀
 * 2. z₀ = M⁻¹*r₀ (M = diag(A) for Jacobi)
 * 3. p₀ = z₀
 * 4. For k = 0, 1, 2, ...
 *    a. αₖ = (rₖᵀzₖ) / (pₖᵀApₖ)
 *    b. xₖ₊₁ = xₖ + αₖpₖ
 *    c. rₖ₊₁ = rₖ - αₖApₖ
 *    d. Check convergence: ||rₖ₊₁|| < tol
 *    e. zₖ₊₁ = M⁻¹*rₖ₊₁
 *    f. βₖ = (rₖ₊₁ᵀzₖ₊₁) / (rₖᵀzₖ)
 *    g. pₖ₊₁ = zₖ₊₁ + βₖpₖ
 * 
 * @param A Sparse matrix in CSR format (must be symmetric positive-definite)
 * @param b Right-hand side vector
 * @param options Solver options
 * @returns Solution and convergence info
 */
export function conjugateGradient(
  A: CSRMatrix,
  b: Float64Array | number[],
  options: CGOptions = {}
): CGResult {
  const startTime = performance.now();
  
  const n = A.rows;
  const maxIter = options.maxIterations ?? n * 2;
  const tol = options.tolerance ?? 1e-6;
  const usePrecond = options.usePreconditioner ?? true;
  
  // Convert b to Float64Array if needed
  const bArr = b instanceof Float64Array ? b : new Float64Array(b);
  
  // Validate dimensions
  if (A.rows !== A.cols) {
    throw new Error('Matrix must be square');
  }
  if (bArr.length !== n) {
    throw new Error(`Vector b length (${bArr.length}) must match matrix size (${n})`);
  }
  
  // Check for zero RHS (trivial solution)
  const bNorm = norm(bArr);
  if (bNorm < 1e-15) {
    return {
      x: new Float64Array(n),
      residualNorm: 0,
      iterations: 0,
      converged: true,
      timeMs: performance.now() - startTime,
    };
  }
  
  // Initialize solution vector x
  const x = new Float64Array(n);
  if (options.initialGuess) {
    const guess = options.initialGuess;
    for (let i = 0; i < n; i++) {
      x[i] = guess[i] ?? 0;
    }
  }
  
  // Get preconditioner (diagonal of A for Jacobi)
  const M = usePrecond ? csrGetDiagonal(A) : null;
  
  // Ensure no zero diagonal entries (would cause division by zero)
  if (M) {
    for (let i = 0; i < n; i++) {
      if (Math.abs(M[i]) < 1e-15) {
        M[i] = 1; // Fallback to identity for zero diagonals
      }
    }
  }
  
  // Allocate work vectors
  const r = new Float64Array(n);   // Residual
  const z = new Float64Array(n);   // Preconditioned residual
  const p = new Float64Array(n);   // Search direction
  const Ap = new Float64Array(n);  // A * p
  const temp = new Float64Array(n);
  
  // r₀ = b - A*x₀
  const Ax0 = csrMatVec(A, x);
  for (let i = 0; i < n; i++) {
    r[i] = bArr[i] - Ax0[i];
  }
  
  // z₀ = M⁻¹*r₀
  if (M) {
    elementDivide(r, M, z);
  } else {
    copy(r, z);
  }
  
  // p₀ = z₀
  copy(z, p);
  
  // rᵀz for first iteration
  let rz = dot(r, z);
  let residualNorm = norm(r);
  
  // Relative tolerance based on initial residual
  const relativeTol = tol * bNorm;
  
  let iteration = 0;
  let converged = false;
  
  // CG iteration loop
  while (iteration < maxIter) {
    // Check convergence
    if (residualNorm < relativeTol) {
      converged = true;
      break;
    }
    
    // Progress callback
    if (options.onProgress) {
      options.onProgress(iteration, residualNorm);
    }
    
    // Ap = A * p
    const ApResult = csrMatVec(A, p);
    copy(ApResult, Ap);
    
    // αₖ = (rᵀz) / (pᵀAp)
    const pAp = dot(p, Ap);
    
    if (Math.abs(pAp) < 1e-15) {
      // Matrix may not be positive definite or is singular
      console.warn('CG: pᵀAp near zero, matrix may be indefinite');
      break;
    }
    
    const alpha = rz / pAp;
    
    // xₖ₊₁ = xₖ + αₖpₖ
    axpy(x, alpha, p, x);
    
    // rₖ₊₁ = rₖ - αₖApₖ
    axpy(r, -alpha, Ap, r);
    
    // Update residual norm
    residualNorm = norm(r);
    
    // zₖ₊₁ = M⁻¹*rₖ₊₁
    if (M) {
      elementDivide(r, M, z);
    } else {
      copy(r, z);
    }
    
    // βₖ = (rₖ₊₁ᵀzₖ₊₁) / (rₖᵀzₖ)
    const rzNew = dot(r, z);
    const beta = rzNew / rz;
    rz = rzNew;
    
    // pₖ₊₁ = zₖ₊₁ + βₖpₖ
    axpy(z, beta, p, p);
    
    iteration++;
  }
  
  const timeMs = performance.now() - startTime;
  
  return {
    x,
    residualNorm,
    iterations: iteration,
    converged,
    timeMs,
  };
}

/**
 * Conjugate Gradient with fallback to dense solver
 * 
 * Tries CG first, falls back to dense LU if it fails.
 * Useful when matrix properties are unknown.
 */
export function conjugateGradientWithFallback(
  A: CSRMatrix,
  b: Float64Array | number[],
  options: CGOptions = {},
  denseSolver?: (A: number[][], b: number[]) => number[]
): CGResult {
  // Try CG first
  const result = conjugateGradient(A, b, options);
  
  if (result.converged) {
    return result;
  }
  
  // If CG didn't converge and we have a fallback, use it
  if (denseSolver) {
    console.warn('CG did not converge, falling back to dense solver');
    
    const startTime = performance.now();
    
    // Convert sparse to dense (only for small matrices!)
    if (A.rows > 1000) {
      console.warn('Matrix too large for dense fallback');
      return result;
    }
    
    const denseA: number[][] = Array(A.rows)
      .fill(null)
      .map(() => Array(A.cols).fill(0));
    
    for (let i = 0; i < A.rows; i++) {
      const rowStart = A.rowPtrs[i];
      const rowEnd = A.rowPtrs[i + 1];
      
      for (let j = rowStart; j < rowEnd; j++) {
        denseA[i][A.colIndices[j]] = A.values[j];
      }
    }
    
    const bArr = b instanceof Float64Array ? Array.from(b) : b;
    const x = denseSolver(denseA, bArr as number[]);
    
    return {
      x: new Float64Array(x),
      residualNorm: 0,
      iterations: 0,
      converged: true,
      timeMs: performance.now() - startTime,
    };
  }
  
  return result;
}

// ============================================================================
// BICGSTAB (for non-symmetric matrices)
// ============================================================================

/**
 * BiCGSTAB solver for non-symmetric systems
 * 
 * Use this if the matrix is not symmetric (e.g., unsymmetric formulations).
 * For symmetric positive-definite matrices, CG is faster.
 */
export function biCGSTAB(
  A: CSRMatrix,
  b: Float64Array | number[],
  options: CGOptions = {}
): CGResult {
  const startTime = performance.now();
  
  const n = A.rows;
  const maxIter = options.maxIterations ?? n * 2;
  const tol = options.tolerance ?? 1e-6;
  
  const bArr = b instanceof Float64Array ? b : new Float64Array(b);
  const bNorm = norm(bArr);
  
  if (bNorm < 1e-15) {
    return {
      x: new Float64Array(n),
      residualNorm: 0,
      iterations: 0,
      converged: true,
      timeMs: performance.now() - startTime,
    };
  }
  
  // Initialize
  const x = new Float64Array(n);
  if (options.initialGuess) {
    x.set(options.initialGuess instanceof Float64Array 
      ? options.initialGuess 
      : new Float64Array(options.initialGuess));
  }
  
  // r₀ = b - A*x₀
  const r = new Float64Array(n);
  const Ax0 = csrMatVec(A, x);
  for (let i = 0; i < n; i++) {
    r[i] = bArr[i] - Ax0[i];
  }
  
  // r̂₀ = r₀ (arbitrary, but r₀ is a good choice)
  const rHat = new Float64Array(n);
  rHat.set(r);
  
  let rho = 1, alpha = 1, omega = 1;
  
  const v = new Float64Array(n);
  const p = new Float64Array(n);
  const s = new Float64Array(n);
  const t = new Float64Array(n);
  
  let residualNorm = norm(r);
  let iteration = 0;
  let converged = false;
  
  const relativeTol = tol * bNorm;
  
  while (iteration < maxIter) {
    if (residualNorm < relativeTol) {
      converged = true;
      break;
    }
    
    const rhoNew = dot(rHat, r);
    
    if (Math.abs(rhoNew) < 1e-15) {
      // Breakdown - restart with new rHat
      console.warn('BiCGSTAB: rho breakdown');
      break;
    }
    
    const beta = (rhoNew / rho) * (alpha / omega);
    rho = rhoNew;
    
    // p = r + β(p - ωv)
    for (let i = 0; i < n; i++) {
      p[i] = r[i] + beta * (p[i] - omega * v[i]);
    }
    
    // v = A*p
    const Ap = csrMatVec(A, p);
    v.set(Ap);
    
    // α = ρ / (r̂ᵀv)
    const rHatV = dot(rHat, v);
    if (Math.abs(rHatV) < 1e-15) {
      console.warn('BiCGSTAB: rHatV breakdown');
      break;
    }
    alpha = rho / rHatV;
    
    // s = r - αv
    for (let i = 0; i < n; i++) {
      s[i] = r[i] - alpha * v[i];
    }
    
    // Check if s is small enough
    if (norm(s) < relativeTol) {
      // x = x + αp
      for (let i = 0; i < n; i++) {
        x[i] += alpha * p[i];
      }
      residualNorm = norm(s);
      converged = true;
      break;
    }
    
    // t = A*s
    const As = csrMatVec(A, s);
    t.set(As);
    
    // ω = (tᵀs) / (tᵀt)
    const tDotT = dot(t, t);
    if (Math.abs(tDotT) < 1e-15) {
      console.warn('BiCGSTAB: tDotT breakdown');
      break;
    }
    omega = dot(t, s) / tDotT;
    
    // x = x + αp + ωs
    for (let i = 0; i < n; i++) {
      x[i] += alpha * p[i] + omega * s[i];
    }
    
    // r = s - ωt
    for (let i = 0; i < n; i++) {
      r[i] = s[i] - omega * t[i];
    }
    
    residualNorm = norm(r);
    iteration++;
    
    if (options.onProgress) {
      options.onProgress(iteration, residualNorm);
    }
  }
  
  return {
    x,
    residualNorm,
    iterations: iteration,
    converged,
    timeMs: performance.now() - startTime,
  };
}
