/**
 * RCBeamDesigner - Reinforced Concrete Beam Design per IS 456:2000
 * 
 * Designs flexural and shear reinforcement for RC beams
 */

export interface RCBeamInput {
  Mu: number; // Ultimate moment (kN-m)
  Vu: number; // Ultimate shear (kN)
  b: number; // Beam width (mm)
  d: number; // Effective depth (mm)
  fc: number; // Concrete strength (MPa) - e.g., 30 for M30
  fy: number; // Steel yield strength (MPa) - e.g., 415 or 500
  cover?: number; // Concrete cover (mm), default 40
  barDiameter?: number; // Main bar diameter (mm), default 20
}

export interface ReinforcementResult {
  flexure: {
    As: number; // Required steel area (mm²)
    barCount: number; // Number of bars
    barDiameter: number; // Bar diameter (mm)
    barArea: number; // Area per bar (mm²)
    description: string; // e.g., "3-#8 Bottom"
  };
  shear: {
    Vc: number; // Concrete shear capacity (kN)
    Vs: number; // Steel shear to be provided (kN)
    Av: number; // Area of stirrup (mm²)
    spacing: number; // Stirrup spacing (mm)
    barDiameter: number; // Stirrup bar diameter (mm)
    description: string; // e.g., "#4@150mm c/c"
  };
  summary: string; // Combined reinforcement string
  warnings: string[];
}

// IS bar designations and areas (mm²)
const barData: Record<number, number> = {
  8: 50.27,
  10: 78.54,
  12: 113.1,
  16: 201.06,
  20: 314.16,
  25: 490.87,
  32: 804.25,
};

function getBarArea(diameter: number): number {
  return barData[diameter] ?? (Math.PI * diameter * diameter) / 4;
}

function findBarCount(requiredArea: number, barDiameter: number): number {
  const barArea = getBarArea(barDiameter);
  return Math.ceil(requiredArea / barArea);
}

/**
 * IS 456:2000 Flexure Design
 * 
 * Moment capacity: Mu = 0.36 * fck * b * d^2 * xu_max
 * Iterative approach: Assume steel controls, then refine neutral axis
 */
function designFlexure(input: RCBeamInput): ReinforcementResult['flexure'] {
  const { Mu, b, d, fc, fy, barDiameter = 20 } = input;

  // Convert Mu to N-mm
  const Mu_Nmm = Mu * 1e6;

  // Moment of resistance: Mu = As * fy * j * d
  // First approximation: j = 0.85 (lever arm factor, typical for singly reinforced)
  const j = 0.85;
  let As = Mu_Nmm / (fy * j * d);

  // Refine: Check if neutral axis is within limits
  // xu_max = 0.43 * d (for fy = 415 MPa, approximately 0.48 for 500 MPa)
  const xuMax = fc === 30 ? 0.43 * d : 0.42 * d;

  // Actual neutral axis: xu = As * fy / (0.36 * fc * b)
  let xu = As * fy / (0.36 * fc * b);

  // If xu > xuMax, compression governs; iterate
  let iterations = 0;
  const maxIterations = 5;
  while (xu > xuMax && iterations < maxIterations) {
    // Compression-controlled: limit xu
    xu = xuMax;
    const lever = d - (xu / 2);
    const Mc = 0.36 * fc * b * xu * lever;
    As = Mu_Nmm / Mc;
    xu = As * fy / (0.36 * fc * b);
    iterations++;
  }

  // Round up As and find suitable bar
  const barCount = findBarCount(As, barDiameter);

  return {
    As,
    barCount,
    barDiameter,
    barArea: getBarArea(barDiameter),
    description: `${barCount}-#${barDiameter} Bottom`,
  };
}

/**
 * IS 456:2000 Shear Design
 * 
 * Concrete shear capacity: Vc = (0.85 * sqrt(fck) * b * d) / 1000  (in kN)
 * If Vu > Vc: Design stirrups
 * Stirrup spacing: s = (Av * fy * d) / (Vs * 1000)
 */
