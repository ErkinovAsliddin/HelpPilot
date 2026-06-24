// tests/integration/deliveryRetry.test.ts
// Feature: helppilot

import { describe, it, expect, vi, beforeAll } from 'vitest';

process.env.DB_PATH = ':memory:';
process.env.SMTP_HOST = 'localhost';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockRejectedValue(new Error('SMTP connection refused')),
    })),
  },
}));

vi.mock('../../src/db/chromaInit.js', () => ({ chromaInit: vi.fn() }));
vi.mock('../../src/services/hitlNotifier.js', () => ({
  notifyAdmin: vi.fn(),
  startHitlNotifier: vi.fn(),
}));

import { initDb } from '../../src/db/schema.js';
import { insertTicket, getTicketById } from '../../src/db/ticketRepository.js';
import { sendEmailResponse } from '../../src/services/deliveryService.js';
import type { Ticket } from '../../src/types/ticket.js';
import { v4 as uuidv4 } from 'uuid';

beforeAll(() => {
  initDb();
});

describe('Email Delivery Retry Integration Test', () => {
  it('should mark ticket as delivery-failed after all SMTP retries fail', async () => {
    const ticketId = uuidv4();
    const ticket: Ticket = {
      id: ticketId,
      subject: 'Test delivery failure',
      source_channel: 'email',
      submitter_email: 'user@example.com',
      status: 'resolved',
      received_at: new Date().toISOString(),
    };
    insertTicket(ticket);

    await sendEmailResponse(ticket, 'Your issue has been resolved.');

    // Wait for retries
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const updated = getTicketById(ticketId);
    expect(updated?.status).toBe('delivery-failed');
  }, 30000);
});
