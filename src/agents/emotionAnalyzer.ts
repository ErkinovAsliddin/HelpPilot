// src/agents/emotionAnalyzer.ts
import { invokeText } from '../utils/bedrockClient.js';
import { logger } from '../utils/logger.js';

export type EmotionalState = 'calm' | 'stressed' | 'angry' | 'desperate';
export type ChurnRisk = 'low' | 'medium' | 'high' | 'critical';
export type ResponseTone = 'professional' | 'empathetic' | 'urgent' | 'crisis';

export interface EmotionResult {
  emotional_state: EmotionalState;
  churn_risk: ChurnRisk;
  frustration_score: number;   // 1–10
  urgency_score: number;       // 1–10
  recommended_tone: ResponseTone;
  trigger_words: string[];
  reasoning: string;
  bypass_queue: boolean;
  mock: boolean;
}

const SYSTEM = `You are an IT helpdesk emotion and churn-risk analyst.
Respond ONLY with valid JSON:
{
  "emotional_state": "calm"|"stressed"|"angry"|"desperate",
  "churn_risk": "low"|"medium"|"high"|"critical",
  "frustration_score": 1-10,
  "urgency_score": 1-10,
  "recommended_tone": "professional"|"empathetic"|"urgent"|"crisis",
  "trigger_words": ["word1","word2"],
  "reasoning": "brief explanation"
}
Rules:
- "cancel", "lawsuit", "legal action", "quit", "refund" → churn_risk: critical
- "urgent", "ASAP", "immediately", "emergency" → urgency_score >= 7
- Multiple exclamation marks or ALL CAPS → frustrated
- bypass_queue = true if churn_risk is critical or emotional_state is desperate`;

export async function analyzeEmotion(subject: string, body: string): Promise<EmotionResult> {
  logger.info('[EmotionAnalyzer] analyzing', { subject: subject.slice(0, 50) });

  const result = await invokeText(
    SYSTEM,
    `Subject: ${subject}\n\nBody: ${body}`
  );

  try {
    const json = extractJson(result.text);
    const churnRisk: ChurnRisk = json.churn_risk ?? 'low';
    const emotionalState: EmotionalState = json.emotional_state ?? 'calm';
    return {
      emotional_state: emotionalState,
      churn_risk: churnRisk,
      frustration_score: clamp(Number(json.frustration_score ?? 2), 1, 10),
      urgency_score: clamp(Number(json.urgency_score ?? 2), 1, 10),
      recommended_tone: json.recommended_tone ?? 'professional',
      trigger_words: Array.isArray(json.trigger_words) ? json.trigger_words : [],
      reasoning: String(json.reasoning ?? ''),
      bypass_queue: churnRisk === 'critical' || emotionalState === 'desperate',
      mock: result.mock,
    };
  } catch (err) {
    logger.warn('[EmotionAnalyzer] parse failed', err);
    return {
      emotional_state: 'calm', churn_risk: 'low',
      frustration_score: 2, urgency_score: 2,
      recommended_tone: 'professional', trigger_words: [],
      reasoning: 'Parse failed — defaulting to calm', bypass_queue: false, mock: true,
    };
  }
}

function extractJson(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found');
  return JSON.parse(match[0]);
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, isNaN(v) ? min : v));
}
