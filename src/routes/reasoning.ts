// src/routes/reasoning.ts
// Feature: helppilot

import { Router } from 'express';
import { getDb } from '../db/schema.js';
import { getTraceBuffer } from '../services/reasoningTraceService.js';
import { bus } from '../pipeline/eventBus.js';

const router = Router();

router.get('/api/tickets/:id/reasoning', (req, res) => {
  const ticketId = req.params['id'] as string;
  const db = getDb();

  // Check if completed trace exists
  const stored = db
    .prepare('SELECT trace FROM reasoning_traces WHERE ticket_id = ?')
    .get(ticketId) as { trace: string } | undefined;

  if (stored) {
    res.json(JSON.parse(stored.trace));
    return;
  }

  // SSE stream for in-progress tickets
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send buffered steps first
  const buffered = getTraceBuffer(ticketId);
  for (const step of buffered) {
    res.write(`data: ${JSON.stringify(step)}\n\n`);
  }

  const stepHandler = (step: { ticketId: string } & Record<string, unknown>): void => {
    if (step['ticketId'] === ticketId) {
      res.write(`data: ${JSON.stringify(step)}\n\n`);
    }
  };

  const terminalHandler = (ticket: { id: string }): void => {
    if (ticket.id === ticketId) {
      res.write(`data: ${JSON.stringify({ event: 'terminal' })}\n\n`);
      res.end();
      cleanup();
    }
  };

  function cleanup(): void {
    bus.off('reasoning.step', stepHandler as any);
    bus.off('ticket.terminal', terminalHandler as any);
  }

  bus.on('reasoning.step', stepHandler as any);
  bus.on('ticket.terminal', terminalHandler as any);
  req.on('close', cleanup);
});

export default router;
