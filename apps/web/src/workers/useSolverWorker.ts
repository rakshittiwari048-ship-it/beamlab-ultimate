// @ts-nocheck
/**
 * useSolverWorker.ts
 * 
 * Helper hook/module to use the SolverWorker from the main thread.
 * Provides a clean API with progress callbacks and promise-based results.
 */

import type {
  SolverInputMessage,
  WorkerOutputMessage,
  ProgressMessage,
  ResultMessage,
  ErrorMessage,
} from './SolverWorker';
import type { SolverNode, SolverMember, SolverSupport, NodalLoad } from '@beamlab/analysis-engine';
import type { SparseSolverResult } from '@beamlab/analysis-engine';

// ============================================================================
// TYPES
// ============================================================================

export interface SolverWorkerOptions {
  onProgress?: (data: ProgressMessage['data']) => void;
}

export interface SolverRequest {
  nodes: SolverNode[];
  members: SolverMember[];
  supports: SolverSupport[];
  loads: NodalLoad[];
  config?: {
    forceSparse?: boolean;
    forceDense?: boolean;
    tolerance?: number;
    maxIterations?: number;
  };
}

export interface SolverResponse {
  result: SparseSolverResult;
  displacements: Float64Array;
  reactions: Float64Array;
}

// ============================================================================
// SOLVER WORKER CLIENT
// ============================================================================

/**
 * Client for the SolverWorker
 * 
 * Usage:
 * ```ts
 * const workerClient = new SolverWorkerClient({
 *   onProgress: (data) => {
 *     console.log(`${data.stage}: ${data.progress}% - ${data.message}`);
 *   }
 * });
 * 
 * const result = await workerClient.solve({
 *   nodes,
 *   members,
 *   supports,
 *   loads,
 * });
 * 
 * console.log('Displacements:', result.displacements);
 * workerClient.terminate();
 * ```
 */
export class SolverWorkerClient {
  private worker: Worker | null = null;
  private options: SolverWorkerOptions;
  private isReady = false;
  private readyPromise: Promise<void>;

  constructor(options: SolverWorkerOptions = {}) {
    this.options = options;
    
    // Initialize worker
    this.readyPromise = this.initWorker();
  }

  private async initWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create worker (adjust path as needed)
        this.worker = new Worker(
          new URL('./SolverWorker.ts', import.meta.url),
          { type: 'module' }
        );

        // Wait for ready signal
        const readyHandler = (event: MessageEvent) => {
          if (event.data.type === 'ready') {
            this.isReady = true;
            this.worker?.removeEventListener('message', readyHandler);
            resolve();
          }
        };

        this.worker.addEventListener('message', readyHandler);
        this.worker.addEventListener('error', (error) => {
          reject(new Error(`Worker initialization error: ${error.message}`));
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Solve structural system in worker thread
   */
  async solve(request: SolverRequest): Promise<SolverResponse> {
    // Wait for worker to be ready
    await this.readyPromise;

    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    return new Promise((resolve, reject) => {
      const messageHandler = (event: MessageEvent<WorkerOutputMessage>) => {
        const message = event.data;

        switch (message.type) {
          case 'progress':
            // Forward progress to callback
            this.options.onProgress?.(message.data);
            break;

          case 'result':
            // Reconstruct result with transferred ArrayBuffers
            const resultData = message.data as ResultMessage['data'];
            
            // Convert transferred buffers back to typed arrays
            const displacements = new Float64Array(resultData.displacementsBuffer);
            const reactions = new Float64Array(resultData.reactionsBuffer);

            // Reconstruct full result
            const fullResult: SparseSolverResult = {
              ...resultData.result,
              displacements: Array.from(displacements),
              reactions: Array.from(reactions),
            };

            const response: SolverResponse = {
              result: fullResult,
              displacements,
              reactions,
            };

            // Clean up
            this.worker?.removeEventListener('message', messageHandler);
            resolve(response);
            break;

          case 'error':
            // Handle error
            const error = new Error(message.data.error);
            if (message.data.stack) {
              error.stack = message.data.stack;
            }

            // Clean up
            this.worker?.removeEventListener('message', messageHandler);
            reject(error);
            break;
        }
      };

      // Listen for messages
      this.worker.addEventListener('message', messageHandler);

      // Send solve request
      const inputMessage: SolverInputMessage = {
        type: 'solve',
        data: request,
      };

      this.worker.postMessage(inputMessage);
    });
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
    }
  }

  /**
   * Check if worker is ready
   */
  get ready(): boolean {
    return this.isReady;
  }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Convenience function for one-off solve operations
 * Creates a worker, solves, and terminates automatically.
 * 
 * Usage:
 * ```ts
 * const result = await solveInWorker({
 *   nodes,
 *   members,
 *   supports,
 *   loads,
 * }, {
 *   onProgress: (data) => console.log(data.message)
 * });
 * ```
 */
export async function solveInWorker(
  request: SolverRequest,
  options?: SolverWorkerOptions
): Promise<SolverResponse> {
  const client = new SolverWorkerClient(options);
  
  try {
    const result = await client.solve(request);
    return result;
  } finally {
    client.terminate();
  }
}

// ============================================================================
// REACT HOOK (OPTIONAL)
// ============================================================================

/**
 * React hook for using the solver worker
 * Manages worker lifecycle automatically
 * 
 * Usage:
 * ```tsx
 * const { solve, isReady, progress } = useSolverWorker();
 * 
 * const handleSolve = async () => {
 *   const result = await solve({ nodes, members, supports, loads });
 *   console.log(result);
 * };
 * ```
 */
export function useSolverWorkerHook() {
  const [progress, setProgress] = React.useState<ProgressMessage['data'] | null>(null);
  const [isReady, setIsReady] = React.useState(false);
  const clientRef = React.useRef<SolverWorkerClient | null>(null);

  // Initialize worker on mount
  React.useEffect(() => {
    const client = new SolverWorkerClient({
      onProgress: (data) => setProgress(data),
    });

    client.readyPromise.then(() => setIsReady(true));
    clientRef.current = client;

    // Cleanup on unmount
    return () => {
      client.terminate();
    };
  }, []);

  const solve = React.useCallback(
    async (request: SolverRequest): Promise<SolverResponse> => {
      if (!clientRef.current) {
        throw new Error('Worker not initialized');
      }
      return clientRef.current.solve(request);
    },
    []
  );

  return {
    solve,
    isReady,
    progress,
  };
}

// Note: Import React if using the hook
// import React from 'react';
