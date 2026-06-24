// src/types/reasoning.ts
// Feature: helppilot

export interface AgentStep {
  agentName: 'MultiModalHandler' | 'Classifier' | 'EmotionAnalyzer' | 'KBSearcher' | 'Resolver';
  startedAt: string;
  completedAt: string;
  durationMs: number;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}

export interface ReasoningTrace {
  ticketId: string;
  steps: AgentStep[];
  escalationReason?: string;
}
