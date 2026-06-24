// src/services/reasoningTraceService.ts
// Feature: helppilot

import { bus } from '../pipeline/eventBus.js';
import { getDb } from '../db/schema.js';
import { log } from '../utils/logger.js';
import type { AgentStep } from '../types/reasoning.js';
import type { Ticket } from '../types/ticket.js';

const traceBuffer = new Map<string, AgentStep[]>();

export function startReasoningTraceService(): void {
  bus.on('reasoning.step', (step) => {
    const { ticketId, ...agentStep } = step;
    if (!traceBuffer.has(ticketId)) traceBuffer.set(ticketId, []);
    traceBuffer.get(ticketId)!.push(agentStep as AgentStep);
  });

  bus.on('ticket.terminal', (ticket: Ticket) => {
    const steps = traceBuffer.get(ticket.id);
    if (!steps) return;

    const trace = {
      ticketId: ticket.id,
      steps,
      escalationReason: ticket.escalation_reason,
    };

    try {
      const db = getDb();
      db.prepare(`
        INSERT OR REPLACE INTO reasoning_traces (ticket_id, trace, created_at)
        VALUES (?, ?, ?)
      `).run(ticket.id, JSON.stringify(trace), new Date().toISOString());
    } catch (err) {
      log({ level: 'error', ticketId: ticket.id, eventType: 'reasoning.trace.error', message: String(err) });
    }

    traceBuffer.delete(ticket.id);
  });
}

export function getTraceBuffer(ticketId: string): AgentStep[] {
  return traceBuffer.get(ticketId) ?? [];
}
