// src/utils/retry.ts
// Feature: helppilot

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  cap?: number;
  multiplier?: number;
}

function jitter(delay: number): number {
  // ±10% jitter
  const factor = 0.9 + Math.random() * 0.2;
  return Math.round(delay * factor);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    cap = 30000,
    multiplier = 2,
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await sleep(jitter(Math.min(delay, cap)));
        delay = Math.min(delay * multiplier, cap);
      }
    }
  }

  throw lastError;
}
