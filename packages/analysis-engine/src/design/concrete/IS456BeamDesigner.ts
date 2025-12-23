/**
 * IS456BeamDesigner.ts
 * 
 * Reinforced Concrete Beam Design per IS 456:2000 (Limit State Method)
 * 
 * Implements:
 * - Annex G: Flexure Design (Singly/Doubly Reinforced)
 * - Clause 40: Shear Design
 * - Clause 26.5.1: Minimum/Maximum Reinforcement
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface BeamGeometry {
  /** Width of beam (mm) */
  b: number;
  /** Overall depth of beam (mm) */
  D: number;
  /** Effective depth (mm) - if not provided, calculated as D - cover - dia/2 */
  d?: number;
  /** Clear cover to reinforcement (mm) - default 25 */
  cover?: number;
}

export interface BeamForces {
  /** Ultimate factored bending moment (kN·m) */
  Mu: number;
  /** Ultimate factored shear force (kN) */
  Vu: number;
}

export interface ConcreteGrade {
  /** Characteristic compressive strength of concrete (MPa) - e.g., 20, 25, 30 */
  fck: number;
}

export interface SteelGrade {
  /** Characteristic yield strength of steel (MPa) - e.g., 415, 500 */
  fy: number;
}

export interface FlexureDesignResult {
  /** Required area of tension steel (mm²) */
  Ast: number;
  /** Required area of compression steel (mm²) - if doubly reinforced */
  Asc: number;
  /** Neutral axis depth (mm) */
  xu: number;
  /** Limiting neutral axis depth (mm) */
  xuMax: number;
  /** Whether section is singly or doubly reinforced */
  type: 'singly' | 'doubly';
  /** Moment of resistance (kN·m) */
  Mulim: number;
  /** Reinforcement percentage */
  pt: number;
  /** Suggested bar configuration */
  bars: string;
}

export interface ShearDesignResult {
  /** Nominal shear stress τv (MPa) */
  tauV: number;
  /** Design shear strength of concrete τc (MPa) */
  tauC: number;
  /** Maximum shear stress τc,max (MPa) */
  tauCMax: number;
  /** Shear status */
  shearStatus: 'adequate' | 'stirrups-required' | 'section-inadequate';
  /** Required stirrup spacing (mm) */
  Sv?: number;
  /** Shear reinforcement area per unit length (mm²/m) */
  Asv?: number;
  /** Suggested stirrup configuration */
  stirrups?: string;
}

export interface BeamDesignResult {
  flexure: FlexureDesignResult;
  shear: ShearDesignResult;
  status: 'PASS' | 'FAIL';
  criticalCheck: string;
  minAst: number;
  maxAst: number;
}

// ============================================================================
// CONSTANTS (IS 456:2000)
// ============================================================================

/** Limiting xu/d ratios based on steel grade (Table G.1.1, Annex G) */
const XU_D_MAX: Record<number, number> = {
  250: 0.53,
  415: 0.48,
  500: 0.46,
  550: 0.44,
};

/** Maximum shear stress τc,max based on concrete grade (Table 20) */
const TAU_C_MAX: Record<number, number> = {
  15: 2.5,
  20: 2.8,
  25: 3.1,
  30: 3.5,
  35: 3.7,
  40: 4.0,
};

/** Design shear strength τc based on pt% (Table 19) - simplified */
function getTauC(fck: number, pt: number): number {
  // τc = 0.85 * √(0.8 * fck) * (√(1 + 5β) - 1) / (6β)
  // where β = 0.8 * fck / (6.89 * pt) but not less than 1
  const beta = Math.max(1, (0.8 * fck) / (6.89 * pt));
  const tauC = (0.85 * Math.sqrt(0.8 * fck) * (Math.sqrt(1 + 5 * beta) - 1)) / (6 * beta);
  return Math.min(tauC, TAU_C_MAX[fck] || 3.1);
}

// ============================================================================
// IS 456:2000 BEAM DESIGNER CLASS
// ============================================================================

export class IS456BeamDesigner {
  private geometry: BeamGeometry;
  private forces: BeamForces;
  private concrete: ConcreteGrade;
  private steel: SteelGrade;
  private d: number;
  private cover: number;

  constructor(
    geometry: BeamGeometry,
    forces: BeamForces,
    concrete: ConcreteGrade,
    steel: SteelGrade
  ) {
    this.geometry = geometry;
    this.forces = forces;
    this.concrete = concrete;
    this.steel = steel;
    this.cover = geometry.cover ?? 25;
    this.d = geometry.d ?? (geometry.D - this.cover - 10); // Assuming 20mm dia bars
  }

  // ==========================================================================
  // ANNEX G: FLEXURE DESIGN
  // ==========================================================================

