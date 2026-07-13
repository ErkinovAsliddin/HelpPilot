// src/agents/logger.ts
// Feature: helppilot

import { updateTicket } from '../db/ticketRepository.js';
import { log } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';
import type { Ticket } from '../types/ticket.js';
import { ChromaClient } from 'chromadb';
import { embedText } from '../utils/qwenClient.js';

const COLLECTION_NAME = 'helppilot_kb';

export class LoggerAgent {
  async run(ticket: Ticket): Promise<void> {
    // Write terminal state to SQLite
    try {
      await withRetry(() =>
        Promise.resolve(
          updateTicket(ticket.id, {
            status: ticket.status,
            outcome: ticket.outcome,
            terminal_at: ticket.terminal_at ?? new Date().toISOString(),
            final_response: ticket.final_response,
            successfully_resolved: ticket.successfully_resolved,
            admin_action: ticket.admin_action,
            admin_id: ticket.admin_id,
            admin_notes: ticket.admin_notes,
            admin_action_at: ticket.admin_action_at,
            delivery_channel: ticket.delivery_channel,
            delivered_at: ticket.delivered_at,
          }),
        ),
      );
    } catch (err) {
      log({
        level: 'error',
        ticketId: ticket.id,
        eventType: 'logger.sqlite.error',
        message: `Failed to write terminal state: ${String(err)}`,
        targetStore: 'sqlite',
        errorClass: err instanceof Error ? err.constructor.name : 'Error',
        timestamp: new Date().toISOString(),
      });
    }

    // KB upsert for successful resolutions
    if (
      ticket.successfully_resolved === 1 &&
      (ticket.outcome === 'SUCCESS_ADMIN' || ticket.outcome === 'SUCCESS_AUTO')
    ) {
      await this.upsertKBEntry(ticket);
    }

    log({
      level: 'info',
      ticketId: ticket.id,
      eventType: 'logger.terminal',
      message: `Ticket reached terminal state: ${ticket.outcome}`,
      outcome: ticket.outcome,
      status: ticket.status,
    });
  }

  private async upsertKBEntry(ticket: Ticket): Promise<void> {
    const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
    const client = new ChromaClient({ path: chromaUrl });

    try {
      const collection = await client.getOrCreateCollection({ name: COLLECTION_NAME });
      const existing = await collection.get({ ids: [ticket.id] });
      if (existing.ids.length > 0) return; // already exists

      const docText = ticket.translated_body || ticket.body || ticket.subject || '';
      const embedding = await embedText(docText);

      await withRetry(() =>
        collection.add({
          ids: [ticket.id],
          documents: [docText],
          embeddings: [embedding],
          metadatas: [
            {
              title: ticket.subject || ticket.id,
              summary: (ticket.final_response || '').slice(0, 500),
              type: 'logged_resolution',
              category: ticket.category || 'other',
              source: 'logged',
              ticketId: ticket.id,
              createdAt: new Date().toISOString(),
              success_count: 1,
              failure_count: 0,
            },
          ],
        }),
      );

      log({ level: 'info', ticketId: ticket.id, eventType: 'logger.kb.upsert', message: 'KB entry created from resolved ticket.' });
    } catch (err) {
      log({
        level: 'error',
        ticketId: ticket.id,
        eventType: 'logger.chroma.error',
        message: String(err),
        targetStore: 'chromadb',
        errorClass: err instanceof Error ? err.constructor.name : 'Error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  static buildRecord(ticket: Ticket): Partial<Ticket> {
    return {
      id: ticket.id,
      category: ticket.category,
      priority: ticket.priority,
      outcome: ticket.outcome,
      terminal_at: ticket.terminal_at ?? new Date().toISOString(),
      confidence_score: ticket.confidence_score,
      final_response: ticket.final_response,
    };
  }
}
