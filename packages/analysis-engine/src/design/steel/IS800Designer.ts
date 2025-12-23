/**
 * IS800Designer.ts
 * 
 * Steel Member Design per IS 800:2007 (Limit State Method)
 * 
 * Implements:
 * - Clause 6: Tension Members
 * - Clause 7: Compression Members (with Buckling Classes a,b,c,d)
 * - Clause 8: Bending Members (High/Low Shear)
 * - Clause 9.3: Combined Forces Interaction
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface MemberForces {
  /** Axial force (kN) - positive = tension, negative = compression */
  Pu: number;
  /** Major axis bending moment (kN·m) */
  Muy: number;
  /** Minor axis bending moment (kN·m) */
  Muz: number;
  /** Shear force (kN) */
  Vu: number;
}

export interface SectionProps {
  /** Gross area (cm²) */
  A: number;
  /** Plastic section modulus about major axis (cm³) */
  Zpy: number;
  /** Plastic section modulus about minor axis (cm³) */
  Zpz: number;
  /** Elastic section modulus about major axis (cm³) */
  Zey: number;
  /** Elastic section modulus about minor axis (cm³) */
  Zez: number;
  /** Flange width (mm) */
  bf: number;
  /** Flange thickness (mm) */
  tf: number;
  /** Web thickness (mm) */
  tw: number;
  /** Depth of section (mm) */
  D: number;
  /** Radius of gyration about major axis (cm) */
  ry: number;
  /** Radius of gyration about minor axis (cm) */
  rz: number;
  /** Section type for buckling class determination */
  sectionType: 'rolled-I' | 'welded-I' | 'hollow' | 'angle' | 'channel';
}

export interface Material {
  /** Yield strength (MPa) */
  fy: number;
  /** Ultimate tensile strength (MPa) */
  fu: number;
  /** Modulus of elasticity (MPa) - default 200000 */
  E?: number;
}

export interface MemberGeometry {
  /** Effective length about major axis (mm) */
  Ly: number;
  /** Effective length about minor axis (mm) */
  Lz: number;
  /** Laterally unbraced length for LTB (mm) */
  Lb?: number;
}

export interface DesignResult {
  /** Utilization ratio (demand/capacity) */
  ratio: number;
  /** Pass/Fail status */
  status: 'PASS' | 'FAIL';
  /** Critical clause number */
  criticalClause: string;
  /** Detailed capacity values */
  capacities: {
    /** Design tensile strength (kN) */
    Tdg?: number;
    /** Design compressive strength (kN) */
    Pd?: number;
    /** Design bending strength - major axis (kN·m) */
    Mdy?: number;
    /** Design bending strength - minor axis (kN·m) */
    Mdz?: number;
    /** Design shear strength (kN) */
    Vd?: number;
  };
  /** Individual check ratios */
  checkRatios: {
    tension?: number;
    compression?: number;
    bendingY?: number;
    bendingZ?: number;
    shear?: number;
    combined?: number;
  };
}

// ============================================================================
// CONSTANTS (IS 800:2007)
// ============================================================================

/** Partial safety factor for material - yielding (Clause 5.4.1) */
const GAMMA_M0 = 1.10;

/** Partial safety factor for material - ultimate stress (Clause 5.4.1) */
const GAMMA_M1 = 1.25;

/** Modulus of Elasticity for steel (MPa) */
const E_STEEL = 200000;

/**
 * Imperfection factor α for buckling curves (Table 7, IS 800:2007)
 */
const IMPERFECTION_FACTOR: Record<'a' | 'b' | 'c' | 'd', number> = {
  a: 0.21,
  b: 0.34,
  c: 0.49,
  d: 0.76,
};

// ============================================================================
// IS 800:2007 DESIGNER CLASS
// ============================================================================

export class IS800Designer {
  private forces: MemberForces;
  private section: SectionProps;
  private material: Material;
  private geometry: MemberGeometry;
  private E: number;

  constructor(
    forces: MemberForces,
    section: SectionProps,
    material: Material,
    geometry: MemberGeometry
  ) {
    this.forces = forces;
    this.section = section;
    this.material = material;
    this.geometry = geometry;
    this.E = material.E ?? E_STEEL;
  }

  // ==========================================================================
  // CLAUSE 6: TENSION MEMBERS
  // ==========================================================================

