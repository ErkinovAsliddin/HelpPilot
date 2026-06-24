// src/agents/classifier.ts
import { invokeText } from '../utils/bedrockClient.js';
import { logger } from '../utils/logger.js';

export type TicketCategory =
  | 'password-reset'
  | 'network-issue'
  | 'software-install'
  | 'hardware-failure'
  | 'billing'
  | 'other';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface ClassificationResult {
  category: TicketCategory;
  priority: Priority;
  detected_language: string;
  translated_subject: string | null;
  translated_body: string | null;
  mock: boolean;
}

const SYSTEM = `You are an IT helpdesk ticket classifier. Respond ONLY with valid JSON matching:
{
  "category": "password-reset"|"network-issue"|"software-install"|"hardware-failure"|"billing"|"other",
  "priority": "low"|"medium"|"high"|"critical",
  "detected_language": "<ISO-639-1 code>",
  "translated_subject": "<English translation or null if already English>",
  "translated_body": "<English translation or null if already English>"
}
Rules:
- hardware-failure with safety risk (battery bulge, fire, electric) → critical
- churn threats or legal threats → high
- "urgent", "ASAP" keywords → high
- production outages → critical`;

export async function classifyTicket(subject: string, body: string): Promise<ClassificationResult> {
  logger.info('[Classifier] classifying ticket', { subject: subject.slice(0, 60) });

  const result = await invokeText(
    SYSTEM,
    `Subject: ${subject}\n\nBody: ${body}`
  );

  try {
    const json = extractJson(result.text);
    return {
      category: json.category ?? 'other',
      priority: json.priority ?? 'low',
      detected_language: json.detected_language ?? 'en',
      translated_subject: json.translated_subject ?? null,
      translated_body: json.translated_body ?? null,
      mock: result.mock,
    };
  } catch (err) {
    logger.warn('[Classifier] JSON parse failed, using defaults', err);
    return { category: 'other', priority: 'low', detected_language: 'en', translated_subject: null, translated_body: null, mock: true };
  }
}

function extractJson(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found');
  return JSON.parse(match[0]);
}
