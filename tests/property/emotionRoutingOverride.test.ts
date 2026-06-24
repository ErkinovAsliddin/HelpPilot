// tests/property/emotionRoutingOverride.test.ts
// Feature: helppilot, Property 15

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { determineAction } from '../../src/agents/resolverRouter.js';

describe('Property 15: Emotion Override Prevents Auto-Resolution for High/Critical Churn', () => {
  it('should always return pending_approval for high/critical churn_risk regardless of confidence', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.constantFrom('low', 'medium', 'high'),
        fc.constantFrom('high', 'critical'),
        (confidenceScore, priority, churnRisk) => {
          const action = determineAction(
            priority as 'low' | 'medium' | 'high',
            'ok',
            confidenceScore,
            churnRisk as 'high' | 'critical',
          );
          expect(action).toBe('pending_approval');
          expect(action).not.toBe('auto_resolve');
        },
      ),
      { numRuns: 500 },
    );
  });
});
