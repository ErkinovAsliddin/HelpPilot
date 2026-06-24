// src/utils/logSanitizer.ts
// Feature: helppilot

const SENSITIVE_PATTERNS: Array<[RegExp, string]> = [
  // API keys: long alphanumeric strings after key-like keywords
  [/("?(?:api[-_]?key|x-api-key|apikey)"?\s*[:=]\s*)"?([A-Za-z0-9\-_]{16,})"?/gi, '$1[REDACTED]'],
  // SMTP passwords
  [/("?(?:smtp[-_]?pass(?:word)?|mail[-_]?pass(?:word)?)"?\s*[:=]\s*)"?([^",\s]{4,})"?/gi, '$1[REDACTED]'],
  // Webhook URLs (Slack, etc.)
  [/(https?:\/\/hooks\.[a-z]+\.com\/[^\s"',]+)/gi, '[REDACTED_WEBHOOK]'],
  // Generic passwords
  [/("?password"?\s*[:=]\s*)"?([^",\s]{4,})"?/gi, '$1[REDACTED]'],
  // AWS secret keys
  [/("?(?:secret[-_]?access[-_]?key|aws[-_]?secret)"?\s*[:=]\s*)"?([A-Za-z0-9/+]{20,})"?/gi, '$1[REDACTED]'],
  // Bearer tokens
  [/(Bearer\s+)([A-Za-z0-9\-_.~+/]+=*)/gi, '$1[REDACTED]'],
  // SendGrid API keys
  [/(SG\.[A-Za-z0-9\-_]{22,}\.[A-Za-z0-9\-_]{43})/g, '[REDACTED_SENDGRID_KEY]'],
];

export function sanitizeLog<T>(entry: T): T {
  const str = JSON.stringify(entry);
  let sanitized = str;
  for (const [pattern, replacement] of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return JSON.parse(sanitized) as T;
}

export function sanitizeString(value: string): string {
  let sanitized = value;
  for (const [pattern, replacement] of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return sanitized;
}
