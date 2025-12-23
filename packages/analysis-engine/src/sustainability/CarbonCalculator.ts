// @ts-nocheck
/**
 * CarbonCalculator.ts
 * 
 * Embodied Carbon Calculator for Structural Analysis
 * 
 * Calculates the total embodied carbon of a structure based on:
 * - Material quantities (volume, mass)
 * - Carbon emission factors from ICE database
 * - Sustainability ratings (A+ to F)
 * 
 * References:
 * - ICE Database v3.0 (Inventory of Carbon & Energy)
 * - IS 14900:2000 - Environmental Management
 */

import CarbonFactorsData from './CarbonFactors.json';

// ============================================================================
// INTERFACES
// ============================================================================

export interface MaterialQuantity {
  materialType: 'steel' | 'concrete' | 'rebar' | 'timber' | 'aluminum' | 'masonry';
  /** Volume in m³ */
  volume: number;
  /** Mass in kg (optional, calculated from volume if not provided) */
  mass?: number;
  /** Material variant (e.g., 'recycled_high', 'M30') */
  variant?: string;
  /** Concrete grade if applicable */
  concreteGrade?: 'M20' | 'M25' | 'M30' | 'M35' | 'M40' | 'M50';
}

export interface MemberCarbonData {
  memberId: string;
  memberLabel?: string;
  materialType: string;
  /** Length in meters */
  length: number;
  /** Cross-sectional area in m² */
  area: number;
  /** Volume in m³ */
  volume: number;
  /** Mass in kg */
  mass: number;
  /** Embodied carbon in kgCO2e */
  embodiedCarbon: number;
  /** Carbon intensity in kgCO2e/m */
  carbonIntensity: number;
  /** Normalized intensity (0-1) for heatmap coloring */
  normalizedIntensity: number;
}

export interface CarbonSummary {
  /** Total embodied carbon in kgCO2e */
  totalEmbodiedCarbon: number;
  /** Total embodied carbon in tCO2e */
  totalEmbodiedCarbonTonnes: number;
  /** Breakdown by material type */
  byMaterial: Record<string, {
    mass: number;
    volume: number;
    embodiedCarbon: number;
    percentage: number;
  }>;
  /** Carbon per floor area (if provided) */
  carbonPerArea?: number;
  /** Sustainability rating */
  rating: SustainabilityRating;
  /** Benchmark comparison */
  benchmark?: BenchmarkComparison;
  /** Individual member data */
  members: MemberCarbonData[];
  /** Statistics */
  statistics: {
    minIntensity: number;
    maxIntensity: number;
    avgIntensity: number;
    totalMass: number;
    totalVolume: number;
  };
}

export interface SustainabilityRating {
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  label: string;
  color: string;
  ratio: number;
  description: string;
}

export interface BenchmarkComparison {
  buildingType: string;
  benchmarkValue: number;
  actualValue: number;
  percentOfBenchmark: number;
  category: 'excellent' | 'good' | 'average' | 'poor';
}

export interface StructuralMember {
  id: string;
  label?: string;
  /** Start node coordinates */
  startNode: { x: number; y: number; z: number };
  /** End node coordinates */
  endNode: { x: number; y: number; z: number };
  /** Section properties */
  section: {
    area: number; // m²
    name?: string;
  };
  /** Material properties */
  material: {
    type: 'steel' | 'concrete' | 'rebar' | 'timber' | 'aluminum' | 'masonry';
    density?: number; // kg/m³
    grade?: string;
    variant?: string;
  };
}

export interface CarbonCalculatorOptions {
  /** Building/structure floor area in m² (for per-area calculations) */
  floorArea?: number;
  /** Building type for benchmark comparison */
  buildingType?: 'residential' | 'office' | 'industrial';
  /** Structure type for bridges */
  structureType?: 'building' | 'bridge';
  /** Bridge type if applicable */
  bridgeType?: 'steel' | 'concrete';
  /** Include sequestered carbon for timber (default: true) */
  includeSequestration?: boolean;
  /** Custom carbon factors override */
  customFactors?: Partial<Record<string, number>>;
}

// ============================================================================
// CARBON FACTORS DATABASE
// ============================================================================

const CarbonFactors = CarbonFactorsData as typeof CarbonFactorsData;

// ============================================================================
// CARBON CALCULATOR CLASS
// ============================================================================

export class CarbonCalculator {
  private options: CarbonCalculatorOptions;
  private customFactors: Map<string, number>;

  constructor(options: CarbonCalculatorOptions = {}) {
    this.options = {
      includeSequestration: true,
      structureType: 'building',
      ...options,
    };
    this.customFactors = new Map(Object.entries(options.customFactors || {}));
  }

  // ==========================================================================
  // MAIN CALCULATION METHODS
  // ==========================================================================

