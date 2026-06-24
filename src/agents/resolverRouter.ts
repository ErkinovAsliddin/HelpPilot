// src/agents/resolverRouter.ts
// Feature: helppilot

import type { Priority, ChurnRisk } from '../types/ticket.js';

type KBStatus = 'ok' | 'no_results' | 'search_error' | 'kb_unavailable';
type ResolverAction = 'auto_resolve' | 'pending_approval' | 'escalate';

export function determineAction(
  priority: Priority,
  kbStatus: KBStatus,
  confidenceScore: number,
  churnRisk?: ChurnRisk,
): ResolverAction {
  // KB failure always escalates
  if (kbStatus !== 'ok') return 'escalate';

  // Critical priority always requires approval
  if (priority === 'critical') return 'pending_approval';

  // Emotion override: high/critical churn always requires approval
  if (churnRisk === 'critical' || churnRisk === 'high') return 'pending_approval';

  // Confidence-based routing
  if (confidenceScore > 85) return 'auto_resolve';
  if (confidenceScore >= 60) return 'pending_approval';
  return 'escalate';
}
