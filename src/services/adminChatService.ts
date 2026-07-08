// src/services/adminChatService.ts
// Feature: helppilot — Admin AI Assistant backend

import { invokeText } from '../utils/bedrockClient.js';
import { listTickets, countTickets } from '../db/ticketRepository.js';
import { listIncidents } from '../db/incidentRepository.js';
import { getSessionMetrics } from './sessionMetricsService.js';
import { log } from '../utils/logger.js';

function buildContext(): string {
  const totalTickets = countTickets();
  const receivedTickets = countTickets({ status: 'received' });
  const resolvedTickets = countTickets({ status: 'resolved' });

  const recentTickets = listTickets({}, { page: 1, pageSize: 50, sortBy: 'received_at', sortOrder: 'desc' });

  const categoryCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};
  for (const t of recentTickets) {
    const cat = t.category || 'uncategorized';
    const pri = t.priority || 'unset';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    priorityCounts[pri] = (priorityCounts[pri] || 0) + 1;
  }

  const openIncidents = listIncidents({ status: 'pending' });
  const session = getSessionMetrics() || {};

  return `
Live HelpPilot Data Snapshot:
- Total tickets (all time): ${totalTickets}
- Tickets currently "received" (unprocessed): ${receivedTickets}
- Tickets resolved: ${resolvedTickets}
- Category breakdown (last 50 tickets): ${JSON.stringify(categoryCounts)}
- Priority breakdown (last 50 tickets): ${JSON.stringify(priorityCounts)}
- Open incidents awaiting admin approval: ${openIncidents.length}
- Incident types open: ${openIncidents.map((i) => i.error_signature).join(', ') || 'none'}
- Session metrics: ${JSON.stringify(session)}
`.trim();
}

const SYSTEM_PROMPT = `You are the Admin AI Assistant embedded in the HelpPilot IT Helpdesk dashboard.
You answer the admin's questions about their live helpdesk data — tickets, trends, metrics, incidents.
You will be given a data snapshot below each question. Base your answer ONLY on that data; if something
isn't in the snapshot, say you don't have that information rather than guessing.
Keep answers concise (2-6 lines), use "- " for bullet lists and "**bold**" for emphasis where helpful.
Do not repeat the raw JSON back verbatim — summarize it in plain, friendly language.`;

export async function answerAdminQuestion(message: string): Promise<{ reply: string; mock: boolean }> {
  const context = buildContext();
  const userPrompt = `${context}\n\nAdmin question: ${message}`;

  try {
    const result = await invokeText(SYSTEM_PROMPT, userPrompt);
    return { reply: result.text, mock: result.mock };
  } catch (err) {
    log({ level: 'error', eventType: 'chat.admin.error', message: String(err) });
    return { reply: 'Sorry, I ran into an error looking that up. Please try again.', mock: true };
  }
}
