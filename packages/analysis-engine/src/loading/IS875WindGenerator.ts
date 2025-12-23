/**
 * IS875WindGenerator.ts
 * 
 * Wind Load Calculation per IS 875 (Part 3): 2015
 * 
 * Implements:
 * - Clause 6.2: Basic Wind Speed (Vb)
 * - Clause 6.3: Design Wind Speed (Vz)
 * - Clause 6.4: Design Wind Pressure (Pz)
 * - Clause 7: Wind Force on Structures
 * - Annex A: Terrain Categories
 * - Annex B: Force Coefficients
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface SiteData {
  /** City or location name */
  city?: string;
  /** Basic wind speed from map (m/s) - default by city or manual */
  Vb?: number;
  /** Terrain category (1, 2, 3, or 4) */
  terrainCategory: 1 | 2 | 3 | 4;
  /** Structure class (A, B, or C) */
  structureClass: 'A' | 'B' | 'C';
  /** Topography type */
  topography: 'upwind' | 'downwind' | 'hill' | 'crest' | 'flat';
  /** Height above mean ground level (m) */
  height: number;
  /** Upwind slope (degrees) - for hilly terrain */
  theta?: number;
  /** Distance from crest (m) - for hilly terrain */
  x?: number;
  /** Height of hill/escarpment (m) */
  H?: number;
  /** Length of upwind slope (m) */
  Le?: number;
}

export interface BuildingData {
  /** Building width perpendicular to wind (m) */
  width: number;
  /** Building depth parallel to wind (m) */
  depth: number;
  /** Building height (m) */
  height: number;
  /** Building type for Cf selection */
  buildingType: 'rectangular' | 'square' | 'circular' | 'openFrame';
  /** Internal pressure coefficient type */
  openingType: 'normal' | 'largeOpenings' | 'dominant' | 'sealed';
  /** Opening ratio (for dominant openings) */
  openingRatio?: number;
}

export interface WindResult {
  /** Basic wind speed (m/s) */
  Vb: number;
  /** Design wind speed at height z (m/s) */
  Vz: number;
  /** Design wind pressure (N/m²) = 0.6 * Vz² */
  Pz: number;
  /** Probability factor k1 */
  k1: number;
  /** Terrain roughness factor k2 */
  k2: number;
  /** Topography factor k3 */
  k3: number;
  /** External pressure coefficient (windward) */
  CpeWindward: number;
  /** External pressure coefficient (leeward) */
  CpeLeeward: number;
  /** Internal pressure coefficient */
  Cpi: number;
  /** Total wind force (kN) */
  totalForce: number;
  /** Distributed force per unit height (kN/m) */
  distributedForce: number;
  /** Force at different heights */
  forceProfile: { height: number; Vz: number; Pz: number; force: number }[];
}

// ============================================================================
// CONSTANTS (IS 875 Part 3: 2015)
// ============================================================================

/**
 * Basic wind speed for major Indian cities (m/s)
 * Table 1 of IS 875 Part 3
 */
const BASIC_WIND_SPEED: Record<string, number> = {
  // Zone I (Vb = 33 m/s)
  'Bangalore': 33,
  'Hyderabad': 44,
  'Jaipur': 47,
  'Jodhpur': 47,
  'Nagpur': 44,
  'Pune': 39,
  
  // Zone II (Vb = 39 m/s)
  'Ahmedabad': 39,
  'Delhi': 47,
  'Lucknow': 47,
  'Patna': 55,
  'Ranchi': 39,
  
  // Zone III (Vb = 44 m/s)
  'Bhopal': 39,
  'Raipur': 39,
  'Thiruvananthapuram': 39,
  'Visakhapatnam': 50,
  
  // Zone IV (Vb = 47 m/s)
  'Kolkata': 50,
  'Bhubaneswar': 50,
  
  // Zone V (Vb = 50 m/s)
  'Chennai': 50,
  'Mumbai': 44,
  
  // Zone VI (Vb = 55 m/s)
  'Mangalore': 39,
};

/**
 * k1 - Probability Factor (Risk Coefficient)
 * Table 1 of IS 875 Part 3
 */
