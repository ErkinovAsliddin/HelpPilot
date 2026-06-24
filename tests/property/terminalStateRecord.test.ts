// tests/property/terminalStateRecord.test.ts
// Feature: helppilot, Property 8

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { LoggerAgent } from '../../src/agents/logger.js';
import type { Ticket } from '../../src/types/ticket.js';
import { v4 as uuidv4 } from 'uuid';

describe('Property 8: Terminal State Logger Records Always Contain Required Fields', () => {
  it('should always include required fields in buildRecord', () => {
    fc.assert(
      fc.property(
        fc.record({
          outcome: fc.constantFrom('SUCCESS_ADMIN', 'SUCCESS_AUTO', 'ESCALATED', 'DELIVERY_FAILED'),
          category: fc.constantFrom('password-reset', 'network-issue', 'other'),
          priority: fc.constantFrom('low', 'medium', 'high', 'critical'),
          confidence_score: fc.float({ min: 0, max: 100, noNaN: true }),
          final_response: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
        }),
        ({ outcome, category, priority, confidence_score, final_response }) => {
          const ticket: Ticket = {
            id: uuidv4(),
            source_channel: 'api',
            status: 'resolved',
            received_at: new Date().toISOString(),
            category: category as Ticket['category'],
            priority: priority as Ticket['priority'],
            outcome: outcome as Ticket['outcome'],
            confidence_score,
            final_response: final_response ?? undefined,
          };

          const record = LoggerAgent.buildRecord(ticket);

          expect(record.id).toBeTruthy();
          expect(record.category).toBeTruthy();
          expect(record.priority).toBeTruthy();
          expect(record.outcome).toBeTruthy();
          expect(record.terminal_at).toBeTruthy();

          // SUCCESS outcomes must include score and response
          if (outcome === 'SUCCESS_ADMIN' || outcome === 'SUCCESS_AUTO') {
            expect(record.confidence_score).toBeDefined();
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
