// tests/integration/emotionOverride.test.ts
// Feature: helppilot

import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

process.env.HELPPILOT_API_KEYS = 'test-key';
process.env.DB_PATH = ':memory:';

vi.mock('../../src/utils/bedrockClient.js', () => ({
  invokeModel: vi.fn((modelId: string, body: unknown) => {
    const b = body as { messages?: Array<{ content: string }> };
    const content = b?.messages?.[0]?.content ?? '';
    // Return emotion analysis with critical churn
    if (content.includes('frustration_score') || content.includes('Analyze the emotional')) {
      return Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify({
          frustration_score: 9,
          urgency_score: 9,
          churn_risk: 'critical',
          emotional_state: 'angry',
          recommended_tone: 'crisis',
          trigger_words: ['cancel'],
          reasoning: 'Very angry customer',
        })}],
      });
    }
    return Promise.resolve({
      content: [{ type: 'text', text: JSON.stringify({
        category: 'other',
        priority: 'medium',
        sentiment: 'frustrated',
        suggestedAgent: 'KBSearcher',
        draft: 'We understand your frustration.',
        confidenceScore: 92,
        confidenceExplanation: 'High confidence',
        sourcesUsed: [],
      })}],
    });
  }),
  embedText: vi.fn(() => Promise.resolve(new Array(1536).fill(0))),
}));

vi.mock('../../src/utils/chromaClient.js', () => ({
  queryCollection: vi.fn(() => Promise.resolve([
    { type: 'kb_article', title: 'General IT Help', summary: 'Contact IT', similarityScore: 0.8 },
  ])),
  KBUnavailableError: class extends Error {},
}));

vi.mock('../../src/db/chromaInit.js', () => ({ chromaInit: vi.fn() }));
vi.mock('../../src/services/hitlNotifier.js', () => ({
  notifyAdmin: vi.fn(),
  startHitlNotifier: vi.fn(),
}));

import { app } from '../../src/app.js';
import { initDb } from '../../src/db/schema.js';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { startReasoningTraceService } from '../../src/services/reasoningTraceService.js';
import { initSession } from '../../src/services/sessionMetricsService.js';

beforeAll(() => {
  initDb();
  startReasoningTraceService();
  initSession();
  new PipelineOrchestrator().start();
});

describe('Emotion Override Integration Test', () => {
  it('should route to pending-approval for critical churn_risk even with confidence > 85', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('X-API-Key', 'test-key')
      .send({ subject: 'I want to cancel everything', body: 'This is terrible. Cancel my account now.' });

    expect(res.status).toBe(201);
    const { ticketId } = res.body;

    await new Promise((r) => setTimeout(r, 3000));

    const ticket = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set('X-API-Key', 'test-key');

    expect(['pending-approval', 'escalated']).toContain(ticket.body.status);
    expect(ticket.body.status).not.toBe('resolved');
  }, 15000);
});
