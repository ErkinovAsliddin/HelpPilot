// src/services/incidentNotifier.ts
// Feature: helppilot

import { bus } from '../pipeline/eventBus.js';
import { getIncidentById, updateIncident } from '../db/incidentRepository.js';
import { getDb } from '../db/schema.js';
import { withRetry } from '../utils/retry.js';
import { log } from '../utils/logger.js';
import nodemailer from 'nodemailer';

export function startIncidentNotifier(): void {
  bus.on('incident.detected', ({ incidentId }) => {
    log({ level: 'info', eventType: 'incident.detected', message: `Incident ${incidentId} detected — awaiting admin approval` });
  });

  bus.on('incident.approved', async ({ incidentId }) => {
    const incident = getIncidentById(incidentId);
    if (!incident) return;

    updateIncident(incidentId, { status: 'sending' });

    const users: string[] = JSON.parse(incident.affected_users);
    const notifLog: Array<{ userId: string; status: string; attempts: number }> = [];

    for (const userId of users) {
      let sent = false;
      let attempts = 0;

      try {
        // Look up last contact channel
        const db = getDb();
        const ticket = db
          .prepare('SELECT submitter_email, source_channel FROM tickets WHERE submitter_email = ? ORDER BY received_at DESC LIMIT 1')
          .get(userId) as { submitter_email?: string; source_channel?: string } | undefined;

        await withRetry(
          async () => {
            attempts++;
            const smtpHost = process.env.SMTP_HOST;
            if (ticket?.submitter_email && smtpHost) {
              const transport = nodemailer.createTransport({
                host: smtpHost,
                port: parseInt(process.env.SMTP_PORT || '587', 10),
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
              });
              await transport.sendMail({
                from: process.env.SMTP_FROM || 'helppilot@noreply.com',
                to: ticket.submitter_email,
                subject: `[HelpPilot] Important IT Notice: ${incident.error_signature}`,
                text: `We've detected an issue affecting your system.\n\nIssue: ${incident.error_signature}\n${incident.suggested_fix ? `Suggested Fix: ${incident.suggested_fix}` : ''}`,
              });
            }
          },
          { maxAttempts: 3, initialDelay: 5000, cap: 60000, multiplier: 2 },
        );
        sent = true;
      } catch {
        // ignore per-user failure
      }

      notifLog.push({ userId, status: sent ? 'sent' : 'failed', attempts });
    }

    updateIncident(incidentId, {
      status: 'closed',
      notification_log: JSON.stringify(notifLog),
      closed_at: new Date().toISOString(),
    });
    log({ level: 'info', eventType: 'incident.dispatched', incidentId, message: `Notifications dispatched for incident ${incidentId}` });
  });
}
