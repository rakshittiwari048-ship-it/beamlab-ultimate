/**
 * copilot.ts
 * 
 * API routes for Engineering Copilot AI service
 */

import { Router, Request, Response } from 'express';
import {
  getEngineeringCopilot,
  CopilotRequest,
} from '../services/ai/EngineeringCopilotService';

const router: Router = Router();

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/copilot/analyze
 * Analyze a failed member and get fix recommendations
 */
router.post('/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      memberId,
      ratio,
      failureMode,
      clause,
      designCode,
      memberType,
      capacity,
      demand,
      length,
      section,
      Kx,
      Ky,
      bracingInterval,
      materialGrade,
      endConditions,
      axialForce,
      momentMajor,
      momentMinor,
      shearForce,
      loadCombination,
      isSeismic,
      userQuery,
      numRecommendations,
    } = req.body;

    // Validate required fields
    if (!memberId || !ratio || !failureMode || !section || !length) {
      res.status(400).json({
        error: 'Missing required fields: memberId, ratio, failureMode, section, length',
      });
      return;
    }

    const request: CopilotRequest = {
      failedMember: {
        memberId,
        ratio,
        failureMode,
        clause,
        designCode: designCode || 'IS 800:2007',
        memberType: memberType || 'column',
        capacity,
        demand,
      },
      geometry: {
        length,
        section,
        Kx,
        Ky,
        bracingInterval,
        materialGrade,
        endConditions,
      },
      loads: {
        axialForce,
        momentMajor,
        momentMinor,
        shearForce,
        loadCombination,
        isSeismic,
      },
      userQuery,
      numRecommendations: numRecommendations || 3,
    };

    const copilot = getEngineeringCopilot();
    const response = await copilot.analyzeFailure(request);

    res.json(response);
  } catch (error) {
    console.error('Copilot analyze error:', error);
    res.status(500).json({
      error: 'Failed to analyze member',
      message: (error as Error).message,
    });
  }
});

/**
 * POST /api/copilot/chat
 * Continue conversation with follow-up questions
 */
router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, message, context } = req.body;

    if (!sessionId || !message) {
      res.status(400).json({
        error: 'Missing required fields: sessionId, message',
      });
      return;
    }

    const copilot = getEngineeringCopilot();
    const response = await copilot.chat(sessionId, message, context);

    res.json(response);
  } catch (error) {
    console.error('Copilot chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      message: (error as Error).message,
    });
  }
});

/**
 * DELETE /api/copilot/session/:sessionId
 * Clear conversation history for a session
 */
router.delete('/session/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const copilot = getEngineeringCopilot();
    copilot.clearSession(sessionId);

    res.json({ success: true, message: 'Session cleared' });
  } catch (error) {
    console.error('Copilot clear session error:', error);
    res.status(500).json({
      error: 'Failed to clear session',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/copilot/health
 * Health check for copilot service
 */
router.get('/health', (_req: Request, res: Response) => {
  const hasApiKey = !!(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY);
  
  res.json({
    status: 'ok',
    service: 'EngineeringCopilot',
    engine: 'Google Gemini',
    apiKeyConfigured: hasApiKey,
    timestamp: new Date().toISOString(),
  });
});

export default router;
