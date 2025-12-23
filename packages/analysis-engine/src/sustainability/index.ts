/**
 * Sustainability module index
 * 
 * Exports carbon calculation and sustainability analysis tools
 */

export {
  CarbonCalculator,
  calculateEmbodiedCarbon,
  getSustainabilityRating,
  type MaterialQuantity,
  type MemberCarbonData,
  type CarbonSummary,
  type SustainabilityRating,
  type BenchmarkComparison,
  type StructuralMember,
  type CarbonCalculatorOptions,
} from './CarbonCalculator';

// Re-export carbon factors for reference
export { default as CarbonFactors } from './CarbonFactors.json';
