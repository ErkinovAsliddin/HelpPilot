// src/db/hitlRepository.ts
import { getDb } from './schema.js';

export interface HitlEntry {
  id: string;
  ticket_id: string;
  admin_id: string;
  action: 'approve' | 'edit-approve' | 'reject';
  notes?: string;
  actioned_at: string;
}

export function insertHitlEntry(entry: HitlEntry): void {
  getDb().prepare(`
    INSERT INTO hitl_log (id, ticket_id, admin_id, action, notes, actioned_at)
    VALUES (@id, @ticket_id, @admin_id, @action, @notes, @actioned_at)
  `).run(entry as unknown as Record<string, unknown>);
}

export function getHitlEntriesForTicket(ticketId: string): HitlEntry[] {
  return getDb().prepare(
    'SELECT * FROM hitl_log WHERE ticket_id = ? ORDER BY actioned_at ASC'
  ).all(ticketId) as HitlEntry[];
}
