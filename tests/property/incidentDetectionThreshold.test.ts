// tests/property/incidentDetectionThreshold.test.ts
// Feature: helppilot, Property 18

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

const INCIDENT_THRESHOLD = 5;

function shouldCreateIncident(userIds: string[]): boolean {
  return new Set(userIds).size >= INCIDENT_THRESHOLD;
}

describe('Property 18: Incident Detection Threshold Is Exactly 5 Users', () => {
  it('should create incident if and only if ≥5 distinct users', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
        (userIds) => {
          const distinctCount = new Set(userIds).size;
          const shouldDetect = shouldCreateIncident(userIds);

          if (distinctCount >= 5) {
            expect(shouldDetect).toBe(true);
          } else {
            expect(shouldDetect).toBe(false);
          }
        },
      ),
      { numRuns: 500 },
    );
  });

  it('should never trigger with exactly 4 users', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 4, maxLength: 4 }),
        (fourUsers) => {
          expect(shouldCreateIncident(fourUsers)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('should always trigger with exactly 5 distinct users', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 5, maxLength: 5 }),
        (fiveUsers) => {
          expect(shouldCreateIncident(fiveUsers)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });
});
