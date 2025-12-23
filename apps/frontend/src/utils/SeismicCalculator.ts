/**
 * Seismic Calculator - IS 1893 (Part 1): 2016
 * Equivalent Static Method implementation.
 */

export type SoilType = 'I' | 'II' | 'III'; // I: Rock/Hard, II: Medium, III: Soft

export type StructuralSystem =
  | 'rc-mrf-infilled'
  | 'rc-mrf-bare'
  | 'steel-mrf'
  | 'braced-frame'
  | 'shear-wall'
  | 'other';

export interface SeismicInputs {
  Z: number;                // Zone factor (Table 3) e.g., 0.10, 0.16, 0.24, 0.36
  I: number;                // Importance factor (Table 8)
  R: number;                // Response reduction factor (Table 9)
  soilType: SoilType;       // Site soil type I/II/III
  dampingRatio?: number;    // Fraction of critical damping (e.g., 0.05 for 5%)
  h: number;                // Total building height (m)
  baseDimension?: number;   // Plan dimension in analysis direction (m) for Ta = 0.09*h/sqrt(d)
  structuralSystem?: StructuralSystem; // For empirical Ta selection
}

export interface FloorLevel {
  level: number;           // Floor number (0 = base)
  height: number;          // Height above base (same units as h)
  weight: number;          // Seismic weight at this level (force units)
}

export interface SeismicResults {
  SaByG: number;            // Design spectral acceleration (Sa/g) at Ta
  Ah: number;               // Design horizontal seismic coefficient
  Ct: number;               // Empirical period coefficient (if used)
  x: number;                // Empirical exponent (if used)
  Ta: number;               // Fundamental period (s)
  V: number;                // Base shear
  W: number;                // Total seismic weight
  k: number;                // Vertical distribution exponent
  floorForces: FloorForce[];
}

export interface FloorForce {
  level: number;
  height: number;
  weight: number;
  Cvx: number;             // Vertical distribution factor
  Fx: number;              // Lateral force at this level
}

const DEFAULT_DAMPING = 0.05;

// ============================================================================
// RESPONSE SPECTRUM (IS 1893 Fig. 2) – 5% Damping Base Curves
// ============================================================================

function getSaOverG(soilType: SoilType, T: number, dampingRatio: number = DEFAULT_DAMPING): number {
  const Tsec = Math.max(T, 0);

  const baseSa = (() => {
    switch (soilType) {
      case 'I': // Rock / Hard Soil
        if (Tsec <= 0.1) return 1 + 15 * Tsec;
        if (Tsec <= 0.4) return 2.5;
        if (Tsec <= 4.0) return 1 / Tsec;
        return 1 / Tsec;
      case 'II': // Medium Soil
        if (Tsec <= 0.1) return 1 + 15 * Tsec;
        if (Tsec <= 0.55) return 2.5;
        if (Tsec <= 4.0) return 1.36 / Tsec;
        return 1.36 / Tsec;
      case 'III': // Soft Soil
        if (Tsec <= 0.1) return 1 + 15 * Tsec;
        if (Tsec <= 0.67) return 2.5;
        if (Tsec <= 4.0) return 1.67 / Tsec;
        return 1.67 / Tsec;
      default:
        return 2.5;
    }
  })();

  // Damping correction factor per IS 1893 (approx.): eta = 10 / (5 + 100*xi)
  // xi is fractional damping (0.05 = 5%).
  const xi = Math.max(0.01, dampingRatio); // avoid zero
  const eta = 10 / (5 + 100 * xi);

  return baseSa * eta;
}

// ============================================================================
// APPROXIMATE FUNDAMENTAL PERIOD (IS 1893-2016 Cl. 7.6)
// ============================================================================

function getPeriodCoefficients(system?: StructuralSystem): { Ct: number; x: number } {
  const coefficients: Record<StructuralSystem, { Ct: number; x: number }> = {
    'rc-mrf-infilled': { Ct: 0.075, x: 0.75 }, // RC MRF with brick infill
    'rc-mrf-bare': { Ct: 0.09, x: 0.75 },       // RC MRF without infill
    'steel-mrf': { Ct: 0.085, x: 0.75 },        // Steel moment frames
    'braced-frame': { Ct: 0.09, x: 0.75 },      // Approximate
    'shear-wall': { Ct: 0.075, x: 0.75 },
    'other': { Ct: 0.09, x: 0.75 },             // Conservative default
  };

  return coefficients[system || 'other'];
}

function calculateFundamentalPeriod(
  h: number,
  baseDimension?: number,
  structuralSystem?: StructuralSystem
): { Ct: number; x: number; Ta: number } {
  const { Ct, x } = getPeriodCoefficients(structuralSystem);

  // IS 1893 Cl. 7.6.1: Ta = Ct * h^x; alternative Ta = 0.09*h / sqrt(d) for all other buildings
  if (baseDimension && baseDimension > 0) {
    const TaAlt = 0.09 * h / Math.sqrt(baseDimension);
    const Ta = Math.max(Ct * Math.pow(h, x), TaAlt);
    return { Ct, x, Ta };
  }

  const Ta = Ct * Math.pow(h, x);
  return { Ct, x, Ta };
}

// ============================================================================
// MAIN CALCULATION FUNCTIONS (IS 1893)
// ============================================================================

