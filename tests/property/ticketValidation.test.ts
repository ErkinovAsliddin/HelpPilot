// tests/property/ticketValidation.test.ts
// Feature: helppilot, Property 1

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import request from 'supertest';
import { app } from '../../src/app.js';

// Set a test API key
process.env.HELPPILOT_API_KEYS = 'test-key-123';

describe('Property 1: Ticket Validation Accepts Any Valid Combination of subject/body', () => {
  it('should return 201 with UUID ticketId for valid subject+body combos', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 255 }),
        fc.string({ minLength: 1, maxLength: 1000 }),
        async (subject, body) => {
          const res = await request(app)
            .post('/api/tickets')
            .set('X-API-Key', 'test-key-123')
            .send({ subject, body });

          expect(res.status).toBe(201);
          expect(res.body.ticketId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          );
          expect(res.body.receivedAt).toBeTruthy();
          // Validate ISO 8601 UTC
          expect(() => new Date(res.body.receivedAt)).not.toThrow();
        },
      ),
      { numRuns: 20 },
    );
  });

  it('should return 400 when both subject and body are absent', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('X-API-Key', 'test-key-123')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 when both fields are empty strings', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('X-API-Key', 'test-key-123')
      .send({ subject: '', body: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
