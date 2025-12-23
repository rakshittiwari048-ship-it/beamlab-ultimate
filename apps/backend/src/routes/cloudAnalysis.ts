/**
 * Cloud Analysis API Routes
 * 
 * Provides server-side structural analysis for large models (2000+ nodes).
 * Uses Python scipy.sparse for high-performance sparse matrix solving.
 * 
 * Endpoints:
 * - POST /api/analysis/cloud     - Submit analysis job
 * - GET  /api/analysis/cloud/:id - Get job status/results
 * - DELETE /api/analysis/cloud/:id - Cancel job
 */

import express, { type Router, type Request, type Response } from 'express';
import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { randomUUID } from 'crypto';

const router: Router = express.Router();

// ============================================================================
// TYPES
// ============================================================================

interface CloudAnalysisJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  stage: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
  result?: any;
  error?: string;
  nodeCount: number;
  memberCount: number;
}

interface AnalysisInputData {
  nodes: Array<{ id: string; x: number; y: number; z: number }>;
  members: Array<{
    id: string;
    startNodeId: string;
    endNodeId: string;
    E: number;
    A: number;
    Iy: number;
    Iz: number;
    G?: number;
    J?: number;
    beta?: number;
  }>;
  supports: Array<{
    nodeId: string;
    dx: boolean;
    dy: boolean;
    dz: boolean;
    rx: boolean;
    ry: boolean;
    rz: boolean;
  }>;
  loads: Array<{
    nodeId: string;
    fx?: number;
    fy?: number;
    fz?: number;
    mx?: number;
    my?: number;
    mz?: number;
  }>;
  config?: {
    useIterative?: boolean;
    tolerance?: number;
    maxIterations?: number;
  };
}

// ============================================================================
// JOB STORAGE (In-memory for simplicity, use Redis in production)
// ============================================================================

const jobs: Map<string, CloudAnalysisJob> = new Map();
const processes: Map<string, ChildProcess> = new Map();

// Clean up old jobs periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  
  for (const [id, job] of jobs.entries()) {
    if (now - job.updatedAt.getTime() > maxAge) {
      jobs.delete(id);
      processes.delete(id);
    }
  }
}, 5 * 60 * 1000);

// ============================================================================
// PYTHON SOLVER INTEGRATION
// ============================================================================

/**
 * Get the path to the Python solver
 */
function getSolverPath(): string {
  // In development, use the local solver
  const devPath = path.join(process.cwd(), '..', '..', 'services', 'solver-python', 'solver.py');
  
  // In production (Docker), use the mounted path
  const prodPath = '/solver/solver.py';
  
  // Check which exists
  return process.env.SOLVER_PATH || (
    process.env.NODE_ENV === 'production' ? prodPath : devPath
  );
}

/**
 * Spawn Python solver process
 */
async function runPythonSolver(
  jobId: string,
  inputData: AnalysisInputData
): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;
  
  // Update job status
  job.status = 'running';
  job.updatedAt = new Date();
  
  // Write input to temp file
  const tempDir = os.tmpdir();
  const inputFile = path.join(tempDir, `beamlab-${jobId}.json`);
  
  try {
    await fs.writeFile(inputFile, JSON.stringify(inputData));
  } catch (error) {
    job.status = 'failed';
    job.error = `Failed to write input file: ${error}`;
    job.updatedAt = new Date();
    return;
  }
  
  // Spawn Python process
  const solverPath = getSolverPath();
  const pythonCmd = process.env.PYTHON_CMD || 'python3';
  
  const child = spawn(pythonCmd, [solverPath, inputFile], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1', // Disable buffering for real-time output
    },
  });
  
  processes.set(jobId, child);
  
  let stdout = '';
  let stderr = '';
  
  // Handle stdout (progress and results)
  child.stdout.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const msg = JSON.parse(line);
        
        if (msg.type === 'progress') {
          job.progress = msg.data.progress;
          job.stage = msg.data.stage;
          job.message = msg.data.message;
          job.updatedAt = new Date();
        } else if (msg.type === 'result') {
          job.status = 'completed';
          job.progress = 100;
          job.result = msg.data;
          job.updatedAt = new Date();
        } else if (msg.type === 'error') {
          job.status = 'failed';
          job.error = msg.data.error;
          job.updatedAt = new Date();
        }
      } catch {
        // Not JSON, collect as regular output
        stdout += line + '\n';
      }
    }
  });
  
  // Handle stderr
  child.stderr.on('data', (data: Buffer) => {
    stderr += data.toString();
  });
  
  // Handle process exit
  child.on('close', async (code) => {
    processes.delete(jobId);
    
    // Clean up temp file
    try {
      await fs.unlink(inputFile);
    } catch {
      // Ignore cleanup errors
    }
    
    if (code !== 0 && job.status !== 'completed' && job.status !== 'cancelled') {
      job.status = 'failed';
      job.error = stderr || `Process exited with code ${code}`;
      job.updatedAt = new Date();
    }
  });
  
  // Handle process errors
  child.on('error', (error) => {
    job.status = 'failed';
    job.error = `Failed to spawn solver: ${error.message}`;
    job.updatedAt = new Date();
    processes.delete(jobId);
  });
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/analysis/cloud
 * Submit a new cloud analysis job
 */
