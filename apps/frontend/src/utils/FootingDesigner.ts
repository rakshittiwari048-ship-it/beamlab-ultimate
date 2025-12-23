/**
 * FootingDesigner.ts
 * 
 * Foundation design utility per IS 456:2000 and IS 1904 (Code of practice for plain and reinforced concrete)
 * 
 * Handles:
 * 1. Area sizing based on soil bearing capacity (SBC)
 * 2. Eccentricity check (Kern limit: e < L/6)
 * 3. One-way shear design
 * 4. Punching shear design
 * 5. Thickness determination
 */

/**
 * Input parameters for footing design
 */
export interface FootingInput {
  P: number; // Axial load (kN)
  M: number; // Bending moment (kN-m)
  SBC: number; // Soil bearing capacity (kPa)
  concreteGrade: string; // e.g., "M25", "M30"
  steelGrade: string; // e.g., "Fe500"
  columnB: number; // Column width (mm)
  columnD: number; // Column depth (mm)
  cover: number; // Concrete cover (mm, default 50)
}

/**
 * Concrete properties
 */
const CONCRETE_PROPS: Record<string, { fck: number; tc: number }> = {
  'M20': { fck: 20, tc: 0.6 },
  'M25': { fck: 25, tc: 0.7 },
  'M30': { fck: 30, tc: 0.8 },
  'M35': { fck: 35, tc: 0.9 },
};

/**
 * Steel properties
 */
const STEEL_PROPS: Record<string, { fy: number }> = {
  'Fe250': { fy: 250 },
  'Fe415': { fy: 415 },
  'Fe500': { fy: 500 },
};

/**
 * Design output
 */
export interface FootingDesignResult {
  // Sizing
  areaRequired: number; // m²
  lengthProposed: number; // mm
  widthProposed: number; // mm
  areaProvided: number; // m² (actual provided)
  
  // Eccentricity
  eccentricity: number; // m
  kernLimit: number; // m (L/6)
  eccentricityOK: boolean;
  
  // Pressure check
  qMax: number; // kPa
  qMin: number; // kPa
  pressureOK: boolean;
  
  // Shear design
  oneWayShear: {
    Vu: number; // kN (shear force)
    d: number; // mm (effective depth)
    Vc: number; // kN (concrete shear capacity)
    Av: number; // mm² (stirrup area required)
    spacing: number; // mm
    OK: boolean;
  };
  
  punchingShear: {
    Vp: number; // kN (punching shear force)
    perimeter: number; // mm
    d: number; // mm (effective depth)
    Vpc: number; // kN (concrete punching capacity)
    OK: boolean;
  };
  
  // Thickness
  thicknessRequired: number; // mm (from shear)
  thicknessProposed: number; // mm (rounded)
  
  // Warnings
  warnings: string[];
  summary: string;
}

/**
 * Design a square or rectangular footing
 * 
 * @param input Footing input parameters
 * @returns Design result with sizing and checks
 */
