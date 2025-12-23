/**
 * Features module index
 * 
 * Advanced analysis features including:
 * - Substructuring & Super Elements (Static Condensation)
 */

// Substructure Manager - Static Condensation
export {
  SubstructureManager,
  createSubstructureManager,
  mergeSuperElements,
  serializeSuperElement,
  deserializeSuperElement,
  type SubstructureNode,
  type SubstructureMember,
  type CreateSuperElementInput,
  type SuperElement,
  type SuperElementResult,
  type SubstructureConfig,
} from './SubstructureManager';

// Super Element Integration with Solver
export {
  HybridSuperElementSolver,
  prepareModelWithSuperElements,
  exampleFloorTrussBuilding,
  type SuperElementAnalysisInput,
  type SuperElementAnalysisResult,
} from './SuperElementIntegration';
