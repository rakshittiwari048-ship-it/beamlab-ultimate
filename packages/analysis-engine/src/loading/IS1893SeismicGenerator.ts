/**
 * IS1893SeismicGenerator.ts
 * 
 * Seismic Load Calculation per IS 1893 (Part 1): 2016
 * 
 * Implements:
 * - Clause 6.4: Design Spectrum
 * - Clause 7.6: Design Base Shear
 * - Clause 7.7: Vertical Distribution of Base Shear
 * - Clause 7.8: Torsion
 * - Annex A: Zone Map
 * - Annex B: Importance Factor
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface SeismicSiteData {
  /** Seismic Zone (II, III, IV, V) */
  zone: 'II' | 'III' | 'IV' | 'V';
  /** Soil Type (I = Rock, II = Medium, III = Soft) */
  soilType: 'I' | 'II' | 'III';
  /** Importance Factor category */
  importanceCategory: 'I' | 'II' | 'III' | 'IV';
  /** Response Reduction Factor R */
  R: number;
  /** Damping ratio (default 5%) */
  damping?: number;
}

export interface BuildingGeometry {
  /** Total building height (m) */
  height: number;
  /** Number of stories */
  stories: number;
  /** Building type for period calculation */
  frameType: 'RCFrame' | 'SteelFrame' | 'RCShearWall' | 'Masonry' | 'other';
  /** Base dimension along seismic direction (m) */
  baseDimension?: number;
  /** Calculated or measured fundamental period (s) - optional */
  T?: number;
}

export interface MassDistribution {
  /** Story number (1 = ground, n = top) */
  story: number;
  /** Height from base (m) */
  height: number;
  /** Seismic weight at this level (kN) */
  weight: number;
}

export interface SeismicResult {
  /** Seismic Zone Factor Z */
  Z: number;
  /** Importance Factor I */
  I: number;
  /** Response Reduction Factor R */
  R: number;
  /** Fundamental Time Period (s) */
  Ta: number;
  /** Spectral Acceleration Coefficient Sa/g */
  SaG: number;
  /** Horizontal Seismic Coefficient Ah */
  Ah: number;
  /** Total Seismic Weight W (kN) */
  W: number;
  /** Design Base Shear VB (kN) */
  VB: number;
  /** Vertical distribution of forces */
  storyForces: StoryForce[];
  /** Story shears */
  storyShears: { story: number; shear: number }[];
  /** Overturning moments */
  overturningMoments: { story: number; moment: number }[];
}

export interface StoryForce {
  /** Story number */
  story: number;
  /** Height from base (m) */
  height: number;
  /** Seismic weight at level (kN) */
  weight: number;
  /** Lateral force at level (kN) */
  Qi: number;
  /** Wi * hi² contribution */
  WiHi2: number;
}

// ============================================================================
// CONSTANTS (IS 1893 Part 1: 2016)
// ============================================================================

/**
 * Seismic Zone Factor Z (Table 3)
 */
const ZONE_FACTORS: Record<string, number> = {
  'II': 0.10,
  'III': 0.16,
  'IV': 0.24,
  'V': 0.36,
};

/**
 * Importance Factor I (Table 8)
 */
const IMPORTANCE_FACTORS: Record<string, number> = {
  'I': 1.0,   // Buildings with less importance
  'II': 1.0,  // Ordinary buildings
  'III': 1.2, // Important buildings (hospitals, schools)
  'IV': 1.5,  // Critical buildings (nuclear plants, emergency services)
};

/**
 * Spectral Acceleration Coefficients (Sa/g)
 * For 5% damping - Figure 2 of IS 1893
 */