router.post('/cloud', async (req: Request, res: Response) => {
  try {
    const inputData: AnalysisInputData = req.body;
    
    // Validate input
    if (!inputData.nodes || !Array.isArray(inputData.nodes)) {
      return res.status(400).json({ error: 'Invalid or missing nodes array' });
    }
    if (!inputData.members || !Array.isArray(inputData.members)) {
      return res.status(400).json({ error: 'Invalid or missing members array' });
    }
    if (!inputData.supports || !Array.isArray(inputData.supports)) {
      return res.status(400).json({ error: 'Invalid or missing supports array' });
    }
    if (!inputData.loads || !Array.isArray(inputData.loads)) {
      return res.status(400).json({ error: 'Invalid or missing loads array' });
    }
    
    // Create job
    const jobId = randomUUID();
    const job: CloudAnalysisJob = {
      id: jobId,
      status: 'pending',
      progress: 0,
      stage: 'queued',
      message: 'Job queued for processing',
      createdAt: new Date(),
      updatedAt: new Date(),
      nodeCount: inputData.nodes.length,
      memberCount: inputData.members.length,
    };
    
    jobs.set(jobId, job);
    
    // Start solver asynchronously
    runPythonSolver(jobId, inputData).catch((error) => {
      const job = jobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        job.updatedAt = new Date();
      }
    });
    
    // Return job ID immediately
    return res.status(202).json({
      success: true,
      jobId,
      message: 'Analysis job submitted',
      nodeCount: inputData.nodes.length,
      memberCount: inputData.members.length,
    });
  } catch (error) {
    console.error('Error submitting cloud analysis:', error);
    return res.status(500).json({
      error: 'Failed to submit analysis job',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/analysis/cloud/:id
 * Get job status and results
 */
router.get('/cloud/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const job = jobs.get(id);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  // Return job status (include result only if completed)
  const response: any = {
    id: job.id,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    message: job.message,
    nodeCount: job.nodeCount,
    memberCount: job.memberCount,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
  
  if (job.status === 'completed' && job.result) {
    response.result = job.result;
  }
  
  if (job.status === 'failed' && job.error) {
    response.error = job.error;
  }
  
  return res.json(response);
});

/**
 * DELETE /api/analysis/cloud/:id
 * Cancel a running job
 */
router.delete('/cloud/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const job = jobs.get(id);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  // Kill process if running
  const proc = processes.get(id);
  if (proc) {
    proc.kill('SIGTERM');
    processes.delete(id);
  }
  
  // Update job status
  job.status = 'cancelled';
  job.message = 'Job cancelled by user';
  job.updatedAt = new Date();
  
  return res.json({ success: true, message: 'Job cancelled' });
});

/**
 * GET /api/analysis/cloud
 * List all jobs (for admin/debugging)
 */
router.get('/cloud', (_req: Request, res: Response) => {
  const jobList = Array.from(jobs.values()).map((job) => ({
    id: job.id,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    nodeCount: job.nodeCount,
    memberCount: job.memberCount,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  }));
  
  return res.json({ jobs: jobList, total: jobList.length });
});

/**
 * GET /api/analysis/cloud/health
 * Check if Python solver is available
 */
router.get('/cloud/health', async (_req: Request, res: Response) => {
  const solverPath = getSolverPath();
  const pythonCmd = process.env.PYTHON_CMD || 'python3';
  
  try {
    // Check Python version
    const pythonCheck = spawn(pythonCmd, ['--version']);
    
    let version = '';
    pythonCheck.stdout.on('data', (data) => {
      version += data.toString();
    });
    pythonCheck.stderr.on('data', (data) => {
      version += data.toString();
    });
    
    await new Promise<void>((resolve) => {
      pythonCheck.on('close', () => resolve());
    });
    
    // Check if solver file exists
    let solverExists = false;
    try {
      await fs.access(solverPath);
      solverExists = true;
    } catch {
      solverExists = false;
    }
    
    return res.json({
      status: solverExists ? 'healthy' : 'degraded',
      python: version.trim(),
      solverPath,
      solverExists,
    });
  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