  /**
   * Calculate embodied carbon for a structure
   */
  calculateStructure(members: StructuralMember[]): CarbonSummary {
    const memberData: MemberCarbonData[] = [];
    const byMaterial: CarbonSummary['byMaterial'] = {};

    // Calculate for each member
    for (const member of members) {
      const data = this.calculateMember(member);
      memberData.push(data);

      // Aggregate by material
      const matKey = data.materialType;
      if (!byMaterial[matKey]) {
        byMaterial[matKey] = {
          mass: 0,
          volume: 0,
          embodiedCarbon: 0,
          percentage: 0,
        };
      }
      byMaterial[matKey].mass += data.mass;
      byMaterial[matKey].volume += data.volume;
      byMaterial[matKey].embodiedCarbon += data.embodiedCarbon;
    }

    // Calculate totals
    const totalEmbodiedCarbon = memberData.reduce((sum, m) => sum + m.embodiedCarbon, 0);
    const totalMass = memberData.reduce((sum, m) => sum + m.mass, 0);
    const totalVolume = memberData.reduce((sum, m) => sum + m.volume, 0);

    // Calculate percentages
    for (const mat of Object.values(byMaterial)) {
      mat.percentage = totalEmbodiedCarbon > 0 
        ? (mat.embodiedCarbon / totalEmbodiedCarbon) * 100 
        : 0;
    }

    // Calculate intensities for heatmap
    const intensities = memberData.map(m => m.carbonIntensity);
    const minIntensity = Math.min(...intensities);
    const maxIntensity = Math.max(...intensities);
    const avgIntensity = intensities.reduce((a, b) => a + b, 0) / intensities.length;

    // Normalize intensities
    for (const member of memberData) {
      member.normalizedIntensity = maxIntensity > minIntensity
        ? (member.carbonIntensity - minIntensity) / (maxIntensity - minIntensity)
        : 0.5;
    }

    // Calculate carbon per area
    const carbonPerArea = this.options.floorArea 
      ? totalEmbodiedCarbon / this.options.floorArea 
      : undefined;

    // Get benchmark comparison
    const benchmark = this.getBenchmarkComparison(carbonPerArea);

    // Calculate rating
    const rating = this.calculateRating(carbonPerArea, benchmark);

    return {
      totalEmbodiedCarbon,
      totalEmbodiedCarbonTonnes: totalEmbodiedCarbon / 1000,
      byMaterial,
      carbonPerArea,
      rating,
      benchmark,
      members: memberData,
      statistics: {
        minIntensity,
        maxIntensity,
        avgIntensity,
        totalMass,
        totalVolume,
      },
    };
  }

  /**
   * Calculate embodied carbon for a single member
   */
  calculateMember(member: StructuralMember): MemberCarbonData {
    // Calculate length
    const dx = member.endNode.x - member.startNode.x;
    const dy = member.endNode.y - member.startNode.y;
    const dz = member.endNode.z - member.startNode.z;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Calculate volume
    const volume = member.section.area * length;

    // Get density
    const density = this.getDensity(member.material.type, member.material.variant);

    // Calculate mass
    const mass = volume * density;

    // Get carbon factor
    const carbonFactor = this.getCarbonFactor(
      member.material.type,
      member.material.variant,
      member.material.grade
    );

    // Calculate embodied carbon
    let embodiedCarbon: number;
    if (member.material.type === 'concrete') {
      // Concrete uses kgCO2e/m³
      embodiedCarbon = volume * carbonFactor;
    } else {
      // Other materials use kgCO2e/kg
      embodiedCarbon = mass * carbonFactor;
    }

    // Calculate carbon intensity (per meter length)
    const carbonIntensity = length > 0 ? embodiedCarbon / length : 0;

    return {
      memberId: member.id,
      memberLabel: member.label,
      materialType: member.material.type,
      length,
      area: member.section.area,
      volume,
      mass,
      embodiedCarbon,
      carbonIntensity,
      normalizedIntensity: 0, // Will be normalized later
    };
  }

