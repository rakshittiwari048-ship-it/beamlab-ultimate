/**
 * Worker Module Exports
 * 
 * Central export point for all worker-related functionality.
 */

// Main worker client
export { SolverWorkerClient, solveInWorker } from './useSolverWorker';

// Types
export type {
  SolverWorkerOptions,
  SolverRequest,
  SolverResponse,
} from './useSolverWorker';

export type {
  SolverInputMessage,
  ProgressMessage,
  ResultMessage,
  ErrorMessage,
  WorkerOutputMessage,
} from './SolverWorker';

// Note: React hook not exported by default to avoid React dependency
// Import directly from './useSolverWorker' if needed:
// import { useSolverWorkerHook } from './workers/useSolverWorker';
