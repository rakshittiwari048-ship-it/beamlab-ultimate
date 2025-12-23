/**
 * SolverWorker.ts
 * 
 * Web Worker for running WASM linear solver off the main thread.
 * Keeps the UI responsive during large matrix computations.
 */

// Message types for worker communication
interface SolverWorkerMessage {
  type: 'solve' | 'solve_sparse' | 'solve_cholesky' | 'solve_cg' | 'init' | 'benchmark';
  id: string;
  payload?: {
    stiffness?: Float64Array | number[];
    force?: Float64Array | number[];
    n?: number;
    // Sparse matrix format
    rowIndices?: Uint32Array | number[];
    colIndices?: Uint32Array | number[];
    values?: Float64Array | number[];
    // CG options
    maxIterations?: number;
    tolerance?: number;
    // Benchmark
    size?: number;
  };
}

interface SolverWorkerResponse {
  type: 'result' | 'error' | 'ready' | 'benchmark_result';
  id: string;
  payload?: {
    displacements?: number[];
    success?: boolean;
    error?: string;
    solveTimeMs?: number;
    method?: string;
    conditionNumber?: number | null;
    benchmarkTimeMs?: number;
  };
}

// WASM module reference
let wasmModule: any = null;
let isInitialized = false;

// Initialize WASM module
async function initWasm(): Promise<void> {
  if (isInitialized) return;
  
  try {
    // Dynamic import of WASM module
    // The path should be adjusted based on your build setup
    const wasm = await import('@beamlab/solver-wasm');
    await wasm.default();
    wasmModule = wasm;
    isInitialized = true;
    
    self.postMessage({
      type: 'ready',
      id: 'init',
      payload: { success: true }
    } as SolverWorkerResponse);
  } catch (error) {
    self.postMessage({
      type: 'error',
      id: 'init',
      payload: { 
        success: false, 
        error: `Failed to initialize WASM: ${error}` 
      }
    } as SolverWorkerResponse);
  }
}

// Handle incoming messages
self.onmessage = async (event: MessageEvent<SolverWorkerMessage>) => {
  const { type, id, payload } = event.data;
  
  try {
    switch (type) {
      case 'init':
        await initWasm();
        break;
        
      case 'solve':
        await handleSolve(id, payload!);
        break;
        
      case 'solve_sparse':
        await handleSolveSparse(id, payload!);
        break;
        
      case 'solve_cholesky':
        await handleSolveCholesky(id, payload!);
        break;
        
      case 'solve_cg':
        await handleSolveCG(id, payload!);
        break;
        
      case 'benchmark':
        await handleBenchmark(id, payload!);
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      payload: {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    } as SolverWorkerResponse);
  }
};

// Solve using LU decomposition
async function handleSolve(
  id: string,
  payload: NonNullable<SolverWorkerMessage['payload']>
): Promise<void> {
  if (!isInitialized) await initWasm();
  
  const { stiffness, force, n } = payload;
  
  if (!stiffness || !force || !n) {
    throw new Error('Missing required parameters: stiffness, force, n');
  }
  
  const stiffnessArray = stiffness instanceof Float64Array 
    ? stiffness 
    : new Float64Array(stiffness);
  const forceArray = force instanceof Float64Array 
    ? force 
    : new Float64Array(force);
  
  const result = wasmModule.solve_system(stiffnessArray, forceArray, n);
  
  self.postMessage({
    type: 'result',
    id,
    payload: {
      displacements: result.displacements,
      success: result.success,
      error: result.error,
      solveTimeMs: result.solve_time_ms,
      method: result.method,
      conditionNumber: result.condition_number
    }
  } as SolverWorkerResponse);
}

// Solve sparse system
async function handleSolveSparse(
  id: string,
  payload: NonNullable<SolverWorkerMessage['payload']>
): Promise<void> {
  if (!isInitialized) await initWasm();
  
  const { rowIndices, colIndices, values, force, n } = payload;
  
  if (!rowIndices || !colIndices || !values || !force || !n) {
    throw new Error('Missing required sparse parameters');
  }
  
  const rows = rowIndices instanceof Uint32Array 
    ? rowIndices 
    : new Uint32Array(rowIndices);
  const cols = colIndices instanceof Uint32Array 
    ? colIndices 
    : new Uint32Array(colIndices);
  const vals = values instanceof Float64Array 
    ? values 
    : new Float64Array(values);
  const forceArray = force instanceof Float64Array 
    ? force 
    : new Float64Array(force);
  
  const result = wasmModule.solve_sparse_system(rows, cols, vals, forceArray, n);
  
  self.postMessage({
    type: 'result',
    id,
    payload: {
      displacements: result.displacements,
      success: result.success,
      error: result.error,
      solveTimeMs: result.solve_time_ms,
      method: result.method
    }
  } as SolverWorkerResponse);
}

// Solve using Cholesky decomposition
async function handleSolveCholesky(
  id: string,
  payload: NonNullable<SolverWorkerMessage['payload']>
): Promise<void> {
  if (!isInitialized) await initWasm();
  
  const { stiffness, force, n } = payload;
  
  if (!stiffness || !force || !n) {
    throw new Error('Missing required parameters: stiffness, force, n');
  }
  
  const stiffnessArray = stiffness instanceof Float64Array 
    ? stiffness 
    : new Float64Array(stiffness);
  const forceArray = force instanceof Float64Array 
    ? force 
    : new Float64Array(force);
  
  const result = wasmModule.solve_cholesky(stiffnessArray, forceArray, n);
  
  self.postMessage({
    type: 'result',
    id,
    payload: {
      displacements: result.displacements,
      success: result.success,
      error: result.error,
      solveTimeMs: result.solve_time_ms,
      method: result.method
    }
  } as SolverWorkerResponse);
}

// Solve using Conjugate Gradient
async function handleSolveCG(
  id: string,
  payload: NonNullable<SolverWorkerMessage['payload']>
): Promise<void> {
  if (!isInitialized) await initWasm();
  
  const { stiffness, force, n, maxIterations = 1000, tolerance = 1e-10 } = payload;
  
  if (!stiffness || !force || !n) {
    throw new Error('Missing required parameters: stiffness, force, n');
  }
  
  const stiffnessArray = stiffness instanceof Float64Array 
    ? stiffness 
    : new Float64Array(stiffness);
  const forceArray = force instanceof Float64Array 
    ? force 
    : new Float64Array(force);
  
  const result = wasmModule.solve_conjugate_gradient(
    stiffnessArray,
    forceArray,
    n,
    maxIterations,
    tolerance
  );
  
  self.postMessage({
    type: 'result',
    id,
    payload: {
      displacements: result.displacements,
      success: result.success,
      error: result.error,
      solveTimeMs: result.solve_time_ms,
      method: result.method
    }
  } as SolverWorkerResponse);
}

// Benchmark
async function handleBenchmark(
  id: string,
  payload: NonNullable<SolverWorkerMessage['payload']>
): Promise<void> {
  if (!isInitialized) await initWasm();
  
  const { size = 100 } = payload;
  const time = wasmModule.benchmark_multiply(size);
  
  self.postMessage({
    type: 'benchmark_result',
    id,
    payload: {
      benchmarkTimeMs: time,
      success: true
    }
  } as SolverWorkerResponse);
}

// Export for TypeScript
export type { SolverWorkerMessage, SolverWorkerResponse };
