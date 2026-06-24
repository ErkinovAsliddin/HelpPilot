// src/utils/emailThreadParser.ts
// Feature: helppilot

const QUOTE_LINE = /^>.*$/m;
const FORWARDED_HEADER = /^(From|Sent|To|Subject):.*\n/gim;
const THREAD_MARKER = /^(-{3,}|_{3,}|From:.+Sent:.+To:.+Subject:)/ms;

/**
 * Detects whether a body looks like a forwarded/replied email thread.
 */
export function isEmailThread(body: string): boolean {
  return QUOTE_LINE.test(body) || THREAD_MARKER.test(body);
}

/**
 * Extracts the most recent non-quoted message segment from a forwarded thread.
 */
export function extractLatestMessage(body: string): string {
  // Remove forwarded-email header blocks (From: ... Subject:)
  let cleaned = body.replace(/\n?(From:\s.+\n)(Sent:\s.+\n)?(To:\s.+\n)?(Subject:\s.+\n?)/gim, '\n--- (forwarded message removed) ---\n');

  // Split on quote markers and take the first (most recent) segment
  const lines = cleaned.split('\n');
  const nonQuotedLines: string[] = [];

  for (const line of lines) {
    if (/^>/.test(line)) break; // stop at first quoted block
    nonQuotedLines.push(line);
  }

  const result = nonQuotedLines.join('\n').trim();
  return result || body.trim();
}
