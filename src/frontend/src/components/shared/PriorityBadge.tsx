// src/frontend/src/components/shared/PriorityBadge.tsx
const PRIORITY_COLORS: Record<string, string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444',
};

export default function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority) return null;
  const color = PRIORITY_COLORS[priority] ?? '#6b7280';
  return (
    <span style={{
      background: color, color: '#fff', borderRadius: 4,
      padding: '2px 8px', fontSize: 12, fontWeight: 600,
    }}>
      {priority}
    </span>
  );
}