function designShear(input: RCBeamInput): ReinforcementResult['shear'] {
  const { Vu, b, d, fc, fy } = input;

  // Concrete shear capacity (simplified, per IS 456)
  const Vc = (0.85 * Math.sqrt(fc) * b * d) / 1000; // kN

  let Vs = 0;
  let spacing = 0;
  let Av = 0;
  let stirrupDiameter = 8; // Default stirrup diameter (mm)
  let description = 'No stirrups needed';

  if (Vu > Vc) {
    // Design stirrups
    Vs = (Vu / 0.75) - Vc; // Shear to be provided by steel

    // Stirrup area per leg: typically 2-legged stirrup with barDiameter 8 or 10
    // For 2-legged #8 stirrup: Av = 2 * 50.27 = 100.54 mm²
    Av = 2 * getBarArea(stirrupDiameter); // 2-legged stirrup

    // Spacing formula: s = (Av * fy * d) / (Vs * 1000)
    spacing = (Av * fy * d) / (Vs * 1000);

    // Limit spacing per IS: max = 0.5*d or 300mm, whichever is less
    const maxSpacing = Math.min(0.5 * d, 300);
    spacing = Math.min(spacing, maxSpacing);

    // Round spacing to nearest 50mm
    spacing = Math.round(spacing / 50) * 50;
    spacing = Math.max(spacing, 100); // Minimum 100mm

    description = `#${stirrupDiameter}@${spacing}mm c/c`;
  }

  return {
    Vc,
    Vs,
    Av,
    spacing,
    barDiameter: stirrupDiameter,
    description,
  };
}

/**
 * Design RC beam for flexure and shear
 */
export function designRCBeam(input: RCBeamInput): ReinforcementResult {
  const warnings: string[] = [];

  // Validate inputs
  if (input.Mu <= 0) warnings.push('Warning: Moment should be positive');
  if (input.Vu <= 0) warnings.push('Warning: Shear should be positive');
  if (input.b <= 0 || input.d <= 0) warnings.push('Warning: Dimensions should be positive');
  if (input.fc < 20 || input.fc > 60) warnings.push(`Warning: Concrete strength ${input.fc} MPa is unusual`);
  if (input.fy !== 415 && input.fy !== 500) warnings.push(`Warning: Steel grade ${input.fy} MPa; IS 456 typically uses 415 or 500`);

  // Check effective depth
  const Leff = input.Mu * 1e6 / (0.138 * input.fc * input.b); // Approximate span
  const minD = Math.sqrt(Leff / 20); // Span/20 rule
  if (input.d < minD * 0.9) warnings.push(`Warning: Effective depth ${input.d}mm may be insufficient`);

  const flexure = designFlexure(input);
  const shear = designShear(input);

  // Construct summary
  const summary = `Main: ${flexure.description} | Stirrups: ${shear.description}`;

  // Add shear design warning if stirrups needed
  if (shear.Vs > 0) {
    warnings.push(`Design shear: ${shear.Vs.toFixed(2)} kN (concrete capacity: ${shear.Vc.toFixed(2)} kN)`);
  }

  return {
    flexure,
    shear,
    summary,
    warnings,
  };
}

/**
 * Generate detailed reinforcement report
 */
export function generateReinforcementReport(result: ReinforcementResult): string {
  const lines = [
    '='.repeat(60),
    'RC BEAM REINFORCEMENT DESIGN',
    '='.repeat(60),
    '',
    'FLEXURE:',
    `  Required steel area: ${result.flexure.As.toFixed(2)} mm²`,
    `  Provided: ${result.flexure.description}`,
    `  Provided area: ${(result.flexure.barCount * result.flexure.barArea).toFixed(2)} mm²`,
    '',
    'SHEAR:',
    `  Concrete capacity: ${result.shear.Vc.toFixed(2)} kN`,
    `  Steel shear to provide: ${result.shear.Vs.toFixed(2)} kN`,
    `  Provided: ${result.shear.description}`,
    '',
    'SUMMARY:',
    `  ${result.summary}`,
    '',
  ];

  if (result.warnings.length > 0) {
    lines.push('WARNINGS/NOTES:');
    result.warnings.forEach((w) => lines.push(`  • ${w}`));
  }

  lines.push('='.repeat(60));

  return lines.join('\n');
}
