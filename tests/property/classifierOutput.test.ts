// tests/property/classifierOutput.test.ts
// Feature: helppilot, Property 2

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

vi.mock('../../src/utils/bedrockClient.js', () => ({
  invokeModel: vi.fn((_modelId: string, body: { messages?: Array<{ content: string }> }) => {
    return Promise.resolve({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            category: 'password-reset',
            priority: 'medium',
            sentiment: 'neutral',
            suggestedAgent: 'KBSearcher',
            detectedLanguage: 'en',
          }),
        },
      ],
    });
  }),
  embedText: vi.fn(() => Promise.resolve(new Array(1536).fill(0))),
}));

vi.mock('../../src/pipeline/eventBus.js', () => ({
  bus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

import { ClassifierAgent } from '../../src/agents/classifier.js';

const VALID_CATEGORIES = new Set(['password-reset', 'network-issue', 'software-install', 'hardware-failure', 'billing', 'other']);
const VALID_PRIORITIES = new Set(['low', 'medium', 'high', 'critical']);
const VALID_SENTIMENTS = new Set(['neutral', 'frustrated', 'urgent', 'positive']);
const VALID_AGENTS = new Set(['KBSearcher', 'Resolver', 'human-review']);

describe('Property 2: Classification Output is Always Valid and Complete', () => {
  it('should always return valid enum values for arbitrary input', async () => {
    const classifier = new ClassifierAgent();

    await fc.assert(
      fc.asyncProperty(
        fc.string({ maxLength: 500 }),
        fc.string({ maxLength: 1000 }),
        async (subject, body) => {
          const output = await classifier.run({ ticketId: 'test-id', subject, body });

          expect(VALID_CATEGORIES.has(output.category)).toBe(true);
          expect(VALID_PRIORITIES.has(output.priority)).toBe(true);
          expect(VALID_SENTIMENTS.has(output.sentiment)).toBe(true);
          expect(VALID_AGENTS.has(output.suggestedAgent)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
