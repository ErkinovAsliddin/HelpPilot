// src/services/hitlNotifier.ts
// Feature: helppilot

import nodemailer from 'nodemailer';
import { bus } from '../pipeline/eventBus.js';
import { listTickets } from '../db/ticketRepository.js';
import { log } from '../utils/logger.js';
import type { Ticket } from '../types/ticket.js';

const STALE_HOURS = 4;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

export async function notifyAdmin(ticket: Ticket, urgent = false): Promise<void> {
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  if (slackUrl) {
    try {
      const { default: fetch } = await import('node-fetch');
      const emoji = urgent ? '🚨' : '📋';
      await fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${emoji} HelpPilot: Ticket requires admin action\nID: ${ticket.id}\nPriority: ${ticket.priority}\nCategory: ${ticket.category}\nConfidence: ${ticket.confidence_score ?? 'N/A'}`,
        }),
      });
      return;
    } catch (err) {
      log({ level: 'warn', ticketId: ticket.id, eventType: 'hitl.slack.error', message: String(err) });
    }
  }

  // Email fallback
  const smtpHost = process.env.SMTP_HOST;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (smtpHost && adminEmail) {
    try {
      const transport = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transport.sendMail({
        from: process.env.SMTP_FROM || 'helppilot@noreply.com',
        to: adminEmail,
        subject: `[HelpPilot] Ticket requires approval: ${ticket.id}`,
        text: `Ticket ${ticket.id} requires admin action.\nPriority: ${ticket.priority}\nCategory: ${ticket.category}`,
      });
    } catch (err) {
      log({ level: 'warn', ticketId: ticket.id, eventType: 'hitl.email.error', message: String(err) });
    }
  }
}

export function startHitlNotifier(): void {
  bus.on('ticket.draft_ready', (ticket) => {
    void notifyAdmin(ticket);
  });

  bus.on('ticket.critical_churn', (ticket) => {
    setTimeout(() => void notifyAdmin(ticket, true), 0);
  });

  // Stale ticket sweep
  setInterval(() => {
    const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString();
    const stale = listTickets({ status: 'pending-approval' }).filter(
      (t) => (t.received_at ?? '') < cutoff,
    );
    for (const ticket of stale) {
      void notifyAdmin(ticket);
      import('../db/ticketRepository.js').then(({ updateTicket }) => {
        updateTicket(ticket.id, { status: 'stale' });
      }).catch(() => {});
      log({ level: 'warn', ticketId: ticket.id, eventType: 'hitl.stale', message: 'Ticket marked stale after 4h without action' });
    }
  }, SWEEP_INTERVAL_MS);

  log({ level: 'info', eventType: 'hitl.notifier.started', message: 'HITL Notifier started' });
}
