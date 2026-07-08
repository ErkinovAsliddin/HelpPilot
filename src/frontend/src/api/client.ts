// src/frontend/src/api/client.ts
import axios from 'axios';

export const apiClient = axios.create({ baseURL: '/api' });

apiClient.interceptors.request.use((config) => {
  const key = sessionStorage.getItem('apiKey');
  if (key) config.headers['X-API-Key'] = key;
  return config;
});

export type Ticket = {
  id: string;
  subject?: string;
  body?: string;
  status: string;
  category?: string;
  priority?: string;
  sentiment?: string;
  confidence_score?: number;
  confidence_explanation?: string;
  draft_response?: string;
  final_response?: string;
  outcome?: string;
  received_at: string;
  terminal_at?: string;
  emotional_state?: string;
  frustration_score?: number;
  urgency_score?: number;
  churn_risk?: string;
  recommended_tone?: string;
  kb_results?: string;
  escalation_reason?: string;
  translated_body?: string;
  detected_language?: string;
  vip_flag?: boolean;
  emotion_reasoning?: string;
  delivered_at?: string;
  delivery_channel?: string;
  classified_at?: string;
  resolved_at?: string;
};

export type Incident = {
  id: string;
  error_signature: string;
  affected_count: number;
  status: string;
  detected_at: string;
  suggested_fix?: string;
};
