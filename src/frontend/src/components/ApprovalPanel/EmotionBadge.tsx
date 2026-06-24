// src/frontend/src/components/ApprovalPanel/EmotionBadge.tsx
const STATE_COLORS: Record<string, string> = {
  calm: '#22c55e', stressed: '#f59e0b', angry: '#f97316', desperate: '#ef4444',
};

interface Props {
  emotional_state?: string;
  frustration_score?: number;
  urgency_score?: number;
  recommended_tone?: string;
}

export default function EmotionBadge({ emotional_state, frustration_score, urgency_score, recommended_tone }: Props) {
  if (!emotional_state) return null;
  const color = STATE_COLORS[emotional_state] ?? '#6b7280';
  return (
    <div style={{ background: '#fafafa', border: `2px solid ${color}`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
      <div style={{ fontWeight: 600, color, marginBottom: 6 }}>
        Emotional State: {emotional_state}
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
        <span>😤 Frustration: <strong>{frustration_score}/10</strong></span>
        <span>⚡ Urgency: <strong>{urgency_score}/10</strong></span>
        <span>🎯 Tone: <strong>{recommended_tone}</strong></span>
      </div>
    </div>
  );
}
