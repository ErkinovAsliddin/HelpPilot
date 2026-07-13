// src/routes/voice.ts
// Feature: helppilot — Voice Command route
import { Router } from 'express';
import { invokeText } from '../utils/qwenClient.js';
import { listTickets, countTickets, updateTicket } from '../db/ticketRepository.js';
import { listIncidents } from '../db/incidentRepository.js';
import { log } from '../utils/logger.js';

const router = Router();

interface VoiceResult {
  action: string;
  message: string;
  speak: string;
  navigate?: string;
  data?: unknown;
}

router.post('/api/voice/command', async (req, res) => {
  const body = req.body as Record<string, string>;
  const transcript = (body['transcript'] || '').trim();

  if (!transcript) {
    res.status(400).json({ error: '"transcript" is required.' });
    return;
  }

  const lower = transcript.toLowerCase();

  try {
    // ── Fast, deterministic quick commands (no AI call needed) ──────────
    if (lower.includes('show ticket') || lower.includes('open ticket')) {
      const result: VoiceResult = {
        action: 'navigate', message: 'Opening tickets.', speak: 'Opening your tickets.',
        navigate: '/tickets',
      };
      res.json(result); return;
    }

    if (lower.includes('metric')) {
      const result: VoiceResult = {
        action: 'navigate', message: 'Opening metrics.', speak: 'Opening metrics dashboard.',
        navigate: '/metrics',
      };
      res.json(result); return;
    }

    if (lower.includes('incident')) {
      const result: VoiceResult = {
        action: 'navigate', message: 'Opening incidents.', speak: 'Opening incidents page.',
        navigate: '/incidents',
      };
      res.json(result); return;
    }

    if (lower.includes('how many pending') || lower.includes('pending ticket')) {
      const pending = countTickets({ status: 'received' });
      const result: VoiceResult = {
        action: 'info', message: `${pending} ticket(s) pending.`,
        speak: `There are ${pending} pending tickets.`,
      };
      res.json(result); return;
    }

    if (lower.includes('system status') || lower.includes('status')) {
      const total = countTickets();
      const openIncidents = listIncidents({ status: 'pending' }).length;
      const result: VoiceResult = {
        action: 'info',
        message: `${total} total tickets, ${openIncidents} open incidents.`,
        speak: `System status: ${total} total tickets, and ${openIncidents} open incidents awaiting approval.`,
      };
      res.json(result); return;
    }

    if (lower.includes('approve') && lower.includes('ticket')) {
      const pending = listTickets({ status: 'received' }, { page: 1, pageSize: 1 });
      if (pending.length === 0) {
        const result: VoiceResult = {
          action: 'info', message: 'No pending tickets to approve.',
          speak: 'There are no pending tickets to approve right now.',
        };
        res.json(result); return;
      }
      const ticket = pending[0];
      updateTicket(ticket.id, { status: 'resolved' });
      const result: VoiceResult = {
        action: 'approved', message: `Ticket "${ticket.subject || ticket.id}" approved.`,
        speak: `Approved the ticket titled ${ticket.subject || 'untitled'}.`,
        data: { ticketId: ticket.id },
      };
      res.json(result); return;
    }

    // ── Fallback: free-form command → Qwen ───────────────────────────────
    const systemPrompt = `You are a voice command interpreter for the HelpPilot IT helpdesk dashboard.
Given a spoken command transcript, respond ONLY with strict JSON (no markdown, no commentary) in this exact shape:
{"action": "info" | "navigate" | "error", "message": "short text for on-screen display", "speak": "short spoken reply"}
Keep "speak" under 25 words. If you don't understand the command, use action "error".`;

    const result = await invokeText(systemPrompt, transcript);
    let parsed: VoiceResult;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      parsed = { action: 'info', message: result.text.slice(0, 200), speak: result.text.slice(0, 150) };
    }
    res.json(parsed);
  } catch (err) {
    log({ level: 'error', eventType: 'voice.command.error', message: String(err) });
    res.status(500).json({ error: 'Failed to process voice command.' });
  }
});

export default router;
