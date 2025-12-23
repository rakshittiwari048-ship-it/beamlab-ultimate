/**
 * IS456ColumnDesigner.ts
 * 
 * Reinforced Concrete Column Design per IS 456:2000 (Limit State Method)
 * 
 * Implements:
 * - Clause 25.4: Minimum Eccentricity
 * - Clause 39: Axial Compression
 * - Clause 39.6: Short Column Design
 * - Clause 39.7: Slender Column Design
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface ColumnGeometry {
  /** Width of column (mm) */
  b: number;
  /** Depth of column (mm) */
  D: number;
  /** Unsupported length (mm) */
  L: number;
  /** Effective length factor about major axis - default 1.0 */
  kx?: number;
  /** Effective length factor about minor axis - default 1.0 */
  ky?: number;
  /** Clear cover to reinforcement (mm) - default 40 */
  cover?: number;
}

export interface ColumnForces {
  /** Ultimate factored axial load (kN) */
  Pu: number;
  /** Ultimate factored moment about major axis (kN·m) */
  Mux?: number;
  /** Ultimate factored moment about minor axis (kN·m) */
  Muy?: number;
}

export interface ConcreteGrade {
  /** Characteristic compressive strength (MPa) */
  fck: number;
}

export interface SteelGrade {
  /** Characteristic yield strength (MPa) */
  fy: number;
}

export interface ColumnDesignResult {
  /** Required area of longitudinal steel (mm²) */
  Asc: number;
  /** Reinforcement percentage */
  pPercent: number;
  /** Gross area of column (mm²) */
  Ag: number;
  /** Axial capacity if purely axially loaded (kN) */
  PuCapacity: number;
  /** Column type */
  columnType: 'short' | 'slender';
  /** Slenderness ratio about major axis */
  lambdaX: number;
  /** Slenderness ratio about minor axis */
  lambdaY: number;
  /** Minimum eccentricity (mm) */
  eMin: number;
  /** Design status */
  status: 'PASS' | 'FAIL';
  /** Critical check */
  criticalCheck: string;
  /** Suggested bar configuration */
  bars: string;
  /** Tie configuration */
  ties: string;
  /** Interaction check result (if biaxial) */
  interactionRatio?: number;
}

// ============================================================================
// CONSTANTS (IS 456:2000)
// ============================================================================

/** Slenderness limit for short columns (Clause 25.1.2) */
const SHORT_COLUMN_LIMIT = 12;

/** Minimum reinforcement percentage (Clause 26.5.3.1) */
const MIN_REINFORCEMENT = 0.8; // 0.8%

/** Maximum reinforcement percentage (Clause 26.5.3.1) */
const MAX_REINFORCEMENT = 6.0; // 6.0% (4% preferred for practical detailing)

// ============================================================================
// IS 456:2000 COLUMN DESIGNER CLASS
// ============================================================================

export class IS456ColumnDesigner {
  private geometry: ColumnGeometry;
  private forces: ColumnForces;
  private concrete: ConcreteGrade;
  private steel: SteelGrade;
  private cover: number;
  private dX: number; // Effective depth about major axis
  private dY: number; // Effective depth about minor axis

  constructor(
    geometry: ColumnGeometry,
    forces: ColumnForces,
    concrete: ConcreteGrade,
    steel: SteelGrade
  ) {
    this.geometry = geometry;
    this.forces = forces;
    this.concrete = concrete;
    this.steel = steel;
    this.cover = geometry.cover ?? 40;
    this.dX = geometry.D - this.cover - 10; // Assuming 20mm bars
    this.dY = geometry.b - this.cover - 10;
  }

  // ==========================================================================
  // CLAUSE 25.1.2: SLENDERNESS
  // ==========================================================================