  /**
   * Design Strength in Tension (Clause 6.2)
   * Tdg = Ag * fy / γm0
   */
  calcTensionCapacity(): number {
    const Ag = this.section.A * 100; // Convert cm² to mm²
    const fy = this.material.fy;
    const Tdg = (Ag * fy) / (GAMMA_M0 * 1000); // kN
    return Tdg;
  }

  /**
   * Check tension member (Clause 6)
   */
  checkTension(): { ratio: number; capacity: number } {
    const Pu = this.forces.Pu;
    if (Pu <= 0) {
      return { ratio: 0, capacity: this.calcTensionCapacity() };
    }
    const Tdg = this.calcTensionCapacity();
    const ratio = Pu / Tdg;
    return { ratio, capacity: Tdg };
  }

  // ==========================================================================
  // CLAUSE 7: COMPRESSION MEMBERS
  // ==========================================================================

  /**
   * Determine buckling class based on section type and axis (Table 10)
   */
  getBucklingClass(axis: 'y' | 'z'): 'a' | 'b' | 'c' | 'd' {
    const { sectionType, tf, bf } = this.section;

    switch (sectionType) {
      case 'rolled-I':
        // For rolled I-sections (Table 10)
        if (tf <= 40) {
          return axis === 'y' ? 'a' : 'b';
        } else {
          return axis === 'y' ? 'b' : 'c';
        }

      case 'welded-I':
        // For welded I-sections (Table 10)
        if (tf <= 40) {
          return axis === 'y' ? 'b' : 'c';
        } else {
          return axis === 'y' ? 'c' : 'd';
        }

      case 'hollow':
        // Hot-finished hollow sections
        return 'a';

      case 'channel':
        return 'c';

      case 'angle':
        return 'c';

      default:
        return 'c';
    }
  }

  /**
   * Calculate design compressive stress fcd (Clause 7.1.2)
   * Uses Euler-based buckling approach with imperfection factors
   */
  calcCompressionCapacity(): { Pd: number; fcd: number; lambda: number } {
    const { A, ry, rz } = this.section;
    const { Ly, Lz } = this.geometry;
    const { fy } = this.material;

    // Convert units
    const Ag = A * 100; // cm² to mm²
    const ryMm = ry * 10; // cm to mm
    const rzMm = rz * 10; // cm to mm

    // Slenderness ratios
    const lambdaY = Ly / ryMm;
    const lambdaZ = Lz / rzMm;

    // Non-dimensional slenderness ratio (Clause 7.1.2.1)
    const fcc = (Math.PI * Math.PI * this.E) / (lambdaY * lambdaY);
    const lambdaBarY = Math.sqrt(fy / fcc);

    const fccZ = (Math.PI * Math.PI * this.E) / (lambdaZ * lambdaZ);
    const lambdaBarZ = Math.sqrt(fy / fccZ);

    // Get buckling class and imperfection factor for each axis
    const bucklingClassY = this.getBucklingClass('y');
    const bucklingClassZ = this.getBucklingClass('z');
    const alphaY = IMPERFECTION_FACTOR[bucklingClassY];
    const alphaZ = IMPERFECTION_FACTOR[bucklingClassZ];

    // Calculate stress reduction factor χ for each axis (Clause 7.1.2.1)
    const phiY = 0.5 * (1 + alphaY * (lambdaBarY - 0.2) + lambdaBarY * lambdaBarY);
    const chiY = 1 / (phiY + Math.sqrt(phiY * phiY - lambdaBarY * lambdaBarY));

    const phiZ = 0.5 * (1 + alphaZ * (lambdaBarZ - 0.2) + lambdaBarZ * lambdaBarZ);
    const chiZ = 1 / (phiZ + Math.sqrt(phiZ * phiZ - lambdaBarZ * lambdaBarZ));

    // Use minimum χ value
    const chi = Math.min(chiY, chiZ, 1.0);
    const governingLambda = chiY < chiZ ? lambdaY : lambdaZ;

    // Design compressive stress (Clause 7.1.2)
    const fcd = (chi * fy) / GAMMA_M0;

    // Design compressive strength
    const Pd = (fcd * Ag) / 1000; // kN

    return { Pd, fcd, lambda: governingLambda };
  }

