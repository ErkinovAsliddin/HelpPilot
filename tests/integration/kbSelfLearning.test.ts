// tests/integration/kbSelfLearning.test.ts
// Feature: helppilot

import { describe, it, expect, vi, beforeAll } from 'vitest';

process.env.DB_PATH = ':memory:';

vi.mock('../../src/db/chromaInit.js', () => ({ chromaInit: vi.fn() }));
vi.mock('../../src/services/hitlNotifier.js', () => ({
  notifyAdmin: vi.fn(),
  startHitlNotifier: vi.fn(),
}));
vi.mock('../../src/utils/bedrockClient.js', () => ({
  invokeModel: vi.fn(() => Promise.resolve({ content: [{ type: 'text', text: 'ok' }] })),
  embedText: vi.fn(() => Promise.resolve(new Array(1536).fill(0.1))),
}));

import { initDb } from '../../src/db/schema.js';
import { initSession } from '../../src/services/sessionMetricsService.js';
import { LoggerAgent } from '../../src/agents/logger.js';
import type { Ticket } from '../../src/types/ticket.js';
import { v4 as uuidv4 } from 'uuid';
import { insertTicket } from '../../src/db/ticketRepository.js';

beforeAll(() => {
  initDb();
  initSession();
});

describe('KB Self-Learning Integration Test', () => {
  it('should call logger without throwing for a successful ticket', async () => {
    const ticketId = uuidv4();
    const ticket: Ticket = {
      id: ticketId,
      subject: 'Password reset help',
      body: 'I need to reset my password urgently.',
      source_channel: 'api',
      status: 'resolved',
      outcome: 'SUCCESS_AUTO',
      successfully_resolved: 1,
      final_response: 'Please visit the self-service portal to reset your password.',
      confidence_score: 92,
      category: 'password-reset',
      priority: 'medium',
      received_at: new Date().toISOString(),
      terminal_at: new Date().toISOString(),
    };
    insertTicket(ticket);

    const logger = new LoggerAgent();
    await expect(logger.run(ticket)).resolves.not.toThrow();
  });
});
