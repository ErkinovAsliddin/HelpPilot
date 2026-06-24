// src/frontend/src/hooks/useMetrics.ts
import { useMemo } from 'react';
import type { Ticket } from '../api/client.ts';

export function useMetrics(tickets: Ticket[]) {
  return useMemo(() => {
    const totalProcessed = tickets.length;
    const autoResolved = tickets.filter((t) => t.outcome === 'SUCCESS_AUTO').length;
    const autoResolutionRate = totalProcessed > 0
      ? Math.round((autoResolved / totalProcessed) * 10000) / 100
      : 0;
    const withScores = tickets.filter((t) => t.confidence_score !== undefined);
    const avgConfidenceScore = withScores.length > 0
      ? withScores.reduce((s, t) => s + (t.confidence_score ?? 0), 0) / withScores.length
      : 0;
    const withTimes = tickets.filter((t) => t.terminal_at);
    const avgResponseTime = withTimes.length > 0
      ? withTimes.reduce((s, t) => {
          const ms = new Date(t.terminal_at!).getTime() - new Date(t.received_at).getTime();
          return s + (ms > 0 ? ms / 1000 : 0);
        }, 0) / withTimes.length
      : 0;
    return { totalProcessed, autoResolutionRate, avgConfidenceScore, avgResponseTime };
  }, [tickets]);
}
