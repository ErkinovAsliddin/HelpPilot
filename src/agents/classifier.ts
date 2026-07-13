// src/agents/classifier.ts
import { invokeText } from '../utils/qwenClient.js';
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
      category: (json.category as TicketCategory) ?? 'other',
      priority: (json.priority as Priority) ?? 'low',
      detected_language: (json.detected_language as string) ?? 'en',
      translated_subject: (json.translated_subject as string | null) ?? null,
      translated_body: (json.translated_body as string | null) ?? null,
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

// ── Class wrapper for PipelineOrchestrator ──────────────────────────────────
export interface ClassifierAgentInput {
  ticketId: string;
  subject: string;
  body: string;
}

export interface ClassifierAgentOutput {
  category: TicketCategory;
  priority: Priority;
  sentiment: 'neutral' | 'positive' | 'negative';
  suggestedAgent: 'auto' | 'human-review';
  detectedLanguage: string;
  translatedSubject: string | null;
  translatedBody: string | null;
}

export class ClassifierAgent {
  async run(input: ClassifierAgentInput): Promise<ClassifierAgentOutput> {
    const result = await classifyTicket(input.subject, input.body);
    const suggestedAgent: 'auto' | 'human-review' =
      result.priority === 'critical' ? 'human-review' : 'auto';
    return {
      category: result.category,
      priority: result.priority,
      sentiment: 'neutral',
      suggestedAgent,
      detectedLanguage: result.detected_language,
      translatedSubject: result.translated_subject,
      translatedBody: result.translated_body,
    };
  }
}