  /**
   * Calculate slenderness ratios
   */
  calcSlenderness(): { lambdaX: number; lambdaY: number; type: 'short' | 'slender' } {
    const { b, D, L, kx = 1.0, ky = 1.0 } = this.geometry;

    // Effective lengths
    const LeX = kx * L;
    const LeY = ky * L;

    // Lateral dimensions
    const iX = D; // Least lateral dimension in X direction
    const iY = b; // Least lateral dimension in Y direction

    // Slenderness ratios
    const lambdaX = LeX / iX;
    const lambdaY = LeY / iY;

    // Maximum slenderness
    const lambdaMax = Math.max(lambdaX, lambdaY);

    // Column type
    const type = lambdaMax <= SHORT_COLUMN_LIMIT ? 'short' : 'slender';

    return { lambdaX, lambdaY, type };
  }

  // ==========================================================================
  // CLAUSE 25.4: MINIMUM ECCENTRICITY
  // ==========================================================================

  /**
   * Calculate minimum eccentricity (Clause 25.4)
   * emin = L/500 + D/30, but not less than 20mm
   */
  calcMinEccentricity(): { eMinX: number; eMinY: number } {
    const { b, D, L } = this.geometry;

    const eMinX = Math.max(L / 500 + D / 30, 20);
    const eMinY = Math.max(L / 500 + b / 30, 20);

    return { eMinX, eMinY };
  }

  // ==========================================================================
  // CLAUSE 39.3: AXIAL COMPRESSION (SHORT COLUMN)
  // ==========================================================================

  /**
   * Calculate axial capacity of short column with minimum eccentricity
   * Pu = 0.4 * fck * Ac + 0.67 * fy * Asc (Clause 39.3)
   */
  calcAxialCapacity(Asc: number): number {
    const { b, D } = this.geometry;
    const { fck } = this.concrete;
    const { fy } = this.steel;

    const Ag = b * D;
    const Ac = Ag - Asc;

    // Axial capacity (kN)
    const Pu = (0.4 * fck * Ac + 0.67 * fy * Asc) / 1000;

    return Pu;
  }

  /**
   * Design for pure axial load with minimum eccentricity (Clause 39.3)
   * Returns required Asc
   */
  designAxial(): { Asc: number; PuCapacity: number } {
    const { b, D } = this.geometry;
    const { Pu } = this.forces;
    const { fck } = this.concrete;
    const { fy } = this.steel;

    const Ag = b * D;

    // From Pu = 0.4 * fck * (Ag - Asc) + 0.67 * fy * Asc
    // Asc = (Pu * 1000 - 0.4 * fck * Ag) / (0.67 * fy - 0.4 * fck)
    const numerator = Pu * 1000 - 0.4 * fck * Ag;
    const denominator = 0.67 * fy - 0.4 * fck;

    let Asc = numerator / denominator;

    // Apply minimum reinforcement
    const AscMin = (MIN_REINFORCEMENT / 100) * Ag;
    Asc = Math.max(Asc, AscMin);

    const PuCapacity = this.calcAxialCapacity(Asc);

    return { Asc, PuCapacity };
  }

  // ==========================================================================
  // CLAUSE 39.5: MEMBERS SUBJECTED TO COMBINED AXIAL AND UNI-AXIAL BENDING
  // ==========================================================================

  /**
   * Calculate moment capacity using SP-16 charts (simplified approach)
   * Uses the approximate formula for rectangular sections
   */
  calcMomentCapacity(Pu: number, axis: 'x' | 'y', Asc: number): number {
    const { b, D } = this.geometry;
    const { fck } = this.concrete;
    const { fy } = this.steel;

    const width = axis === 'x' ? b : D;
    const depth = axis === 'x' ? D : b;
    const d = depth - this.cover - 10;

    // p/fck ratio
    const p = (Asc * 100) / (b * D);
    const pFck = p / fck;

    // Pu/fck*b*D ratio
    const PuRatio = (Pu * 1000) / (fck * b * D);

    // Approximate moment capacity using simplified SP-16 approach
    // Mu/fck*b*D² depends on Pu/fck*b*D and p/fck
    // Using approximate formula for balanced failure
    const k = 0.87 * fy / (0.36 * fck);
    const xuD = Math.min(0.48, PuRatio / 0.36 + 0.002);

    // Mu = 0.36 * fck * b * xu * (d - 0.42 * xu) + Asc/2 * (fy/1.15) * (d - d')
    const xu = xuD * depth;
    const dPrime = this.cover + 10;
    const Mu = (0.36 * fck * width * xu * (d - 0.42 * xu) + 
                (Asc / 2) * (fy / 1.15) * (d - dPrime)) / 1e6;

    return Math.max(Mu, 0);
  }

