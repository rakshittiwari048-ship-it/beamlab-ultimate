import express, { type Router, type Request, type Response } from 'express';
import { requireAuth } from '@clerk/express';
import { ProjectModel } from '../models/Project.js';
import { StructuralAnalyzer } from '@beamlab/analysis-engine';
import { AnalyzeModelRequestSchema } from '@beamlab/types';
import { ZodError } from 'zod';

const router: Router = express.Router();

// Protect all /api/analysis routes with Clerk auth
router.use(requireAuth());

// Run analysis on a model
router.post('/run', async (req: Request, res: Response) => {
  try {
    const validatedData = AnalyzeModelRequestSchema.parse(req.body);
    
    // Fetch the project/model
    const project = await ProjectModel.findById(validatedData.modelId);
    
    if (!project) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    // Determine which load cases to analyze
    const loadCaseIds = validatedData.loadCaseIds || 
      (project.model as any).loadCases.map((lc: { id: string }) => lc.id);
    
    if (loadCaseIds.length === 0) {
      return res.status(400).json({ error: 'No load cases to analyze' });
    }
    
    // Run analysis for each load case
    const analyzer = new StructuralAnalyzer(project.model as any);
    const results = [];
    
    for (const loadCaseId of loadCaseIds) {
      try {
        const result = analyzer.solve(loadCaseId);
        results.push(result);
      } catch (error) {
        console.error(`Error analyzing load case ${loadCaseId}:`, error);
        return res.status(400).json({ 
          error: 'Analysis failed', 
          loadCaseId,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    // Save results to project
    project.results = results;
    await project.save();
    
    return res.json({ 
      success: true, 
      results,
      message: `Successfully analyzed ${results.length} load case(s)`,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error running analysis:', error);
    return res.status(500).json({ 
      error: 'Failed to run analysis',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get analysis results for a project
router.get('/:modelId/results', async (req: Request, res: Response) => {
  try {
    const project = await ProjectModel.findById(req.params.modelId).lean();
    
    if (!project) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    return res.json({ results: project.results || [] });
  } catch (error) {
    console.error('Error fetching results:', error);
    return res.status(500).json({ error: 'Failed to fetch results' });
  }
});

export default router;
