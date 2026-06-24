// tests/property/multiModalNormalization.test.ts
// Feature: helppilot, Property 17

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

vi.mock('../../src/utils/bedrockClient.js', () => ({
  invokeModel: vi.fn(() => Promise.resolve({ content: [{ type: 'text', text: 'extracted text' }] })),
  embedText: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../src/pipeline/eventBus.js', () => ({
  bus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

import { MultiModalHandlerAgent } from '../../src/agents/multiModalHandler.js';
import type { Ticket } from '../../src/types/ticket.js';

const VALID_MODALITIES = new Set(['text', 'image', 'voice', 'email_thread']);

describe('Property 17: MultiModal Normalization Always Produces Valid Ticket Format', () => {
  it('should always return non-null body and valid source_modality', async () => {
    const agent = new MultiModalHandlerAgent();

    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.string({ maxLength: 200 })),
        fc.option(fc.string({ maxLength: 1000 })),
        async (subject, body) => {
          const ticket: Ticket = {
            id: 'test-id',
            source_channel: 'api',
            status: 'received',
            received_at: new Date().toISOString(),
            subject: subject ?? undefined,
            body: body ?? undefined,
          };

          const output = await agent.run(ticket);

          expect(output.body).toBeDefined();
          expect(typeof output.body).toBe('string');
          expect(VALID_MODALITIES.has(output.source_modality)).toBe(true);
          expect(Array.isArray(output.processing_notes)).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });
});
