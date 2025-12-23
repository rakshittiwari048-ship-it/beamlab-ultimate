/**
 * SteelDesignEngine - Simplified IS code-oriented checks.
 * 
 * This is a lightweight utility to assess member utilization using
 * core IS 800 concepts (limit state design), approximated for quick screening:
 *  - Tension: φPn with φt ~0.9
 *  - Compression: Euler-based estimate with slenderness limits
 *  - Flexure: plastic moment vs lateral buckling (using Lp/Lr style bounds)
 *  - Interaction: Pr/Pc + (8/9)(Mr/Mc) ≤ 1.0
 *
 * Note: This is a simplified helper. For production, replace the
 * approximations with full IS 800 clause-by-clause checks
 * (net area, shear lag, local buckling, lateral torsional buckling,
 * interaction factors, etc.).
 */

import type { Section, Material } from '@beamlab/types';

export interface MemberDesignInput {
  length: number;      // Unbraced length (m)
  kFactor?: number;    // Effective length factor (default 1.0)
  Lb?: number;         // Lateral unbraced length for flexure (m)
}

export interface MemberForces {
  Pu: number;  // Axial factored force (kN, +compression, -tension)
  Mux: number; // Major-axis moment (kN-m)
  Muy: number; // Minor-axis moment (kN-m)
}

export interface DesignCheckResult {
  utilization: number;
  governingEquation: string;
  components: {
    tension?: number;
    compression?: number;
    flexureMajor?: number;
    flexureMinor?: number;
    interaction?: number;
  };
}

const PHI_T = 0.9; // tension resistance factor (approx)
const PHI_C = 0.85; // compression resistance factor (approx)
const PHI_M = 0.9; // flexure resistance factor (approx)

function radiusOfGyration(I: number, A: number): number {
  return Math.sqrt(Math.max(I, 0) / Math.max(A, 1e-12));
}

function plasticMoment(fy: number, Z: number): number {
  return fy * Z / 1e6; // convert N*mm to kN-m if Z in mm³; assume SI (here expect m³). Keep in kN-m with consistent units.
}

function elasticBucklingStress(E: number, KLr: number): number {
  // Fe = (pi^2 * E) / (KL/r)^2
  const slender = Math.max(KLr, 1e-6);
  return (Math.PI * Math.PI * E) / (slender * slender);
}

function compressionCapacity(area: number, fy: number, E: number, KLr: number): number {
  // Simplified: use Euler when slender; squash when stocky.
  const Fe = elasticBucklingStress(E, KLr);
  // IS approach blends via stress; here use A * min(fy, 0.877 Fe)
  const fcr = Math.min(fy, 0.877 * Fe);
  // Convert to kN: assume area in m^2, fy in Pa -> N
  const Pn_N = area * fcr; // N
  const Pn_kN = Pn_N / 1000;
  return PHI_C * Pn_kN;
}

function tensionCapacity(area: number, fy: number): number {
  const Pn_N = area * fy; // N
  return PHI_T * (Pn_N / 1000); // kN
}

function flexureCapacity(fy: number, Z: number, Lb: number | undefined, Lp: number, Lr: number): number {
  // Simplified: if Lb <= Lp => plastic; if >= Lr => elastic; linear in between
  const Mp = plasticMoment(fy, Z); // kN-m
  if (Lb === undefined) return PHI_M * Mp;
  if (Lb <= Lp) return PHI_M * Mp;
  if (Lb >= Lr) return PHI_M * (Mp * (Lp / Lb));
  const Mc = Mp * (1 - (Lb - Lp) / (Lr - Lp)) + (Mp * (Lp / Lr)) * ((Lb - Lp) / (Lr - Lp));
  return PHI_M * Mc;
}

export function checkMember(
  member: MemberDesignInput,
  forces: MemberForces,
  section: Section,
  material: Material
): DesignCheckResult {
  const A = section.properties.area; // m^2
  const Iy = section.properties.momentOfInertiaY; // m^4
  const Iz = section.properties.momentOfInertiaZ; // m^4
  const Zy = section.properties.sectionModulusY ?? 0; // m^3
  const Zz = section.properties.sectionModulusZ ?? 0; // m^3
  const fy = material.yieldStrength ?? material.elasticModulus * 0.002; // Pa
  const E = material.elasticModulus; // Pa

  const k = member.kFactor ?? 1.0;
  const L = member.length;
  const ry = radiusOfGyration(Iy, A);
  const rz = radiusOfGyration(Iz, A);
  const KLry = (k * L) / Math.max(ry, 1e-6);
  const KLrz = (k * L) / Math.max(rz, 1e-6);
  const governingKLr = Math.max(KLry, KLrz);

  // Capacities
  const Pt = tensionCapacity(A, fy); // kN
  const Pc = compressionCapacity(A, fy, E, governingKLr); // kN

  // Flexure: use major/minor with Lp/Lr approximations
  const Lb = member.Lb ?? L;
  // Rough Lp/Lr estimates (placeholders):
  const Lp = 0.1 * L;
  const Lr = 1.0 * L;
  const Mnx = flexureCapacity(fy, Zy, Lb, Lp, Lr); // kN-m major
  const Mny = flexureCapacity(fy, Zz, Lb, Lp, Lr); // kN-m minor

  // Demand ratios
  const tensionRatio = forces.Pu < 0 ? Math.abs(forces.Pu) / Pt : 0; // tension negative
  const compressionRatio = forces.Pu > 0 ? forces.Pu / Pc : 0;
  const flexMajorRatio = Mnx > 0 ? Math.abs(forces.Mux) / Mnx : 0;
  const flexMinorRatio = Mny > 0 ? Math.abs(forces.Muy) / Mny : 0;

  // Interaction (axial + major flexure), using provided equation
  const PrOverPc = forces.Pu > 0 && Pc > 0 ? forces.Pu / Pc : 0;
  const MrOverMc = Mnx > 0 ? Math.abs(forces.Mux) / Mnx : 0;
  const interaction = PrOverPc + (8 / 9) * MrOverMc;

  const utilization = Math.max(tensionRatio, compressionRatio, flexMajorRatio, flexMinorRatio, interaction);
  const governing = (() => {
    const entries: Array<[string, number]> = [
      ['Tension', tensionRatio],
      ['Compression', compressionRatio],
      ['Flexure-Major', flexMajorRatio],
      ['Flexure-Minor', flexMinorRatio],
      ['Interaction', interaction],
    ];
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  })();

  return {
    utilization,
    governingEquation: governing,
    components: {
      tension: tensionRatio,
      compression: compressionRatio,
      flexureMajor: flexMajorRatio,
      flexureMinor: flexMinorRatio,
      interaction,
    },
  };
}
