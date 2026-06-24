// tests/property/apiAuthentication.test.ts
// Feature: helppilot, Property 12

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import request from 'supertest';

process.env.HELPPILOT_API_KEYS = 'valid-key-abc';
process.env.DB_PATH = ':memory:';

import { app } from '../../src/app.js';
import { initDb } from '../../src/db/schema.js';

beforeAll(() => {
  initDb();
});

const PROTECTED_PATHS = [
  { method: 'GET', path: '/api/tickets' },
  { method: 'POST', path: '/api/tickets' },
  { method: 'POST', path: '/api/approvals' },
];

describe('Property 12: API Authentication Always Enforced', () => {
  it('should return 401 for any request to protected endpoints without a valid API key', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...PROTECTED_PATHS),
        fc.option(fc.string({ maxLength: 64 })),
        async (endpoint, badKey) => {
          // Skip if the bad key accidentally matches the valid key
          if (badKey === 'valid-key-abc') return;

          const req = request(app)[endpoint.method.toLowerCase() as 'get' | 'post'](endpoint.path);

          if (badKey != null && badKey.length > 0) {
            req.set('X-API-Key', badKey);
          }

          const res = await req.send({});
          expect(res.status).toBe(401);
          // No ticket data in body
          expect(res.body.ticketId).toBeUndefined();
          expect(res.body.tickets).toBeUndefined();
        },
      ),
      { numRuns: 50 },
    );
  });

  it('should allow health endpoint without API key', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });
});
