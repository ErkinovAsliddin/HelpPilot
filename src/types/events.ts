// src/types/events.ts
// Feature: helppilot

import type { Ticket } from './ticket.js';
import type { AgentStep } from './reasoning.js';

export interface PipelineEventMap {
  'ticket.received': Ticket;
  'ticket.classified': Ticket;
  'ticket.kb_searched': Ticket;
  'ticket.draft_ready': Ticket;
  'ticket.escalated': Ticket;
  'ticket.approved': { ticketId: string; editedResponse?: string; adminId: string };
  'ticket.rejected': { ticketId: string; notes?: string; adminId: string };
  'ticket.terminal': Ticket;
  'ticket.critical_churn': Ticket;
  'ticket.emotion_analyzed': Ticket;
  'reasoning.step': AgentStep & { ticketId: string };
  'incident.detected': { incidentId: string };
  'incident.approved': { incidentId: string; adminId: string };
}
