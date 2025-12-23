/**
 * SolverWorker.ts
 * 
 * Web Worker for structural analysis solver.
 * Runs assemble() and solve() in a separate thread to avoid blocking the main thread.
 * 
 * Features:
 * - Offloads heavy computation (matrix assembly & solving)
 * - Progress events for UI feedback
 * - Zero-copy transfer using Transferable Objects (ArrayBuffers)
 * - Supports both dense and sparse solvers
 */

import { SparseSolver, type SparseSolverConfig, type SparseSolverResult } from '@beamlab/analysis-engine';
import type { SolverNode, SolverMember, SolverSupport, NodalLoad } from '@beamlab/analysis-engine';

// ============================================================================
// MESSAGE TYPES
// ============================================================================

/**
 * Input: Model data from main thread
 */
interface SolverInputMessage {
  type: 'solve';
  data: {
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
  };
}

/**
 * Output: Progress update
 */
interface ProgressMessage {
  type: 'progress';
  data: {
    stage: 'initializing' | 'assembling' | 'solving' | 'postprocessing';
    progress: number; // 0-100
    message: string;
  };
}

/**
 * Output: Computation result
 */
interface ResultMessage {
  type: 'result';
  data: {
    success: true;
    result: SparseSolverResult;
    // Transferable arrays for zero-copy
    displacementsBuffer: ArrayBuffer;
    reactionsBuffer: ArrayBuffer;
  };
}

/**
 * Output: Error
 */
interface ErrorMessage {
  type: 'error';
  data: {
    success: false;
    error: string;
    stack?: string;
  };
}

type WorkerOutputMessage = ProgressMessage | ResultMessage | ErrorMessage;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Send progress update to main thread
 */
function sendProgress(
  stage: ProgressMessage['data']['stage'],
  progress: number,
  message: string
): void {
  const msg: ProgressMessage = {
    type: 'progress',
    data: { stage, progress, message },
  };
  self.postMessage(msg);
}

/**
 * Send error to main thread
 */
function sendError(error: Error): void {
  const msg: ErrorMessage = {
    type: 'error',
    data: {
      success: false,
      error: error.message,
      stack: error.stack,
    },
  };
  self.postMessage(msg);
}

/**
 * Send result to main thread with transferable objects
 */
function sendResult(result: SparseSolverResult): void {
  // Convert result arrays to Float64Array for transferable
  const displacements = new Float64Array(result.displacements);
  const reactions = new Float64Array(result.reactions);

  // Get ArrayBuffers (these will be transferred, not copied)
  const displacementsBuffer = displacements.buffer;
  const reactionsBuffer = reactions.buffer;

  const msg: ResultMessage = {
    type: 'result',
    data: {
      success: true,
      result: {
        ...result,
        // Replace arrays with empty arrays (actual data in buffers)
        displacements: [],
        reactions: [],
      },
      displacementsBuffer,
      reactionsBuffer,
    },
  };

  // Transfer ownership of ArrayBuffers (zero-copy)
  self.postMessage(msg, [displacementsBuffer, reactionsBuffer]);
}

// ============================================================================
// MAIN WORKER LOGIC
// ============================================================================

/**
 * Process solve request
 */
async function processSolveRequest(input: SolverInputMessage['data']): Promise<void> {
  try {
    // Stage 1: Initialize (5%)
    sendProgress('initializing', 5, 'Initializing solver...');
    
    const config: SparseSolverConfig = {
      nodes: input.nodes,
      members: input.members,
      supports: input.supports,
      forceSparse: input.config?.forceSparse,
      forceDense: input.config?.forceDense,
      cgOptions: {
        tolerance: input.config?.tolerance ?? 1e-8,
        maxIterations: input.config?.maxIterations ?? 1000,
      },
    };

    const solver = new SparseSolver(config);

    // Stage 2: Assembly (5% -> 45%)
    sendProgress('assembling', 10, 'Assembling stiffness matrix...');
    
    const startAssembly = performance.now();
    solver.assembleSparse();
    const assemblyTime = performance.now() - startAssembly;
    
    const numMembers = input.members.length;
    const numNodes = input.nodes.length;
    
    sendProgress(
      'assembling',
      45,
      `Assembled ${numMembers} members, ${numNodes} nodes (${assemblyTime.toFixed(1)}ms)`
    );

    // Stage 3: Solve (45% -> 90%)
    sendProgress('solving', 50, 'Solving linear system...');
    
    const startSolve = performance.now();
    const result = solver.solve(input.loads);
    const solveTime = performance.now() - startSolve;
    
    sendProgress(
      'solving',
      90,
      `Solved using ${result.solverType} (${solveTime.toFixed(1)}ms)`
    );

    // Stage 4: Postprocessing (90% -> 100%)
    sendProgress('postprocessing', 95, 'Preparing results...');
    
    // Send result with transferable objects
    sendResult(result);
    
    sendProgress('postprocessing', 100, 'Complete!');

  } catch (error) {
    console.error('Worker error:', error);
    sendError(error instanceof Error ? error : new Error(String(error)));
  }
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

/**
 * Listen for messages from main thread
 */
self.addEventListener('message', (event: MessageEvent<SolverInputMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'solve':
      processSolveRequest(message.data);
      break;

    default:
      sendError(new Error(`Unknown message type: ${(message as any).type}`));
  }
});

// ============================================================================
// WORKER READY
// ============================================================================

// Signal that worker is ready
self.postMessage({ type: 'ready' });

// Export types for main thread (not executed in worker context)
export type {
  SolverInputMessage,
  ProgressMessage,
  ResultMessage,
  ErrorMessage,
  WorkerOutputMessage,
};
