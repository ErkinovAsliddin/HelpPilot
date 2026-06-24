// src/routes/health.ts
// Feature: helppilot

import { Router } from 'express';
import { checkHealth } from '../services/healthMonitor.js';

const router = Router();

router.get('/api/health', async (_req, res) => {
  const result = await checkHealth();
  res.json(result);
});

export default router;