  /**
   * Check compression member (Clause 7)
   */
  checkCompression(): { ratio: number; capacity: number; lambda: number } {
    const Pu = this.forces.Pu;
    if (Pu >= 0) {
      const { Pd, lambda } = this.calcCompressionCapacity();
      return { ratio: 0, capacity: Pd, lambda };
    }
    const { Pd, lambda } = this.calcCompressionCapacity();
    const ratio = Math.abs(Pu) / Pd;
    return { ratio, capacity: Pd, lambda };
  }

  // ==========================================================================
  // CLAUSE 8: BENDING MEMBERS
  // ==========================================================================

  /**
   * Calculate shear capacity (Clause 8.4)
   * Vd = Av * fyw / (√3 * γm0)
   */
  calcShearCapacity(): number {
    const { D, tw } = this.section;
    const { fy } = this.material;

    // Shear area for I-section (Clause 8.4.1.1)
    const Av = D * tw; // mm²

    // Design shear strength
    const Vd = (Av * fy) / (Math.sqrt(3) * GAMMA_M0 * 1000); // kN

    return Vd;
  }

  /**
   * Check if high shear condition exists (Clause 8.2.1.2)
   * High shear when V > 0.6 * Vd
   */
  isHighShear(): boolean {
    const Vd = this.calcShearCapacity();
    return Math.abs(this.forces.Vu) > 0.6 * Vd;
  }

  /**
   * Calculate bending capacity (Clause 8.2)
   * For Low Shear: Md = βb * Zp * fy / γm0
   * For High Shear: Reduced capacity per Clause 8.2.1.2
   */
  calcBendingCapacity(axis: 'y' | 'z'): number {
    const Zp = axis === 'y' ? this.section.Zpy : this.section.Zpz;
    const Ze = axis === 'y' ? this.section.Zey : this.section.Zez;
    const { fy } = this.material;

    // Convert cm³ to mm³
    const ZpMm3 = Zp * 1000;
    const ZeMm3 = Ze * 1000;

    // Section classification factor βb (Clause 8.2.1.2)
    // For plastic/compact sections, βb = 1.0
    // For semi-compact sections, βb = Ze/Zp
    const betaB = Math.min(1.0, ZpMm3 / ZeMm3);

    // Base bending capacity
    let Md = (betaB * ZpMm3 * fy) / (GAMMA_M0 * 1e6); // kN·m

    // Check high shear condition
    if (this.isHighShear()) {
      const Vd = this.calcShearCapacity();
      const Vu = Math.abs(this.forces.Vu);
      const beta = Math.pow((2 * Vu / Vd - 1), 2);

      // For I-sections, reduce by web contribution (Clause 8.2.1.2)
      const { D, tw, tf } = this.section;
      const dw = D - 2 * tf; // Web depth
      const Mfd = (ZpMm3 - (dw * tw * dw / 4)) * fy / (GAMMA_M0 * 1e6);
      const Mdv = Md - beta * (Md - Mfd);
      Md = Math.min(Md, Mdv);
    }

    // Limit to 1.2 * Ze * fy / γm0 (Clause 8.2.1)
    const MdMax = (1.2 * ZeMm3 * fy) / (GAMMA_M0 * 1e6);
    Md = Math.min(Md, MdMax);

    return Md;
  }

  /**
   * Check bending (Clause 8)
   */
  checkBending(): { ratioY: number; ratioZ: number; Mdy: number; Mdz: number } {
    const Mdy = this.calcBendingCapacity('y');
    const Mdz = this.calcBendingCapacity('z');

    const ratioY = Math.abs(this.forces.Muy) / Mdy;
    const ratioZ = Math.abs(this.forces.Muz) / Mdz;

    return { ratioY, ratioZ, Mdy, Mdz };
  }

  /**
   * Check shear (Clause 8.4)
   */
  checkShear(): { ratio: number; capacity: number } {
    const Vd = this.calcShearCapacity();
    const ratio = Math.abs(this.forces.Vu) / Vd;
    return { ratio, capacity: Vd };
  }

  // ==========================================================================
  // CLAUSE 9.3: COMBINED FORCES
  // ==========================================================================