export function calculateDesignHorizontalCoefficient(
  Z: number,
  I: number,
  R: number,
  SaByG: number
): number {
  // Ah = (Z/2) * (I/R) * (Sa/g)
  const Ah = (Z / 2) * (I / R) * SaByG;

  // Minimum Ah often taken as 0.01 for low seismicity; clamp to avoid zero.
  return Math.max(Ah, 0.01);
}

/**
 * Vertical distribution exponent k (IS 1893 Cl. 7.7.1):
 * k = 1 for Ta <= 0.5s; k = 2 for Ta >= 2.0s; linear in between.
 */
export function calculateVerticalExponent(Ta: number): number {
  if (Ta <= 0.5) return 1.0;
  if (Ta >= 2.0) return 2.0;
  return 1.0 + ((Ta - 0.5) / (2.0 - 0.5));
}

export function calculateVerticalDistribution(
  levels: FloorLevel[],
  V: number,
  k: number
): FloorForce[] {
  const wxhxk = levels.map(level => ({
    level: level.level,
    height: level.height,
    weight: level.weight,
    wxhxk: level.weight * Math.pow(level.height, k),
  }));

  const sumWxHxK = wxhxk.reduce((sum, item) => sum + item.wxhxk, 0);

  return wxhxk.map(item => {
    const Cvx = sumWxHxK > 0 ? item.wxhxk / sumWxHxK : 0;
    const Fx = Cvx * V;
    return {
      level: item.level,
      height: item.height,
      weight: item.weight,
      Cvx,
      Fx,
    };
  });
}

// ============================================================================
// COMPREHENSIVE SEISMIC ANALYSIS (IS 1893)
// ============================================================================

export function performSeismicAnalysis(
  inputs: SeismicInputs,
  levels: FloorLevel[]
): SeismicResults {
  const { Z, I, R, soilType, dampingRatio = DEFAULT_DAMPING, h, baseDimension, structuralSystem } = inputs;

  // Period
  const { Ct, x, Ta } = calculateFundamentalPeriod(h, baseDimension, structuralSystem);

  // Spectrum and coefficient
  const SaByG = getSaOverG(soilType, Ta, dampingRatio);
  const Ah = calculateDesignHorizontalCoefficient(Z, I, R, SaByG);

  // Weights and base shear
  const W = levels.reduce((sum, level) => sum + level.weight, 0);
  const V = Ah * W;

  // Vertical distribution
  const k = calculateVerticalExponent(Ta);
  const floorForces = calculateVerticalDistribution(levels, V, k);

  return {
    SaByG,
    Ah,
    Ct,
    x,
    Ta,
    V,
    W,
    k,
    floorForces,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

export function getSeismicSummary(results: SeismicResults): string {
  const lines = [
    'SEISMIC ANALYSIS SUMMARY (IS 1893:2016)',
    '═'.repeat(50),
    '',
    'Spectrum & Coefficient:',
    `  Sa/g = ${results.SaByG.toFixed(3)}`,
    `  Ah   = ${results.Ah.toFixed(4)}`,
    '',
    'Fundamental Period:',
    `  Ta   = ${results.Ta.toFixed(3)} s (Ct=${results.Ct.toFixed(3)}, x=${results.x.toFixed(2)})`,
    '',
    'Base Shear:',
    `  V    = ${results.V.toFixed(2)} (W = ${results.W.toFixed(2)})`,
    '',
    `Vertical Distribution (k = ${results.k.toFixed(2)}):`,
  ];

  results.floorForces.forEach(floor => {
    lines.push(
      `  Level ${floor.level}: Fx = ${floor.Fx.toFixed(2)} (Cvx = ${floor.Cvx.toFixed(4)})`
    );
  });

  return lines.join('\n');
}

export function validateSeismicInputs(inputs: SeismicInputs): string[] {
  const errors: string[] = [];

  if (inputs.Z <= 0 || inputs.Z > 0.36) {
    errors.push('Zone factor Z must be between 0 and 0.36');
  }

  if (inputs.I < 0.8 || inputs.I > 1.5) {
    errors.push('Importance factor I should be between 0.8 and 1.5');
  }

  if (inputs.R <= 0 || inputs.R > 12) {
    errors.push('Response reduction factor R must be between 0 and 12');
  }

  if (!inputs.soilType) {
    errors.push('Soil type (I/II/III) is required');
  }

  if (inputs.dampingRatio !== undefined && (inputs.dampingRatio <= 0 || inputs.dampingRatio > 0.2)) {
    errors.push('Damping ratio should be in fractional form (e.g., 0.05 for 5%) and > 0');
  }

  if (inputs.h <= 0) {
    errors.push('Building height h must be positive');
  }

  if (inputs.baseDimension !== undefined && inputs.baseDimension <= 0) {
    errors.push('Base dimension must be positive when provided');
  }

  return errors;
}

export function validateFloorLevels(levels: FloorLevel[]): string[] {
  const errors: string[] = [];

  if (levels.length === 0) {
    errors.push('At least one floor level is required');
    return errors;
  }

  for (const level of levels) {
    if (level.height <= 0) {
      errors.push(`Level ${level.level}: height must be positive`);
    }
    if (level.weight <= 0) {
      errors.push(`Level ${level.level}: weight must be positive`);
    }
  }

  for (let i = 1; i < levels.length; i++) {
    if (levels[i].height <= levels[i - 1].height) {
      errors.push(`Level ${levels[i].level}: heights must be strictly increasing`);
    }
  }

  return errors;
}
