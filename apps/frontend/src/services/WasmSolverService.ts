/**
 * WasmSolverService.ts
 * 
 * Service for managing the WASM solver Web Worker.
 * Provides a Promise-based API for solving linear systems.
 * Automatically falls back to JS solver if WASM is not available.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SolverResult {
  /** Solution displacement vector */
  displacements: number[];
  /** Whether solve was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Solve time in milliseconds */
  solveTimeMs: number;
  /** Solver method used */
  method: string;
  /** Matrix condition number estimate */
  conditionNumber?: number | null;
}

export interface SolverOptions {
  /** Force use of WASM solver */
  forceWasm?: boolean;
  /** Force use of JS solver */
  forceJs?: boolean;
  /** Use Cholesky for SPD matrices */
  useCholesky?: boolean;
  /** Use iterative CG solver */
  useCG?: boolean;
  /** CG max iterations */
  cgMaxIterations?: number;
  /** CG tolerance */
  cgTolerance?: number;
  /** Timeout in milliseconds */
  timeout?: number;
}

interface PendingRequest {
  resolve: (result: SolverResult) => void;
  reject: (error: Error) => void;
  timeout?: ReturnType<typeof setTimeout>;
}

/** Worker response structure */
interface WorkerResultPayload {
  displacements?: number[];
  success?: boolean;
  error?: string;
  solveTimeMs?: number;
  method?: string;
  conditionNumber?: number | null;
  benchmarkTimeMs?: number;
}

// ============================================================================
// WASM SOLVER SERVICE
// ============================================================================

class WasmSolverService {
  private worker: Worker | null = null;
  private isReady = false;
  private isInitializing = false;
  private pendingRequests = new Map<string, PendingRequest>();
  private requestCounter = 0;
  private wasmAvailable: boolean | null = null;

  // Node count threshold for using WASM solver
  private readonly WASM_THRESHOLD = 500;