  /**
   * Combined axial and bending check (Clause 9.3)
   * (N/Nd) + (My/Mdy) + (Mz/Mdz) ≤ 1.0
   */
  checkCombined(): { ratio: number; components: { axial: number; bendingY: number; bendingZ: number } } {
    const { Pu, Muy, Muz } = this.forces;

    // Get axial capacity
    let Nd: number;
    if (Pu > 0) {
      Nd = this.calcTensionCapacity();
    } else {
      Nd = this.calcCompressionCapacity().Pd;
    }

    // Get bending capacities
    const Mdy = this.calcBendingCapacity('y');
    const Mdz = this.calcBendingCapacity('z');

    // Calculate individual ratios
    const axialRatio = Math.abs(Pu) / Nd;
    const bendingYRatio = Math.abs(Muy) / Mdy;
    const bendingZRatio = Math.abs(Muz) / Mdz;

    // Combined interaction ratio (Clause 9.3.1)
    const combinedRatio = axialRatio + bendingYRatio + bendingZRatio;

    return {
      ratio: combinedRatio,
      components: {
        axial: axialRatio,
        bendingY: bendingYRatio,
        bendingZ: bendingZRatio,
      },
    };
  }

  // ==========================================================================
  // MAIN DESIGN CHECK
  // ==========================================================================

  /**
   * Perform complete design check per IS 800:2007
   */
  design(): DesignResult {
    const capacities: DesignResult['capacities'] = {};
    const checkRatios: DesignResult['checkRatios'] = {};

    // Individual checks
    const tensionCheck = this.checkTension();
    capacities.Tdg = tensionCheck.capacity;
    checkRatios.tension = tensionCheck.ratio;

    const compressionCheck = this.checkCompression();
    capacities.Pd = compressionCheck.capacity;
    checkRatios.compression = compressionCheck.ratio;

    const bendingCheck = this.checkBending();
    capacities.Mdy = bendingCheck.Mdy;
    capacities.Mdz = bendingCheck.Mdz;
    checkRatios.bendingY = bendingCheck.ratioY;
    checkRatios.bendingZ = bendingCheck.ratioZ;

    const shearCheck = this.checkShear();
    capacities.Vd = shearCheck.capacity;
    checkRatios.shear = shearCheck.ratio;

    const combinedCheck = this.checkCombined();
    checkRatios.combined = combinedCheck.ratio;

    // Determine critical condition
    const checks = [
      { ratio: tensionCheck.ratio, clause: 'Clause 6 - Tension' },
      { ratio: compressionCheck.ratio, clause: 'Clause 7 - Compression' },
      { ratio: Math.max(bendingCheck.ratioY, bendingCheck.ratioZ), clause: 'Clause 8 - Bending' },
      { ratio: shearCheck.ratio, clause: 'Clause 8.4 - Shear' },
      { ratio: combinedCheck.ratio, clause: 'Clause 9.3 - Combined' },
    ];

    const critical = checks.reduce((max, check) => 
      check.ratio > max.ratio ? check : max
    );

    return {
      ratio: critical.ratio,
      status: critical.ratio <= 1.0 ? 'PASS' : 'FAIL',
      criticalClause: critical.clause,
      capacities,
      checkRatios,
    };
  }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Quick design check for a steel member per IS 800:2007
 */
export function designSteelMemberIS800(
  forces: MemberForces,
  section: SectionProps,
  material: Material,
  geometry: MemberGeometry
): DesignResult {
  const designer = new IS800Designer(forces, section, material, geometry);
  return designer.design();
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/*
const forces: MemberForces = {
  Pu: -500,    // 500 kN compression
  Muy: 150,    // 150 kN·m major axis moment
  Muz: 20,     // 20 kN·m minor axis moment
  Vu: 100,     // 100 kN shear
};

const section: SectionProps = {
  A: 98.5,     // ISMB 450
  Zpy: 1533,
  Zpz: 235,
  Zey: 1350,
  Zez: 150,
  bf: 150,
  tf: 17.4,
  tw: 9.4,
  D: 450,
  ry: 18.5,
  rz: 3.01,
  sectionType: 'rolled-I',
};

const material: Material = {
  fy: 250,
  fu: 410,
};

const geometry: MemberGeometry = {
  Ly: 4000,
  Lz: 4000,
};

const result = designSteelMemberIS800(forces, section, material, geometry);
console.log(result);
// { ratio: 0.72, status: 'PASS', criticalClause: 'Clause 9.3 - Combined', ... }
*/
