// src/frontend/src/components/MetricsPanel/MetricsPanel.tsx
import { useSessionMetrics } from '../../hooks/useSessionMetrics.ts';

function MetricCard({ label, value, color = '#2563eb' }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 8, padding: '16px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)', minWidth: 150, borderTop: `3px solid ${color}`
    }}>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function MetricsPanel() {
  const m = useSessionMetrics();

  const total = m?.tickets_total ?? 0;
  const autoRate = m?.autoResolutionRate ?? 0;
  const escalated = m?.tickets_escalated ?? 0;
  const learned = m?.solutions_learned ?? 0;
  const prevented = m?.tickets_prevented ?? 0;
  const emotionEsc = m?.emotion_escalations ?? 0;
  const avgTime = m?.avgResolutionTimeSeconds ?? 0;
  const timeSaved = m?.estimatedTimeSavedMinutes ?? 0;
  const costSaved = m?.estimatedCostSavedUsd ?? '$0.00';

  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>📊 Session Metrics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <MetricCard label="Tickets Processed" value={total} color="#2563eb" />
        <MetricCard label="Auto-Resolution %" value={`${autoRate.toFixed(1)}%`} color="#22c55e" />
        <MetricCard label="Escalated" value={escalated} color="#f97316" />
        <MetricCard label="Solutions Learned" value={learned} color="#8b5cf6" />
        <MetricCard label="Tickets Prevented" value={prevented} color="#06b6d4" />
        <MetricCard label="Emotion Escalations" value={emotionEsc} color="#ec4899" />
        <MetricCard label="Avg Response Time" value={`${avgTime.toFixed(0)}s`} color="#f59e0b" />
        <MetricCard label="Time Saved (min)" value={timeSaved.toFixed(0)} color="#10b981" />
        <MetricCard label="Cost Saved" value={costSaved} color="#059669" />
      </div>
    </div>
  );
}