const K1_FACTORS: Record<string, number> = {
  'A': 0.92, // Buildings and structures for temporary structures, sheds, etc. (5 years)
  'B': 1.00, // Buildings and structures for general structures (50 years)
  'C': 1.07, // Important buildings (100 years)
};

/**
 * k2 - Terrain, Height, and Structure Size Factor
 * Table 2 of IS 875 Part 3
 * Format: k2[terrainCategory][structureClass][heightIndex]
 */
const K2_TABLE: Record<number, Record<string, number[]>> = {
  // Heights: [10, 15, 20, 30, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500]
  1: { // Terrain Category 1
    'A': [1.05, 1.09, 1.12, 1.17, 1.24, 1.32, 1.37, 1.41, 1.44, 1.47, 1.49, 1.51, 1.53, 1.55],
    'B': [1.03, 1.07, 1.10, 1.15, 1.22, 1.30, 1.35, 1.39, 1.42, 1.45, 1.47, 1.49, 1.51, 1.53],
    'C': [0.99, 1.03, 1.06, 1.11, 1.18, 1.26, 1.31, 1.35, 1.38, 1.41, 1.43, 1.45, 1.47, 1.49],
  },
  2: { // Terrain Category 2
    'A': [1.00, 1.05, 1.08, 1.14, 1.21, 1.30, 1.35, 1.39, 1.42, 1.45, 1.47, 1.49, 1.51, 1.53],
    'B': [0.98, 1.02, 1.06, 1.11, 1.18, 1.27, 1.32, 1.36, 1.40, 1.43, 1.45, 1.47, 1.49, 1.51],
    'C': [0.93, 0.97, 1.01, 1.06, 1.13, 1.22, 1.27, 1.31, 1.35, 1.38, 1.40, 1.42, 1.44, 1.46],
  },
  3: { // Terrain Category 3
    'A': [0.91, 0.96, 1.00, 1.07, 1.15, 1.25, 1.31, 1.35, 1.39, 1.42, 1.44, 1.46, 1.48, 1.50],
    'B': [0.88, 0.93, 0.97, 1.03, 1.11, 1.21, 1.27, 1.31, 1.35, 1.38, 1.40, 1.42, 1.44, 1.46],
    'C': [0.82, 0.87, 0.91, 0.97, 1.05, 1.15, 1.21, 1.26, 1.30, 1.33, 1.35, 1.37, 1.39, 1.41],
  },
  4: { // Terrain Category 4
    'A': [0.80, 0.80, 0.80, 0.87, 0.98, 1.13, 1.22, 1.27, 1.31, 1.35, 1.38, 1.40, 1.42, 1.44],
    'B': [0.76, 0.76, 0.76, 0.83, 0.93, 1.08, 1.17, 1.22, 1.27, 1.31, 1.34, 1.36, 1.38, 1.40],
    'C': [0.67, 0.67, 0.67, 0.74, 0.85, 1.00, 1.09, 1.14, 1.19, 1.23, 1.26, 1.28, 1.30, 1.32],
  },
};

/** Standard heights for k2 table (m) */
const K2_HEIGHTS = [10, 15, 20, 30, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500];

/**
 * External Pressure Coefficients for Rectangular Buildings
 * Table 5 of IS 875 Part 3
 */
const CPE_RECTANGULAR: Record<string, { windward: number; leeward: number }> = {
  'h/w<=0.5': { windward: 0.7, leeward: -0.3 },
  'h/w=1': { windward: 0.7, leeward: -0.5 },
  'h/w=1.5': { windward: 0.7, leeward: -0.5 },
  'h/w>=2': { windward: 0.7, leeward: -0.6 },
};

/**
 * Internal Pressure Coefficients
 * Clause 7.3.2 of IS 875 Part 3
 */
const CPI_VALUES: Record<string, number> = {
  'normal': 0.2,       // Normal permeability (up to 5%)
  'largeOpenings': 0.5, // Large openings (>5% but <20%)
  'dominant': 0.7,      // Dominant openings
  'sealed': 0.0,        // Sealed building
};

// ============================================================================
// IS 875 WIND GENERATOR CLASS
// ============================================================================

export class IS875WindGenerator {
  private site: SiteData;
  private building: BuildingData;

  constructor(site: SiteData, building: BuildingData) {
    this.site = site;
    this.building = building;
  }

