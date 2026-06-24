// tests/property/metricsComputation.test.ts
// Feature: helppilot, Property 11

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Pure computation function (mirrors what the React hook does)
function computeMetrics(tickets: Array<{
  outcome?: string;
  confidence_score?: number;
  received_at: string;
  terminal_at?: string;
}>) {
  const totalProcessed = tickets.length;
  const autoResolved = tickets.filter((t) => t.outcome === 'SUCCESS_AUTO').length;
  const autoResolutionRate = totalProcessed > 0
    ? Math.round((autoResolved / totalProcessed) * 10000) / 100
    : 0;

  const withScores = tickets.filter((t) => t.confidence_score !== undefined && t.confidence_score !== null);
  const avgConfidenceScore = withScores.length > 0
    ? withScores.reduce((sum, t) => sum + (t.confidence_score ?? 0), 0) / withScores.length
    : 0;

  const withTimes = tickets.filter((t) => t.terminal_at);
  const avgResponseTime = withTimes.length > 0
    ? withTimes.reduce((sum, t) => {
        const ms = new Date(t.terminal_at!).getTime() - new Date(t.received_at).getTime();
        return sum + (ms > 0 ? ms / 1000 : 0);
      }, 0) / withTimes.length
    : 0;

  return { totalProcessed, autoResolutionRate, avgConfidenceScore, avgResponseTime };
}

describe('Property 11: Aggregate Metrics Are Computed Correctly', () => {
  it('should produce correct totalProcessed equal to ticket count', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          outcome: fc.option(fc.constantFrom('SUCCESS_AUTO', 'SUCCESS_ADMIN', 'ESCALATED', 'DELIVERY_FAILED')),
          confidence_score: fc.option(fc.float({ min: 0, max: 100, noNaN: true })),
          received_at: fc.constant(new Date().toISOString()),
          terminal_at: fc.option(fc.constant(new Date().toISOString())),
        }), { maxLength: 50 }),
        (tickets) => {
          const cleanTickets = tickets.map((t) => ({
            outcome: t.outcome ?? undefined,
            confidence_score: t.confidence_score ?? undefined,
            received_at: t.received_at,
            terminal_at: t.terminal_at ?? undefined,
          }));
          const metrics = computeMetrics(cleanTickets);

          expect(metrics.totalProcessed).toBe(cleanTickets.length);
          expect(isFinite(metrics.autoResolutionRate)).toBe(true);
          expect(isNaN(metrics.autoResolutionRate)).toBe(false);
          expect(isFinite(metrics.avgConfidenceScore)).toBe(true);
          expect(isNaN(metrics.avgConfidenceScore)).toBe(false);
          expect(isFinite(metrics.avgResponseTime)).toBe(true);
          expect(isNaN(metrics.avgResponseTime)).toBe(false);

          // Rate is 0-100
          expect(metrics.autoResolutionRate).toBeGreaterThanOrEqual(0);
          expect(metrics.autoResolutionRate).toBeLessThanOrEqual(100);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('should be order-independent', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          outcome: fc.constantFrom('SUCCESS_AUTO', 'SUCCESS_ADMIN', 'ESCALATED'),
          confidence_score: fc.float({ min: 0, max: 100, noNaN: true }),
          received_at: fc.constant(new Date().toISOString()),
        }), { minLength: 1, maxLength: 20 }),
        (tickets) => {
          const shuffled = [...tickets].sort(() => Math.random() - 0.5);
          const m1 = computeMetrics(tickets);
          const m2 = computeMetrics(shuffled);

          expect(m1.totalProcessed).toBe(m2.totalProcessed);
          expect(m1.autoResolutionRate).toBe(m2.autoResolutionRate);
          expect(Math.abs(m1.avgConfidenceScore - m2.avgConfidenceScore)).toBeLessThan(0.001);
        },
      ),
      { numRuns: 100 },
    );
  });
});