  /**
   * Calculate from material quantities (for simplified input)
   */
  calculateFromQuantities(quantities: MaterialQuantity[]): CarbonSummary {
    const members: StructuralMember[] = quantities.map((q, i) => ({
      id: `qty_${i}`,
      startNode: { x: 0, y: 0, z: 0 },
      endNode: { x: 1, y: 0, z: 0 },
      section: { area: q.volume }, // Use volume directly
      material: {
        type: q.materialType,
        variant: q.variant,
        grade: q.concreteGrade,
      },
    }));

    // Override calculation to use provided quantities
    const memberData: MemberCarbonData[] = quantities.map((q, i) => {
      const density = this.getDensity(q.materialType, q.variant);
      const mass = q.mass ?? q.volume * density;
      const carbonFactor = this.getCarbonFactor(
        q.materialType,
        q.variant,
        q.concreteGrade
      );

      let embodiedCarbon: number;
      if (q.materialType === 'concrete') {
        embodiedCarbon = q.volume * carbonFactor;
      } else {
        embodiedCarbon = mass * carbonFactor;
      }

      return {
        memberId: `qty_${i}`,
        materialType: q.materialType,
        length: 1,
        area: q.volume,
        volume: q.volume,
        mass,
        embodiedCarbon,
        carbonIntensity: embodiedCarbon,
        normalizedIntensity: 0,
      };
    });

    // Rest of calculation is same as calculateStructure
    return this.aggregateResults(memberData);
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private getDensity(materialType: string, variant?: string): number {
    const material = (CarbonFactors.materials as any)[materialType];
    if (!material) return 7850; // Default to steel density

    if (variant && material.variants?.[variant]?.density) {
      return material.variants[variant].density;
    }

    return material.density || 7850;
  }

  private getCarbonFactor(
    materialType: string,
    variant?: string,
    grade?: string
  ): number {
    // Check custom factors first
    const customKey = variant ? `${materialType}_${variant}` : materialType;
    if (this.customFactors.has(customKey)) {
      return this.customFactors.get(customKey)!;
    }

    const material = (CarbonFactors.materials as any)[materialType];
    if (!material) return 1.85; // Default to steel factor

    // Handle concrete grades
    if (materialType === 'concrete' && grade) {
      const gradeData = material.grades?.[grade];
      if (gradeData) {
        let factor = gradeData.carbonFactor;
        
        // Apply variant reduction if specified
        if (variant && material.variants?.[variant]?.carbonReduction) {
          factor *= (1 - material.variants[variant].carbonReduction);
        }
        
        return factor;
      }
    }

    // Handle variants
    if (variant && material.variants?.[variant]?.carbonFactor !== undefined) {
      return material.variants[variant].carbonFactor;
    }

    return material.carbonFactor;
  }

  private getBenchmarkComparison(carbonPerArea?: number): BenchmarkComparison | undefined {
    if (!carbonPerArea || !this.options.buildingType) return undefined;

    const benchmarks = this.options.structureType === 'bridge'
      ? (CarbonFactors.benchmarks.bridges as any)[this.options.bridgeType || 'steel']
      : (CarbonFactors.benchmarks.buildings as any)[this.options.buildingType];

    if (!benchmarks) return undefined;

    const categories = ['excellent', 'good', 'average', 'poor'] as const;
    let category: typeof categories[number] = 'poor';
    let benchmarkValue = benchmarks.poor;

    for (const cat of categories) {
      if (carbonPerArea <= benchmarks[cat]) {
        category = cat;
        benchmarkValue = benchmarks[cat];
        break;
      }
    }

    return {
      buildingType: this.options.buildingType,
      benchmarkValue: benchmarks.average,
      actualValue: carbonPerArea,
      percentOfBenchmark: (carbonPerArea / benchmarks.average) * 100,
      category,
    };
  }

  private calculateRating(
    carbonPerArea?: number,
    benchmark?: BenchmarkComparison
  ): SustainabilityRating {
    const ratio = benchmark 
      ? carbonPerArea! / benchmark.benchmarkValue 
      : carbonPerArea ? carbonPerArea / 500 : 1; // Default benchmark of 500 kgCO2e/m²

    const ratings = CarbonFactors.ratings.thresholds;
    
    for (const [grade, threshold] of Object.entries(ratings)) {
      if (ratio <= threshold.maxRatio) {
        return {
          grade: grade as SustainabilityRating['grade'],
          label: threshold.label,
          color: threshold.color,
          ratio,
          description: this.getRatingDescription(grade as string, ratio),
        };
      }
    }

    return {
      grade: 'F',
      label: 'Poor',
      color: '#991B1B',
      ratio,
      description: 'Significant improvements needed to reduce embodied carbon.',
    };
  }

  private getRatingDescription(grade: string, ratio: number): string {
    const descriptions: Record<string, string> = {
      'A+': 'Exceptional performance - leading-edge sustainable design',
      'A': 'Excellent performance - significantly below benchmark',
      'B': 'Very good performance - below industry average',
      'C': 'Good performance - meets current benchmark',
      'D': 'Average performance - typical for this building type',
      'E': 'Below average - improvements recommended',
      'F': 'Poor performance - significant improvements needed',
    };
    return descriptions[grade] || '';
  }

  private aggregateResults(memberData: MemberCarbonData[]): CarbonSummary {
    const byMaterial: CarbonSummary['byMaterial'] = {};

    for (const data of memberData) {
      const matKey = data.materialType;
      if (!byMaterial[matKey]) {
        byMaterial[matKey] = {
          mass: 0,
          volume: 0,
          embodiedCarbon: 0,
          percentage: 0,
        };
      }
      byMaterial[matKey].mass += data.mass;
      byMaterial[matKey].volume += data.volume;
      byMaterial[matKey].embodiedCarbon += data.embodiedCarbon;
    }

    const totalEmbodiedCarbon = memberData.reduce((sum, m) => sum + m.embodiedCarbon, 0);
    const totalMass = memberData.reduce((sum, m) => sum + m.mass, 0);
    const totalVolume = memberData.reduce((sum, m) => sum + m.volume, 0);

    for (const mat of Object.values(byMaterial)) {
      mat.percentage = totalEmbodiedCarbon > 0 
        ? (mat.embodiedCarbon / totalEmbodiedCarbon) * 100 
        : 0;
    }

    const intensities = memberData.map(m => m.carbonIntensity);
    const minIntensity = Math.min(...intensities);
    const maxIntensity = Math.max(...intensities);
    const avgIntensity = intensities.length > 0 
      ? intensities.reduce((a, b) => a + b, 0) / intensities.length 
      : 0;

    for (const member of memberData) {
      member.normalizedIntensity = maxIntensity > minIntensity
        ? (member.carbonIntensity - minIntensity) / (maxIntensity - minIntensity)
        : 0.5;
    }

    const carbonPerArea = this.options.floorArea 
      ? totalEmbodiedCarbon / this.options.floorArea 
      : undefined;

    const benchmark = this.getBenchmarkComparison(carbonPerArea);
    const rating = this.calculateRating(carbonPerArea, benchmark);

    return {
      totalEmbodiedCarbon,
      totalEmbodiedCarbonTonnes: totalEmbodiedCarbon / 1000,
      byMaterial,
      carbonPerArea,
      rating,
      benchmark,
      members: memberData,
      statistics: {
        minIntensity,
        maxIntensity,
        avgIntensity,
        totalMass,
        totalVolume,
      },
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get available material types
   */
  static getMaterialTypes(): string[] {
    return Object.keys(CarbonFactors.materials);
  }

  /**
   * Get concrete grades
   */
  static getConcreteGrades(): string[] {
    return Object.keys((CarbonFactors.materials as any).concrete.grades);
  }

  /**
   * Get carbon factor for a material
   */
  static getCarbonFactor(materialType: string, variant?: string): number {
    const material = (CarbonFactors.materials as any)[materialType];
    if (!material) return 0;

    if (variant && material.variants?.[variant]) {
      return material.variants[variant].carbonFactor;
    }

    return material.carbonFactor;
  }

  /**
   * Get rating thresholds
   */
  static getRatingThresholds(): typeof CarbonFactors.ratings.thresholds {
    return CarbonFactors.ratings.thresholds;
  }

  /**
   * Compare two design options
   */
  static compareOptions(
    option1: CarbonSummary,
    option2: CarbonSummary
  ): {
    carbonDifference: number;
    percentDifference: number;
    recommendation: string;
  } {
    const diff = option2.totalEmbodiedCarbon - option1.totalEmbodiedCarbon;
    const percentDiff = (diff / option1.totalEmbodiedCarbon) * 100;

    let recommendation: string;
    if (percentDiff < -10) {
      recommendation = 'Option 2 is significantly better for sustainability';
    } else if (percentDiff > 10) {
      recommendation = 'Option 1 is significantly better for sustainability';
    } else {
      recommendation = 'Both options have similar carbon impact';
    }

    return {
      carbonDifference: diff,
      percentDifference: percentDiff,
      recommendation,
    };
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick calculation for a single material quantity
 */
export function calculateEmbodiedCarbon(
  materialType: 'steel' | 'concrete' | 'rebar' | 'timber',
  volume: number,
  options?: {
    variant?: string;
    concreteGrade?: 'M20' | 'M25' | 'M30' | 'M35' | 'M40' | 'M50';
  }
): number {
  const calculator = new CarbonCalculator();
  const result = calculator.calculateFromQuantities([{
    materialType,
    volume,
    variant: options?.variant,
    concreteGrade: options?.concreteGrade,
  }]);
  return result.totalEmbodiedCarbon;
}

/**
 * Get sustainability rating for given carbon per area
 */
export function getSustainabilityRating(
  carbonPerArea: number,
  buildingType: 'residential' | 'office' | 'industrial' = 'office'
): SustainabilityRating {
  const calculator = new CarbonCalculator({ buildingType, floorArea: 1 });
  const benchmark = (calculator as any).getBenchmarkComparison(carbonPerArea);
  return (calculator as any).calculateRating(carbonPerArea, benchmark);
}