  // ==========================================================================
  // GET BASIC WIND SPEED
  // ==========================================================================

  /**
   * Get basic wind speed Vb from city name or manual input
   */
  getVb(): number {
    if (this.site.Vb) {
      return this.site.Vb;
    }

    if (this.site.city && BASIC_WIND_SPEED[this.site.city]) {
      return BASIC_WIND_SPEED[this.site.city];
    }

    // Default to Zone II
    return 39;
  }

  // ==========================================================================
  // CLAUSE 6.3.1: k1 - PROBABILITY FACTOR
  // ==========================================================================

  /**
   * Get k1 factor based on structure class
   */
  getK1(): number {
    return K1_FACTORS[this.site.structureClass] || 1.0;
  }

  // ==========================================================================
  // CLAUSE 6.3.2: k2 - TERRAIN, HEIGHT & STRUCTURE SIZE FACTOR
  // ==========================================================================

  /**
   * Get k2 factor for given height
   */
  getK2(height: number): number {
    const { terrainCategory, structureClass } = this.site;
    const k2Values = K2_TABLE[terrainCategory][structureClass];

    // Linear interpolation
    for (let i = 0; i < K2_HEIGHTS.length - 1; i++) {
      if (height <= K2_HEIGHTS[i]) {
        return k2Values[i];
      }
      if (height > K2_HEIGHTS[i] && height <= K2_HEIGHTS[i + 1]) {
        const ratio = (height - K2_HEIGHTS[i]) / (K2_HEIGHTS[i + 1] - K2_HEIGHTS[i]);
        return k2Values[i] + ratio * (k2Values[i + 1] - k2Values[i]);
      }
    }

    return k2Values[k2Values.length - 1];
  }

  // ==========================================================================
  // CLAUSE 6.3.3: k3 - TOPOGRAPHY FACTOR
  // ==========================================================================

  /**
   * Get k3 factor based on topography
   */
  getK3(): number {
    const { topography, theta = 0, x = 0, H = 0, Le = 1 } = this.site;

    if (topography === 'flat' || theta < 3) {
      return 1.0;
    }

    // For hills and ridges (Clause 6.3.3)
    // k3 = 1 + C * s
    // where C = topography factor, s = speed-up factor

    // Simplified calculation for common cases
    const slope = theta;
    
    if (slope < 3) {
      return 1.0;
    }

    // Speed-up factor s (simplified)
    let s = 0;
    const z = this.site.height;
    const xH = x / H;

    if (topography === 'upwind') {
      if (slope <= 17) {
        s = 1.2 * (1 - Math.abs(xH)) * (1 - z / (2 * H));
      } else {
        s = 0.36 * (1 - Math.abs(xH)) * (1 - z / (2 * H));
      }
    } else if (topography === 'downwind') {
      s = 0.6 * (1 - xH) * (1 - z / (2 * H));
    } else if (topography === 'crest' || topography === 'hill') {
      s = 1.2 * (1 - z / (2 * H));
    }

    // C factor based on slope
    let C = 0;
    if (slope >= 3 && slope < 17) {
      C = 1.2 * (slope / 17);
    } else if (slope >= 17) {
      C = 0.36;
    }

    const k3 = 1 + C * s;
    return Math.max(1.0, k3);
  }

  // ==========================================================================
  // CLAUSE 6.3 & 6.4: DESIGN WIND SPEED & PRESSURE
  // ==========================================================================

  /**
   * Calculate design wind speed Vz at height z
   * Vz = Vb * k1 * k2 * k3
   */
  calcVz(height: number): number {
    const Vb = this.getVb();
    const k1 = this.getK1();
    const k2 = this.getK2(height);
    const k3 = this.getK3();

    return Vb * k1 * k2 * k3;
  }

  /**
   * Calculate design wind pressure Pz
   * Pz = 0.6 * Vz² (N/m²)
   */
  calcPz(Vz: number): number {
    return 0.6 * Vz * Vz;
  }

  // ==========================================================================
  // CLAUSE 7: PRESSURE COEFFICIENTS
  // ==========================================================================

