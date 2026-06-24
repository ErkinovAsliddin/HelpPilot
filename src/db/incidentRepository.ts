// src/db/incidentRepository.ts
import { getDb } from './schema.js';

export interface Incident {
  id: string;
  error_signature: string;
  affected_users: string;
  affected_count: number;
  first_occurrence: string;
  detected_at: string;
  suggested_fix?: string;
  kb_entry_id?: string;
  status: 'draft' | 'approved' | 'sending' | 'closed';
  admin_id?: string;
  approved_at?: string;
  closed_at?: string;
  notification_log: string;
  cooldown_until?: string;
}

export function insertIncident(incident: Incident): void {
  getDb().prepare(`
    INSERT INTO incidents (
      id, error_signature, affected_users, affected_count,
      first_occurrence, detected_at, suggested_fix, kb_entry_id,
      status, notification_log
    ) VALUES (
      @id, @error_signature, @affected_users, @affected_count,
      @first_occurrence, @detected_at, @suggested_fix, @kb_entry_id,
      @status, @notification_log
    )
  `).run(incident as unknown as Record<string, unknown>);
}

export function getIncidentById(id: string): Incident | undefined {
  return getDb().prepare('SELECT * FROM incidents WHERE id = ?').get(id) as Incident | undefined;
}

export function listIncidents(filters: { status?: string } = {}): Incident[] {
  if (filters.status) {
    return getDb().prepare('SELECT * FROM incidents WHERE status = ? ORDER BY detected_at DESC').all(filters.status) as Incident[];
  }
  return getDb().prepare('SELECT * FROM incidents ORDER BY detected_at DESC').all() as Incident[];
}

export function updateIncident(id: string, updates: Partial<Incident>): void {
  const db = getDb();
  const entries = Object.entries(updates).filter(([k]) => k !== 'id');
  if (!entries.length) return;
  const sets = entries.map(([k]) => `${k} = @${k}`).join(', ');
  const params = Object.fromEntries(entries) as Record<string, unknown>;
  params['id'] = id;
  db.prepare(`UPDATE incidents SET ${sets} WHERE id = @id`).run(params);
}
