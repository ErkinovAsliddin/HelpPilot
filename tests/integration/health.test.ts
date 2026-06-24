// tests/integration/health.test.ts
// Feature: helppilot

import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

process.env.DB_PATH = ':memory:';

vi.mock('../../src/utils/bedrockClient.js', () => ({
  invokeModel: vi.fn(() => Promise.reject(new Error('Bedrock unavailable'))),
  embedText: vi.fn(() => Promise.reject(new Error('unavailable'))),
}));

vi.mock('../../src/db/chromaInit.js', () => ({ chromaInit: vi.fn() }));

import { app } from '../../src/app.js';
import { initDb } from '../../src/db/schema.js';

initDb();

describe('Health Endpoint Integration Test', () => {
  it('should return 200 without auth header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('should return status field', async () => {
    const res = await request(app).get('/api/health');
    expect(['healthy', 'degraded', 'unavailable']).toContain(res.body.status);
  });

  it('should return all service statuses', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.services).toBeDefined();
    expect(res.body.services.sqlite).toBeDefined();
    expect(res.body.checkedAt).toBeTruthy();
    expect(res.body.autoResolutionEnabled).toBeDefined();
  });
});
