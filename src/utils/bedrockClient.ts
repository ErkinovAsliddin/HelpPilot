// src/utils/bedrockClient.ts
// Falls back to deterministic mock when AWS credentials are absent or Bedrock is unreachable.

import { logger } from './logger.js';

const MOCK_MODE =
  !process.env.AWS_REGION ||
  !process.env.AWS_ACCESS_KEY_ID ||
  process.env.MOCK_MODE === 'true';

if (MOCK_MODE) {
  logger.info('[BedrockClient] Running in MOCK mode — no AWS credentials required.');
}

export interface BedrockTextResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  mock: boolean;
}

export interface BedrockEmbeddingResult {
  embedding: number[];
  mock: boolean;
}

/** Invoke Claude 3.5 Sonnet (or mock) with a system + user prompt */
export async function invokeText(
  systemPrompt: string,
  userPrompt: string
): Promise<BedrockTextResult> {
  if (MOCK_MODE) {
    return mockText(systemPrompt, userPrompt);
  }
  try {
    const { BedrockRuntimeClient, InvokeModelCommand } = await import(
      '@aws-sdk/client-bedrock-runtime'
    );
    const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const cmd = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      contentType: 'application/json',
      accept: 'application/json',
      body,
    });
    const response = await client.send(cmd);
    const parsed = JSON.parse(Buffer.from(response.body).toString());
    return {
      text: parsed.content[0].text as string,
      inputTokens: parsed.usage?.input_tokens ?? 0,
      outputTokens: parsed.usage?.output_tokens ?? 0,
      mock: false,
    };
  } catch (err) {
    logger.warn('[BedrockClient] Live call failed, falling back to mock', err);
    return mockText(systemPrompt, userPrompt);
  }
}

/** Generate embedding vector via Titan (or mock) */
export async function invokeEmbedding(text: string): Promise<BedrockEmbeddingResult> {
  if (MOCK_MODE) return mockEmbedding(text);
  try {
    const { BedrockRuntimeClient, InvokeModelCommand } = await import(
      '@aws-sdk/client-bedrock-runtime'
    );
    const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
    const cmd = new InvokeModelCommand({
      modelId: 'amazon.titan-embed-text-v2:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({ inputText: text.slice(0, 8000) }),
    });
    const response = await client.send(cmd);
    const parsed = JSON.parse(Buffer.from(response.body).toString());
    return { embedding: parsed.embedding as number[], mock: false };
  } catch {
    return mockEmbedding(text);
  }
}

// ── Mock implementations ────────────────────────────────────────

function deterministicSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h);
}

