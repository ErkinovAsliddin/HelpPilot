// tests/property/sessionMetricsZeroState.test.ts
// Feature: helppilot, Property 16

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

function computeSessionMetrics(session: {
  tickets_total: number;
  tickets_auto_resolved: number;
  total_resolution_time_ms: number;
  avg_handling_time_minutes: number;
  cost_per_hour_usd: number;
}) {
  const { tickets_total, tickets_auto_resolved, total_resolution_time_ms, avg_handling_time_minutes, cost_per_hour_usd } = session;

  const autoResolutionRate = tickets_total > 0
    ? Math.round((tickets_auto_resolved / tickets_total) * 10000) / 100
    : 0;

  const avgResolutionTimeSeconds = tickets_total > 0
    ? Math.round(total_resolution_time_ms / tickets_total / 1000 * 100) / 100
    : 0;

  const estimatedTimeSavedMinutes = tickets_auto_resolved * avg_handling_time_minutes;
  const costSaved = (estimatedTimeSavedMinutes / 60) * cost_per_hour_usd;
  const estimatedCostSavedUsd = `$${costSaved.toFixed(2)}`;

  return { autoResolutionRate, avgResolutionTimeSeconds, estimatedTimeSavedMinutes, estimatedCostSavedUsd };
}

describe('Property 16: Session Metrics Never Produce NaN or Division-by-Zero', () => {
  it('should produce finite values for all metric computations including zero state', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10000 }),
        fc.nat({ max: 10000 }),
        fc.nat({ max: 1000000 }),
        fc.float({ min: 0.1, max: 120, noNaN: true }),
        fc.float({ min: 0.1, max: 500, noNaN: true }),
        (total, autoResolved, resolutionMs, avgHandling, costPerHour) => {
          const session = {
            tickets_total: total,
            tickets_auto_resolved: Math.min(autoResolved, total),
            total_resolution_time_ms: resolutionMs,
            avg_handling_time_minutes: avgHandling,
            cost_per_hour_usd: costPerHour,
          };

          const metrics = computeSessionMetrics(session);

          expect(isNaN(metrics.autoResolutionRate)).toBe(false);
          expect(isFinite(metrics.autoResolutionRate)).toBe(true);
          expect(isNaN(metrics.avgResolutionTimeSeconds)).toBe(false);
          expect(isFinite(metrics.avgResolutionTimeSeconds)).toBe(true);
          expect(isNaN(metrics.estimatedTimeSavedMinutes)).toBe(false);
          expect(isFinite(metrics.estimatedTimeSavedMinutes)).toBe(true);
          expect(metrics.estimatedCostSavedUsd).not.toContain('NaN');
          expect(metrics.estimatedCostSavedUsd).not.toContain('Infinity');
        },
      ),
      { numRuns: 500 },
    );
  });

  it('should return all zeros for a zero-state session', () => {
    const metrics = computeSessionMetrics({
      tickets_total: 0, tickets_auto_resolved: 0, total_resolution_time_ms: 0,
      avg_handling_time_minutes: 5, cost_per_hour_usd: 50,
    });
    expect(metrics.autoResolutionRate).toBe(0);
    expect(metrics.avgResolutionTimeSeconds).toBe(0);
    expect(metrics.estimatedTimeSavedMinutes).toBe(0);
    expect(metrics.estimatedCostSavedUsd).toBe('$0.00');
  });
});
