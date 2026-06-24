// src/frontend/src/hooks/useSessionMetrics.ts
import { useState, useEffect } from 'react';
import { apiClient } from '../api/client.ts';

export interface SessionMetrics {
  tickets_total: number;
  tickets_auto_resolved: number;
  tickets_escalated: number;
  solutions_learned: number;
  tickets_prevented: number;
  emotion_escalations: number;
  autoResolutionRate: number;
  avgResolutionTimeSeconds: number;
  estimatedTimeSavedMinutes: number;
  estimatedCostSavedUsd: string;
}

export function useSessionMetrics() {
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);

  useEffect(() => {
    let active = true;
    const fetch = async () => {
      try {
        const res = await apiClient.get<SessionMetrics>('/metrics/session');
        if (active) setMetrics(res.data);
      } catch { /* ignore */ }
    };
    fetch();
    const id = setInterval(fetch, 5000);
    return () => { active = false; clearInterval(id); };
  }, []);

  return metrics;
}
