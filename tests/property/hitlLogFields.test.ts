// tests/property/hitlLogFields.test.ts
// Feature: helppilot, Property 7

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';

// Use in-memory DB for tests
process.env.DB_PATH = ':memory:';

import { initDb } from '../../src/db/schema.js';
import { insertTicket } from '../../src/db/ticketRepository.js';
import { insertHitlEntry, getHitlEntriesForTicket } from '../../src/db/hitlRepository.js';

beforeEach(() => {
  initDb();
});

describe('Property 7: HITL Log Entries Always Contain Required Fields', () => {
  it('should always produce records with required non-null fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('approve', 'edit-approve', 'reject'),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (action, adminId) => {
          const ticketId = uuidv4();
          insertTicket({
            id: ticketId,
            source_channel: 'api',
            status: 'pending-approval',
            received_at: new Date().toISOString(),
          });

          const entry = {
            id: uuidv4(),
            ticket_id: ticketId,
            admin_id: adminId,
            action: action as 'approve' | 'edit-approve' | 'reject',
            actioned_at: new Date().toISOString(),
          };

          insertHitlEntry(entry);
          const stored = getHitlEntriesForTicket(ticketId);

          expect(stored.length).toBeGreaterThan(0);
          const last = stored[stored.length - 1]!;
          expect(last.ticket_id).toBeTruthy();
          expect(last.admin_id).toBeTruthy();
          expect(last.action).toBeTruthy();
          expect(last.actioned_at).toBeTruthy();
        },
      ),
      { numRuns: 50 },
    );
  });
});
