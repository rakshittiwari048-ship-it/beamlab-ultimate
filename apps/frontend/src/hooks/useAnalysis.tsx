/**
 * useAnalysis.ts
 * 
 * React hook for running structural analysis with automatic
 * local/cloud solver selection based on model size.
 * 
 * Features:
 * - Automatic solver selection (local < 2000 nodes, cloud >= 2000 nodes)
 * - Progress tracking with UI updates
 * - Toast notifications
 * - Cancellation support
 * - Result caching
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  AnalysisService,
  type AnalysisInput,
  type AnalysisResult,
  type AnalysisProgress,
  type AnalysisServiceOptions,
} from '../services/AnalysisService';

// ============================================================================
// TYPES
// ============================================================================

export interface UseAnalysisOptions {
  /** Toast notification callback */
  onToast?: (message: string, type: 'info' | 'success' | 'error' | 'warning') => void;
  /** API base URL for cloud solver */
  apiBaseUrl?: string;
  /** Node count threshold for cloud vs local (default: 2000) */
  nodeThreshold?: number;
}

export interface UseAnalysisReturn {
  /** Run analysis on the given input */
  analyze: (input: AnalysisInput) => Promise<AnalysisResult>;
  /** Cancel running analysis */
  cancel: () => void;
  /** Check cloud solver health */
  checkHealth: () => Promise<{ available: boolean; error?: string }>;
  /** Current progress */
  progress: AnalysisProgress | null;
  /** Whether analysis is running */
  isAnalyzing: boolean;
  /** Last analysis result */
  result: AnalysisResult | null;
  /** Last error */
  error: Error | null;
  /** Whether using cloud solver */
  isCloud: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAnalysis(options: UseAnalysisOptions = {}): UseAnalysisReturn {
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isCloud, setIsCloud] = useState(false);
  
  const serviceRef = useRef<AnalysisService | null>(null);

  // Initialize service
  useEffect(() => {
    const serviceOptions: AnalysisServiceOptions = {
      onProgress: (p) => {
        setProgress(p);
        setIsCloud(p.isCloud);
      },
      onToast: options.onToast,
      apiBaseUrl: options.apiBaseUrl,
      nodeThreshold: options.nodeThreshold,
    };
    
    serviceRef.current = new AnalysisService(serviceOptions);
    
    return () => {
      serviceRef.current?.cancel();
    };
  }, [options.onToast, options.apiBaseUrl, options.nodeThreshold]);

  /**
   * Run analysis
   */
  const analyze = useCallback(async (input: AnalysisInput): Promise<AnalysisResult> => {
    if (!serviceRef.current) {
      throw new Error('Analysis service not initialized');
    }
    
    setIsAnalyzing(true);
    setProgress(null);
    setError(null);
    setResult(null);
    
    try {
      const analysisResult = await serviceRef.current.analyze(input);
      setResult(analysisResult);
      return analysisResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * Cancel running analysis
   */
  const cancel = useCallback(() => {
    serviceRef.current?.cancel();
    setIsAnalyzing(false);
    setProgress(null);
  }, []);

  /**
   * Check cloud solver health
   */
  const checkHealth = useCallback(async () => {
    if (!serviceRef.current) {
      return { available: false, error: 'Service not initialized' };
    }
    return serviceRef.current.checkCloudHealth();
  }, []);

  return {
    analyze,
    cancel,
    checkHealth,
    progress,
    isAnalyzing,
    result,
    error,
    isCloud,
  };
}

// ============================================================================
// PROVIDER (Optional - for global state)
// ============================================================================

import { createContext, useContext, type ReactNode } from 'react';

interface AnalysisContextValue extends UseAnalysisReturn {}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export interface AnalysisProviderProps {
  children: ReactNode;
  options?: UseAnalysisOptions;
}

export function AnalysisProvider({ children, options }: AnalysisProviderProps) {
  const analysis = useAnalysis(options);
  
  return (
    <AnalysisContext.Provider value={analysis}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysisContext(): AnalysisContextValue {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysisContext must be used within AnalysisProvider');
  }
  return context;
}
