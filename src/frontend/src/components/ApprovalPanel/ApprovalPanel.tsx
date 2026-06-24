// src/frontend/src/components/ApprovalPanel/ApprovalPanel.tsx
import React, { useState } from 'react';
import { apiClient, type Ticket } from '../../api/client.ts';
import EmotionBadge from './EmotionBadge.tsx';

interface Props { ticket: Ticket; onAction: () => void; }

export default function ApprovalPanel({ ticket, onAction }: Props) {
  const [editing, setEditing] = useState(false);
  const [editedText, setEditedText] = useState(ticket.draft_response || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (ticket.status !== 'pending-approval') return null;

  const submit = async (action: string) => {
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/approvals', {
        ticketId: ticket.id,
        action,
        adminId: 'admin-' + Date.now(),
        editedResponse: action === 'edit-approve' ? editedText : undefined,
      });
      onAction();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('Another admin already acted on this ticket.');
      } else {
        setError('Action failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginTop: 20 }}>
      <h3 style={{ marginTop: 0 }}>⚡ Approval Required</h3>
      <EmotionBadge
        emotional_state={ticket.emotional_state}
        frustration_score={ticket.frustration_score}
        urgency_score={ticket.urgency_score}
        recommended_tone={ticket.recommended_tone}
      />
      {ticket.confidence_explanation && (
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
          <strong>Reasoning:</strong> {ticket.confidence_explanation}
        </p>
      )}
      <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 6, padding: 12, marginBottom: 16 }}>
        <strong style={{ fontSize: 13 }}>Draft Response:</strong>
        {editing ? (
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            style={{ width: '100%', minHeight: 120, marginTop: 8, padding: 8, fontSize: 13, border: '1px solid #d1d5db', borderRadius: 4 }}
            aria-label="Edit response"
          />
        ) : (
          <p style={{ marginTop: 8, fontSize: 13 }}>{ticket.draft_response || 'No draft available'}</p>
        )}
      </div>
      {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => submit('approve')} disabled={loading}
          style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 600 }}>
          ✅ Approve
        </button>
        {!editing ? (
          <button onClick={() => setEditing(true)} disabled={loading}
            style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 600 }}>
            ✏️ Edit
          </button>
        ) : (
          <button onClick={() => submit('edit-approve')} disabled={loading}
            style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 600 }}>
            💾 Save & Approve
          </button>
        )}
        <button onClick={() => submit('reject')} disabled={loading}
          style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 600 }}>
          ❌ Reject
        </button>
      </div>
    </div>
  );
}
