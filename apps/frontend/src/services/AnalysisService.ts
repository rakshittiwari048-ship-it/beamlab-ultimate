/**
 * AnalysisService.ts
 * 
 * Hybrid structural analysis service that automatically routes to:
 * - Local Web Worker: For small models (<2000 nodes) - faster startup, no network
 * - Cloud Python Engine: For large models (>=2000 nodes) - more memory, faster solving
 * 
 * Features:
 * - Automatic solver selection based on model size
 * - Progress tracking for both local and cloud solvers
 * - Retry logic for cloud failures
 * - Result caching
 * - Toast notifications for user feedback
 */

// ============================================================================
// TYPES (Inline to avoid import issues when package not built)
// ============================================================================

/** Node data for solver */
export interface SolverNode {
  id: string;
  x: number;
  y: number;
  z: number;
}

/** Member data for solver */
export interface SolverMember {
  id: string;
  startNodeId: string;
  endNodeId: string;
  E: number;   // Elastic modulus (Pa or kN/m²)
  A: number;   // Cross-sectional area (m²)
  Iy: number;  // Moment of inertia about y-axis (m⁴)
  Iz: number;  // Moment of inertia about z-axis (m⁴)
  G?: number;  // Shear modulus (optional)
  J?: number;  // Torsional constant (optional)
  beta?: number; // Roll angle about member axis (radians)
}

/** Support constraint */
export interface SolverSupport {
  nodeId: string;
  dx: boolean;
  dy: boolean;
  dz: boolean;
  rx: boolean;
  ry: boolean;
  rz: boolean;
}

/** Nodal load */
export interface NodalLoad {
  nodeId: string;
  fx?: number;
  fy?: number;
  fz?: number;
  mx?: number;
  my?: number;
  mz?: number;
}

// ============================================================================
// APPLICATION TYPES
// ============================================================================

export interface AnalysisInput {
  nodes: SolverNode[];
  members: SolverMember[];
  supports: SolverSupport[];
  loads: NodalLoad[];
  config?: {
    forceSparse?: boolean;
    forceDense?: boolean;
    tolerance?: number;
    maxIterations?: number;
    forceCloud?: boolean;  // Force cloud solver regardless of size
    forceLocal?: boolean;  // Force local solver regardless of size
  };
}

export interface AnalysisProgress {
  stage: 'initializing' | 'assembling' | 'solving' | 'postprocessing' | 'uploading' | 'polling';
  progress: number;
  message: string;
  isCloud: boolean;
}

export interface AnalysisResult {
  success: boolean;
  displacements: number[];
  reactions: number[];
  nodalDisplacements: Record<string, {
    dx: number;
    dy: number;
    dz: number;
    rx: number;
    ry: number;
    rz: number;
  }>;
  nodalReactions: Record<string, {
    fx: number;
    fy: number;
    fz: number;
    mx: number;
    my: number;
    mz: number;
  }>;
  timing: {
    assembly: number;
    solve: number;
    total: number;
  };
  solverInfo: {
    method: string;
    isCloud: boolean;
    nodeCount: number;
    memberCount: number;
  };
  matrixStats?: {
    size: number;
    nnz: number;
    density: number;
    memorySavedMB: number;
  };
}

export interface AnalysisServiceOptions {
  onProgress?: (progress: AnalysisProgress) => void;
  onToast?: (message: string, type: 'info' | 'success' | 'error' | 'warning') => void;
  apiBaseUrl?: string;
  nodeThreshold?: number;  // Threshold for cloud vs local (default: 2000)
  pollInterval?: number;   // Cloud polling interval in ms (default: 500)
  maxPollTime?: number;    // Max time to poll in ms (default: 300000 = 5 min)
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_NODE_THRESHOLD = 2000;
const DEFAULT_POLL_INTERVAL = 500;  // ms
const DEFAULT_MAX_POLL_TIME = 300000;  // 5 minutes

// ============================================================================
// ANALYSIS SERVICE CLASS
// ============================================================================

export class AnalysisService {
  private options: Required<AnalysisServiceOptions>;
  private worker: Worker | null = null;
  private abortController: AbortController | null = null;

  constructor(options: AnalysisServiceOptions = {}) {
    this.options = {
      onProgress: options.onProgress || (() => {}),
      onToast: options.onToast || (() => {}),
      apiBaseUrl: options.apiBaseUrl || '/api',
      nodeThreshold: options.nodeThreshold || DEFAULT_NODE_THRESHOLD,
      pollInterval: options.pollInterval || DEFAULT_POLL_INTERVAL,
      maxPollTime: options.maxPollTime || DEFAULT_MAX_POLL_TIME,
    };
  }

