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
    const load = async () => {
      try { const r = await apiClient.get<SessionMetrics>('/metrics/session'); setMetrics(r.data); }
      catch {}
    };
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);
  return metrics;
}
