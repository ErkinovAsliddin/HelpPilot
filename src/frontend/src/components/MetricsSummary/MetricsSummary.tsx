// src/frontend/src/components/MetricsSummary/MetricsSummary.tsx

interface Metrics {
  totalProcessed: number;
  autoResolutionRate: number;
  avgConfidenceScore: number;
  avgResponseTime: number;
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', minWidth: 140 }}>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function MetricsSummary({ metrics }: { metrics: Metrics }) {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
      <MetricCard label="Total Processed" value={metrics.totalProcessed} />
      <MetricCard label="Auto-Resolution Rate" value={`${metrics.autoResolutionRate.toFixed(1)}%`} />
      <MetricCard label="Avg Confidence Score" value={metrics.avgConfidenceScore.toFixed(1)} />
      <MetricCard label="Avg Response Time" value={`${metrics.avgResponseTime.toFixed(0)}s`} />
    </div>
  );
}
