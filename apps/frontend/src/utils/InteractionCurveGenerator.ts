/**
 * InteractionCurveGenerator.ts
 * 
 * Generates P-M (axial force vs. bending moment) interaction curves for RC sections
 * per IS 456:2000 strain compatibility method.
 * 
 * Theory:
 * - Neutral axis depth `c` varies from pure compression (c → ∞) to pure tension (c → 0)
 * - At each position, calculate concrete and steel stresses from strain compatibility
 * - Sum forces to get Pn (axial capacity), moments to get Mn (moment capacity)
 * - Each point (Pn, Mn) represents a safe design combination
 */

/**
 * IS 456 Concrete Grades and Properties
 */
export const CONCRETE_GRADES: Record<string, { fck: number; ecu: number }> = {
  'M20': { fck: 20, ecu: 0.0032 },
  'M25': { fck: 25, ecu: 0.0032 },
  'M30': { fck: 30, ecu: 0.0032 },
  'M35': { fck: 35, ecu: 0.0032 },
  'M40': { fck: 40, ecu: 0.0032 },
};

/**
 * Steel Grades and yield strength
 */
export const STEEL_GRADES: Record<string, { fy: number }> = {
  'Fe250': { fy: 250 },
  'Fe415': { fy: 415 },
  'Fe500': { fy: 500 },
};

/**
 * Stress block parameters for IS 456 rectangular stress distribution
 * fc = 0.45*fck for rectangulr block
 * Lever arm factor la = 0.5 + (fck-25)/1000
 */
const getStressBlockParams = (fck: number) => ({
  fc: 0.45 * fck, // Rectangular block stress
  lambda: 0.9, // Depth factor λ (IS 456 Table 2)
  beta: 0.5 + (fck - 25) / 1000, // Lever arm factor
});

/**
 * Calculate steel stress at given strain
 * Bilinear: Es * es until fy, then fy
 */
function getSteelStress(strain: number, fy: number): number {
  const Es = 200000; // Young's modulus for steel (MPa)
  const ey = fy / Es;

  if (Math.abs(strain) < 1e-6) return 0;
  if (Math.abs(strain) <= ey) return Es * strain;
  return Math.sign(strain) * fy;
}

/**
 * Interaction curve point: {P (kN), M (kN-m)}
 */
export interface InteractionPoint {
  P: number; // Axial force (kN)
  M: number; // Bending moment (kN-m)
  c?: number; // Neutral axis depth (mm) for reference
}

/**
 * Reinforcement in section
 */
export interface SectionReinforcement {
  bars: Array<{
    diameter: number; // mm
    count: number;
    position: 'top' | 'bottom'; // Distance from top fiber
    yc: number; // Distance from centroid (mm, positive down)
  }>;
}

/**
 * RC Section properties
 */
export interface RCSection {
  b: number; // Width (mm)
  d: number; // Effective depth (mm)
  D: number; // Total depth (mm)
  concreteGrade: string; // e.g., "M25"
  steelGrade: string; // e.g., "Fe500"
  reinforcement: SectionReinforcement;
}

/**
 * Generate interaction curve by iterating neutral axis depth
 * 
 * @param section RC section properties
 * @param steps Number of points to generate (default 50)
 * @returns Array of {P, M} points
 */