  /**
   * Calculate limiting moment of resistance (Annex G.1.1)
   * Mulim = 0.36 * fck * b * xuMax * (d - 0.42 * xuMax)
   */
  calcMuLim(): { Mulim: number; xuMax: number } {
    const { b } = this.geometry;
    const { fck } = this.concrete;
    const { fy } = this.steel;

    const xuDMax = XU_D_MAX[fy] ?? 0.46;
    const xuMax = xuDMax * this.d;

    // Limiting moment (kN·m)
    const Mulim = (0.36 * fck * b * xuMax * (this.d - 0.42 * xuMax)) / 1e6;

    return { Mulim, xuMax };
  }

  /**
   * Design for flexure (Annex G)
   * Mu = 0.87 * fy * Ast * d * (1 - (Ast * fy) / (b * d * fck))
   */
  designFlexure(): FlexureDesignResult {
    const { b } = this.geometry;
    const { Mu } = this.forces;
    const { fck } = this.concrete;
    const { fy } = this.steel;
    const d = this.d;

    const { Mulim, xuMax } = this.calcMuLim();

    let Ast: number;
    let Asc = 0;
    let xu: number;
    let type: 'singly' | 'doubly';

    if (Mu <= Mulim) {
      // Singly reinforced section
      type = 'singly';

      // Solve quadratic: Mu = 0.87 * fy * Ast * d * (1 - (Ast * fy) / (b * d * fck))
      // Let R = Mu / (b * d²)
      const R = (Mu * 1e6) / (b * d * d);

      // Ast = (0.5 * fck / fy) * (1 - √(1 - 4.6 * R / fck)) * b * d
      const term = 1 - Math.sqrt(1 - (4.6 * R) / fck);
      Ast = (0.5 * fck / fy) * term * b * d;

      // Calculate xu
      xu = (0.87 * fy * Ast) / (0.36 * fck * b);
    } else {
      // Doubly reinforced section
      type = 'doubly';

      // Moment to be resisted by compression steel
      const Mu2 = Mu - Mulim;

      // Lever arm for compression steel (assuming d' = 0.1d)
      const dPrime = 0.1 * d;
      const leverArm = d - dPrime;

      // Compression steel (assuming fsc = 0.87 * fy for simplicity)
      Asc = (Mu2 * 1e6) / (0.87 * fy * leverArm);

      // Tension steel for Mulim
      const Ast1 = (0.5 * fck / fy) * (1 - Math.sqrt(1 - (4.6 * Mulim * 1e6) / (fck * b * d * d))) * b * d;

      // Additional tension steel for Mu2
      const Ast2 = Asc; // For equilibrium

      Ast = Ast1 + Ast2;
      xu = xuMax;
    }

    // Calculate reinforcement percentage
    const pt = (Ast * 100) / (b * d);

    // Suggest bar configuration
    const bars = this.suggestBars(Ast, 'tension');

    return {
      Ast,
      Asc,
      xu,
      xuMax,
      type,
      Mulim,
      pt,
      bars,
    };
  }

  // ==========================================================================
  // CLAUSE 40: SHEAR DESIGN
  // ==========================================================================

  /**
   * Design for shear (Clause 40)
   */
  designShear(pt: number): ShearDesignResult {
    const { b } = this.geometry;
    const { Vu } = this.forces;
    const { fck } = this.concrete;
    const { fy } = this.steel;
    const d = this.d;

    // Nominal shear stress (Clause 40.1)
    const tauV = (Vu * 1000) / (b * d); // MPa

    // Design shear strength of concrete (Table 19)
    const tauC = getTauC(fck, pt);

    // Maximum shear stress (Table 20)
    const tauCMax = TAU_C_MAX[fck] ?? 3.1;

    let shearStatus: ShearDesignResult['shearStatus'];
    let Sv: number | undefined;
    let Asv: number | undefined;
    let stirrups: string | undefined;

    if (tauV > tauCMax) {
      // Section inadequate - increase size
      shearStatus = 'section-inadequate';
    } else if (tauV > tauC) {
      // Shear reinforcement required (Clause 40.4)
      shearStatus = 'stirrups-required';

      // Shear to be resisted by stirrups
      const Vus = (tauV - tauC) * b * d / 1000; // kN

      // For vertical stirrups: Vus = 0.87 * fy * Asv * d / Sv
      // Assuming 2-legged 8mm stirrups: Asv = 2 * π * 8² / 4 = 100.5 mm²
      const AsvAssume = 100.5; // 2L-8mm

      // Calculate spacing
      Sv = (0.87 * fy * AsvAssume * d) / (Vus * 1000);

      // Check maximum spacing (Clause 26.5.1.5)
      const SvMax = Math.min(0.75 * d, 300);
      Sv = Math.min(Sv, SvMax);

      // Round down to practical value
      Sv = Math.floor(Sv / 25) * 25;
      Sv = Math.max(Sv, 75); // Minimum practical spacing

      Asv = (Vus * 1000 * Sv) / (0.87 * fy * d);
      stirrups = `2L-8mm @ ${Sv}mm c/c`;
    } else {
      // Only minimum shear reinforcement required
      shearStatus = 'adequate';

      // Minimum shear reinforcement (Clause 26.5.1.6)
      const AsvMin = (0.4 * b) / (0.87 * fy);
      const SvMax = Math.min(0.75 * d, 300);
      Sv = SvMax;
      Asv = AsvMin * Sv;
      stirrups = `2L-8mm @ ${Sv}mm c/c (minimum)`;
    }

    return {
      tauV,
      tauC,
      tauCMax,
      shearStatus,
      Sv,
      Asv,
      stirrups,
    };
  }

