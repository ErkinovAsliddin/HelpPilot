// tests/property/routingDeterminism.test.ts
// Feature: helppilot, Property 4

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { determineAction } from '../../src/agents/resolverRouter.js';

const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const VALID_KB_STATUSES = ['ok', 'no_results', 'search_error', 'kb_unavailable'] as const;
const VALID_ACTIONS = new Set(['auto_resolve', 'pending_approval', 'escalate']);

describe('Property 4: Confidence Score Routing is Deterministic and Exhaustive', () => {
  it('should always return exactly one valid action', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_PRIORITIES),
        fc.constantFrom(...VALID_KB_STATUSES),
        fc.float({ min: 0, max: 100, noNaN: true }),
        (priority, kbStatus, confidence) => {
          const action = determineAction(priority, kbStatus, confidence);
          expect(VALID_ACTIONS.has(action)).toBe(true);
          expect(action).toBeDefined();
          expect(typeof action).toBe('string');
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('should always return pending_approval for critical priority with ok KB', () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 100, noNaN: true }), (confidence) => {
        const action = determineAction('critical', 'ok', confidence);
        expect(action).toBe('pending_approval');
      }),
      { numRuns: 200 },
    );
  });

  it('should always escalate when kbStatus is not ok', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_PRIORITIES),
        fc.constantFrom('no_results', 'search_error', 'kb_unavailable'),
        fc.float({ min: 0, max: 100, noNaN: true }),
        (priority, kbStatus, confidence) => {
          const action = determineAction(priority, kbStatus as typeof VALID_KB_STATUSES[number], confidence);
          expect(action).toBe('escalate');
        },
      ),
      { numRuns: 200 },
    );
  });

  it('should auto_resolve when confidence > 85 and not critical with ok KB', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('low', 'medium', 'high'),
        fc.float({ min: 85.1, max: 100, noNaN: true }),
        (priority, confidence) => {
          const action = determineAction(priority as 'low' | 'medium' | 'high', 'ok', confidence);
          expect(action).toBe('auto_resolve');
        },
      ),
      { numRuns: 200 },
    );
  });
});