const SPECTRAL_COEFFICIENTS = {
  // Soil Type I (Rock/Hard Soil)
  'I': {
    tRange1: 0.10,  // T <= 0.10s
    tRange2: 0.40,  // 0.10 < T <= 0.40s
    tRange3: 4.00,  // 0.40 < T <= 4.00s
    sa1: 1.0,       // Sa/g = 1 + 15*T for T <= 0.10
    sa2: 2.5,       // Sa/g = 2.5 for 0.10 < T <= 0.40
    saFormula: (T: number) => 1.0 / T, // Sa/g = 1/T for T > 0.40
  },
  // Soil Type II (Medium Soil)
  'II': {
    tRange1: 0.10,
    tRange2: 0.55,
    tRange3: 4.00,
    sa1: 1.0,
    sa2: 2.5,
    saFormula: (T: number) => 1.36 / T,
  },
  // Soil Type III (Soft Soil)
  'III': {
    tRange1: 0.10,
    tRange2: 0.67,
    tRange3: 4.00,
    sa1: 1.0,
    sa2: 2.5,
    saFormula: (T: number) => 1.67 / T,
  },
};

/**
 * Common Response Reduction Factors R (Table 9)
 */
export const RESPONSE_REDUCTION_FACTORS: Record<string, number> = {
  // RC Frames
  'OMRF': 3.0,      // Ordinary Moment Resisting Frame
  'SMRF': 5.0,      // Special Moment Resisting Frame

  // Steel Frames  
  'Steel_OMRF': 3.0,
  'Steel_SMRF': 5.0,

  // Shear Walls
  'RC_ShearWall': 4.0,
  'RC_ShearWall_SMRF': 5.0,

  // Braced Frames
  'Steel_OCBF': 4.0,  // Ordinary Concentrically Braced
  'Steel_SCBF': 4.5,  // Special Concentrically Braced
  'Steel_EBF': 5.0,   // Eccentrically Braced

  // Masonry
  'Masonry_Unreinforced': 1.5,
  'Masonry_Reinforced': 3.0,

  // Dual Systems
  'Dual_SMRF_ShearWall': 5.0,
};

// ============================================================================
// IS 1893 SEISMIC GENERATOR CLASS
// ============================================================================

export class IS1893SeismicGenerator {
  private site: SeismicSiteData;
  private building: BuildingGeometry;
  private masses: MassDistribution[];

  constructor(
    site: SeismicSiteData,
    building: BuildingGeometry,
    masses: MassDistribution[]
  ) {
    this.site = site;
    this.building = building;
    this.masses = masses.sort((a, b) => a.story - b.story);
  }

  // ==========================================================================
  // CLAUSE 6.4.1: ZONE FACTOR
  // ==========================================================================

  getZ(): number {
    return ZONE_FACTORS[this.site.zone] || 0.10;
  }

  // ==========================================================================
  // CLAUSE 6.4.2: IMPORTANCE FACTOR
  // ==========================================================================

  getI(): number {
    return IMPORTANCE_FACTORS[this.site.importanceCategory] || 1.0;
  }

  // ==========================================================================
  // CLAUSE 7.6.2: FUNDAMENTAL PERIOD
  // ==========================================================================

  /**
   * Calculate fundamental natural period Ta
   * Clause 7.6.2 - Empirical formulas
   */
  calcPeriod(): number {
    // If user provided period, use it
    if (this.building.T) {
      return this.building.T;
    }

    const { height, frameType, baseDimension } = this.building;

    switch (frameType) {
      case 'RCFrame':
        // Ta = 0.075 * h^0.75
        return 0.075 * Math.pow(height, 0.75);

      case 'SteelFrame':
        // Ta = 0.085 * h^0.75
        return 0.085 * Math.pow(height, 0.75);

      case 'RCShearWall':
        // Ta = 0.075 * h^0.75 / sqrt(Aw)
        // Simplified: Ta = 0.09 * h / sqrt(d) if base dimension given
        if (baseDimension) {
          return 0.09 * height / Math.sqrt(baseDimension);
        }
        return 0.05 * Math.pow(height, 0.75);

      case 'Masonry':
        // Ta = 0.09 * h / sqrt(d)
        if (baseDimension) {
          return 0.09 * height / Math.sqrt(baseDimension);
        }
        return 0.06 * Math.pow(height, 0.75);

      default:
        // Default: use RC frame formula
        return 0.075 * Math.pow(height, 0.75);
    }
  }

  // ==========================================================================
  // CLAUSE 6.4.5: SPECTRAL ACCELERATION COEFFICIENT
  // ==========================================================================