  /**
   * Get external pressure coefficients for building
   */
  getCpe(): { windward: number; leeward: number } {
    const { height, width, buildingType } = this.building;
    const hw = height / width;

    if (buildingType === 'circular') {
      return { windward: 0.8, leeward: -0.4 };
    }

    if (buildingType === 'openFrame') {
      return { windward: 1.3, leeward: 0 };
    }

    // Rectangular building
    if (hw <= 0.5) {
      return CPE_RECTANGULAR['h/w<=0.5'];
    } else if (hw <= 1.0) {
      return CPE_RECTANGULAR['h/w=1'];
    } else if (hw <= 1.5) {
      return CPE_RECTANGULAR['h/w=1.5'];
    } else {
      return CPE_RECTANGULAR['h/w>=2'];
    }
  }

  /**
   * Get internal pressure coefficient
   */
  getCpi(): number {
    const { openingType, openingRatio = 0 } = this.building;

    if (openingType === 'dominant' && openingRatio > 0) {
      // For dominant opening, Cpi depends on opening ratio
      if (openingRatio > 0.5) {
        return 0.7;
      } else if (openingRatio > 0.3) {
        return 0.5;
      } else {
        return 0.3;
      }
    }

    return CPI_VALUES[openingType] || 0.2;
  }

  // ==========================================================================
  // CLAUSE 7.4: WIND FORCE CALCULATION
  // ==========================================================================

  /**
   * Calculate total wind force on building
   * F = (Cpe - Cpi) * A * Pz
   */
  calcForce(Pz: number, area: number): number {
    const { windward, leeward } = this.getCpe();
    const Cpi = this.getCpi();

    // Windward force
    const Fwindward = (windward - (-Cpi)) * area * Pz / 1000; // kN

    // Leeward force  
    const Fleeward = ((-leeward) - Cpi) * area * Pz / 1000; // kN

    return Fwindward + Fleeward;
  }

  // ==========================================================================
  // MAIN CALCULATION
  // ==========================================================================

  /**
   * Generate complete wind load analysis
   */
  generate(): WindResult {
    const { height, width, depth } = this.building;
    
    const Vb = this.getVb();
    const k1 = this.getK1();
    const k2 = this.getK2(height);
    const k3 = this.getK3();

    // Design wind at top of building
    const Vz = this.calcVz(height);
    const Pz = this.calcPz(Vz);

    // Pressure coefficients
    const { windward: CpeWindward, leeward: CpeLeeward } = this.getCpe();
    const Cpi = this.getCpi();

    // Total projected area
    const totalArea = width * height;

    // Total force
    const totalForce = this.calcForce(Pz, totalArea);

    // Distributed force per unit height
    const distributedForce = totalForce / height;

    // Force profile at different heights
    const forceProfile: { height: number; Vz: number; Pz: number; force: number }[] = [];
    const intervals = 5;
    const dh = height / intervals;

    for (let i = 1; i <= intervals; i++) {
      const h = i * dh;
      const VzH = this.calcVz(h);
      const PzH = this.calcPz(VzH);
      const areaStrip = width * dh;
      const forceH = this.calcForce(PzH, areaStrip);
      forceProfile.push({ height: h, Vz: VzH, Pz: PzH, force: forceH });
    }

    return {
      Vb,
      Vz,
      Pz,
      k1,
      k2,
      k3,
      CpeWindward,
      CpeLeeward,
      Cpi,
      totalForce,
      distributedForce,
      forceProfile,
    };
  }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Quick wind load calculation per IS 875 Part 3
 */
export function generateWindLoadIS875(
  site: SiteData,
  building: BuildingData
): WindResult {
  const generator = new IS875WindGenerator(site, building);
  return generator.generate();
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/*
const result = generateWindLoadIS875(
  {
    city: 'Chennai',
    terrainCategory: 2,
    structureClass: 'B',
    topography: 'flat',
    height: 30,
  },
  {
    width: 20,
    depth: 15,
    height: 30,
    buildingType: 'rectangular',
    openingType: 'normal',
  }
);

console.log(result);
// {
//   Vb: 50,
//   Vz: 55.5,
//   Pz: 1848.15,
//   k1: 1.0,
//   k2: 1.11,
//   k3: 1.0,
//   CpeWindward: 0.7,
//   CpeLeeward: -0.5,
//   Cpi: 0.2,
//   totalForce: 1329.1,
//   distributedForce: 44.3,
//   forceProfile: [...]
// }
*/
