/**
 * SolverStatus.tsx
 * 
 * Component to display the WASM solver status in the UI.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Zap, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { SolverResult } from '../services/WasmSolverService';

// ============================================================================
// TYPES
// ============================================================================

interface SolverStatusProps {
  isReady: boolean;
  isWasmAvailable: boolean | null;
  isSolving: boolean;
  lastResult?: SolverResult | null;
  className?: string;
  showDetails?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SolverStatus: React.FC<SolverStatusProps> = ({
  isReady,
  isWasmAvailable,
  isSolving,
  lastResult,
  className = '',
  showDetails = true,
}) => {
  const getStatusColor = () => {
    if (isSolving) return 'bg-yellow-500';
    if (isReady) return 'bg-green-500';
    if (isWasmAvailable === false) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    if (isSolving) return 'Solving...';
    if (isReady) return 'WASM Ready';
    if (isWasmAvailable === false) return 'JS Solver';
    return 'Initializing...';
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Status Badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
        <motion.span
          className={`w-2 h-2 rounded-full ${getStatusColor()}`}
          animate={isSolving ? { scale: [1, 1.2, 1] } : {}}
          transition={{ repeat: Infinity, duration: 0.8 }}
        />
        <span className="text-sm font-medium text-gray-700">
          {getStatusText()}
        </span>
        {isWasmAvailable && !isSolving && (
          <Zap className="w-3.5 h-3.5 text-yellow-500" />
        )}
      </div>

      {/* Last Result Info */}
      {showDetails && lastResult && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 text-sm text-gray-500"
        >
          <span className="text-gray-300">|</span>
          
          {lastResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          
          <span className="font-medium">{lastResult.method}</span>
          
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{lastResult.solveTimeMs.toFixed(1)}ms</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ============================================================================
// DETAILED STATUS PANEL
// ============================================================================

interface SolverStatusPanelProps {
  isReady: boolean;
  isWasmAvailable: boolean | null;
  isSolving: boolean;
  lastResult?: SolverResult | null;
  onBenchmark?: () => void;
  benchmarkResult?: { wasmTimeMs: number; jsTimeMs: number } | null;
}

export const SolverStatusPanel: React.FC<SolverStatusPanelProps> = ({
  isReady,
  isWasmAvailable,
  isSolving,
  lastResult,
  onBenchmark,
  benchmarkResult,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Cpu className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Linear Solver</h3>
            <p className="text-sm text-gray-500">Matrix computation engine</p>
          </div>
        </div>
        <SolverStatus
          isReady={isReady}
          isWasmAvailable={isWasmAvailable}
          isSolving={isSolving}
          showDetails={false}
        />
      </div>

      {/* Solver Info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Engine</p>
          <p className="font-medium text-gray-900">
            {isWasmAvailable ? 'WebAssembly (Rust)' : 'JavaScript'}
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Algorithm</p>
          <p className="font-medium text-gray-900">
            {lastResult?.method || 'LU Decomposition'}
          </p>
        </div>
      </div>

      {/* Last Result */}
      {lastResult && (
        <div className="p-4 bg-gray-50 rounded-lg mb-4">
          <p className="text-xs text-gray-500 mb-2">Last Solve</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-lg font-bold text-gray-900">
                {lastResult.solveTimeMs.toFixed(1)}ms
              </p>
              <p className="text-xs text-gray-500">Solve Time</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {lastResult.displacements.length}
              </p>
              <p className="text-xs text-gray-500">DOFs</p>
            </div>
            <div>
              <p className={`text-lg font-bold ${lastResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {lastResult.success ? 'Success' : 'Failed'}
              </p>
              <p className="text-xs text-gray-500">Status</p>
            </div>
          </div>
          {lastResult.conditionNumber && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Condition Number: {lastResult.conditionNumber.toExponential(2)}
              </p>
            </div>
          )}
          {lastResult.error && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-red-600">{lastResult.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Benchmark */}
      {onBenchmark && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Performance Benchmark</span>
            <button
              onClick={onBenchmark}
              className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Run Benchmark
            </button>
          </div>
          {benchmarkResult && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600 mb-1">WASM</p>
                <p className="text-lg font-bold text-green-700">
                  {benchmarkResult.wasmTimeMs.toFixed(1)}ms
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">JavaScript</p>
                <p className="text-lg font-bold text-gray-700">
                  {benchmarkResult.jsTimeMs.toFixed(1)}ms
                </p>
              </div>
              <div className="col-span-2 text-center">
                <p className="text-sm text-gray-600">
                  WASM is{' '}
                  <span className="font-bold text-green-600">
                    {(benchmarkResult.jsTimeMs / benchmarkResult.wasmTimeMs).toFixed(1)}x
                  </span>{' '}
                  faster
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SolverStatus;
