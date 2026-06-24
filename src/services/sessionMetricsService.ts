// src/services/sessionMetricsService.ts
// Feature: helppilot

import { getDb } from '../db/schema.js';
import { v4 as uuidv4 } from 'uuid';

export type MetricCounter =
  | 'tickets_auto_resolved'
  | 'tickets_escalated'
  | 'tickets_total'
  | 'solutions_learned'
  | 'tickets_prevented'
  | 'emotion_escalations';

let _sessionId: string | null = null;

export function initSession(): string {
  const db = getDb();
  const id = uuidv4();
  const avgHandlingMinutes = parseFloat(process.env.AVG_HANDLING_TIME_MINUTES || '5.0');
  const costPerHour = parseFloat(process.env.COST_PER_HOUR_USD || '50.0');

  db.prepare(`
    INSERT INTO sessions (id, started_at, avg_handling_time_minutes, cost_per_hour_usd)
    VALUES (?, ?, ?, ?)
  `).run(id, new Date().toISOString(), avgHandlingMinutes, costPerHour);

  _sessionId = id;
  return id;
}

export function increment(counter: MetricCounter, value = 1): void {
  if (!_sessionId) return;
  const db = getDb();
  db.prepare(`UPDATE sessions SET ${counter} = ${counter} + ? WHERE id = ?`).run(value, _sessionId);
}

export function addResolutionTime(ms: number): void {
  if (!_sessionId) return;
  const db = getDb();
  db.prepare('UPDATE sessions SET total_resolution_time_ms = total_resolution_time_ms + ? WHERE id = ?').run(ms, _sessionId);
}

export function getSessionMetrics(): Record<string, unknown> | null {
  if (!_sessionId) return null;
  const db = getDb();
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(_sessionId) as Record<string, unknown> | null;
}

export function getCurrentSessionId(): string | null {
  return _sessionId;
}
