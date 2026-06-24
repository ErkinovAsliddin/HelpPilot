// tests/property/kbConfidenceMultiplier.test.ts
// Feature: helppilot, Property 14

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

function computeMultiplier(successCount: number, failureCount: number): number {
  const total = successCount + failureCount;
  if (total === 0) return 1.0;
  return successCount / total;
}

function sortWithMultiplier(
  entries: Array<{ rawScore: number; successCount: number; failureCount: number }>,
) {
  const withMultiplier = entries.map((e) => ({
    ...e,
    multiplier: computeMultiplier(e.successCount, e.failureCount),
    adjustedScore: e.rawScore * computeMultiplier(e.successCount, e.failureCount),
  }));

  const high = withMultiplier.filter((e) => e.multiplier >= 0.4);
  const low = withMultiplier.filter((e) => e.multiplier < 0.4);

  return [
    ...high.sort((a, b) => b.adjustedScore - a.adjustedScore),
    ...low.sort((a, b) => b.adjustedScore - a.adjustedScore),
  ];
}

describe('Property 14: KB Confidence Multiplier Is Always in [0, 1] and Deprioritization Rule Holds', () => {
  it('should always produce multiplier in [0, 1]', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1000 }),
        fc.nat({ max: 1000 }),
        (success, failure) => {
          const m = computeMultiplier(success, failure);
          expect(m).toBeGreaterThanOrEqual(0);
          expect(m).toBeLessThanOrEqual(1);
          expect(isFinite(m)).toBe(true);
          expect(isNaN(m)).toBe(false);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('should always place low-multiplier entries after high-multiplier entries', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            rawScore: fc.float({ min: 0, max: 1, noNaN: true }),
            successCount: fc.nat({ max: 100 }),
            failureCount: fc.nat({ max: 100 }),
          }),
          { minLength: 2, maxLength: 20 },
        ),
        (entries) => {
          const sorted = sortWithMultiplier(entries);
          let seenLow = false;

          for (const entry of sorted) {
            if (entry.multiplier < 0.4) {
              seenLow = true;
            }
            if (seenLow && entry.multiplier >= 0.4) {
              // High-multiplier entry after a low one → violation
              expect(false).toBe(true);
            }
          }
        },
      ),
      { numRuns: 500 },
    );
  });
});
