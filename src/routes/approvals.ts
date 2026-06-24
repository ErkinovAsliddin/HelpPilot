// src/routes/approvals.ts
// Feature: helppilot

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/schema.js';
import { insertHitlEntry } from '../db/hitlRepository.js';
import { bus } from '../pipeline/eventBus.js';

const router = Router();

const VALID_ACTIONS = new Set(['approve', 'edit-approve', 'reject']);

router.post('/api/approvals', (req, res) => {
  const body = req.body as Record<string, string>;
  const { ticketId, action, adminId, editedResponse, notes } = body;

  if (!ticketId || !action || !adminId) {
    res.status(400).json({ error: 'ticketId, action, and adminId are required.' });
    return;
  }
  if (!VALID_ACTIONS.has(action)) {
    res.status(400).json({ error: `action must be one of: ${[...VALID_ACTIONS].join(', ')}` });
    return;
  }
  if (action === 'edit-approve' && !editedResponse) {
    res.status(422).json({ error: 'editedResponse is required for edit-approve action.' });
    return;
  }

  const db = getDb();
  const now = new Date().toISOString();

  // Atomic update — prevent concurrent actions
  const result = db
    .prepare(`UPDATE tickets SET status = ?, admin_id = ?, admin_action = ?, admin_action_at = ? WHERE id = ? AND status = 'pending-approval'`)
    .run(
      action === 'reject' ? 'escalated' : 'resolved',
      adminId,
      action,
      now,
      ticketId,
    );

  if (result.changes === 0) {
    res.status(409).json({ error: 'Ticket is not in pending-approval state or concurrent action already taken.' });
    return;
  }

  // Log HITL entry
  insertHitlEntry({
    id: uuidv4(),
    ticket_id: ticketId,
    admin_id: adminId,
    action: action as 'approve' | 'edit-approve' | 'reject',
    notes,
    actioned_at: now,
  });

  // Emit events
  if (action === 'reject') {
    bus.emit('ticket.rejected', { ticketId, notes, adminId });
  } else {
    bus.emit('ticket.approved', {
      ticketId,
      editedResponse: action === 'edit-approve' ? editedResponse : undefined,
      adminId,
    });
  }

  res.json({ success: true, ticketId, action });
});

export default router;