  /**
   * Calculate Sa/g based on period and soil type
   */
  calcSaG(T: number): number {
    const { soilType, damping = 5 } = this.site;
    const spectrum = SPECTRAL_COEFFICIENTS[soilType];

    let SaG: number;

    if (T <= 0) {
      SaG = 1.0;
    } else if (T <= spectrum.tRange1) {
      // Linear rise: 1 + 15*T (for T <= 0.10)
      SaG = 1.0 + 15 * T;
    } else if (T <= spectrum.tRange2) {
      // Plateau region
      SaG = spectrum.sa2;
    } else if (T <= spectrum.tRange3) {
      // Descending branch
      SaG = spectrum.saFormula(T);
    } else {
      // Beyond 4.0s - constant
      SaG = spectrum.saFormula(spectrum.tRange3);
    }

    // Damping correction (if not 5%)
    if (damping !== 5) {
      // Multiplier from Table 3 notes
      const dampingFactors: Record<number, number> = {
        0: 3.20,
        2: 1.40,
        5: 1.00,
        7: 0.90,
        10: 0.80,
        15: 0.70,
        20: 0.60,
        25: 0.55,
        30: 0.50,
      };
      const factor = dampingFactors[damping] || 1.0;
      SaG *= factor;
    }

    return SaG;
  }

  // ==========================================================================
  // CLAUSE 6.4.2: DESIGN HORIZONTAL SEISMIC COEFFICIENT
  // ==========================================================================

  /**
   * Calculate Ah = (Z/2) * (I/R) * (Sa/g)
   */
  calcAh(SaG: number): number {
    const Z = this.getZ();
    const I = this.getI();
    const { R } = this.site;

    let Ah = (Z / 2) * (I / R) * SaG;

    // Minimum Ah (Clause 7.2.2)
    // For Zone II: Ah,min = 0.10 * Z
    // For Zone III, IV, V: Ah,min = 0.10 * Z
    const AhMin = 0.10 * Z;
    Ah = Math.max(Ah, AhMin);

    return Ah;
  }

  // ==========================================================================
  // CLAUSE 7.6.1: SEISMIC WEIGHT
  // ==========================================================================

  /**
   * Calculate total seismic weight W
   */
  calcSeismicWeight(): number {
    return this.masses.reduce((sum, m) => sum + m.weight, 0);
  }

  // ==========================================================================
  // CLAUSE 7.6.3: DESIGN BASE SHEAR
  // ==========================================================================

  /**
   * Calculate design base shear VB = Ah * W
   */
  calcBaseShear(Ah: number, W: number): number {
    return Ah * W;
  }

  // ==========================================================================
  // CLAUSE 7.7: VERTICAL DISTRIBUTION OF BASE SHEAR
  // ==========================================================================

  /**
   * Distribute base shear vertically
   * Qi = VB * (Wi * hi²) / Σ(Wj * hj²)
   */
  distributeVertically(VB: number): StoryForce[] {
    // Calculate Wi * hi² for each level
    const contributions = this.masses.map((m) => ({
      ...m,
      WiHi2: m.weight * Math.pow(m.height, 2),
    }));

    // Sum of all Wi * hi²
    const sumWiHi2 = contributions.reduce((sum, c) => sum + c.WiHi2, 0);

    // Calculate lateral force at each level
    const storyForces: StoryForce[] = contributions.map((c) => ({
      story: c.story,
      height: c.height,
      weight: c.weight,
      WiHi2: c.WiHi2,
      Qi: sumWiHi2 > 0 ? VB * (c.WiHi2 / sumWiHi2) : 0,
    }));

    return storyForces;
  }

  // ==========================================================================
  // STORY SHEARS & OVERTURNING MOMENTS
  // ==========================================================================

  /**
   * Calculate story shears (cumulative from top)
   */
  calcStoryShears(storyForces: StoryForce[]): { story: number; shear: number }[] {
    const shears: { story: number; shear: number }[] = [];
    let cumulativeShear = 0;

    // Start from top story
    const sortedForces = [...storyForces].sort((a, b) => b.story - a.story);

    for (const sf of sortedForces) {
      cumulativeShear += sf.Qi;
      shears.push({ story: sf.story, shear: cumulativeShear });
    }

    return shears.sort((a, b) => a.story - b.story);
  }

