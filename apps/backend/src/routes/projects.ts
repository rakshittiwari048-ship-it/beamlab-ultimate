import express, { type Router, type Request, type Response } from 'express';
import { requireAuth } from '@clerk/express';
import { ProjectModel } from '../models/Project.js';
import { CreateProjectRequestSchema } from '@beamlab/types';
import { ZodError } from 'zod';

const router: Router = express.Router();

// Protect all /api/projects routes with Clerk auth
router.use(requireAuth());

// Get all projects
router.get('/', async (_req: Request, res: Response) => {
  try {
    const projects = await ProjectModel.find().sort({ updatedAt: -1 }).lean();
    
    const formattedProjects = projects.map((p) => ({
      ...p,
      id: p._id.toString(),
      _id: undefined,
    }));
    
    return res.json(formattedProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const project = await ProjectModel.findById(req.params.id).lean();
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const formattedProject = {
      ...project,
      id: project._id.toString(),
      _id: undefined,
    };
    
    return res.json(formattedProject);
  } catch (error) {
    console.error('Error fetching project:', error);
    return res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = CreateProjectRequestSchema.parse(req.body);
    
    const project = new ProjectModel(validatedData);
    await project.save();
    
    const formattedProject = {
      ...project.toObject(),
      id: project._id.toString(),
      _id: undefined,
    };
    
    return res.status(201).json(formattedProject);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating project:', error);
    return res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const project = await ProjectModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).lean();
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const formattedProject = {
      ...project,
      id: project._id.toString(),
      _id: undefined,
    };
    
    return res.json(formattedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    return res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const project = await ProjectModel.findByIdAndDelete(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    return res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
