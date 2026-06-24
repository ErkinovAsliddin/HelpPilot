// src/services/deliveryService.ts
// Feature: helppilot

import nodemailer from 'nodemailer';
import { updateTicket } from '../db/ticketRepository.js';
import { notifyAdmin } from './hitlNotifier.js';
import { withRetry } from '../utils/retry.js';
import { log } from '../utils/logger.js';
import type { Ticket } from '../types/ticket.js';

export async function sendEmailResponse(ticket: Ticket, response: string): Promise<void> {
  const to = ticket.submitter_email;
  if (!to) {
    log({ level: 'warn', ticketId: ticket.id, eventType: 'delivery.no_email', message: 'No submitter email, skipping email delivery' });
    return;
  }

  const sendgridKey = process.env.SENDGRID_API_KEY;

  await withRetry(
    async () => {
      if (sendgridKey) {
        const { default: fetch } = await import('node-fetch');
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sendgridKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: process.env.SMTP_FROM || 'helppilot@noreply.com' },
            subject: `Re: ${ticket.subject || 'Your support ticket'}`,
            content: [{ type: 'text/plain', value: response }],
          }),
        });
        if (!res.ok) throw new Error(`SendGrid error: ${res.status}`);
      } else {
        const transport = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await transport.sendMail({
          from: process.env.SMTP_FROM || 'helppilot@noreply.com',
          to,
          subject: `Re: ${ticket.subject || 'Your support ticket'}`,
          text: response,
        });
      }
    },
    { maxAttempts: 3, initialDelay: 5000, cap: 60000, multiplier: 2 },
  ).then(() => {
    updateTicket(ticket.id, {
      status: 'resolved',
      final_response: response,
      delivered_at: new Date().toISOString(),
      delivery_channel: 'email',
    });
    log({ level: 'info', ticketId: ticket.id, eventType: 'delivery.email.sent', message: 'Email response sent' });
  }).catch(async () => {
    updateTicket(ticket.id, { status: 'delivery-failed' });
    await notifyAdmin(ticket);
    log({ level: 'error', ticketId: ticket.id, eventType: 'delivery.email.failed', message: 'All email retries exhausted' });
  });
}

export async function updateApiResponse(ticket: Ticket, response: string): Promise<void> {
  await withRetry(
    () =>
      Promise.resolve(
        updateTicket(ticket.id, {
          status: 'resolved',
          final_response: response,
          delivered_at: new Date().toISOString(),
          delivery_channel: 'api',
        }),
      ),
    { maxAttempts: 3, initialDelay: 1000, cap: 30000, multiplier: 2 },
  ).catch(async () => {
    updateTicket(ticket.id, { status: 'delivery-failed' });
    await notifyAdmin(ticket);
  });
}
