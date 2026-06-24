// tests/integration/predictionEngine.test.ts
// Feature: helppilot

import { describe, it, expect, beforeAll } from 'vitest';

process.env.DB_PATH = ':memory:';

import { initDb } from '../../src/db/schema.js';
import { PredictionEngine } from '../../src/agents/predictionEngine.js';
import { listIncidents } from '../../src/db/incidentRepository.js';

beforeAll(() => {
  initDb();
});

describe('Proactive Prediction Engine Integration Test', () => {
  it('should create an incident when 5+ distinct users trigger same error signature', async () => {
    const engine = new PredictionEngine();

    // Inject 6 distinct users with same signature
    const signature = 'TEST_VPN_FAIL';
    for (let i = 0; i < 6; i++) {
      engine.handleEvent({
        errorSignature: signature,
        userId: `user-${i}`,
        timestamp: new Date().toISOString(),
      });
    }

    // Trigger sweep manually
    (engine as any).sweep();
    await new Promise((r) => setTimeout(r, 500));

    const incidents = listIncidents({ status: 'draft' });
    const match = incidents.find((i) => i.error_signature === signature);
    expect(match).toBeDefined();
    expect(match!.affected_count).toBeGreaterThanOrEqual(5);
  });

  it('should NOT create incident with only 4 distinct users', async () => {
    const engine = new PredictionEngine();
    const signature = 'TEST_LDAP_FAIL';

    for (let i = 0; i < 4; i++) {
      engine.handleEvent({
        errorSignature: signature,
        userId: `user-${i}`,
        timestamp: new Date().toISOString(),
      });
    }

    (engine as any).sweep();
    await new Promise((r) => setTimeout(r, 500));

    const incidents = listIncidents();
    const match = incidents.find((i) => i.error_signature === signature);
    expect(match).toBeUndefined();
  });
});
