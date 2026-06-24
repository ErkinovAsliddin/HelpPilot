// tests/integration/bedrockOutage.test.ts
// Feature: helppilot

import { describe, it, expect, vi, beforeAll } from 'vitest';

process.env.DB_PATH = ':memory:';

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockRejectedValue(new Error('Bedrock unavailable')),
  })),
  InvokeModelCommand: vi.fn(),
}));

vi.mock('../../src/db/chromaInit.js', () => ({ chromaInit: vi.fn() }));

import { initDb } from '../../src/db/schema.js';
import { checkHealth } from '../../src/services/healthMonitor.js';

beforeAll(() => {
  initDb();
});

describe('Bedrock Unavailability Integration Test', () => {
  it('should report Bedrock as unavailable when it throws', async () => {
    const health = await checkHealth();
    expect(health.services.bedrock).toBe('unavailable');
  });

  it('should return valid health structure', async () => {
    const health = await checkHealth();
    expect(health.checkedAt).toBeTruthy();
    expect(typeof health.autoResolutionEnabled).toBe('boolean');
    expect(['healthy', 'degraded', 'unavailable']).toContain(health.status);
  });
});