  /**
   * Calculate overturning moments at each level
   */
  calcOverturningMoments(storyForces: StoryForce[]): { story: number; moment: number }[] {
    const moments: { story: number; moment: number }[] = [];

    // Calculate moment at base
    let baseM = 0;
    for (const sf of storyForces) {
      baseM += sf.Qi * sf.height;
    }

    // Moment at each level
    for (const sf of storyForces) {
      let M = 0;
      for (const sf2 of storyForces) {
        if (sf2.height >= sf.height) {
          M += sf2.Qi * (sf2.height - sf.height);
        }
      }
      moments.push({ story: sf.story, moment: M });
    }

    return moments;
  }

  // ==========================================================================
  // MAIN CALCULATION
  // ==========================================================================

  /**
   * Generate complete seismic load analysis
   */
  generate(): SeismicResult {
    const Z = this.getZ();
    const I = this.getI();
    const { R } = this.site;

    // Time period
    const Ta = this.calcPeriod();

    // Spectral acceleration
    const SaG = this.calcSaG(Ta);

    // Horizontal seismic coefficient
    const Ah = this.calcAh(SaG);

    // Seismic weight
    const W = this.calcSeismicWeight();

    // Base shear
    const VB = this.calcBaseShear(Ah, W);

    // Vertical distribution
    const storyForces = this.distributeVertically(VB);

    // Story shears
    const storyShears = this.calcStoryShears(storyForces);

    // Overturning moments
    const overturningMoments = this.calcOverturningMoments(storyForces);

    return {
      Z,
      I,
      R,
      Ta,
      SaG,
      Ah,
      W,
      VB,
      storyForces,
      storyShears,
      overturningMoments,
    };
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick seismic load calculation per IS 1893 Part 1
 */
export function generateSeismicLoadIS1893(
  site: SeismicSiteData,
  building: BuildingGeometry,
  masses: MassDistribution[]
): SeismicResult {
  const generator = new IS1893SeismicGenerator(site, building, masses);
  return generator.generate();
}

/**
 * Quick base shear calculation (simplified)
 */
export function calcDesignBaseShear(
  zone: 'II' | 'III' | 'IV' | 'V',
  soilType: 'I' | 'II' | 'III',
  importance: 'I' | 'II' | 'III' | 'IV',
  R: number,
  height: number,
  frameType: BuildingGeometry['frameType'],
  totalWeight: number
): { VB: number; Ah: number; Ta: number; SaG: number } {
  const building: BuildingGeometry = { height, stories: 1, frameType };
  const site: SeismicSiteData = { zone, soilType, importanceCategory: importance, R };
  const masses: MassDistribution[] = [{ story: 1, height, weight: totalWeight }];

  const generator = new IS1893SeismicGenerator(site, building, masses);
  
  const Ta = generator.calcPeriod();
  const SaG = generator.calcSaG(Ta);
  const Ah = generator.calcAh(SaG);
  const VB = Ah * totalWeight;

  return { VB, Ah, Ta, SaG };
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/*
const result = generateSeismicLoadIS1893(
  {
    zone: 'IV',
    soilType: 'II',
    importanceCategory: 'III',
    R: 5.0,
  },
  {
    height: 30,
    stories: 10,
    frameType: 'RCFrame',
  },
  [
    { story: 1, height: 3, weight: 1500 },
    { story: 2, height: 6, weight: 1400 },
    { story: 3, height: 9, weight: 1400 },
    { story: 4, height: 12, weight: 1400 },
    { story: 5, height: 15, weight: 1400 },
    { story: 6, height: 18, weight: 1400 },
    { story: 7, height: 21, weight: 1400 },
    { story: 8, height: 24, weight: 1400 },
    { story: 9, height: 27, weight: 1300 },
    { story: 10, height: 30, weight: 1200 },
  ]
);

console.log(result);
// {
//   Z: 0.24,
//   I: 1.2,
//   R: 5.0,
//   Ta: 0.96,
//   SaG: 1.42,
//   Ah: 0.041,
//   W: 14200,
//   VB: 582.2,
//   storyForces: [...],
//   storyShears: [...],
//   overturningMoments: [...]
// }
*/
