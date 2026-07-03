import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTicket } from '../hooks/useTicket.ts';
import { apiClient } from '../api/client.ts';
import PipelineVisualizer from '../components/PipelineVisualizer/PipelineVisualizer.tsx';
import ConfidenceTooltip from '../components/shared/ConfidenceTooltip.tsx';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { ticket, loading } = useTicket(id!);
  const [editing, setEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalMsg, setApprovalMsg] = useState('');
  const [approvalErr, setApprovalErr] = useState('');

  if (loading) return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <div className="spinner" style={{ margin: '0 auto 12px', width: 24, height: 24, borderWidth: 3 }}></div>
      <div style={{ color: 'var(--text-dim)' }}>Loading ticket…</div>
    </div>
  );
  if (!ticket) return <div className="page"><div className="alert alert-error">Ticket not found.</div></div>;

  const kbResults = (() => { try { return JSON.parse(ticket.kb_results || '[]'); } catch { return []; } })();
  const isPending = ticket.status === 'pending-approval';

  const doApproval = async (action: string) => {
    setApprovalLoading(true); setApprovalErr(''); setApprovalMsg('');
    try {
      await apiClient.post('/approvals', {
        ticketId: ticket.id, action,
        adminId: `admin-${Date.now()}`,
        editedResponse: action === 'edit-approve' ? editedText : undefined,
      });
      setApprovalMsg(action === 'reject' ? 'Ticket escalated to human agent.' : 'Response approved and dispatched!');
      setEditing(false);
    } catch (err: any) {
      setApprovalErr(err.response?.data?.error || 'Action failed');
    } finally { setApprovalLoading(false); }
  };

  const stateColor = {
    calm: '#34d399', stressed: '#fcd34d', angry: '#fb923c', desperate: '#f87171'
  } as any;

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
            <span style={{ fontSize: 15 }}>{ticket.subject || '(no subject)'}</span>
          </h1>
          <p style={{ paddingLeft: 80 }}>
            <span className={`badge ${ticket.status}`}>{ticket.status}</span>
            {ticket.priority && <span className={`priority-badge ${ticket.priority}`} style={{ marginLeft: 6 }}>{ticket.priority}</span>}
            {ticket.category && <span className="tag" style={{ marginLeft: 6 }}>{ticket.category}</span>}
          </p>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'monospace' }}>{ticket.id}</div>
      </div>

      <div className="page">
        <div className="grid-2">
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Ticket body */}
            <div className="card">
              <div className="card-header"><div className="card-title">📄 Ticket Content</div></div>
              <div className="card-body">
                {ticket.subject && <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>{ticket.subject}</div>}
                <div className="scroll-text" style={{ maxHeight: 160 }}>{ticket.body || '(no body)'}</div>
                {ticket.translated_body && (
                  <div style={{ marginTop: 12, padding: 10, background: 'rgba(99,102,241,.06)', borderRadius: 8, border: '1px solid rgba(99,102,241,.15)' }}>
                    <div style={{ fontSize: 11, color: 'var(--primary-light,#a5b4fc)', fontWeight: 700, marginBottom: 4 }}>
                      🌐 AUTO-TRANSLATED ({ticket.detected_language?.toUpperCase()})
                    </div>
                    <div className="scroll-text">{ticket.translated_body}</div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Classification */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">🤖 AI Classification</div>
                <span className="ai-badge">Qwen</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', fontSize: 13 }}>
                  {[
                    ['Category', ticket.category],
                    ['Priority', ticket.priority],
                    ['Sentiment', ticket.sentiment],
                    ['Language', ticket.detected_language || 'English'],
                  ].map(([l, v]) => v ? (
                    <div key={l}>
                      <div style={{ color: 'var(--text-dim)', fontSize: 11, marginBottom: 2 }}>{l}</div>
                      <div style={{ fontWeight: 600 }}>{String(v).replace(/-/g, ' ')}</div>
                    </div>
                  ) : null)}
                </div>
              </div>
            </div>

            {/* Emotion Analysis */}
            {ticket.emotional_state && (
              <div className="card">
                <div className="card-header"><div className="card-title">💭 Emotion Analysis</div></div>
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: stateColor[ticket.emotional_state] || 'var(--text)' }}>
                      {ticket.emotional_state?.toUpperCase()}
                    </div>
                    {ticket.churn_risk && <span className={`badge ${ticket.churn_risk === 'critical' ? 'escalated' : 'pending-approval'}`}>churn: {ticket.churn_risk}</span>}
                    {ticket.vip_flag ? <span className="badge resolved">⭐ VIP</span> : null}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      ['Frustration', ticket.frustration_score, 10],
                      ['Urgency', ticket.urgency_score, 10],
                    ].map(([label, val, max]: any) => (
                      <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
                          <span>{label}</span><span style={{ fontWeight: 700 }}>{val}/{max}</span>
                        </div>
                        <div className="progress">
                          <div className={`progress-bar ${val > 7 ? 'red' : val > 4 ? 'yellow' : 'green'}`} style={{ width: `${(val / max) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {ticket.emotion_reasoning && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>"{ticket.emotion_reasoning}"</div>}
                </div>
              </div>
            )}

            {/* KB Results */}
            {kbResults.length > 0 && (
              <div className="card">
                <div className="card-header"><div className="card-title">🔍 Knowledge Base Matches</div></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {kbResults.map((r: any, i: number) => (
                    <div key={i} style={{ padding: 12, background: 'rgba(99,102,241,.04)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{r.title}</span>
                        {r.similarityScore && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: r.similarityScore > 0.7 ? '#34d399' : '#fcd34d' }}>
                            {(r.similarityScore * 100).toFixed(0)}% match
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.summary}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Confidence */}
            {ticket.confidence_score != null && (
              <div className="card">
                <div className="card-header"><div className="card-title">📊 AI Confidence Score</div></div>
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                    <div style={{ fontSize: 40, fontWeight: 800, color: ticket.confidence_score > 85 ? '#34d399' : ticket.confidence_score > 60 ? '#fcd34d' : '#f87171', lineHeight: 1 }}>
                      {ticket.confidence_score.toFixed(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{ticket.confidence_score > 85 ? 'High Confidence' : ticket.confidence_score > 60 ? 'Medium Confidence' : 'Low Confidence'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>/ 100 points</div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <ConfidenceTooltip score={ticket.confidence_score} explanation={ticket.confidence_explanation} />
                    </div>
                  </div>
                  <div className="progress" style={{ height: 6 }}>
                    <div className={`progress-bar ${ticket.confidence_score > 85 ? 'green' : ticket.confidence_score > 60 ? 'yellow' : 'red'}`}
                      style={{ width: `${ticket.confidence_score}%` }} />
                  </div>
                  {ticket.confidence_explanation && (
                    <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {ticket.confidence_explanation}
                    </div>
                  )}
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    💡 Hover the score above for a detailed breakdown
                  </div>
                </div>
              </div>
            )}

            {/* HITL Approval Panel */}
            {isPending && (
              <div className="card" style={{ border: '1px solid rgba(249,115,22,.3)', background: 'rgba(249,115,22,.04)' }}>
                <div className="card-header" style={{ borderColor: 'rgba(249,115,22,.2)' }}>
                  <div className="card-title" style={{ color: '#fb923c' }}>🔔 Approval Required</div>
                  <span className="badge pending-approval">HITL Checkpoint</span>
                </div>
                <div className="card-body">
                  {approvalMsg && <div className="alert alert-success">{approvalMsg}</div>}
                  {approvalErr && <div className="alert alert-error">{approvalErr}</div>}

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6, fontWeight: 600 }}>AI DRAFT RESPONSE</div>
                    {editing ? (
                      <textarea className="form-input" value={editedText} onChange={e => setEditedText(e.target.value)}
                        rows={6} placeholder="Edit the response…" />
                    ) : (
                      <div style={{ background: 'rgba(0,0,0,.2)', borderRadius: 8, padding: 12, fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}>
                        {ticket.draft_response || 'No draft available'}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {!editing ? (
                      <>
                        <button className="btn btn-success" disabled={approvalLoading} onClick={() => doApproval('approve')}>
                          ✅ Approve & Send
                        </button>
                        <button className="btn btn-warning" onClick={() => { setEditing(true); setEditedText(ticket.draft_response || ''); }}>
                          ✏️ Edit Response
                        </button>
                        <button className="btn btn-danger" disabled={approvalLoading} onClick={() => doApproval('reject')}>
                          ❌ Reject
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-primary" disabled={approvalLoading || !editedText.trim()} onClick={() => doApproval('edit-approve')}>
                          💾 Save & Approve
                        </button>
                        <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Final Response */}
            {ticket.final_response && (
              <div className="card" style={{ border: '1px solid rgba(16,185,129,.2)' }}>
                <div className="card-header" style={{ borderColor: 'rgba(16,185,129,.2)' }}>
                  <div className="card-title" style={{ color: '#34d399' }}>✅ Final Response Sent</div>
                  <span className="badge resolved">{ticket.outcome}</span>
                </div>
                <div className="card-body">
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                    {ticket.final_response}
                  </div>
                  {ticket.delivered_at && (
                    <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-dim)' }}>
                      Delivered: {new Date(ticket.delivered_at).toLocaleString()} via {ticket.delivery_channel}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="card">
              <div className="card-header"><div className="card-title">⏱ Timeline</div></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { label: 'Received', time: ticket.received_at, icon: '📥' },
                  { label: 'Classified', time: ticket.classified_at, icon: '🤖' },
                  { label: 'Resolved', time: ticket.resolved_at, icon: '✅' },
                  { label: 'Terminal', time: ticket.terminal_at, icon: '🏁' },
                ].filter(e => e.time).map((e, i, arr) => (
                  <div key={e.label} style={{ display: 'flex', gap: 12, paddingBottom: i < arr.length - 1 ? 12 : 0, marginBottom: i < arr.length - 1 ? 0 : 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ fontSize: 16 }}>{e.icon}</div>
                      {i < arr.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--border)', margin: '4px 0' }}></div>}
                    </div>
                    <div style={{ paddingBottom: i < arr.length - 1 ? 12 : 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{e.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{new Date(e.time!).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Visualizer — spans full width below both columns */}
        <PipelineVisualizer ticketId={ticket.id} status={ticket.status} />
      </div>
    </div>
  );
}