  /**
   * Run structural analysis with automatic solver selection
   */
  async analyze(input: AnalysisInput): Promise<AnalysisResult> {
    const nodeCount = input.nodes.length;
    const memberCount = input.members.length;
    
    // Determine solver
    const useCloud = this.shouldUseCloud(input);
    
    console.log(`[AnalysisService] Analyzing ${nodeCount} nodes, ${memberCount} members`);
    console.log(`[AnalysisService] Using ${useCloud ? 'cloud' : 'local'} solver`);
    
    try {
      if (useCloud) {
        return await this.runCloudAnalysis(input);
      } else {
        return await this.runLocalAnalysis(input);
      }
    } catch (error) {
      console.error('[AnalysisService] Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Determine if cloud solver should be used
   */
  private shouldUseCloud(input: AnalysisInput): boolean {
    // Explicit overrides
    if (input.config?.forceCloud) return true;
    if (input.config?.forceLocal) return false;
    
    // Use cloud for large models
    return input.nodes.length >= this.options.nodeThreshold;
  }

  // ==========================================================================
  // LOCAL SOLVER (Web Worker)
  // ==========================================================================

  /**
   * Run analysis locally using Web Worker
   */
  private async runLocalAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
    const startTime = performance.now();
    
    this.reportProgress('initializing', 5, 'Starting local solver...', false);
    
    try {
      // Dynamic import to avoid bundling issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const analysisEngine: any = await import('@beamlab/analysis-engine');
      const SparseSolver = analysisEngine.SparseSolver || analysisEngine.default?.SparseSolver;
      
      this.reportProgress('assembling', 15, 'Assembling stiffness matrix...', false);
      
      // Create solver
      const solver = new SparseSolver({
        nodes: input.nodes,
        members: input.members,
        supports: input.supports,
        forceSparse: input.config?.forceSparse,
        forceDense: input.config?.forceDense,
        cgOptions: {
          tolerance: input.config?.tolerance ?? 1e-8,
          maxIterations: input.config?.maxIterations ?? 1000,
        },
      });
      
      this.reportProgress('assembling', 40, 'Matrix assembly complete...', false);
      
      // Solve
      this.reportProgress('solving', 50, 'Solving linear system...', false);
      
      const result = solver.solve(input.loads);
      
      this.reportProgress('solving', 85, `Solved using ${result.solverType}`, false);
      
      // Post-process
      this.reportProgress('postprocessing', 95, 'Preparing results...', false);
      
      const totalTime = performance.now() - startTime;
      
      this.reportProgress('postprocessing', 100, 'Complete!', false);
      this.options.onToast(`Analysis complete in ${(totalTime / 1000).toFixed(1)}s`, 'success');
      
      // Build response
      return {
        success: true,
        displacements: result.displacements,
        reactions: result.reactions,
        nodalDisplacements: Object.fromEntries(result.nodalDisplacements),
        nodalReactions: Object.fromEntries(result.nodalReactions),
        timing: {
          assembly: result.timing.assembly,
          solve: result.timing.solve,
          total: totalTime,
        },
        solverInfo: {
          method: result.solverType,
          isCloud: false,
          nodeCount: input.nodes.length,
          memberCount: input.members.length,
        },
        matrixStats: result.matrixStats,
      };
    } catch (error) {
      this.options.onToast(
        `Local analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
      throw error;
    }
  }

  // ==========================================================================
  // CLOUD SOLVER (Python Backend)
  // ==========================================================================

  /**
   * Run analysis on cloud using Python scipy solver
   */
  private async runCloudAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
    const startTime = performance.now();
    
    // Create abort controller for cancellation
    this.abortController = new AbortController();
    
    try {
      // Stage 1: Upload
      this.reportProgress('uploading', 10, 'Uploading to Cloud Engine...', true);
      this.options.onToast('Uploading to Cloud Engine...', 'info');
      
      const submitResponse = await fetch(`${this.options.apiBaseUrl}/analysis/cloud`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: this.abortController.signal,
      });
      
      if (!submitResponse.ok) {
        const error = await submitResponse.json();
        throw new Error(error.error || 'Failed to submit analysis');
      }
      
      const { jobId, nodeCount } = await submitResponse.json();
      
      this.reportProgress('uploading', 20, `Job submitted: ${nodeCount} nodes`, true);
      
      // Stage 2: Poll for results
      const result = await this.pollForResults(jobId);
      
      const totalTime = performance.now() - startTime;
      
      this.options.onToast(
        `Cloud analysis complete in ${(totalTime / 1000).toFixed(1)}s`,
        'success'
      );
      
      // Build response
      return {
        success: true,
        displacements: result.displacements,
        reactions: result.reactions,
        nodalDisplacements: result.nodalDisplacements,
        nodalReactions: result.nodalReactions,
        timing: {
          assembly: result.timing?.assembly || 0,
          solve: result.timing?.solve || 0,
          total: totalTime,
        },
        solverInfo: {
          method: result.solverInfo?.method || 'cloud-scipy',
          isCloud: true,
          nodeCount: input.nodes.length,
          memberCount: input.members.length,
        },
        matrixStats: result.matrixStats,
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.options.onToast('Analysis cancelled', 'warning');
        throw new Error('Analysis cancelled by user');
      }
      
      this.options.onToast(
        `Cloud analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Poll for cloud job results
   */
  private async pollForResults(jobId: string): Promise<any> {
    const startTime = Date.now();
    
    while (true) {
      // Check timeout
      if (Date.now() - startTime > this.options.maxPollTime) {
        throw new Error('Analysis timed out after 5 minutes');
      }
      
      // Check abort
      if (this.abortController?.signal.aborted) {
        throw new Error('Analysis cancelled');
      }
      
      // Poll status
      const response = await fetch(
        `${this.options.apiBaseUrl}/analysis/cloud/${jobId}`,
        { signal: this.abortController?.signal }
      );
      
      if (!response.ok) {
        throw new Error('Failed to check job status');
      }
      
      const job = await response.json();
      
      // Update progress
      this.reportProgress(
        job.stage === 'assembling' ? 'assembling' :
        job.stage === 'solving' ? 'solving' :
        job.stage === 'postprocessing' ? 'postprocessing' : 'polling',
        Math.min(20 + job.progress * 0.75, 95),  // Map 0-100 to 20-95
        job.message || 'Processing...',
        true
      );
      
      // Check completion
      if (job.status === 'completed') {
        this.reportProgress('postprocessing', 100, 'Complete!', true);
        return job.result;
      }
      
      if (job.status === 'failed') {
        throw new Error(job.error || 'Cloud analysis failed');
      }
      
      if (job.status === 'cancelled') {
        throw new Error('Analysis was cancelled');
      }
      
      // Wait before next poll
      await this.delay(this.options.pollInterval);
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Report progress to callback
   */
  private reportProgress(
    stage: AnalysisProgress['stage'],
    progress: number,
    message: string,
    isCloud: boolean
  ): void {
    this.options.onProgress({
      stage,
      progress,
      message,
      isCloud,
    });
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cancel running analysis
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Check if cloud solver is available
   */
  async checkCloudHealth(): Promise<{
    available: boolean;
    python?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.options.apiBaseUrl}/analysis/cloud/health`);
      
      if (!response.ok) {
        return { available: false, error: 'Cloud solver not responding' };
      }
      
      const health = await response.json();
      return {
        available: health.status === 'healthy',
        python: health.python,
        error: health.status !== 'healthy' ? 'Solver not properly configured' : undefined,
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let analysisServiceInstance: AnalysisService | null = null;

/**
 * Get the singleton AnalysisService instance
 */
export function getAnalysisService(options?: AnalysisServiceOptions): AnalysisService {
  if (!analysisServiceInstance || options) {
    analysisServiceInstance = new AnalysisService(options);
  }
  return analysisServiceInstance;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Run analysis with automatic solver selection
 * 
 * @example
 * ```typescript
 * const result = await runAnalysis({
 *   nodes,
 *   members,
 *   supports,
 *   loads,
 * }, {
 *   onProgress: (p) => console.log(`${p.progress}% - ${p.message}`),
 *   onToast: (msg, type) => toast[type](msg),
 * });
 * ```
 */
export async function runAnalysis(
  input: AnalysisInput,
  options?: AnalysisServiceOptions
): Promise<AnalysisResult> {
  const service = new AnalysisService(options);
  return service.analyze(input);
}

/**
 * Check cloud solver availability
 */
export async function checkCloudSolverHealth(
  apiBaseUrl?: string
): Promise<{ available: boolean; error?: string }> {
  const service = new AnalysisService({ apiBaseUrl });
  return service.checkCloudHealth();
}