function mockText(system: string, user: string): BedrockTextResult {
  const seed = deterministicSeed(system.slice(0, 40) + user.slice(0, 40));
  const lower = user.toLowerCase();

  // Classification mock
  if (system.includes('classify')) {
    const cats = ['password-reset', 'network-issue', 'software-install', 'hardware-failure', 'billing', 'other'];
    const pris = ['low', 'medium', 'high', 'critical'];
    let cat = cats[seed % cats.length];
    let pri = pris[seed % pris.length];
    if (lower.includes('password') || lower.includes('reset')) { cat = 'password-reset'; pri = 'medium'; }
    else if (lower.includes('vpn') || lower.includes('network')) { cat = 'network-issue'; pri = 'high'; }
    else if (lower.includes('install') || lower.includes('docker')) { cat = 'software-install'; pri = 'low'; }
    else if (lower.includes('battery') || lower.includes('bulge')) { cat = 'hardware-failure'; pri = 'critical'; }
    else if (lower.includes('bill') || lower.includes('budget')) { cat = 'billing'; pri = 'medium'; }
    return {
      text: JSON.stringify({ category: cat, priority: pri, detected_language: lower.includes('español') || lower.includes('hola') ? 'es' : 'en', translated_subject: null, translated_body: null }),
      inputTokens: 120, outputTokens: 40, mock: true,
    };
  }

  // Emotion mock
  if (system.includes('emotion') || system.includes('sentiment')) {
    let state = 'calm'; let churn = 'low'; let frust = 2; let urg = 2;
    if (lower.includes('cancel') || lower.includes('lawsuit') || lower.includes('angry')) {
      state = 'angry'; churn = 'critical'; frust = 9; urg = 9;
    } else if (lower.includes('urgent') || lower.includes('asap')) {
      state = 'stressed'; churn = 'medium'; frust = 6; urg = 8;
    } else if (lower.includes('frustrated') || lower.includes('broken')) {
      state = 'stressed'; churn = 'high'; frust = 7; urg = 5;
    }
    return {
      text: JSON.stringify({ emotional_state: state, churn_risk: churn, frustration_score: frust, urgency_score: urg, recommended_tone: state === 'angry' ? 'crisis' : state === 'stressed' ? 'empathetic' : 'professional', trigger_words: [], reasoning: 'Mock emotion analysis based on keyword detection.' }),
      inputTokens: 100, outputTokens: 60, mock: true,
    };
  }

  // Draft response mock
  if (system.includes('draft') || system.includes('response') || system.includes('resolve')) {
    const drafts: Record<string, string> = {
      'password-reset': 'Dear User,\n\nThank you for reaching out. To reset your password:\n\n1. Press Ctrl+Alt+Del → Change a password\n2. Or visit https://password.helppilot.com for self-service reset\n3. If on remote: connect to VPN first\n\nBest regards,\nHelpPilot Support',
      'network-issue': 'Dear User,\n\nFor your VPN connectivity issue:\n\n1. Verify gateway: vpn.helppilot.com\n2. Run: ipconfig /flushdns\n3. Approve MFA within 15 seconds of prompt\n4. Restart router if issue persists\n\nBest regards,\nHelpPilot Support',
      'software-install': 'Dear User,\n\nTo install Docker Desktop:\n\n1. Open Software Center (Start Menu)\n2. Search "Docker Desktop"\n3. Click Install (approx. 10 min)\n4. Restart when prompted\n\nBest regards,\nHelpPilot Support',
      'hardware-failure': 'Dear User,\n\n⚠️ SAFETY ALERT: Power off immediately! Do NOT charge.\nBring device to IT Walk-up Bar (4th Floor, Block B) now.\nWe will provide a replacement device.\n\nBest regards,\nHelpPilot Support — Emergency Response',
      'billing': 'Dear User,\n\nFor your budget extension:\n\n1. Visit devops.helppilot.com\n2. Select "Budget Extension Request"\n3. Provide business justification\n4. Await team lead approval\n\nBest regards,\nHelpPilot Support',
      'other': 'Dear User,\n\nThank you for contacting IT Support. A team member will review your request shortly. For immediate help, visit IT Walk-up Bar (4th Floor, Mon–Fri 8am–6pm).\n\nBest regards,\nHelpPilot Support',
    };
    let category = 'other';
    if (lower.includes('password')) category = 'password-reset';
    else if (lower.includes('vpn') || lower.includes('network')) category = 'network-issue';
    else if (lower.includes('docker') || lower.includes('install')) category = 'software-install';
    else if (lower.includes('battery') || lower.includes('bulge')) category = 'hardware-failure';
    else if (lower.includes('bill') || lower.includes('budget')) category = 'billing';
    return {
      text: JSON.stringify({
        draft_response: drafts[category],
        confidence_score: 72 + (seed % 25),
        confidence_explanation: `Mock resolver: matched category "${category}" from keyword analysis.`,
        resolution_action: seed % 3 === 0 ? 'auto_resolve' : 'pending_approval',
      }),
      inputTokens: 300, outputTokens: 200, mock: true,
    };
  }

  return { text: `Mock response for: ${user.slice(0, 80)}`, inputTokens: 50, outputTokens: 20, mock: true };
}

function mockEmbedding(text: string): BedrockEmbeddingResult {
  const seed = deterministicSeed(text.slice(0, 200));
  const DIM = 1536;
  const embedding = Array.from({ length: DIM }, (_, i) => {
    const v = Math.sin(seed * (i + 1) * 0.0001) * 0.5 + Math.cos(seed * (i + 1) * 0.00007) * 0.5;
    return parseFloat(v.toFixed(6));
  });
  const mag = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
  return { embedding: embedding.map(v => v / mag), mock: true };
}
