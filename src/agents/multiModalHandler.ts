// src/agents/multiModalHandler.ts
// Feature: helppilot

import { invokeModel } from '../utils/qwenClient.js';
import { isEmailThread, extractLatestMessage } from '../utils/emailThreadParser.js';
import { log } from '../utils/logger.js';
import { bus } from '../pipeline/eventBus.js';
import type { Ticket, SourceModality } from '../types/ticket.js';

const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0';

export interface MultiModalOutput {
  subject: string;
  body: string;
  source_modality: SourceModality;
  processing_notes: string[];
}

export class MultiModalHandlerAgent {
  async run(ticket: Ticket): Promise<MultiModalOutput> {
    const startedAt = new Date().toISOString();
    const start = Date.now();

    let body = ticket.body || '';
    const subject = ticket.subject || '';
    const notes: string[] = [];
    let source_modality: SourceModality = 'text';

    // Process attachments
    if (ticket.attachments && ticket.attachments.length > 0) {
      for (const att of ticket.attachments) {
        if (att.type === 'image') {
          const extracted = await this.extractImageText(att.buffer, att.filename);
          if (extracted) {
            body += `\n\n[Image attachment: ${att.filename}]\n${extracted}`;
            source_modality = 'image';
          } else {
            notes.push('Image attachment could not be processed');
          }
        } else if (att.type === 'audio') {
          const transcript = await this.transcribeAudio(att.buffer, att.filename);
          if (transcript) {
            body += `\n\n[Audio attachment: ${att.filename}]\n${transcript}`;
            source_modality = 'voice';
          } else {
            notes.push('Audio attachment could not be transcribed');
          }
        }
      }
    }

    // Email thread parsing
    if (isEmailThread(body)) {
      body = extractLatestMessage(body);
      source_modality = 'email_thread';
    }

    const completedAt = new Date().toISOString();
    bus.emit('reasoning.step', {
      ticketId: ticket.id,
      agentName: 'MultiModalHandler',
      startedAt,
      completedAt,
      durationMs: Date.now() - start,
      inputs: { ticketId: ticket.id, attachmentCount: ticket.attachments?.length ?? 0 },
      outputs: { source_modality, notesCount: notes.length },
    });

    return { subject, body, source_modality, processing_notes: notes };
  }

  private async extractImageText(buffer: Buffer, filename: string): Promise<string | null> {
    try {
      const base64 = buffer.toString('base64');
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const mediaType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';

      const response = (await invokeModel(MODEL_ID, {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: 'Extract all visible text from this screenshot. Return only the extracted text, no commentary.' },
          ],
        }],
      })) as { content?: Array<{ type: string; text: string }> };

      return response.content?.[0]?.text?.trim() || null;
    } catch (err) {
      log({ level: 'warn', eventType: 'multimodal.ocr.error', message: String(err) });
      return null;
    }
  }

  private async transcribeAudio(_buffer: Buffer, _filename: string): Promise<string | null> {
    const whisperEndpoint = process.env.WHISPER_ENDPOINT;
    if (!whisperEndpoint) {
      // AWS Transcribe would go here; return null for now as it requires S3
      return null;
    }
    try {
      const { default: fetch } = await import('node-fetch');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      formData.append('file', _buffer, { filename: _filename });
      const res = await fetch(whisperEndpoint, { method: 'POST', body: formData });
      if (!res.ok) return null;
      const data = (await res.json()) as { text?: string };
      return data.text?.trim() || null;
    } catch {
      return null;
    }
  }
}