export function generateInteractionCurve(
  section: RCSection,
  steps: number = 50
): InteractionPoint[] {
  const { b, d, D } = section;
  const concProps = CONCRETE_GRADES[section.concreteGrade];
  const steelProps = STEEL_GRADES[section.steelGrade];

  if (!concProps) throw new Error(`Unknown concrete grade: ${section.concreteGrade}`);
  if (!steelProps) throw new Error(`Unknown steel grade: ${section.steelGrade}`);

  const { fck } = concProps;
  const { fy } = steelProps;

  const points: InteractionPoint[] = [];

  // Centroid location (assuming symmetric section from top)
  const yg = D / 2; // Distance of centroid from top fiber

  // Iterate neutral axis from pure compression to pure tension
  // c ranges from large (compression) to small (tension)
  const cMin = 0.1; // mm (near pure tension)
  const cMax = d * 2; // mm (near pure compression)

  for (let i = 0; i <= steps; i++) {
    // Logarithmic spacing for better resolution at low c values
    const t = i / steps;
    const c = cMin * Math.pow(cMax / cMin, t); // Logarithmic interpolation

    // Strain at top concrete fiber (compression positive)
    const ecTop = 0.003; // IS 456 ultimate concrete strain
    const strainFactor = ecTop / c;

    // Resultant force and moment
    let Pn = 0; // kN
    let Mn = 0; // kN-m (about centroid)

    // 1. Concrete contribution (rectangular stress block)
    const params = getStressBlockParams(fck);
    const xu = params.lambda * c; // Effective neutral axis depth
    if (xu > 0 && xu <= d) {
      // Concrete compression zone
      const concArea = b * xu; // mm²
      const concStress = params.fc; // MPa
      const concForce = (concArea * concStress) / 1000; // kN

      // Depth of resultant from top
      const concDepth = xu / 2;
      const concMoment = (concForce * (concDepth - yg)) / 1000; // kN-m (divide by 1000 to convert to kN-m from N-mm)

      Pn += concForce;
      Mn += concMoment;
    }

    // 2. Steel contributions
    for (const bar of section.reinforcement.bars) {
      // Distance of bar from top fiber
      const ybar = bar.position === 'top' ? 30 : d + 30; // mm (assuming 30mm cover)

      // Strain in steel at this depth (linear strain compatibility)
      const steelStrain = (ybar - c) * strainFactor;

      // Stress in steel
      const steelStress = getSteelStress(steelStrain, fy); // MPa

      // Total steel area
      const steelArea = bar.count * (Math.PI * Math.pow(bar.diameter / 2, 2)); // mm²

      // Force in steel
      const steelForce = (steelArea * steelStress) / 1000; // kN

      // Moment contribution (about centroid)
      const steelMoment = (steelForce * (ybar - yg)) / 1000; // kN-m

      Pn += steelForce;
      Mn += steelMoment;
    }

    // Store point
    points.push({
      P: Pn,
      M: Mn,
      c: c,
    });
  }

  return points;
}

/**
 * Generate simplified interaction curve with moment in positive direction
 * (for visualization, ensure M >= 0)
 */
export function generateInteractionCurveNormalized(
  section: RCSection,
  steps: number = 50
): InteractionPoint[] {
  const points = generateInteractionCurve(section, steps);

  // Normalize: ensure all points are in positive quadrant
  const minP = Math.min(...points.map((p) => p.P), 0);

  return points.map((p) => ({
    P: p.P - minP, // Shift to positive
    M: Math.abs(p.M), // Use absolute moment
    c: p.c,
  }));
}

/**
 * Generate interaction curve summary for documentation
 */
export function getInteractionCurveSummary(
  section: RCSection,
  curve: InteractionPoint[]
): string {
  const maxP = Math.max(...curve.map((p) => p.P));
  const maxM = Math.max(...curve.map((p) => p.M));
  const minP = Math.min(...curve.map((p) => p.P));

  return `
Interaction Curve Summary
=========================
Section: ${section.b}mm x ${section.D}mm, ${section.concreteGrade}, ${section.steelGrade}
Effective Depth: ${section.d}mm
Reinforcement: ${section.reinforcement.bars.map((b) => `${b.count}x${b.diameter}mm ${b.position}`).join(', ')}

Capacity Range:
- Max Axial Force (Pn): ${maxP.toFixed(2)} kN
- Min Axial Force (Pn): ${minP.toFixed(2)} kN
- Max Moment (Mn): ${maxM.toFixed(2)} kN-m

Points Generated: ${curve.length}
`;
}