  /**
   * Initialize the WASM solver worker
   */
  async initialize(): Promise<boolean> {
    if (this.isReady) return true;
    if (this.isInitializing) {
      // Wait for existing initialization
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (this.isReady || this.wasmAvailable === false) {
            clearInterval(check);
            resolve(this.isReady);
          }
        }, 100);
      });
    }

    this.isInitializing = true;

    try {
      // Check if Web Workers are supported
      if (typeof Worker === 'undefined') {
        console.warn('Web Workers not supported, falling back to JS solver');
        this.wasmAvailable = false;
        return false;
      }

      // Create worker
      this.worker = new Worker(
        new URL('./SolverWorker.ts', import.meta.url),
        { type: 'module' }
      );

      // Set up message handler
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);

      // Initialize WASM in worker
      const initResult = await this.sendToWorker('init', {});

      if (initResult.success) {
        this.isReady = true;
        this.wasmAvailable = true;
        console.log('✅ WASM solver initialized successfully');
        return true;
      } else {
        throw new Error(initResult.error || 'WASM initialization failed');
      }
    } catch (error) {
      console.warn('WASM solver initialization failed:', error);
      this.wasmAvailable = false;
      this.cleanup();
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Solve a linear system Kx = F
   * Automatically chooses between WASM and JS based on matrix size
   */
  async solve(
    stiffnessMatrix: number[][] | Float64Array,
    forceVector: number[] | Float64Array,
    options: SolverOptions = {}
  ): Promise<SolverResult> {
    const n = forceVector.length;
    
    // Flatten matrix if needed
    const flatStiffness = this.flattenMatrix(stiffnessMatrix, n);
    const forceArray = Array.isArray(forceVector) 
      ? new Float64Array(forceVector) 
      : forceVector;

    // Decide which solver to use
    const useWasm = this.shouldUseWasm(n, options);

    if (useWasm && this.isReady) {
      return this.solveWithWasm(flatStiffness, forceArray, n, options);
    } else {
      return this.solveWithJs(flatStiffness, forceArray, n);
    }
  }

  /**
   * Solve sparse system
   */
  async solveSparse(
    rowIndices: number[],
    colIndices: number[],
    values: number[],
    forceVector: number[],
    n: number,
    options: SolverOptions = {}
  ): Promise<SolverResult> {
    const useWasm = this.shouldUseWasm(n, options);

    if (useWasm && this.isReady) {
      const result = await this.sendToWorker('solve_sparse', {
        rowIndices: new Uint32Array(rowIndices),
        colIndices: new Uint32Array(colIndices),
        values: new Float64Array(values),
        force: new Float64Array(forceVector),
        n
      }, options.timeout);

      return {
        displacements: result.displacements || [],
        success: result.success ?? false,
        error: result.error,
        solveTimeMs: result.solveTimeMs ?? 0,
        method: result.method ?? 'WASM Sparse'
      };
    } else {
      // Fall back to dense JS solver
      return this.solveWithJs(
        this.sparseToFlat(rowIndices, colIndices, values, n),
        new Float64Array(forceVector),
        n
      );
    }
  }

  /**
   * Run benchmark
   */
  async benchmark(size: number = 100): Promise<{ wasmTimeMs: number; jsTimeMs: number }> {
    // WASM benchmark
    let wasmTimeMs = 0;
    if (this.isReady) {
      const result = await this.sendToWorker('benchmark', { size });
      wasmTimeMs = result.benchmarkTimeMs ?? 0;
    }

    // JS benchmark
    const jsStart = performance.now();
    const a = this.createRandomMatrix(size);
    const b = this.createRandomMatrix(size);
    this.multiplyMatrices(a, b, size);
    const jsTimeMs = performance.now() - jsStart;

    return { wasmTimeMs, jsTimeMs };
  }

  /**
   * Check if WASM solver is available
   */
  isWasmAvailable(): boolean {
    return this.wasmAvailable === true;
  }

  /**
   * Get current status
   */
  getStatus(): { ready: boolean; wasmAvailable: boolean | null } {
    return {
      ready: this.isReady,
      wasmAvailable: this.wasmAvailable
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isReady = false;
    this.pendingRequests.clear();
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private shouldUseWasm(n: number, options: SolverOptions): boolean {
    if (options.forceJs) return false;
    if (options.forceWasm) return true;
    if (this.wasmAvailable === false) return false;
    
    // Use WASM for models > threshold nodes
    // Each node has 6 DOFs, so matrix size = 6n x 6n
    return n >= this.WASM_THRESHOLD * 6;
  }

  private async solveWithWasm(
    stiffness: Float64Array,
    force: Float64Array,
    n: number,
    options: SolverOptions
  ): Promise<SolverResult> {
    let messageType = 'solve';
    const payload: Record<string, unknown> = {
      stiffness,
      force,
      n
    };

    if (options.useCholesky) {
      messageType = 'solve_cholesky';
    } else if (options.useCG) {
      messageType = 'solve_cg';
      payload.maxIterations = options.cgMaxIterations ?? 1000;
      payload.tolerance = options.cgTolerance ?? 1e-10;
    }

    const result = await this.sendToWorker(messageType, payload, options.timeout);

    return {
      displacements: result.displacements || [],
      success: result.success ?? false,
      error: result.error,
      solveTimeMs: result.solveTimeMs ?? 0,
      method: result.method ?? 'WASM',
      conditionNumber: result.conditionNumber
    };
  }

  private solveWithJs(
    stiffness: Float64Array,
    force: Float64Array,
    n: number
  ): SolverResult {
    const start = performance.now();

    try {
      // Simple Gaussian elimination with partial pivoting
      const A = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => stiffness[i * n + j])
      );
      const b = Array.from(force);

      // Forward elimination
      for (let k = 0; k < n; k++) {
        // Find pivot
        let maxRow = k;
        for (let i = k + 1; i < n; i++) {
          if (Math.abs(A[i][k]) > Math.abs(A[maxRow][k])) {
            maxRow = i;
          }
        }

        // Swap rows
        [A[k], A[maxRow]] = [A[maxRow], A[k]];
        [b[k], b[maxRow]] = [b[maxRow], b[k]];

        // Check for singularity
        if (Math.abs(A[k][k]) < 1e-12) {
          return {
            displacements: [],
            success: false,
            error: 'Matrix is singular',
            solveTimeMs: performance.now() - start,
            method: 'JavaScript Gaussian'
          };
        }

        // Eliminate column
        for (let i = k + 1; i < n; i++) {
          const factor = A[i][k] / A[k][k];
          for (let j = k; j < n; j++) {
            A[i][j] -= factor * A[k][j];
          }
          b[i] -= factor * b[k];
        }
      }

      // Back substitution
      const x = new Array(n).fill(0);
      for (let i = n - 1; i >= 0; i--) {
        let sum = b[i];
        for (let j = i + 1; j < n; j++) {
          sum -= A[i][j] * x[j];
        }
        x[i] = sum / A[i][i];
      }

      return {
        displacements: x,
        success: true,
        solveTimeMs: performance.now() - start,
        method: 'JavaScript Gaussian'
      };
    } catch (error) {
      return {
        displacements: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        solveTimeMs: performance.now() - start,
        method: 'JavaScript Gaussian'
      };
    }
  }

  private sendToWorker(
    type: string,
    payload: Record<string, unknown>,
    timeout: number = 30000
  ): Promise<WorkerResultPayload> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = `${type}_${++this.requestCounter}`;

      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Solver timeout after ${timeout}ms`));
      }, timeout);

      this.pendingRequests.set(id, {
        resolve: (result) => {
          clearTimeout(timeoutHandle);
          resolve(result as unknown as WorkerResultPayload);
        },
        reject: (error) => {
          clearTimeout(timeoutHandle);
          reject(error);
        },
        timeout: timeoutHandle
      });

      this.worker.postMessage({ type, id, payload });
    });
  }

  private handleWorkerMessage(event: MessageEvent): void {
    const { type, id, payload } = event.data;

    const pending = this.pendingRequests.get(id);
    if (pending) {
      this.pendingRequests.delete(id);
      
      if (type === 'error') {
        pending.reject(new Error(payload?.error || 'Unknown worker error'));
      } else {
        pending.resolve(payload || {});
      }
    }
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('Solver worker error:', error);
    
    // Reject all pending requests
    this.pendingRequests.forEach((pending) => {
      pending.reject(new Error(`Worker error: ${error.message}`));
    });
    this.pendingRequests.clear();
  }

  private flattenMatrix(
    matrix: number[][] | Float64Array,
    n: number
  ): Float64Array {
    if (matrix instanceof Float64Array) {
      return matrix;
    }

    const flat = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        flat[i * n + j] = matrix[i]?.[j] ?? 0;
      }
    }
    return flat;
  }

  private sparseToFlat(
    rows: number[],
    cols: number[],
    vals: number[],
    n: number
  ): Float64Array {
    const flat = new Float64Array(n * n);
    for (let i = 0; i < rows.length; i++) {
      flat[rows[i] * n + cols[i]] = vals[i];
    }
    return flat;
  }

  private createRandomMatrix(n: number): number[][] {
    return Array.from({ length: n }, () =>
      Array.from({ length: n }, () => Math.random())
    );
  }

  private multiplyMatrices(a: number[][], b: number[][], n: number): number[][] {
    const c = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < n; k++) {
          c[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    return c;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let solverInstance: WasmSolverService | null = null;

export function getWasmSolver(): WasmSolverService {
  if (!solverInstance) {
    solverInstance = new WasmSolverService();
  }
  return solverInstance;
}

export async function initializeWasmSolver(): Promise<boolean> {
  const solver = getWasmSolver();
  return solver.initialize();
}

export { WasmSolverService };
