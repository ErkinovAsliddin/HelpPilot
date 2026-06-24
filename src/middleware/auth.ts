// src/middleware/auth.ts
// Feature: helppilot

import type { Request, Response, NextFunction } from 'express';

function getValidKeys(): Set<string> {
  const raw = process.env.HELPPILOT_API_KEYS || '';
  return new Set(
    raw
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
  );
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'];
  const validKeys = getValidKeys();

  if (!apiKey || typeof apiKey !== 'string' || !validKeys.has(apiKey)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
