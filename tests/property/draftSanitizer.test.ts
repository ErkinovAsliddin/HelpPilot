// tests/property/draftSanitizer.test.ts
// Feature: helppilot, Property 5

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { sanitizeDraft } from '../../src/utils/draftSanitizer.js';
import { v4 as uuidv4 } from 'uuid';

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
const CONFIDENCE_REGEX = /confidence[:\s]+\d+/i;
const AGENT_REGEX = /\b(Classifier|KBSearcher|Resolver|LoggerAgent|Logger|PipelineOrchestrator|MultiModalHandler|EmotionAnalyzer|PredictionEngine)\b/;

describe('Property 5: Draft Responses Never Contain Internal System Metadata', () => {
  it('should strip UUIDs from arbitrary text', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 500 }), (text) => {
        const injected = `${text} ${uuidv4()} ${text}`;
        const sanitized = sanitizeDraft(injected);
        expect(UUID_REGEX.test(sanitized)).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  it('should strip confidence patterns', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 200 }),
        fc.integer({ min: 0, max: 100 }),
        (text, score) => {
          const injected = `${text} confidence: ${score} ${text}`;
          const sanitized = sanitizeDraft(injected);
          expect(CONFIDENCE_REGEX.test(sanitized)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('should strip agent names', () => {
    const agents = ['Classifier', 'KBSearcher', 'Resolver', 'Logger', 'MultiModalHandler'];
    fc.assert(
      fc.property(
        fc.string({ maxLength: 200 }),
        fc.constantFrom(...agents),
        (text, agent) => {
          const injected = `${text} ${agent} processed this ${text}`;
          const sanitized = sanitizeDraft(injected);
          expect(AGENT_REGEX.test(sanitized)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });
});
