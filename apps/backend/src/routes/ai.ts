/**
 * ai.ts
 * 
 * API routes for AI services including:
 * - Model Generator: Convert natural language to structural models
 * - Engineering Copilot: Analyze design failures and provide recommendations
 */

import { Router, Request, Response } from 'express';
import { ModelGeneratorService } from '../services/ai/ModelGeneratorService';
import { AIArchitectService } from '../services/ai/AIArchitectService';

const router: Router = Router();

// Lazy instantiation - will be created on first use after .env is loaded
let modelGenerator: ModelGeneratorService | null = null;

function getModelGenerator(): ModelGeneratorService {
  if (!modelGenerator) {
    modelGenerator = new ModelGeneratorService();
  }
  return modelGenerator;
}

// ============================================================================
// MODEL GENERATOR ROUTES
// ============================================================================

/**
 * POST /api/ai/generate
 * Generate a structural model from natural language description
 * 
 * Request body:
 * {
 *   "prompt": "2-story 2-bay frame, 3m bays, 3m story height",
 *   "units": "meters" (optional),
 *   "structureType": "frame" (optional),
 *   "maxNodes": 50 (optional),
 *   "maxMembers": 100 (optional)
 * }
 */
router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, units, structureType, maxNodes, maxMembers } = req.body;

    // Validate required fields
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid "prompt" field. Provide a natural language description of the structure.',
      });
      return;
    }

    const response = await getModelGenerator().generateModel({
      prompt: prompt.trim(),
      units: units || 'meters',
      structureType,
      maxNodes: maxNodes || 100,
      maxMembers: maxMembers || 500,
    });

    res.json(response);
  } catch (error) {
    console.error('Model generator error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate model',
      message: (error as Error).message,
    });
  }
});

/**
 * POST /api/ai/architect
 * Lightweight Gemini-powered generation (JSON only)
 */
router.post('/architect', async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Missing or invalid "prompt"' });
      return;
    }

    const model = await AIArchitectService.generateStructure(prompt.trim());
    res.json({ success: true, model });
  } catch (error) {
    console.error('AI architect error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate structure',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/ai/health
 * Health check for AI services
 */
router.get('/health', (_req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    services: {
      modelGenerator: 'operational',
      architectService: 'operational',
      copilotService: 'operational',
      gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY ? 'configured' : 'not configured',
    },
  });
});

export default router;
