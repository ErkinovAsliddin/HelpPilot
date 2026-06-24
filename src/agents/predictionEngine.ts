// src/agents/predictionEngine.ts
// Feature: helppilot

import { v4 as uuidv4 } from 'uuid';
import { insertIncident } from '../db/incidentRepository.js';
import { log } from '../utils/logger.js';
import { bus } from '../pipeline/eventBus.js';
import { MockEventStream } from './mockEventStream.js';

const INCIDENT_THRESHOLD = 5;
const PREDICTION_INTERVAL_MS = parseInt(process.env.PREDICTION_INTERVAL_MS || '30000', 10);
const INCIDENT_WINDOW_MS = parseInt(process.env.INCIDENT_WINDOW_MS || '300000', 10);
const COOLDOWN_MS = 30 * 60 * 1000;

export class PredictionEngine {
  private rolling = new Map<string, Map<string, Date>>();
  private cooldowns = new Map<string, Date>();
  private sweepInterval?: ReturnType<typeof setInterval>;
  private stream?: MockEventStream;

  start(): void {
    this.stream = new MockEventStream();
    this.stream.on((event) => this.handleEvent(event));
    this.stream.start(PREDICTION_INTERVAL_MS / 6);

    this.sweepInterval = setInterval(() => this.sweep(), PREDICTION_INTERVAL_MS);
    log({ level: 'info', eventType: 'prediction.engine.started', message: 'PredictionEngine started' });
  }

  stop(): void {
    this.stream?.stop();
    if (this.sweepInterval) clearInterval(this.sweepInterval);
  }

  handleEvent(event: { errorSignature: string; userId: string; timestamp: string }): void {
    const { errorSignature, userId } = event;
    if (!this.rolling.has(errorSignature)) {
      this.rolling.set(errorSignature, new Map());
    }
    this.rolling.get(errorSignature)!.set(userId, new Date(event.timestamp));
  }

  private async sweep(): Promise<void> {
    const now = Date.now();
    for (const [sig, users] of this.rolling.entries()) {
      // Clean stale entries
      for (const [uid, ts] of users.entries()) {
        if (now - ts.getTime() > INCIDENT_WINDOW_MS) users.delete(uid);
      }

      if (users.size < INCIDENT_THRESHOLD) continue;

      // Check cooldown
      const cooldownUntil = this.cooldowns.get(sig);
      if (cooldownUntil && cooldownUntil > new Date()) continue;

      const incidentId = uuidv4();
      const affectedUsers = Array.from(users.keys());
      const firstOccurrence = new Date(Math.min(...Array.from(users.values()).map((d) => d.getTime()))).toISOString();

      try {
        insertIncident({
          id: incidentId,
          error_signature: sig,
          affected_users: JSON.stringify(affectedUsers),
          affected_count: affectedUsers.length,
          first_occurrence: firstOccurrence,
          detected_at: new Date().toISOString(),
          status: 'draft',
          notification_log: '[]',
        });

        bus.emit('incident.detected', { incidentId });
        log({ level: 'info', eventType: 'prediction.incident.created', message: `Incident created for ${sig}`, incidentId, affectedCount: affectedUsers.length });

        // Clear users for this signature to avoid duplicate detection
        this.rolling.set(sig, new Map());
      } catch (err) {
        log({ level: 'error', eventType: 'prediction.incident.error', message: String(err) });
      }
    }
  }
}