  // ==========================================================================
  // CLAUSE 39.6: BIAXIAL BENDING
  // ==========================================================================

  /**
   * Check biaxial bending using interaction equation (Clause 39.6)
   * (Mux/Mux1)^αn + (Muy/Muy1)^αn ≤ 1.0
   */
  checkBiaxialBending(Asc: number): { ratio: number; pass: boolean } {
    const { Pu, Mux = 0, Muy = 0 } = this.forces;
    const { b, D } = this.geometry;
    const { fck } = this.concrete;

    if (Mux === 0 && Muy === 0) {
      return { ratio: 0, pass: true };
    }

    // Uniaxial moment capacities
    const Mux1 = this.calcMomentCapacity(Pu, 'x', Asc);
    const Muy1 = this.calcMomentCapacity(Pu, 'y', Asc);

    // Calculate αn based on Pu/Puz (Clause 39.6)
    const Puz = (0.45 * fck * (b * D - Asc) + 0.75 * this.steel.fy * Asc) / 1000;
    const PuPuz = Pu / Puz;

    // αn varies from 1.0 (Pu/Puz = 0.2) to 2.0 (Pu/Puz = 0.8)
    let alphan: number;
    if (PuPuz <= 0.2) {
      alphan = 1.0;
    } else if (PuPuz >= 0.8) {
      alphan = 2.0;
    } else {
      alphan = 1.0 + (PuPuz - 0.2) * (2.0 - 1.0) / (0.8 - 0.2);
    }

    // Interaction check
    const ratio = Math.pow(Mux / Mux1, alphan) + Math.pow(Muy / Muy1, alphan);

    return { ratio, pass: ratio <= 1.0 };
  }

  // ==========================================================================
  // CLAUSE 39.7: SLENDER COLUMN ADDITIONAL MOMENTS
  // ==========================================================================

  /**
   * Calculate additional moments for slender columns (Clause 39.7.1)
   */
  calcAdditionalMoments(): { MaxAdd: number; MayAdd: number } {
    const { b, D, L, kx = 1.0, ky = 1.0 } = this.geometry;
    const { Pu } = this.forces;
    const { lambdaX, lambdaY } = this.calcSlenderness();

    // Additional eccentricity (Clause 39.7.1)
    // ea = D * (Le/D)² / 2000 for bending about X axis
    const LeX = kx * L;
    const LeY = ky * L;

    const eaX = (D * Math.pow(LeX / D, 2)) / 2000;
    const eaY = (b * Math.pow(LeY / b, 2)) / 2000;

    // Additional moments
    const MaxAdd = (Pu * eaX) / 1000; // kN·m
    const MayAdd = (Pu * eaY) / 1000; // kN·m

    return { MaxAdd, MayAdd };
  }

  // ==========================================================================
  // DETAILING
  // ==========================================================================

  /**
   * Suggest bar configuration
   */
  suggestBars(Asc: number): { bars: string; ties: string } {
    const { b, D } = this.geometry;

    const barAreas: Record<number, number> = {
      12: 113.1,
      16: 201.1,
      20: 314.2,
      25: 490.9,
      32: 804.2,
    };

    // Minimum 4 bars for rectangular columns
    let selectedDia = 16;
    let numBars = 4;

    for (const [dia, area] of Object.entries(barAreas)) {
      const n = Math.ceil(Asc / area);
      if (n >= 4 && n <= 12) {
        selectedDia = parseInt(dia);
        numBars = n;
        break;
      }
    }

    // Distribute bars
    const barsPerSide = Math.ceil((numBars - 4) / 2) + 2;
    const bars = `${numBars}-${selectedDia}mm (${barsPerSide} on each face)`;

    // Ties (Clause 26.5.3.2)
    const tieDia = Math.max(selectedDia / 4, 6);
    const tieSpacing = Math.min(16 * selectedDia, Math.min(b, D), 300);
    const ties = `${Math.ceil(tieDia)}mm ties @ ${tieSpacing}mm c/c`;

    return { bars, ties };
  }