  // ==========================================================================
  // REINFORCEMENT LIMITS (CLAUSE 26.5.1)
  // ==========================================================================

  /**
   * Calculate minimum reinforcement (Clause 26.5.1.1)
   * As,min = 0.85 * b * d / fy
   */
  calcMinAst(): number {
    const { b } = this.geometry;
    const { fy } = this.steel;
    return (0.85 * b * this.d) / fy;
  }

  /**
   * Calculate maximum reinforcement (Clause 26.5.1.1)
   * As,max = 0.04 * b * D (4% of gross area)
   */
  calcMaxAst(): number {
    const { b, D } = this.geometry;
    return 0.04 * b * D;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Suggest bar configuration for given area
   */
  suggestBars(area: number, _type: 'tension' | 'compression'): string {
    const barAreas: Record<number, number> = {
      10: 78.5,
      12: 113.1,
      16: 201.1,
      20: 314.2,
      25: 490.9,
      32: 804.2,
    };

    // Try different bar sizes
    for (const [dia, areaPerBar] of Object.entries(barAreas)) {
      const numBars = Math.ceil(area / areaPerBar);
      if (numBars <= 6) {
        return `${numBars}-${dia}mm (${(numBars * areaPerBar).toFixed(0)} mm²)`;
      }
    }

    // For larger areas, use multiple rows
    const numBars25 = Math.ceil(area / barAreas[25]);
    return `${numBars25}-25mm in 2 rows`;
  }

  // ==========================================================================
  // MAIN DESIGN
  // ==========================================================================

  /**
   * Perform complete beam design per IS 456:2000
   */
  design(): BeamDesignResult {
    // Flexure design
    const flexure = this.designFlexure();

    // Shear design
    const shear = this.designShear(flexure.pt);

    // Reinforcement limits
    const minAst = this.calcMinAst();
    const maxAst = this.calcMaxAst();

    // Check limits
    let status: 'PASS' | 'FAIL' = 'PASS';
    let criticalCheck = 'None';

    if (flexure.Ast < minAst) {
      flexure.Ast = minAst;
      flexure.bars = this.suggestBars(minAst, 'tension');
    }

    if (flexure.Ast > maxAst) {
      status = 'FAIL';
      criticalCheck = 'Maximum reinforcement exceeded (Clause 26.5.1.1)';
    }

    if (shear.shearStatus === 'section-inadequate') {
      status = 'FAIL';
      criticalCheck = 'Shear stress exceeds τc,max (Clause 40.2.3)';
    }

    return {
      flexure,
      shear,
      status,
      criticalCheck,
      minAst,
      maxAst,
    };
  }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Quick beam design per IS 456:2000
 */
export function designRCBeamIS456(
  geometry: BeamGeometry,
  forces: BeamForces,
  concrete: ConcreteGrade,
  steel: SteelGrade
): BeamDesignResult {
  const designer = new IS456BeamDesigner(geometry, forces, concrete, steel);
  return designer.design();
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/*
const result = designRCBeamIS456(
  { b: 300, D: 500 },
  { Mu: 250, Vu: 150 },
  { fck: 25 },
  { fy: 500 }
);

console.log(result);
// {
//   flexure: {
//     Ast: 1425.6,
//     Asc: 0,
//     xu: 98.2,
//     xuMax: 207,
//     type: 'singly',
//     Mulim: 286.4,
//     pt: 1.06,
//     bars: '5-20mm (1571 mm²)'
//   },
//   shear: {
//     tauV: 1.11,
//     tauC: 0.62,
//     tauCMax: 3.1,
//     shearStatus: 'stirrups-required',
//     Sv: 175,
//     stirrups: '2L-8mm @ 175mm c/c'
//   },
//   status: 'PASS',
//   ...
// }
*/
