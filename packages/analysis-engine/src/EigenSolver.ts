// @ts-nocheck
import { eigs, matrix, multiply, inv, Matrix, type MathArray, sqrt } from 'mathjs';

export interface EigenResult {
  angularFrequencies: number[]; // rad/s
  frequenciesHz: number[];      // Hz
  modeShapes: number[][];       // columns correspond to modes
}

export interface EigenSolverOptions {
  modeCount?: number;           // number of modes to extract; if omitted, all
}

/**
 * Assemble a diagonal (lumped) mass matrix from nodal masses.
 * @param masses Array of masses per DOF (same ordering as stiffness matrix DOFs).
 */
export function assembleLumpedMassMatrix(masses: number[]): number[][] {
  const n = masses.length;
  const M: number[][] = Array.from({ length: n }, (_, i) => {
    const row = Array.from({ length: n }, () => 0);
    row[i] = masses[i];
    return row;
  });
  return M;
}

/**
 * Solve the generalized eigenvalue problem (K - w^2 M) v = 0 using mathjs.eigs.
 * Suitable for small to moderate models where dense inversion is acceptable.
 */
export function solveEigenmodes(
  K: number[][],
  masses: number[],
  options: EigenSolverOptions = {}
): EigenResult {
  const n = K.length;
  if (masses.length !== n) {
    throw new Error(`Mass array length ${masses.length} must match matrix size ${n}`);
  }

  // Build lumped mass matrix and its inverse (diagonal -> cheap inversion)
  const Mdiag = masses.map((m) => (m === 0 ? 1e-12 : m)); // avoid divide-by-zero
  const Minv: number[][] = Array.from({ length: n }, (_, i) => {
    const row = Array.from({ length: n }, () => 0);
    row[i] = 1 / Mdiag[i];
    return row;
  });

  // Form A = M^{-1} K
  const A = multiply(matrix(Minv) as Matrix, matrix(K) as Matrix) as Matrix;

  const { values, vectors } = eigs(A, options.modeCount);

  // values: eigenvalues (lambda) satisfy A v = lambda v, where lambda = w^2
  const lambda: number[] = (values as MathArray).map((val) => Number(val));
  const angularFrequencies = lambda.map((l) => Math.sqrt(Math.max(l, 0))); // rad/s
  const frequenciesHz = angularFrequencies.map((w) => w / (2 * Math.PI));

  // vectors: columns are mode shapes
  const V = (vectors as Matrix).toArray() as number[][];

  return {
    angularFrequencies,
    frequenciesHz,
    modeShapes: V,
  };
}
