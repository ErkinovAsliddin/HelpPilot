import { useParams, useNavigate } from 'react-router-dom';
import { useTicket } from '../hooks/useTicket.ts';
import { useState } from 'react';
import { apiClient } from '../api/client.ts';

const EMOTION_CLASS: Record<string,string> = { calm:'emotion-calm', stressed:'emotion-stressed', angry:'emotion-angry', desperate:'emotion-desperate' };

export default function TicketDetailPage() {
  const { id } = useParams<{id:string}>();
  const navigate = useNavigate();
  const { ticket, loading } = useTicket(id!);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionDone, setActionDone] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  if (loading) return <div className="page"><div style={{display:'flex',alignItems:'center',gap:12,color:'var(--text-muted)'}}><div className="spinner"></div>Loading ticket…</div></div>;
  if (!ticket) return <div className="page"><div className="alert alert-error">Ticket not found.</div></div>;

  const kbResults = ticket.kb_results ? JSON.parse(ticket.kb_results) as Array<{title:string;summary:string;similarityScore?:number;type?:string}> : [];

  const doAction = async (action: string) => {
    setActionLoading(true); setActionError(''); setActionDone('');
    try {
      await apiClient.post('/approvals', {
        ticketId: ticket.id,
        action,
        adminId: `admin-${Date.now()}`,
        editedResponse: action === 'edit-approve' ? editText : undefined,
      });
      setActionDone(`✅ ${action === 'reject' ? 'Rejected' : 'Approved'} successfully`);
      setTimeout(() => navigate('/tickets'), 1500);
    } catch (e: any) {
      setActionError(e.response?.data?.error || 'Action failed');
    } finally { setActionLoading(false); }
  };

  const scoreColor = (s?: number) => !s ? 'var(--text-dim)' : s > 85 ? 'var(--success)' : s > 60 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div>
      <div className="topbar">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
          <div>
            <div className="topbar-title">{ticket.subject || '(no subject)'}</div>
            <div className="topbar-subtitle" style={{fontFamily:'monospace',fontSize:11}}>{ticket.id}</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span className={`badge-priority ${ticket.priority || 'low'}`}>{ticket.priority || '—'}</span>
          <span className={`badge-status ${ticket.status}`}>{ticket.status}</span>
        </div>
      </div>

      <div className="page" style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:20}}>
        {/* LEFT COLUMN */}
        <div>
          {/* Ticket body */}
          <div className="card" style={{marginBottom:20}}>
            <div className="card-title">📋 Ticket Content</div>
            <div style={{background:'var(--bg)',borderRadius:8,padding:'14px 16px',border:'1px solid var(--border)',marginBottom:12}}>
              <div style={{fontSize:13,color:'var(--text)',lineHeight:'1.7',whiteSpace:'pre-wrap'}}>{ticket.body || '(no body)'}</div>
            </div>
            {ticket.translated_body && (
              <div style={{marginTop:8}}>
                <div style={{fontSize:11,color:'var(--text-dim)',marginBottom:6,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>
                  Translated from {ticket.detected_language}
                </div>
                <div style={{background:'rgba(99,102,241,0.05)',border:'1px solid rgba(99,102,241,0.15)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'var(--text-muted)',lineHeight:'1.7'}}>
                  {ticket.translated_body}
                </div>
              </div>
            )}
          </div>

          {/* Classification */}
          <div className="card" style={{marginBottom:20}}>
            <div className="card-title">🔬 Classification</div>
            <div className="detail-grid">
              <div className="detail-label">Category</div>   <div className="detail-value">{ticket.category || '—'}</div>
              <div className="detail-label">Priority</div>   <div className="detail-value"><span className={`badge-priority ${ticket.priority||'low'}`}>{ticket.priority||'—'}</span></div>
              <div className="detail-label">Sentiment</div>  <div className="detail-value">{ticket.sentiment || '—'}</div>
              <div className="detail-label">Channel</div>    <div className="detail-value">{ticket.source_channel || '—'}</div>
              <div className="detail-label">Submitted</div>  <div className="detail-value">{new Date(ticket.received_at).toLocaleString()}</div>
              {ticket.submitter_email && <><div className="detail-label">Submitter</div><div className="detail-value">{ticket.submitter_email}</div></>}
            </div>
          </div>

          {/* KB Results */}
          {kbResults.length > 0 && (
            <div className="card" style={{marginBottom:20}}>
              <div className="card-title">📚 Knowledge Base Results</div>
              {kbResults.map((r, i) => (
                <div key={i} style={{background:'var(--bg)',borderRadius:8,padding:'12px 14px',border:'1px solid var(--border)',marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                    <span style={{fontWeight:600,fontSize:13}}>{r.title}</span>
                    {r.similarityScore != null && (
                      <span style={{fontSize:11,fontWeight:700,color:r.similarityScore>0.7?'var(--success)':'var(--warning)',background:'rgba(0,0,0,0.2)',padding:'2px 8px',borderRadius:4}}>
                        {(r.similarityScore*100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:12,color:'var(--text-muted)',lineHeight:'1.6'}}>{r.summary}</div>
                  {r.type && <div style={{fontSize:10,color:'var(--text-dim)',marginTop:4,textTransform:'uppercase',letterSpacing:'0.04em'}}>{r.type.replace(/_/g,' ')}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Draft / Final Response */}
          {(ticket.draft_response || ticket.final_response) && (
            <div className="card" style={{marginBottom:20}}>
              <div className="card-title">
                {ticket.final_response ? '✅ Final Response Sent' : '📝 Draft Response'}
                {ticket.confidence_score != null && (
                  <span style={{marginLeft:'auto',fontSize:12,color:scoreColor(ticket.confidence_score),fontWeight:700}}>
                    Confidence: {ticket.confidence_score.toFixed(0)}%
                  </span>
                )}
              </div>
              {ticket.confidence_explanation && (
                <div style={{fontSize:12,color:'var(--text-dim)',marginBottom:12,lineHeight:'1.6'}}>{ticket.confidence_explanation}</div>
              )}
              <div style={{background:'var(--bg)',borderRadius:8,padding:'14px 16px',border:'1px solid var(--border)',whiteSpace:'pre-wrap',fontSize:13,color:'var(--text)',lineHeight:'1.7'}}>
                {ticket.final_response || ticket.draft_response}
              </div>
              {ticket.translated_response && (
                <div style={{marginTop:10,background:'rgba(99,102,241,0.05)',borderRadius:8,padding:'12px 14px',border:'1px solid rgba(99,102,241,0.15)',whiteSpace:'pre-wrap',fontSize:13,color:'var(--text-muted)',lineHeight:'1.7'}}>
                  <div style={{fontSize:11,color:'var(--primary-light)',marginBottom:6,fontWeight:700,textTransform:'uppercase'}}>Translated Response</div>
                  {ticket.translated_response}
                </div>
              )}
            </div>
          )}

          {/* Approval Panel */}
          {ticket.status === 'pending-approval' && !actionDone && (
            <div className="card" style={{border:'1px solid rgba(249,115,22,0.3)',background:'rgba(249,115,22,0.05)'}}>
              <div className="card-title" style={{color:'var(--orange)'}}>⚡ Approval Required</div>
              <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:16}}>Review the draft response above before sending to the submitter.</p>

              {actionError && <div className="alert alert-error">{actionError}</div>}

              {editing ? (
                <div style={{marginBottom:16}}>
                  <label className="form-label">Edit Response</label>
                  <textarea className="form-input" rows={6} value={editText} onChange={e=>setEditText(e.target.value)}
                    placeholder={ticket.draft_response || ''} />
                </div>
              ) : null}

              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <button className="btn btn-success" disabled={actionLoading} onClick={() => doAction('approve')}>
                  ✅ Approve & Send
                </button>
                {!editing ? (
                  <button className="btn btn-warning" onClick={() => { setEditing(true); setEditText(ticket.draft_response||''); }}>
                    ✏️ Edit Response
                  </button>
                ) : (
                  <button className="btn btn-warning" disabled={actionLoading || !editText} onClick={() => doAction('edit-approve')}>
                    💾 Save & Approve
                  </button>
                )}
                <button className="btn btn-danger" disabled={actionLoading} onClick={() => doAction('reject')}>
                  ❌ Reject
                </button>
                {editing && <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>}
              </div>
            </div>
          )}
          {actionDone && <div className="alert alert-success">{actionDone}</div>}
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* Emotion Analysis */}
          {ticket.emotional_state && (
            <div className="card" style={{marginBottom:16}}>
              <div className="card-title">🧠 Emotion Analysis</div>
              <div style={{marginBottom:12}}>
                <span className={`emotion-badge ${EMOTION_CLASS[ticket.emotional_state]||'emotion-calm'}`}>
                  {ticket.emotional_state}
                </span>
                {ticket.vip_flag ? <span style={{marginLeft:8,fontSize:11,background:'rgba(245,158,11,0.15)',color:'var(--warning)',padding:'2px 8px',borderRadius:4,fontWeight:700}}>⭐ VIP</span> : null}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                <div style={{background:'var(--bg)',borderRadius:6,padding:'8px 10px',textAlign:'center',border:'1px solid var(--border)'}}>
                  <div style={{fontSize:20,fontWeight:800,color:'var(--orange)'}}>{ticket.frustration_score ?? '—'}</div>
                  <div style={{fontSize:10,color:'var(--text-dim)',textTransform:'uppercase',letterSpacing:'0.04em'}}>Frustration</div>
                </div>
                <div style={{background:'var(--bg)',borderRadius:6,padding:'8px 10px',textAlign:'center',border:'1px solid var(--border)'}}>
                  <div style={{fontSize:20,fontWeight:800,color:'var(--danger)'}}>{ticket.urgency_score ?? '—'}</div>
                  <div style={{fontSize:10,color:'var(--text-dim)',textTransform:'uppercase',letterSpacing:'0.04em'}}>Urgency</div>
                </div>
              </div>
              {ticket.churn_risk && (
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderTop:'1px solid var(--border)'}}>
                  <span style={{fontSize:12,color:'var(--text-dim)'}}>Churn Risk</span>
                  <span style={{fontSize:12,fontWeight:700,color:ticket.churn_risk==='critical'?'var(--danger)':ticket.churn_risk==='high'?'var(--orange)':ticket.churn_risk==='medium'?'var(--warning)':'var(--success)'}}>
                    {ticket.churn_risk.toUpperCase()}
                  </span>
                </div>
              )}
              {ticket.recommended_tone && (
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderTop:'1px solid var(--border)'}}>
                  <span style={{fontSize:12,color:'var(--text-dim)'}}>Recommended Tone</span>
                  <span style={{fontSize:12,fontWeight:600,color:'var(--primary-light)'}}>{ticket.recommended_tone}</span>
                </div>
              )}
            </div>
          )}

          {/* Outcome */}
          <div className="card" style={{marginBottom:16}}>
            <div className="card-title">📊 Outcome</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[
                ['Status', <span className={`badge-status ${ticket.status}`}>{ticket.status}</span>],
                ['Outcome', ticket.outcome || '—'],
                ['Resolution', ticket.resolution_action || '—'],
                ['Classified At', ticket.classified_at ? new Date(ticket.classified_at).toLocaleTimeString() : '—'],
                ['Terminal At', ticket.terminal_at ? new Date(ticket.terminal_at).toLocaleString() : '—'],
              ].map(([label, value]: any) => (
                <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0',borderBottom:'1px solid rgba(45,49,72,0.4)'}}>
                  <span style={{fontSize:12,color:'var(--text-dim)'}}>{label}</span>
                  <span style={{fontSize:12,fontWeight:500}}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Escalation reason */}
          {ticket.escalation_reason && (
            <div className="alert alert-warning" style={{fontSize:12}}>
              <span>⚠️</span>
              <div><strong>Escalation reason:</strong><br/>{ticket.escalation_reason}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
