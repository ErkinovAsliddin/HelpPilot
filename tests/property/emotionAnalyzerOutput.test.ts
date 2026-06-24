// tests/property/emotionAnalyzerOutput.test.ts
// Feature: helppilot, Property 13

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

process.env.DB_PATH = ':memory:';

vi.mock('../../src/utils/bedrockClient.js', () => ({
  invokeModel: vi.fn(() =>
    Promise.resolve({
      content: [{ type: 'text', text: JSON.stringify({
        frustration_score: 5,
        urgency_score: 3,
        churn_risk: 'medium',
        emotional_state: 'stressed',
        recommended_tone: 'empathetic',
        trigger_words: [],
        reasoning: 'Moderate frustration detected',
      })}],
    }),
  ),
  embedText: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../src/pipeline/eventBus.js', () => ({
  bus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

vi.mock('../../src/db/schema.js', () => ({
  getDb: vi.fn(() => ({
    prepare: vi.fn(() => ({ get: vi.fn(() => ({ cnt: 0 })) })),
  })),
  initDb: vi.fn(),
}));

import { EmotionAnalyzerAgent } from '../../src/agents/emotionAnalyzer.js';

const VALID_CHURN = new Set(['low', 'medium', 'high', 'critical']);
const VALID_STATES = new Set(['calm', 'stressed', 'angry', 'desperate']);
const VALID_TONES = new Set(['professional', 'empathetic', 'urgent', 'crisis']);

describe('Property 13: EmotionAnalyzer Output Always Has Valid Fields', () => {
  it('should always produce valid field values for arbitrary input', async () => {
    const agent = new EmotionAnalyzerAgent();

    await fc.assert(
      fc.asyncProperty(
        fc.string({ maxLength: 300 }),
        fc.string({ maxLength: 500 }),
        async (subject, body) => {
          const output = await agent.run({ ticketId: 'test-id', subject, body });

          expect(output.frustration_score).toBeGreaterThanOrEqual(0);
          expect(output.frustration_score).toBeLessThanOrEqual(10);
          expect(output.urgency_score).toBeGreaterThanOrEqual(0);
          expect(output.urgency_score).toBeLessThanOrEqual(10);
          expect(VALID_CHURN.has(output.churn_risk)).toBe(true);
          expect(VALID_STATES.has(output.emotional_state)).toBe(true);
          expect(VALID_TONES.has(output.recommended_tone)).toBe(true);
          expect(Array.isArray(output.trigger_words)).toBe(true);
          expect(typeof output.reasoning).toBe('string');
        },
      ),
      { numRuns: 50 },
    );
  });
});
