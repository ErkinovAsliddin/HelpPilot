// src/routes/metrics.ts
// Feature: helppilot

import { Router } from 'express';
import { getSessionMetrics } from '../services/sessionMetricsService.js';

const router = Router();

router.get('/api/metrics/session', (_req, res) => {
  const session = getSessionMetrics();
  if (!session) {
    res.json({ error: 'No active session' });
    return;
  }

  const totalProcessed = (session['tickets_total'] as number) || 0;
  const autoResolved = (session['tickets_auto_resolved'] as number) || 0;
  const totalResolutionMs = (session['total_resolution_time_ms'] as number) || 0;
  const avgHandlingMin = (session['avg_handling_time_minutes'] as number) || 5.0;
  const costPerHour = (session['cost_per_hour_usd'] as number) || 50.0;

  const autoResolutionRate = totalProcessed > 0 ? Math.round((autoResolved / totalProcessed) * 10000) / 100 : 0;
  const avgResolutionTimeSeconds = totalProcessed > 0 ? Math.round(totalResolutionMs / totalProcessed / 1000 * 100) / 100 : 0;
  const estimatedTimeSavedMinutes = autoResolved * avgHandlingMin;
  const estimatedCostSavedUsd = (estimatedTimeSavedMinutes / 60) * costPerHour;

  res.json({
    ...session,
    autoResolutionRate,
    avgResolutionTimeSeconds,
    estimatedTimeSavedMinutes,
    estimatedCostSavedUsd: `$${estimatedCostSavedUsd.toFixed(2)}`,
  });
});

export default router;
