// tests/property/languageDetection.test.ts
// Feature: helppilot, Property 3

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

const NON_ENGLISH_LANGS = ['fr', 'es', 'de', 'pt', 'ja', 'zh'];

vi.mock('../../src/utils/bedrockClient.js', () => ({
  invokeModel: vi.fn(() =>
    Promise.resolve({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            category: 'other',
            priority: 'medium',
            sentiment: 'neutral',
            suggestedAgent: 'KBSearcher',
            detectedLanguage: NON_ENGLISH_LANGS[Math.floor(Math.random() * NON_ENGLISH_LANGS.length)],
          }),
        },
      ],
    }),
  ),
  embedText: vi.fn(() => Promise.resolve(new Array(1536).fill(0))),
}));

vi.mock('../../src/pipeline/eventBus.js', () => ({
  bus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

import { ClassifierAgent } from '../../src/agents/classifier.js';

describe('Property 3: Non-English Tickets Always Have Language Recorded', () => {
  it('should always record a non-null detectedLanguage for non-English tickets', async () => {
    const classifier = new ClassifierAgent();

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        async (text) => {
          const output = await classifier.run({ ticketId: 'test-id', subject: text, body: text });

          expect(output.detectedLanguage).toBeTruthy();
          expect(typeof output.detectedLanguage).toBe('string');
          expect((output.detectedLanguage as string).length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