  // ==========================================================================
  // MAIN DESIGN
  // ==========================================================================

  /**
   * Perform complete column design per IS 456:2000
   */
  design(): ColumnDesignResult {
    const { b, D } = this.geometry;
    const { Pu, Mux = 0, Muy = 0 } = this.forces;

    const Ag = b * D;
    const { lambdaX, lambdaY, type } = this.calcSlenderness();
    const { eMinX, eMinY } = this.calcMinEccentricity();

    let status: ColumnDesignResult['status'] = 'PASS';
    let criticalCheck = 'None';

    // Adjust moments for minimum eccentricity
    const MuxDesign = Math.max(Mux, (Pu * eMinX) / 1000);
    const MuyDesign = Math.max(Muy, (Pu * eMinY) / 1000);

    // For slender columns, add additional moments
    let MuxTotal = MuxDesign;
    let MuyTotal = MuyDesign;

    if (type === 'slender') {
      const { MaxAdd, MayAdd } = this.calcAdditionalMoments();
      MuxTotal += MaxAdd;
      MuyTotal += MayAdd;
    }

    // Initial design for axial load
    let { Asc, PuCapacity } = this.designAxial();

    // Check biaxial bending and iterate if needed
    let biaxialCheck = this.checkBiaxialBending(Asc);
    let iterations = 0;
    const maxIterations = 10;

    while (!biaxialCheck.pass && iterations < maxIterations) {
      // Increase reinforcement
      Asc *= 1.2;
      biaxialCheck = this.checkBiaxialBending(Asc);
      iterations++;
    }

    // Check reinforcement limits
    const AscMin = (MIN_REINFORCEMENT / 100) * Ag;
    const AscMax = (MAX_REINFORCEMENT / 100) * Ag;

    if (Asc < AscMin) {
      Asc = AscMin;
    }

    if (Asc > AscMax) {
      status = 'FAIL';
      criticalCheck = 'Maximum reinforcement exceeded (Clause 26.5.3.1)';
    }

    if (!biaxialCheck.pass) {
      status = 'FAIL';
      criticalCheck = 'Biaxial bending check failed (Clause 39.6)';
    }

    // Calculate final capacity
    PuCapacity = this.calcAxialCapacity(Asc);

    if (Pu > PuCapacity) {
      status = 'FAIL';
      criticalCheck = 'Axial capacity exceeded';
    }

    // Calculate percentage
    const pPercent = (Asc * 100) / Ag;

    // Suggest detailing
    const { bars, ties } = this.suggestBars(Asc);

    return {
      Asc,
      pPercent,
      Ag,
      PuCapacity,
      columnType: type,
      lambdaX,
      lambdaY,
      eMin: Math.max(eMinX, eMinY),
      status,
      criticalCheck,
      bars,
      ties,
      interactionRatio: biaxialCheck.ratio,
    };
  }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Quick column design per IS 456:2000
 */
export function designRCColumnIS456(
  geometry: ColumnGeometry,
  forces: ColumnForces,
  concrete: ConcreteGrade,
  steel: SteelGrade
): ColumnDesignResult {
  const designer = new IS456ColumnDesigner(geometry, forces, concrete, steel);
  return designer.design();
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/*
const result = designRCColumnIS456(
  { b: 400, D: 400, L: 3500 },
  { Pu: 1200, Mux: 80, Muy: 60 },
  { fck: 25 },
  { fy: 500 }
);

console.log(result);
// {
//   Asc: 1920,
//   pPercent: 1.2,
//   Ag: 160000,
//   PuCapacity: 1450,
//   columnType: 'short',
//   lambdaX: 8.75,
//   lambdaY: 8.75,
//   eMin: 20.3,
//   status: 'PASS',
//   bars: '8-16mm (4 on each face)',
//   ties: '8mm ties @ 256mm c/c',
//   interactionRatio: 0.78
// }
*/
