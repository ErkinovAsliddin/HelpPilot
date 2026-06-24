// src/types/ticket.ts
// Feature: helppilot

export type Category =
  | 'password-reset'
  | 'network-issue'
  | 'software-install'
  | 'hardware-failure'
  | 'billing'
  | 'other';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type Sentiment = 'neutral' | 'frustrated' | 'urgent' | 'positive';

export type TicketStatus =
  | 'received'
  | 'classifying'
  | 'kb_searching'
  | 'resolving'
  | 'pending-approval'
  | 'auto-resolving'
  | 'resolved'
  | 'escalated'
  | 'stale'
  | 'delivery-failed'
  | 'enqueue-failed';

export type ChurnRisk = 'low' | 'medium' | 'high' | 'critical';
export type EmotionalState = 'calm' | 'stressed' | 'angry' | 'desperate';
export type RecommendedTone = 'professional' | 'empathetic' | 'urgent' | 'crisis';
export type SourceModality = 'text' | 'image' | 'voice' | 'email_thread';

export interface KBResult {
  type: 'kb_article' | 'logged_resolution' | 'web_result';
  title: string;
  summary: string;
  similarityScore?: number;
  sourceUrl?: string;
  entryId?: string;
}

export interface KBSearchOutput {
  results: KBResult[];
  kbStatus: 'ok' | 'no_results' | 'search_error' | 'kb_unavailable';
}

export interface ClassifierInput {
  ticketId: string;
  subject: string;
  body: string;
}

export interface ClassifierOutput {
  category: Category;
  priority: Priority;
  sentiment: Sentiment;
  suggestedAgent: 'KBSearcher' | 'Resolver' | 'human-review';
  detectedLanguage?: string;
  translatedSubject?: string;
  translatedBody?: string;
}

export interface ResolverOutput {
  action: 'auto_resolve' | 'pending_approval' | 'escalate';
  draftResponse?: string;
  confidenceScore: number;
  confidenceExplanation: string;
  sourcesUsed: string[];
  translatedResponse?: string;
}

export interface EmotionAnalyzerInput {
  ticketId: string;
  subject: string;
  body: string;
  submitterEmail?: string;
}

export interface EmotionAnalyzerOutput {
  frustration_score: number;
  urgency_score: number;
  churn_risk: ChurnRisk;
  emotional_state: EmotionalState;
  recommended_tone: RecommendedTone;
  trigger_words: string[];
  reasoning: string;
  vip_flag: boolean;
}

export interface Ticket {
  id: string;
  subject?: string;
  body?: string;
  source_channel: 'api' | 'email' | 'webform';
  submitter_email?: string;
  status: TicketStatus;
  category?: Category;
  priority?: Priority;
  sentiment?: Sentiment;
  suggested_agent?: string;
  detected_language?: string;
  translated_subject?: string;
  translated_body?: string;
  confidence_score?: number;
  confidence_explanation?: string;
  draft_response?: string;
  translated_response?: string;
  final_response?: string;
  resolution_action?: 'auto_resolve' | 'pending_approval' | 'escalate';
  outcome?: 'SUCCESS_ADMIN' | 'SUCCESS_AUTO' | 'ESCALATED' | 'DELIVERY_FAILED';
  successfully_resolved?: number;
  admin_id?: string;
  admin_action?: 'approve' | 'edit-approve' | 'reject';
  admin_notes?: string;
  admin_action_at?: string;
  delivery_channel?: string;
  delivered_at?: string;
  kb_status?: string;
  kb_results?: string;
  received_at: string;
  classified_at?: string;
  resolved_at?: string;
  terminal_at?: string;
  enqueue_attempts?: number;
  // Emotion fields
  frustration_score?: number;
  urgency_score?: number;
  churn_risk?: ChurnRisk;
  emotional_state?: EmotionalState;
  recommended_tone?: RecommendedTone;
  trigger_words?: string;
  emotion_reasoning?: string;
  vip_flag?: number;
  // MultiModal fields
  source_modality?: SourceModality;
  multimodal_notes?: string;
  escalation_reason?: string;
  created_at?: string;
  // Attachments (not stored in DB, used in pipeline)
  attachments?: Array<{
    type: 'image' | 'audio';
    filename: string;
    buffer: Buffer;
    sizeMb: number;
  }>;
}
