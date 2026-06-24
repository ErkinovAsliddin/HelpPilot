// src/routes/tickets.ts
// Feature: helppilot

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  insertTicket,
  getTicketById,
  listTickets,
} from '../db/ticketRepository.js';
import { bus } from '../pipeline/eventBus.js';
import { log } from '../utils/logger.js';
import { uploadMiddleware, handleUploadErrors } from '../middleware/upload.js';
import type { Ticket } from '../types/ticket.js';

const router = Router();

// POST /api/tickets — create ticket (JSON, form-encoded, or multipart)
router.post('/api/tickets', uploadMiddleware as any, handleUploadErrors as any, (req, res) => {
  const body = req.body as Record<string, string>;
  const subject: string | undefined = body['subject'];
  const bodyText: string | undefined = body['body'];

  if (!subject && !bodyText) {
    res.status(400).json({ error: 'At least one of "subject" or "body" is required.' });
    return;
  }

  if (subject && subject.length > 255) {
    res.status(400).json({ error: '"subject" must not exceed 255 characters.' });
    return;
  }
  if (bodyText && bodyText.length > 10000) {
    res.status(400).json({ error: '"body" must not exceed 10,000 characters.' });
    return;
  }

  const ticketId = uuidv4();
  const receivedAt = new Date().toISOString();

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const attachments: Ticket['attachments'] = files.map((f) => ({
    type: f.mimetype.startsWith('image/') ? 'image' : 'audio',
    filename: f.originalname,
    buffer: f.buffer,
    sizeMb: f.size / (1024 * 1024),
  }));

  const ticket: Ticket = {
    id: ticketId,
    subject,
    body: bodyText,
    source_channel: req.is('application/x-www-form-urlencoded') ? 'webform' : 'api',
    submitter_email: body['submitter_email'],
    status: 'received',
    received_at: receivedAt,
    source_modality: attachments.length > 0 ? (attachments[0]?.type === 'image' ? 'image' : 'voice') : 'text',
    attachments,
  };

  try {
    insertTicket(ticket);
  } catch (err) {
    log({ level: 'error', ticketId, eventType: 'ticket.insert.error', message: String(err) });
    res.status(500).json({ error: 'Failed to create ticket' });
    return;
  }

  // Enqueue with retry
  let attempts = 0;
  const enqueue = (): void => {
    try {
      bus.emit('ticket.received', ticket);
    } catch {
      attempts++;
      if (attempts < 3) {
        setTimeout(enqueue, 1000);
      } else {
        import('../db/ticketRepository.js').then(({ updateTicket }) => {
          updateTicket(ticketId, { status: 'enqueue-failed', enqueue_attempts: attempts });
        }).catch(() => {});
      }
    }
  };
  enqueue();

  log({ level: 'info', ticketId, eventType: 'ticket.created', message: 'Ticket created and enqueued', receivedAt });
  res.status(201).json({ ticketId, status: 'received', receivedAt });
});

// GET /api/tickets
router.get('/api/tickets', (req, res) => {
  const q = req.query as Record<string, string>;
  const tickets = listTickets(
    {
      status: q['status'] as any,
      category: q['category'] as any,
      priority: q['priority'] as any,
      adminId: q['adminId'],
      fromDate: q['fromDate'],
      toDate: q['toDate'],
    },
    {
      page: q['page'] ? parseInt(q['page'], 10) : 1,
      pageSize: q['pageSize'] ? parseInt(q['pageSize'], 10) : 100,
      sortBy: (q['sortBy'] as any) || 'received_at',
      sortOrder: (q['sortOrder'] as any) || 'desc',
    },
  );
  res.json({ tickets });
});

// GET /api/tickets/:id
router.get('/api/tickets/:id', (req, res) => {
  const ticket = getTicketById(req.params['id'] as string);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  res.json(ticket);
});

export default router;
