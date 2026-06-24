// src/db/schema.ts — SQLite via better-sqlite3
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../helppilot.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH === ':memory:' ? ':memory:' : DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    applySchema(_db);
  }
  return _db;
}

export function initDb(): void {
  getDb();
}

// Reset for tests
export function resetDb(): void {
  _db = null;
}

function applySchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id                    TEXT PRIMARY KEY,
      subject               TEXT,
      body                  TEXT,
      source_channel        TEXT NOT NULL DEFAULT 'api',
      submitter_email       TEXT,
      status                TEXT NOT NULL DEFAULT 'received',
      category              TEXT,
      priority              TEXT,
      sentiment             TEXT,
      suggested_agent       TEXT,
      detected_language     TEXT,
      translated_subject    TEXT,
      translated_body       TEXT,
      confidence_score      REAL,
      confidence_explanation TEXT,
      draft_response        TEXT,
      translated_response   TEXT,
      final_response        TEXT,
      resolution_action     TEXT,
      outcome               TEXT,
      successfully_resolved INTEGER DEFAULT 0,
      admin_id              TEXT,
      admin_action          TEXT,
      admin_notes           TEXT,
      admin_action_at       TEXT,
      delivery_channel      TEXT,
      delivered_at          TEXT,
      kb_status             TEXT,
      kb_results            TEXT,
      received_at           TEXT NOT NULL,
      classified_at         TEXT,
      resolved_at           TEXT,
      terminal_at           TEXT,
      enqueue_attempts      INTEGER DEFAULT 0,
      frustration_score     INTEGER,
      urgency_score         INTEGER,
      churn_risk            TEXT,
      emotional_state       TEXT,
      recommended_tone      TEXT,
      trigger_words         TEXT,
      emotion_reasoning     TEXT,
      vip_flag              INTEGER DEFAULT 0,
      source_modality       TEXT DEFAULT 'text',
      multimodal_notes      TEXT,
      escalation_reason     TEXT,
      created_at            TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_status   ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
    CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
    CREATE INDEX IF NOT EXISTS idx_tickets_received ON tickets(received_at);
    CREATE INDEX IF NOT EXISTS idx_tickets_admin    ON tickets(admin_id);

    CREATE TABLE IF NOT EXISTS hitl_log (
      id          TEXT PRIMARY KEY,
      ticket_id   TEXT NOT NULL,
      admin_id    TEXT NOT NULL,
      action      TEXT NOT NULL,
      notes       TEXT,
      actioned_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_hitl_ticket ON hitl_log(ticket_id);

    CREATE TABLE IF NOT EXISTS reasoning_traces (
      ticket_id  TEXT PRIMARY KEY,
      trace      TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id               TEXT PRIMARY KEY,
      error_signature  TEXT NOT NULL,
      affected_users   TEXT NOT NULL DEFAULT '[]',
      affected_count   INTEGER NOT NULL DEFAULT 0,
      first_occurrence TEXT NOT NULL,
      detected_at      TEXT NOT NULL,
      suggested_fix    TEXT,
      kb_entry_id      TEXT,
      status           TEXT NOT NULL DEFAULT 'draft',
      admin_id         TEXT,
      approved_at      TEXT,
      closed_at        TEXT,
      notification_log TEXT NOT NULL DEFAULT '[]',
      cooldown_until   TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_incidents_status    ON incidents(status);
    CREATE INDEX IF NOT EXISTS idx_incidents_signature ON incidents(error_signature);

    CREATE TABLE IF NOT EXISTS sessions (
      id                        TEXT PRIMARY KEY,
      started_at                TEXT NOT NULL,
      tickets_auto_resolved     INTEGER DEFAULT 0,
      tickets_escalated         INTEGER DEFAULT 0,
      tickets_total             INTEGER DEFAULT 0,
      solutions_learned         INTEGER DEFAULT 0,
      tickets_prevented         INTEGER DEFAULT 0,
      emotion_escalations       INTEGER DEFAULT 0,
      total_resolution_time_ms  INTEGER DEFAULT 0,
      avg_handling_time_minutes REAL DEFAULT 5.0,
      cost_per_hour_usd         REAL DEFAULT 50.0
    );
  `);
}
