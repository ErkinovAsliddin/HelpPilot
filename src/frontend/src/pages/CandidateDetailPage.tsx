import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.ts';

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(0);

  const load = async () => {
    try { const r = await apiClient.get(`/hireflow/candidates/${id}`); setCandidate(r.data); setEditedEmail(r.data.interview_email_draft || ''); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const decide = async (decision: string) => {
    setActionLoading(true);
    await apiClient.post(`/hireflow/candidates/${id}/decide`, { decision, reviewerId: 'admin-' + Date.now() });
    setMsg(`✅ Candidate ${decision === 'advance' ? 'advanced to interview stage' : decision === 'reject' ? 'rejected' : 'put on hold'}.`);
    setActionLoading(false); load();
  };

  const scoreNow = async () => {
    setActionLoading(true);
    await apiClient.post(`/hireflow/candidates/${id}/score`, {});
    setMsg('🤖 AI scoring complete.'); setActionLoading(false); load();
  };

  const scheduleNow = async () => {
    setActionLoading(true);
    const r = await apiClient.post(`/hireflow/candidates/${id}/schedule`, {});
    if (r.data.escalate) setMsg(`⚠️ Escalated: ${r.data.reason}`);
    else setMsg(`📅 ${r.data.proposedSlots?.length} time slots proposed.`);
    setActionLoading(false); load();
  };

  const confirmInvite = async () => {
    setActionLoading(true);
    const r = await apiClient.post(`/hireflow/candidates/${id}/confirm-invite`, {
      confirmedSlotIndex: selectedSlot,
      approvedBy: 'admin-' + Date.now(),
      editedEmailBody: editedEmail,
    });
    setMsg(r.data.success ? '✅ Interview invite sent!' : `❌ ${r.data.error}`);
    setActionLoading(false); load();
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto', width: 24, height: 24, borderWidth: 3 }}></div></div>;
  if (!candidate) return <div className="page"><div className="alert alert-error">Candidate not found.</div></div>;

  const slots = JSON.parse(candidate.interview_slots || '[]');
  const skills = JSON.parse(candidate.skills || '[]');
  const strengths = JSON.parse(candidate.strengths || '[]');
  const gaps = JSON.parse(candidate.gaps || '[]');
  const ambiguities = JSON.parse(candidate.ambiguities || '[]');
  const auditLog = candidate.auditLog || [];

  const STAGE_COLOR: Record<string, string> = {
    parsed: '#6366f1', awaiting_human_review: '#f97316', scored: '#0ea5e9',
    approved_for_interview: '#10b981', awaiting_schedule_confirmation: '#f59e0b',
    interview_scheduled: '#34d399', rejected: '#ef4444', on_hold: '#6b7280',
  };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/hiring')}>← Hiring</button>
            <span style={{ fontSize: 16 }}>{candidate.name}</span>
          </h1>
          <p style={{ paddingLeft: 80 }}>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${STAGE_COLOR[candidate.stage] || '#6b7280'}15`, color: STAGE_COLOR[candidate.stage] || '#6b7280', border: `1px solid ${STAGE_COLOR[candidate.stage] || '#6b7280'}30` }}>
              {candidate.stage?.replace(/_/g, ' ')}
            </span>
            {candidate.fit_score != null && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: candidate.fit_score >= 70 ? '#34d399' : candidate.fit_score >= 50 ? '#fcd34d' : '#f87171' }}>Score: {candidate.fit_score}/100</span>}
          </p>
        </div>
      </div>

      <div className="page">
        {msg && <div className="alert alert-success" style={{ marginBottom: 16 }}>{msg}</div>}

        <div className="grid-2">
          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card">
              <div className="card-header"><div className="card-title">👤 Candidate Info</div></div>
              <div className="card-body">
                {[['Email', candidate.email], ['Phone', candidate.phone], ['Location', candidate.location],
                  ['Current Role', candidate.current_role], ['Company', candidate.current_company],
                  ['Experience', candidate.years_of_experience != null ? `${candidate.years_of_experience} years` : null],
                  ['Seniority', candidate.seniority_level],
                ].map(([l, v]) => v ? (
                  <div key={l as string} style={{ display: 'flex', gap: 10, marginBottom: 7, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-dim)', minWidth: 100 }}>{l}</span>
                    <span style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ) : null)}
                {skills.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>SKILLS</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {skills.map((s: string) => <span key={s} className="tag" style={{ fontSize: 11 }}>{s}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Scoring */}
            {candidate.score_rationale && (
              <div className="card">
                <div className="card-header"><div className="card-title">🤖 AI Screening</div><span className="ai-badge">qwen-plus</span></div>
                <div className="card-body">
                  <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>{candidate.score_rationale}</div>
                  {strengths.length > 0 && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 11, color: '#34d399', fontWeight: 700, marginBottom: 4 }}>✅ STRENGTHS</div>{strengths.map((s: string) => <div key={s} style={{ fontSize: 12, color: 'var(--text-muted)' }}>• {s}</div>)}</div>}
                  {gaps.length > 0 && <div><div style={{ fontSize: 11, color: '#f87171', fontWeight: 700, marginBottom: 4 }}>⚠️ GAPS</div>{gaps.map((g: string) => <div key={g} style={{ fontSize: 12, color: 'var(--text-muted)' }}>• {g}</div>)}</div>}
                </div>
              </div>
            )}

            {/* Ambiguities */}
            {ambiguities.length > 0 && (
              <div className="card" style={{ border: '1px solid rgba(245,158,11,.25)' }}>
                <div className="card-header"><div className="card-title" style={{ color: '#fcd34d' }}>⚠️ Ambiguities Detected</div></div>
                <div className="card-body">{ambiguities.map((a: string) => <div key={a} style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 5 }}>• {a}</div>)}</div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Action panel */}
            <div className="card" style={{ border: '1px solid rgba(99,102,241,.25)' }}>
              <div className="card-header"><div className="card-title">⚡ Pipeline Actions</div></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {candidate.stage === 'parsed' && (
                  <button className="btn btn-primary" disabled={actionLoading} onClick={scoreNow} style={{ justifyContent: 'center' }}>
                    🤖 Score with Qwen AI
                  </button>
                )}
                {(candidate.stage === 'awaiting_human_review' || candidate.stage === 'scored') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="alert alert-warning" style={{ fontSize: 12 }}>
                      <strong>HITL Checkpoint 1:</strong> Review AI score and decide whether to advance this candidate.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-success" disabled={actionLoading} onClick={() => decide('advance')}>✅ Advance to Interview</button>
                      <button className="btn btn-danger"  disabled={actionLoading} onClick={() => decide('reject')}>❌ Reject</button>
                      <button className="btn btn-ghost"   disabled={actionLoading} onClick={() => decide('hold')}>⏸ Hold</button>
                    </div>
                  </div>
                )}
                {candidate.stage === 'approved_for_interview' && (
                  <button className="btn btn-primary" disabled={actionLoading} onClick={scheduleNow} style={{ justifyContent: 'center' }}>
                    📅 Propose Interview Slots
                  </button>
                )}
                {candidate.stage === 'awaiting_schedule_confirmation' && slots.length > 0 && (
                  <div>
                    <div className="alert alert-warning" style={{ fontSize: 12, marginBottom: 10 }}>
                      <strong>HITL Checkpoint 2:</strong> Confirm the time slot and approve sending the invite.
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <div className="form-label">Select time slot</div>
                      {slots.map((s: any, i: number) => (
                        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer', fontSize: 13 }}>
                          <input type="radio" name="slot" checked={selectedSlot === i} onChange={() => setSelectedSlot(i)} style={{ accentColor: '#6366f1' }} />
                          {new Date(s.start).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </label>
                      ))}
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <div className="form-label">Email to candidate (editable)</div>
                      <textarea className="form-input" value={editedEmail} onChange={e => setEditedEmail(e.target.value)} rows={6} />
                    </div>
                    <button className="btn btn-primary" disabled={actionLoading} onClick={confirmInvite} style={{ width: '100%', justifyContent: 'center' }}>
                      ✅ Approve & Send Invite
                    </button>
                  </div>
                )}
                {candidate.stage === 'interview_scheduled' && (
                  <div className="alert alert-success">🗓 Interview scheduled! Invite sent to {candidate.email}.</div>
                )}
              </div>
            </div>

            {/* Audit trail */}
            <div className="card">
              <div className="card-header"><div className="card-title">📋 Audit Trail</div></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {auditLog.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>No actions yet.</div> :
                  auditLog.map((entry: any, i: number) => (
                    <div key={i} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, color: entry.actor === 'human' ? '#10b981' : '#a5b4fc' }}>{entry.actor === 'human' ? '👤 Human' : '🤖 Agent'} · {entry.action}</span>
                        <span style={{ color: 'var(--text-dim)' }}>{new Date(entry.created_at).toLocaleTimeString()}</span>
                      </div>
                      {entry.data && (() => { try { const d = JSON.parse(entry.data); return <div style={{ color: 'var(--text-dim)' }}>{d.recommendation || d.decision || d.reason || ''}</div>; } catch { return null; } })()}
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
