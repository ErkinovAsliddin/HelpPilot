// tests/integration/pipeline.test.ts
// Feature: helppilot

import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

process.env.HELPPILOT_API_KEYS = 'test-key';
process.env.DB_PATH = ':memory:';

vi.mock('../../src/utils/bedrockClient.js', () => ({
  invokeModel: vi.fn(() => Promise.resolve({
    content: [{ type: 'text', text: JSON.stringify({
      category: 'password-reset',
      priority: 'medium',
      sentiment: 'neutral',
      suggestedAgent: 'KBSearcher',
      draft: 'Please reset your password using the self-service portal.',
      confidenceScore: 90,
      confidenceExplanation: 'High confidence KB match',
      sourcesUsed: ['Password Reset via Self-Service Portal'],
    })}],
  })),
  embedText: vi.fn(() => Promise.resolve(new Array(1536).fill(0))),
}));

vi.mock('../../src/utils/chromaClient.js', () => ({
  queryCollection: vi.fn(() => Promise.resolve([
    { type: 'kb_article', title: 'Password Reset via Self-Service Portal', summary: 'Visit password.company.com', similarityScore: 0.9 },
  ])),
  KBUnavailableError: class KBUnavailableError extends Error {},
}));

vi.mock('../../src/db/chromaInit.js', () => ({ chromaInit: vi.fn() }));
vi.mock('../../src/services/hitlNotifier.js', () => ({
  notifyAdmin: vi.fn(),
  startHitlNotifier: vi.fn(),
}));

import { app } from '../../src/app.js';
import { initDb, getDb } from '../../src/db/schema.js';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { startReasoningTraceService } from '../../src/services/reasoningTraceService.js';
import { initSession } from '../../src/services/sessionMetricsService.js';

beforeAll(() => {
  initDb();
  startReasoningTraceService();
  initSession();
  const orch = new PipelineOrchestrator();
  orch.start();
});

describe('Full Pipeline Smoke Integration Test', () => {
  it('should process a ticket through all stages and reach a terminal state', async () => {
    const createRes = await request(app)
      .post('/api/tickets')
      .set('X-API-Key', 'test-key')
      .send({ subject: 'Cannot login to my account', body: 'I forgot my password and the reset link is not working.' });

    expect(createRes.status).toBe(201);
    const { ticketId } = createRes.body;
    expect(ticketId).toBeTruthy();

    // Wait for pipeline to process
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const getRes = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set('X-API-Key', 'test-key');

    expect(getRes.status).toBe(200);
    const ticket = getRes.body;
    expect(['resolved', 'pending-approval', 'escalated']).toContain(ticket.status);
  });
});
