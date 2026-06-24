// src/agents/resolver.ts
// Feature: helppilot

import { invokeModel } from '../utils/bedrockClient.js';
import { determineAction } from './resolverRouter.js';
import { sanitizeDraft } from '../utils/draftSanitizer.js';
import { log } from '../utils/logger.js';
import { bus } from '../pipeline/eventBus.js';
import type { Ticket, KBSearchOutput, ResolverOutput } from '../types/ticket.js';

const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0';
const SUPPORTED_LANGUAGES = new Set(['es', 'fr', 'de', 'pt', 'ja', 'zh']);

export class ResolverAgent {
  async run(ticket: Ticket, kbOutput: KBSearchOutput): Promise<ResolverOutput> {
    const startedAt = new Date().toISOString();
    const start = Date.now();

    try {
      const action = determineAction(
        ticket.priority ?? 'medium',
        kbOutput.kbStatus,
        0, // will compute real score below if needed
        ticket.churn_risk,
      );

      // Early escalation
      if (action === 'escalate' && kbOutput.kbStatus !== 'ok') {
        return this.buildEscalate(ticket, kbOutput, startedAt, start, 'KB unavailable or no results');
      }

      // Generate draft via Bedrock
      const kbContext = kbOutput.results
        .map((r, i) => `[${i + 1}] ${r.title}: ${r.summary}`)
        .join('\n');

      const subject = ticket.translated_subject || ticket.subject || '';
      const body = ticket.translated_body || ticket.body || '';

      const prompt = `You are an expert IT helpdesk agent. Generate a helpful response to this support ticket.

Ticket Subject: ${subject}
Ticket Body: ${body}
Category: ${ticket.category}
Priority: ${ticket.priority}

Knowledge Base Articles:
${kbContext || 'No KB articles available.'}

Instructions:
1. Write complete sentences addressed to the ticket submitter (use "you" / "your").
2. Do NOT include ticket IDs, confidence scores, agent names, or any internal metadata.
3. Be professional and helpful.
4. Return ONLY a JSON object:
{
  "draft": "<your response>",
  "confidenceScore": <0-100>,
  "confidenceExplanation": "<why this score>",
  "sourcesUsed": ["<article title 1>", ...]
}`;

      const response = (await invokeModel(MODEL_ID, {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1024,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      })) as { content?: Array<{ type: string; text: string }> };

      const text = response.content?.[0]?.text?.trim() ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in resolver response');

      const parsed = JSON.parse(jsonMatch[0]) as {
        draft: string;
        confidenceScore: number;
        confidenceExplanation: string;
        sourcesUsed: string[];
      };

      const confidenceScore = Math.max(0, Math.min(100, parsed.confidenceScore ?? 50));
      const finalAction = determineAction(
        ticket.priority ?? 'medium',
        kbOutput.kbStatus,
        confidenceScore,
        ticket.churn_risk,
      );

      if (finalAction === 'escalate') {
        return this.buildEscalate(ticket, kbOutput, startedAt, start, 'Low confidence');
      }

      let draft = sanitizeDraft(parsed.draft || '');

      // Emotion tone rewrite
      if (ticket.emotional_state && ticket.emotional_state !== 'calm' && ticket.recommended_tone) {
        draft = await this.rewriteOpener(draft, ticket.recommended_tone);
      }

      // Back-translate if needed
      let translatedResponse: string | undefined;
      const lang = ticket.detected_language;
      if (lang && lang !== 'en' && SUPPORTED_LANGUAGES.has(lang)) {
        try {
          translatedResponse = await this.translate(draft, lang);
        } catch {
          // keep English draft
        }
      }

      const output: ResolverOutput = {
        action: finalAction,
        draftResponse: draft,
        confidenceScore,
        confidenceExplanation: parsed.confidenceExplanation || '',
        sourcesUsed: parsed.sourcesUsed || [],
        translatedResponse,
      };

      const completedAt = new Date().toISOString();
      bus.emit('reasoning.step', {
        ticketId: ticket.id,
        agentName: 'Resolver',
        startedAt,
        completedAt,
        durationMs: Date.now() - start,
        inputs: { ticketId: ticket.id, kbStatus: kbOutput.kbStatus },
        outputs: { action: output.action, confidenceScore },
      });

      return output;
    } catch (err) {
      log({ level: 'error', ticketId: ticket.id, eventType: 'resolver.error', message: String(err), stack: err instanceof Error ? err.stack : undefined });
      return this.buildEscalate(ticket, kbOutput, startedAt, start, `Error: ${String(err)}`);
    }
  }

  private buildEscalate(
    ticket: Ticket,
    kbOutput: KBSearchOutput,
    startedAt: string,
    start: number,
    reason: string,
  ): ResolverOutput {
    const completedAt = new Date().toISOString();
    bus.emit('reasoning.step', {
      ticketId: ticket.id,
      agentName: 'Resolver',
      startedAt,
      completedAt,
      durationMs: Date.now() - start,
      inputs: { ticketId: ticket.id },
      outputs: { action: 'escalate', reason },
    });
    return {
      action: 'escalate',
      confidenceScore: 0,
      confidenceExplanation: reason,
      sourcesUsed: kbOutput.results.map((r) => r.title),
    };
  }

  private async rewriteOpener(draft: string, tone: string): Promise<string> {
    const sentences = draft.split(/(?<=[.!?])\s+/);
    if (!sentences[0]) return draft;
    const prompt = `Rewrite ONLY this opening sentence in a ${tone} tone. Return ONLY the rewritten sentence, nothing else:\n"${sentences[0]}"`;
    try {
      const response = (await invokeModel(MODEL_ID, {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      })) as { content?: Array<{ type: string; text: string }> };
      const newOpener = response.content?.[0]?.text?.trim().replace(/^"(.+)"$/, '$1') ?? '';
      if (newOpener) {
        sentences[0] = newOpener;
        return sentences.join(' ');
      }
    } catch {
      // ignore
    }
    return draft;
  }

  private async translate(text: string, targetLang: string): Promise<string> {
    const prompt = `Translate the following IT support response to the language with BCP-47 code "${targetLang}". Return ONLY the translated text:\n\n${text}`;
    const response = (await invokeModel(MODEL_ID, {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })) as { content?: Array<{ type: string; text: string }> };
    return response.content?.[0]?.text?.trim() ?? text;
  }
}
