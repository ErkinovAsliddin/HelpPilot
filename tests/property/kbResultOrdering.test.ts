// tests/property/kbResultOrdering.test.ts
// Feature: helppilot, Property 6

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Pure sort/filter function to test
function sortAndFilterKBResults(
  results: Array<{ similarityScore: number; title: string }>,
): Array<{ similarityScore: number; title: string }> {
  return results
    .filter((r) => r.similarityScore > 0)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 3);
}

describe('Property 6: KB Search Results are Always Sorted by Descending Similarity Score', () => {
  it('should return results in descending order with no score ≤ 0', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            similarityScore: fc.float({ min: -0.5, max: 1.0, noNaN: true }),
            title: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          { maxLength: 20 },
        ),
        (results) => {
          const sorted = sortAndFilterKBResults(results);

          // No scores <= 0
          for (const r of sorted) {
            expect(r.similarityScore).toBeGreaterThan(0);
          }

          // Descending order
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i - 1]!.similarityScore).toBeGreaterThanOrEqual(sorted[i]!.similarityScore);
          }

          // Max 3 results
          expect(sorted.length).toBeLessThanOrEqual(3);

          // Count valid input items
          const validCount = results.filter((r) => r.similarityScore > 0).length;
          expect(sorted.length).toBe(Math.min(validCount, 3));
        },
      ),
      { numRuns: 500 },
    );
  });
});
