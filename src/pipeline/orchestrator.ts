// src/pipeline/orchestrator.ts
// Feature: helppilot

import { bus } from './eventBus.js';
import { ClassifierAgent } from '../agents/classifier.js';
import { KBSearcherAgent } from '../agents/kbSearcher.js';
import { ResolverAgent } from '../agents/resolver.js';
import { LoggerAgent } from '../agents/logger.js';
import { EmotionAnalyzerAgent } from '../agents/emotionAnalyzer.js';
import { MultiModalHandlerAgent } from '../agents/multiModalHandler.js';
import { updateTicket } from '../db/ticketRepository.js';
import { log } from '../utils/logger.js';
import { isAutoResolutionEnabled } from '../services/healthMonitor.js';
import type { Ticket } from '../types/ticket.js';

export class PipelineOrchestrator {
  private classifier = new ClassifierAgent();
  private kbSearcher = new KBSearcherAgent();
  private resolver = new ResolverAgent();
  private logger = new LoggerAgent();
  private emotionAnalyzer = new EmotionAnalyzerAgent();
  private multiModal = new MultiModalHandlerAgent();

  start(): void {
    bus.on('ticket.received', (ticket) => void this.processTicket(ticket));
    bus.on('ticket.approved', ({ ticketId, editedResponse, adminId }) => {
      void this.handleApproval(ticketId, editedResponse, adminId);
    });
    bus.on('ticket.rejected', ({ ticketId, notes, adminId }) => {
      void this.handleRejection(ticketId, notes, adminId);
    });
    log({ level: 'info', eventType: 'orchestrator.started', message: 'Pipeline orchestrator started' });
  }

  private async processTicket(ticket: Ticket): Promise<void> {
    try {
      // MultiModal pre-processing
      if ((ticket.attachments && ticket.attachments.length > 0) || ticket.source_modality === 'email_thread') {
        const mmOut = await this.multiModal.run(ticket);
        ticket.body = mmOut.body;
        ticket.source_modality = mmOut.source_modality;
        ticket.multimodal_notes = JSON.stringify(mmOut.processing_notes);
        updateTicket(ticket.id, { body: ticket.body, source_modality: ticket.source_modality, multimodal_notes: ticket.multimodal_notes });
      }

      // Classification
      updateTicket(ticket.id, { status: 'classifying' });
      let classifierOutput;
      try {
        classifierOutput = await this.classifier.run({
          ticketId: ticket.id,
          subject: ticket.subject || '',
          body: ticket.body || '',
        });
      } catch {
        classifierOutput = { category: 'other' as const, priority: 'high' as const, sentiment: 'neutral' as const, suggestedAgent: 'human-review' as const };
      }

      Object.assign(ticket, {
        category: classifierOutput.category,
        priority: classifierOutput.priority,
        sentiment: classifierOutput.sentiment,
        suggested_agent: classifierOutput.suggestedAgent,
        detected_language: classifierOutput.detectedLanguage,
        translated_subject: classifierOutput.translatedSubject,
        translated_body: classifierOutput.translatedBody,
        classified_at: new Date().toISOString(),
      });

      updateTicket(ticket.id, {
        category: ticket.category,
        priority: ticket.priority,
        sentiment: ticket.sentiment,
        suggested_agent: ticket.suggested_agent,
        detected_language: ticket.detected_language,
        translated_subject: ticket.translated_subject,
        translated_body: ticket.translated_body,
        classified_at: ticket.classified_at,
      });

      bus.emit('ticket.classified', ticket);

      // Emotion analysis (parallel with classification)
      const emotionOut = await this.emotionAnalyzer.run({
        ticketId: ticket.id,
        subject: ticket.subject || '',
        body: ticket.body || '',
        submitterEmail: ticket.submitter_email,
      });

      Object.assign(ticket, {
        frustration_score: emotionOut.frustration_score,
        urgency_score: emotionOut.urgency_score,
        churn_risk: emotionOut.churn_risk,
        emotional_state: emotionOut.emotional_state,
        recommended_tone: emotionOut.recommended_tone,
        trigger_words: JSON.stringify(emotionOut.trigger_words),
        emotion_reasoning: emotionOut.reasoning,
        vip_flag: emotionOut.vip_flag ? 1 : 0,
      });

      updateTicket(ticket.id, {
        frustration_score: ticket.frustration_score,
        urgency_score: ticket.urgency_score,
        churn_risk: ticket.churn_risk,
        emotional_state: ticket.emotional_state,
        recommended_tone: ticket.recommended_tone,
        trigger_words: ticket.trigger_words,
        emotion_reasoning: ticket.emotion_reasoning,
        vip_flag: ticket.vip_flag,
      });

      if (emotionOut.churn_risk === 'critical') {
        bus.emit('ticket.critical_churn', ticket);
      }
      bus.emit('ticket.emotion_analyzed', ticket);

      // Route human-review directly
      if (classifierOutput.suggestedAgent === 'human-review' || !isAutoResolutionEnabled()) {
        await this.escalateTicket(ticket, 'Classifier suggested human-review or auto-resolution disabled');
        return;
      }

      // KB search
      updateTicket(ticket.id, { status: 'kb_searching' });
      const kbOutput = await this.kbSearcher.run(ticket);
      ticket.kb_status = kbOutput.kbStatus;
      ticket.kb_results = JSON.stringify(kbOutput.results);
      updateTicket(ticket.id, { kb_status: ticket.kb_status, kb_results: ticket.kb_results });
      bus.emit('ticket.kb_searched', ticket);

      // Resolve
      updateTicket(ticket.id, { status: 'resolving' });
      const resolverOut = await this.resolver.run(ticket, kbOutput);

      Object.assign(ticket, {
        confidence_score: resolverOut.confidenceScore,
        confidence_explanation: resolverOut.confidenceExplanation,
        draft_response: resolverOut.draftResponse,
        translated_response: resolverOut.translatedResponse,
        resolution_action: resolverOut.action,
        resolved_at: new Date().toISOString(),
      });

      updateTicket(ticket.id, {
        confidence_score: ticket.confidence_score,
        confidence_explanation: ticket.confidence_explanation,
        draft_response: ticket.draft_response,
        translated_response: ticket.translated_response,
        resolution_action: ticket.resolution_action,
        resolved_at: ticket.resolved_at,
      });

      if (resolverOut.action === 'escalate') {
        await this.escalateTicket(ticket, resolverOut.confidenceExplanation);
      } else if (resolverOut.action === 'auto_resolve') {
        await this.autoResolve(ticket);
      } else {
        // pending_approval
        updateTicket(ticket.id, { status: 'pending-approval' });
        ticket.status = 'pending-approval';
        bus.emit('ticket.draft_ready', ticket);
      }
    } catch (err) {
      log({ level: 'error', ticketId: ticket.id, eventType: 'orchestrator.error', message: String(err) });
      await this.escalateTicket(ticket, `Unhandled error: ${String(err)}`);
    }
  }

