/**
 * useWasmSolver.ts
 * 
 * React hook for using the WASM linear solver.
 * Handles initialization, status tracking, and provides
 * methods for solving linear systems.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getWasmSolver,
  type SolverResult,
  type SolverOptions,
} from '../services/WasmSolverService';

// ============================================================================
// TYPES
// ============================================================================

export interface UseWasmSolverReturn {
  /** Whether the WASM solver is ready */
  isReady: boolean;
  /** Whether WASM is supported/available */
  isWasmAvailable: boolean | null;
  /** Whether currently solving */
  isSolving: boolean;
  /** Last solve result */
  lastResult: SolverResult | null;
  /** Last error */
  error: Error | null;
  /** Solve a linear system */
  solve: (
    stiffnessMatrix: number[][] | Float64Array,
    forceVector: number[] | Float64Array,
    options?: SolverOptions
  ) => Promise<SolverResult>;
  /** Solve a sparse linear system */
  solveSparse: (
    rowIndices: number[],
    colIndices: number[],
    values: number[],
    forceVector: number[],
    n: number,
    options?: SolverOptions
  ) => Promise<SolverResult>;
  /** Run benchmark comparison */
  benchmark: (size?: number) => Promise<{ wasmTimeMs: number; jsTimeMs: number }>;
  /** Reinitialize the solver */
  reinitialize: () => Promise<void>;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useWasmSolver(): UseWasmSolverReturn {
  const [isReady, setIsReady] = useState(false);
  const [isWasmAvailable, setIsWasmAvailable] = useState<boolean | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [lastResult, setLastResult] = useState<SolverResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const solverRef = useRef(getWasmSolver());

  // Initialize on mount
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const success = await solverRef.current.initialize();
        if (mounted) {
          setIsReady(success);
          setIsWasmAvailable(solverRef.current.isWasmAvailable());
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsWasmAvailable(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Solve method
  const solve = useCallback(
    async (
      stiffnessMatrix: number[][] | Float64Array,
      forceVector: number[] | Float64Array,
      options: SolverOptions = {}
    ): Promise<SolverResult> => {
      setIsSolving(true);
      setError(null);

      try {
        const result = await solverRef.current.solve(
          stiffnessMatrix,
          forceVector,
          options
        );
        setLastResult(result);

        if (!result.success) {
          setError(new Error(result.error || 'Solve failed'));
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsSolving(false);
      }
    },
    []
  );

  // Solve sparse method
  const solveSparse = useCallback(
    async (
      rowIndices: number[],
      colIndices: number[],
      values: number[],
      forceVector: number[],
      n: number,
      options: SolverOptions = {}
    ): Promise<SolverResult> => {
      setIsSolving(true);
      setError(null);

      try {
        const result = await solverRef.current.solveSparse(
          rowIndices,
          colIndices,
          values,
          forceVector,
          n,
          options
        );
        setLastResult(result);

        if (!result.success) {
          setError(new Error(result.error || 'Solve failed'));
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsSolving(false);
      }
    },
    []
  );

  // Benchmark method
  const benchmark = useCallback(
    async (size: number = 100) => {
      return solverRef.current.benchmark(size);
    },
    []
  );

  // Reinitialize method
  const reinitialize = useCallback(async () => {
    setIsReady(false);
    setError(null);

    solverRef.current.cleanup();
    solverRef.current = getWasmSolver();

    try {
      const success = await solverRef.current.initialize();
      setIsReady(success);
      setIsWasmAvailable(solverRef.current.isWasmAvailable());
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsWasmAvailable(false);
    }
  }, []);

  return {
    isReady,
    isWasmAvailable,
    isSolving,
    lastResult,
    error,
    solve,
    solveSparse,
    benchmark,
    reinitialize,
  };
}

export default useWasmSolver;
