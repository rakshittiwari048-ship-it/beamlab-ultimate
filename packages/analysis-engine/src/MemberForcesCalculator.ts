/**
 * MemberForcesCalculator
 *
 * Computes end forces for a 3D frame member (local axes) and
 * produces bending moment Mz(x) and shear Fy(x) diagrams along the member
 * using static equilibrium based on end forces and applied loads.
 *
 * Assumptions / Conventions:
 * - Local DOF order and corresponding end force vector components follow the common 3D frame convention:
 *   DOFs (per end): [uX, uY, uZ, rX, rY, rZ]
 *   End force vector (local): [Nx, Vy, Vz, T, My, Mz] at i-end, then same at j-end.
 * - Shear Fy is the local Y shear (positive upward).
 * - Bending Mz is the local Z bending moment.
 * - Distributed load qy(x) is positive downward (reduces V/Fy as x increases).
 * - Point loads Py are positive downward.
 * - Length units: meters; Loads: kN or kN/m; Moments: kN·m.
 */

export interface MemberLoadProfile {
  /** Uniformly distributed load in local Y (kN/m), positive downward */
  udlY?: number;
  /** Linearly varying distributed load in local Y (kN/m), from wStart at x=0 to wEnd at x=L */
  uvlY?: { wStart: number; wEnd: number };
  /** Point loads in local Y (kN) at position x (m), positive downward */
  pointLoadsY?: Array<{ x: number; Py: number }>;
}

export interface MemberForcesOutput {
  /** Position along member in meters */
  x: number;
  /** Bending moment about local Z at x (kN·m) */
  Mz: number;
  /** Shear in local Y at x (kN) */
  Fy: number;
}

/**
 * Multiply a 12x12 matrix with a 12x1 vector.
 */
function multiply12(k: number[][], u: number[]): number[] {
  const n = 12;
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    const row = k[i];
    for (let j = 0; j < n; j++) {
      sum += (row?.[j] ?? 0) * (u?.[j] ?? 0);
    }
    out[i] = sum;
  }
  return out;
}

/**
 * Evaluate distributed load qy(x) based on load profile.
 * Positive downward; returns kN/m.
 */
function qyAt(x: number, L: number, loads?: MemberLoadProfile): number {
  if (!loads) return 0;
  let q = 0;
  if (typeof loads.udlY === 'number') {
    q += loads.udlY;
  }
  if (loads.uvlY) {
    const t = Math.min(1, Math.max(0, x / L));
    q += loads.uvlY.wStart + t * (loads.uvlY.wEnd - loads.uvlY.wStart);
  }
  return q;
}

/**
 * Calculates bending moment Mz(x) and shear Fy(x) along a member.
 *
 * Inputs:
 * - k: 12x12 local stiffness matrix (numbers)
 * - u: 12x1 local displacement vector (numbers)
 * - length: member length L in meters
 * - loads: optional applied loads in local Y (distributed + point)
 * - segments: number of segments to divide member into (default 20)
 *
 * Output: Array of { x, Mz, Fy }
 */
export function calculateMemberFyMz(
  k: number[][],
  u: number[],
  length: number,
  loads?: MemberLoadProfile,
  segments = 20
): MemberForcesOutput[] {
  const L = length;
  const s = Math.max(1, segments);
  const dx = L / s;

  // End forces in local axes from Fe = k * u
  const Fe = multiply12(k, u);

  // Map to local components at i-end and j-end
  const Vy_i = Fe[1]; // shear in local Y at start
  const Mz_i = Fe[5]; // moment about local Z at start
  const Vy_j = Fe[7]; // shear in local Y at end
  const Mz_j = Fe[11]; // moment about local Z at end

  // Initialize diagrams at x=0 using i-end forces
  let V_prev = Vy_i; // shear Fy (kN), positive upward
  let M_prev = Mz_i; // bending moment (kN·m)

  const outputs: MemberForcesOutput[] = [];
  let x_prev = 0;

  // Helper: handle point load steps when crossing their positions
  const pointLoads = (loads?.pointLoadsY ?? []).slice().sort((a, b) => a.x - b.x);
  let nextPointIndex = 0;

  // Include start point
  outputs.push({ x: 0, Mz: M_prev, Fy: V_prev });

  for (let i = 1; i <= s; i++) {
    const x_curr = i * dx;

    // Distributed load effect over [x_prev, x_curr]
    const xm = (x_prev + x_curr) / 2; // midpoint approximation
    const q_mid = qyAt(xm, L, loads); // kN/m (positive downward)

    // Shear changes by -∫ q dx ≈ -q_mid * dx
    let V_curr = V_prev - q_mid * dx;

    // Moment increases by ∫ V dx; trapezoidal rule
    let M_curr = M_prev + 0.5 * (V_prev + V_curr) * dx;

    // Apply point loads that occur in (x_prev, x_curr]
    while (nextPointIndex < pointLoads.length && pointLoads[nextPointIndex].x <= x_curr) {
      const p = pointLoads[nextPointIndex];
      if (p.x > x_prev && p.x <= x_curr) {
        // Step change in shear (downward load reduces upward shear)
        V_curr -= p.Py;
        // Moment is continuous; subtract area under the step over (p.x, x_curr]
        M_curr -= p.Py * (x_curr - p.x);
      }
      nextPointIndex++;
    }

    outputs.push({ x: x_curr, Mz: M_curr, Fy: V_curr });

    // Advance
    x_prev = x_curr;
    V_prev = V_curr;
    M_prev = M_curr;
  }

  // Optional: overwrite end value to match j-end forces for better consistency
  // (small numerical differences may exist due to approximations)
  outputs[outputs.length - 1] = { x: L, Mz: Mz_j, Fy: Vy_j };

  return outputs;
}
