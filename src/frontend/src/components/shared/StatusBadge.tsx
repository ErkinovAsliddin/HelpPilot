// src/frontend/src/components/shared/StatusBadge.tsx
const STATUS_COLORS: Record<string, string> = {
  received: '#6366f1',
  classifying: '#8b5cf6',
  kb_searching: '#0ea5e9',
  resolving: '#f59e0b',
  'pending-approval': '#f97316',
  'auto-resolving': '#10b981',
  resolved: '#22c55e',
  escalated: '#ef4444',
  stale: '#9ca3af',
  'delivery-failed': '#dc2626',
  'enqueue-failed': '#7f1d1d',
};

export default function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#6b7280';
  return (
    <span style={{
      background: color, color: '#fff', borderRadius: 4,
      padding: '2px 8px', fontSize: 12, fontWeight: 600,
    }}>
      {status}
    </span>
  );
}