  private async autoResolve(ticket: Ticket): Promise<void> {
    const finalResponse = ticket.translated_response || ticket.draft_response || '';
    Object.assign(ticket, {
      status: 'resolved' as const,
      outcome: 'SUCCESS_AUTO' as const,
      final_response: finalResponse,
      successfully_resolved: 1,
      terminal_at: new Date().toISOString(),
    });
    updateTicket(ticket.id, {
      status: ticket.status,
      outcome: ticket.outcome,
      final_response: ticket.final_response,
      successfully_resolved: ticket.successfully_resolved,
      terminal_at: ticket.terminal_at,
    });
    bus.emit('ticket.terminal', ticket);
    await this.logger.run(ticket);
  }

  private async escalateTicket(ticket: Ticket, reason: string): Promise<void> {
    Object.assign(ticket, {
      status: 'escalated' as const,
      outcome: 'ESCALATED' as const,
      escalation_reason: reason,
      terminal_at: new Date().toISOString(),
    });
    updateTicket(ticket.id, {
      status: ticket.status,
      outcome: ticket.outcome,
      escalation_reason: ticket.escalation_reason,
      terminal_at: ticket.terminal_at,
    });
    bus.emit('ticket.escalated', ticket);
    bus.emit('ticket.terminal', ticket);
    await this.logger.run(ticket);
  }

  private async handleApproval(ticketId: string, editedResponse?: string, adminId?: string): Promise<void> {
    const { getTicketById } = await import('../db/ticketRepository.js');
    const ticket = getTicketById(ticketId);
    if (!ticket) return;

    const finalResponse = editedResponse || ticket.translated_response || ticket.draft_response || '';
    const now = new Date().toISOString();

    Object.assign(ticket, {
      status: 'resolved' as const,
      outcome: 'SUCCESS_ADMIN' as const,
      final_response: finalResponse,
      successfully_resolved: 1,
      admin_id: adminId,
      admin_action: editedResponse ? ('edit-approve' as const) : ('approve' as const),
      admin_action_at: now,
      terminal_at: now,
    });

    updateTicket(ticketId, {
      status: ticket.status,
      outcome: ticket.outcome,
      final_response: ticket.final_response,
      successfully_resolved: ticket.successfully_resolved,
      admin_id: ticket.admin_id,
      admin_action: ticket.admin_action,
      admin_action_at: ticket.admin_action_at,
      terminal_at: ticket.terminal_at,
    });

    bus.emit('ticket.terminal', ticket);
    await this.logger.run(ticket);
  }

  private async handleRejection(ticketId: string, notes?: string, adminId?: string): Promise<void> {
    const { getTicketById } = await import('../db/ticketRepository.js');
    const ticket = getTicketById(ticketId);
    if (!ticket) return;

    const now = new Date().toISOString();
    Object.assign(ticket, {
      status: 'escalated' as const,
      outcome: 'ESCALATED' as const,
      admin_id: adminId,
      admin_action: 'reject' as const,
      admin_notes: notes,
      admin_action_at: now,
      terminal_at: now,
    });

    updateTicket(ticketId, {
      status: ticket.status,
      outcome: ticket.outcome,
      admin_id: ticket.admin_id,
      admin_action: ticket.admin_action,
      admin_notes: ticket.admin_notes,
      admin_action_at: ticket.admin_action_at,
      terminal_at: ticket.terminal_at,
    });

    bus.emit('ticket.terminal', ticket);
    await this.logger.run(ticket);
  }
}
