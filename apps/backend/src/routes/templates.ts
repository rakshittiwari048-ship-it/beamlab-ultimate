import { Router, Request, Response } from 'express';
import { listTemplates, getTemplate } from '../data/templateBank.js';

const router: Router = Router();

// GET /api/templates - list all templates (lightweight metadata)
router.get('/', (_req: Request, res: Response) => {
  const templates = listTemplates();
  res.json({ success: true, templates });
});

// GET /api/templates/:id - fetch a full template by id
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const template = getTemplate(id);
  if (!template) {
    res.status(404).json({ success: false, error: 'Template not found' });
    return;
  }
  res.json({ success: true, template });
});

export default router;
