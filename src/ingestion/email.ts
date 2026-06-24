// src/ingestion/email.ts
// Feature: helppilot

import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { v4 as uuidv4 } from 'uuid';
import { insertTicket } from '../db/ticketRepository.js';
import { bus } from '../pipeline/eventBus.js';
import { log } from '../utils/logger.js';
import type { Ticket } from '../types/ticket.js';

export function startEmailIngestion(): void {
  const imapConfig = {
    user: process.env.IMAP_USER || '',
    password: process.env.IMAP_PASS || '',
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    tls: true,
  };

  if (!imapConfig.user || !imapConfig.host) {
    log({ level: 'info', eventType: 'email.ingestion.skipped', message: 'IMAP not configured, skipping email ingestion' });
    return;
  }

  const imap = new Imap(imapConfig);

  imap.once('ready', () => {
    imap.openBox('INBOX', false, (err, _box) => {
      if (err) {
        log({ level: 'error', eventType: 'email.imap.error', message: String(err) });
        return;
      }
      fetchUnread(imap);
    });
  });

  imap.once('error', (err: Error) => {
    log({ level: 'error', eventType: 'email.imap.error', message: String(err) });
  });

  imap.connect();
}

function fetchUnread(imap: Imap): void {
  imap.search(['UNSEEN'], (err, uids) => {
    if (err || !uids.length) return;

    const f = imap.fetch(uids, { bodies: '' });
    f.on('message', (msg) => {
      const buffers: Buffer[] = [];
      msg.on('body', (stream) => {
        stream.on('data', (chunk: Buffer) => buffers.push(chunk));
        stream.once('end', () => {
          const raw = Buffer.concat(buffers);
          simpleParser(raw)
            .then((parsed) => {
              const subject = parsed.subject || '';
              const body = (typeof parsed.text === 'string' ? parsed.text : '') || '';
              const from = parsed.from?.value?.[0]?.address;

              if (!subject && !body) {
                log({ level: 'warn', eventType: 'email.parse.discard', message: 'Email discarded: no subject or body' });
                return;
              }

              const ticket: Ticket = {
                id: uuidv4(),
                subject,
                body,
                source_channel: 'email',
                submitter_email: from,
                status: 'received',
                received_at: new Date().toISOString(),
                source_modality: 'text',
              };

              insertTicket(ticket);
              bus.emit('ticket.received', ticket);
              log({ level: 'info', ticketId: ticket.id, eventType: 'email.ingested', message: 'Email ticket created' });
            })
            .catch((parseErr) => {
              log({ level: 'error', eventType: 'email.parse.error', message: `Failed to parse email: ${String(parseErr)}` });
            });
        });
      });
    });
  });
}