export function designFooting(input: FootingInput): FootingDesignResult {
  const {
    P,
    M,
    SBC,
    concreteGrade,
    steelGrade,
    columnB,
    columnD,
    cover = 50,
  } = input;

  const concProps = CONCRETE_PROPS[concreteGrade];
  const steelProps = STEEL_PROPS[steelGrade];

  if (!concProps) throw new Error(`Unknown concrete grade: ${concreteGrade}`);
  if (!steelProps) throw new Error(`Unknown steel grade: ${steelGrade}`);

  const { fck } = concProps;
  const { fy } = steelProps;

  const warnings: string[] = [];

  // 1. AREA SIZING
  // Area_req = P / SBC (P in kN, SBC in kPa, Area in m²)
  const areaRequired = (P * 1000) / (SBC * 1000); // Convert kN to N, kPa to Pa
  
  // Assume square footing for simplicity; can be adjusted
  // Provide 10% extra for eccentricity and loadings
  const areaBase = areaRequired * 1.1;
  const sideBase = Math.sqrt(areaBase) * 1000; // mm

  // Round up to nearest 50 mm
  const lengthProposed = Math.ceil(sideBase / 50) * 50;
  const widthProposed = lengthProposed;
  const areaProvided = (lengthProposed * widthProposed) / 1e6; // m²

  // 2. ECCENTRICITY CHECK
  const eccentricity = M / P; // m (M in kN-m, P in kN)
  const kernLimit = lengthProposed / 6000; // m (length in mm → m)
  const eccentricityOK = eccentricity < kernLimit;

  if (!eccentricityOK) {
    warnings.push(
      `Eccentricity (${(eccentricity * 1000).toFixed(0)} mm) exceeds kern limit (${(kernLimit * 1000).toFixed(0)} mm). Consider increasing footing size.`
    );
  }

  // 3. PRESSURE CHECK (assuming rectangular distribution for simplicity)
  // For eccentric loading:
  // qMax = P/A + M*c/I
  // qMin = P/A - M*c/I
  // For square footing: I = B*L³/12, c = L/2
  const L = lengthProposed;
  const momentOfInertia = (widthProposed * L * L * L) / 12; // mm⁴
  const c = L / 2; // mm
  const momentStress = (M * 1e6 * c) / momentOfInertia; // kPa (convert M from kN-m to N-mm)
  const baseStress = (P * 1000) / (L * widthProposed); // kPa

  const qMax = (baseStress + momentStress) / 1000; // kPa
  const qMin = (baseStress - momentStress) / 1000; // kPa
  const pressureOK = qMax <= SBC && qMin >= 0;

  if (!pressureOK) {
    if (qMax > SBC) {
      warnings.push(
        `Max pressure (${qMax.toFixed(1)} kPa) exceeds SBC (${SBC.toFixed(1)} kPa). Increase footing size.`
      );
    }
    if (qMin < 0) {
      warnings.push(
        `Min pressure is negative (${qMin.toFixed(1)} kPa). Footing may lift. Increase footing size or reduce eccentricity.`
      );
    }
  }

  // 4. ONE-WAY SHEAR DESIGN
  // Critical section at distance d from column face
  // Assume average pressure = P / A
  const avgPressure = (P * 1000) / (L * widthProposed); // kPa (P in kN)

  // Distance from column to edge of footing
  const overhang = (L - columnB) / 2; // mm
  const dEffective = overhang * 0.5; // d ≈ 0.5 * overhang (approximate)
  const dOneWay = Math.max(dEffective, 200); // Minimum d = 200 mm

  // Shear force at critical section
  const VuOneWay = (avgPressure * overhang * widthProposed) / 1e6; // kN

  // Concrete shear capacity (IS 456: Vc = tc * b * d / 1000)
  // For flexure: tc depends on steel reinforcement; use 0.6 for conservative estimate
  const tcEffective = 0.6; // MPa (conservative)
  const VcOneWay = (tcEffective * widthProposed * dOneWay) / 1000; // kN

  const oneWayShearOK = VuOneWay <= VcOneWay;

  // Stirrup design (if required)
  let Av = 0;
  let spacing = 300;
  if (!oneWayShearOK) {
    const Vu = VuOneWay - VcOneWay; // Additional shear to be resisted by stirrups
    // Av*fy*d / s*1000 = Vu (in kN)
    const Av2Leg = 2 * (Math.PI * Math.pow(8, 2) / 4); // 2 legs of 8mm (mm²)
    spacing = Math.floor((Av2Leg * (fy / 1000) * dOneWay) / (Vu * 1000)); // mm
    spacing = Math.min(spacing, 300); // Max spacing 300 mm
    Av = Av2Leg;
  }

  if (!oneWayShearOK) {
    warnings.push(
      `One-way shear critical. Required stirrup spacing: ${spacing.toFixed(0)} mm.`
    );
  }

  // 5. PUNCHING SHEAR DESIGN
  // Perimeter at distance d/2 from column face
  const perimeter = 2 * (columnB + columnD + Math.PI * dOneWay); // mm (approximate)
  
  // Punching shear force (load - punched area pressure)
  const punchArea = (columnB + dOneWay) * (columnD + dOneWay); // mm²
  const punchPressure = (P * 1000 * punchArea) / (L * widthProposed * 1e6); // kPa (stress within punch perimeter)
  const Vp = (P * 1000) - (punchPressure * punchArea) / 1e6; // kN

  // Punching shear capacity (IS 456)
  // Vpc = 0.25 * sqrt(fck) * perimeter * d / 1000 (in kN)
  const Vpc = (0.25 * Math.sqrt(fck) * perimeter * dOneWay) / (1000 * 1000); // kN

  const punchingShearOK = Vp <= Vpc;

  if (!punchingShearOK) {
    warnings.push(
      `Punching shear critical. Increase footing thickness or use shear reinforcement.`
    );
  }

  // 6. THICKNESS DETERMINATION
  // From one-way shear: d ≈ Vu / (0.6 * b)
  let thicknessRequired = dOneWay + cover; // Add cover

  // Check punching shear and adjust if needed
  if (!punchingShearOK) {
    // Estimate required d from Vpc = 0.25*sqrt(fck)*perimeter*d/1000
    const dPunch = (Vp * 1000 * 1000) / (0.25 * Math.sqrt(fck) * perimeter);
    thicknessRequired = Math.max(thicknessRequired, dPunch + cover);
  }

  // Round up to nearest 50 mm
  const thicknessProposed = Math.ceil(thicknessRequired / 50) * 50;

  // Recalculate checks with proposed thickness
  const dFinal = thicknessProposed - cover;
  const VcFinal = (tcEffective * widthProposed * dFinal) / 1000;
  const VpFinal = (0.25 * Math.sqrt(fck) * perimeter * dFinal) / (1000 * 1000);

  // 7. SUMMARY
  const summary = `
Footing Design Summary
======================
Load: P = ${P.toFixed(1)} kN, M = ${M.toFixed(1)} kN-m
Soil Bearing Capacity: ${SBC.toFixed(0)} kPa
Column: ${columnB}mm x ${columnD}mm

Sizing:
- Required Area: ${areaRequired.toFixed(2)} m²
- Proposed Footing: ${lengthProposed}mm x ${widthProposed}mm (${areaProvided.toFixed(3)} m²)

Eccentricity:
- e = ${(eccentricity * 1000).toFixed(0)} mm
- Kern Limit (L/6) = ${(kernLimit * 1000).toFixed(0)} mm
- Status: ${eccentricityOK ? 'OK' : 'NOT OK'}

Bearing Pressure:
- qMax = ${qMax.toFixed(1)} kPa (Allowed: ${SBC.toFixed(0)} kPa)
- qMin = ${qMin.toFixed(1)} kPa
- Status: ${pressureOK ? 'OK' : 'NOT OK'}

One-way Shear:
- Vu = ${VuOneWay.toFixed(2)} kN, Vc = ${VcFinal.toFixed(2)} kN
- Status: ${VuOneWay <= VcFinal ? 'OK' : 'NOT OK'}

Punching Shear:
- Vp = ${Vp.toFixed(2)} kN, Vpc = ${VpFinal.toFixed(2)} kN
- Status: ${Vp <= VpFinal ? 'OK' : 'NOT OK'}

Thickness:
- Proposed: ${thicknessProposed}mm (d = ${dFinal}mm, cover = ${cover}mm)
${warnings.length > 0 ? `\nWarnings:\n${warnings.map((w) => `• ${w}`).join('\n')}` : ''}
`;

  return {
    areaRequired,
    lengthProposed,
    widthProposed,
    areaProvided,
    eccentricity,
    kernLimit,
    eccentricityOK,
    qMax,
    qMin,
    pressureOK,
    oneWayShear: {
      Vu: VuOneWay,
      d: dOneWay,
      Vc: VcFinal,
      Av,
      spacing,
      OK: VuOneWay <= VcFinal,
    },
    punchingShear: {
      Vp,
      perimeter,
      d: dFinal,
      Vpc: VpFinal,
      OK: Vp <= VpFinal,
    },
    thicknessRequired,
    thicknessProposed,
    warnings,
    summary,
  };
}

/**
 * Check if footing design is safe
 */
export function isFootingSafe(result: FootingDesignResult): boolean {
  return (
    result.eccentricityOK &&
    result.pressureOK &&
    result.oneWayShear.OK &&
    result.punchingShear.OK
  );
}

/**
 * Get recommendations for improving footing design
 */
export function getFootingRecommendations(result: FootingDesignResult): string[] {
  const recs: string[] = [];

  if (!result.eccentricityOK) {
    recs.push('Increase footing dimensions to reduce eccentricity ratio');
  }

  if (!result.pressureOK) {
    recs.push('Increase footing area to reduce bearing pressure');
  }

  if (!result.oneWayShear.OK) {
    recs.push(
      `Increase footing thickness or provide stirrups at ${result.oneWayShear.spacing}mm spacing`
    );
  }

  if (!result.punchingShear.OK) {
    recs.push('Increase footing thickness to resist punching shear');
  }

  return recs;
}
