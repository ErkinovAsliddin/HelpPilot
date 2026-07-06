import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.ts';

const STAGE_LABELS: Record<string, { label: string; color: string; col: number }> = {
  parsed:                     { label: '📄 Parsed',          color: '#6366f1', col: 0 },
  awaiting_human_review:      { label: '👤 Needs Review',    color: '#f97316', col: 1 },
  scored:                     { label: '🤖 Scored',          color: '#0ea5e9', col: 1 },
  approved_for_interview:     { label: '✅ Approved',         color: '#10b981', col: 2 },
  awaiting_schedule_confirmation:{ label: '📅 Scheduling',   color: '#f59e0b', col: 2 },
  interview_scheduled:        { label: '🗓 Scheduled',        color: '#34d399', col: 3 },
  rejected:                   { label: '❌ Rejected',          color: '#ef4444', col: 4 },
  on_hold:                    { label: '⏸ On Hold',           color: '#6b7280', col: 4 },
};

const COLUMNS = [
  { id: 0, title: 'Intake',     stages: ['parsed'] },
  { id: 1, title: 'Screening',  stages: ['awaiting_human_review', 'scored'] },
  { id: 2, title: 'Interview',  stages: ['approved_for_interview', 'awaiting_schedule_confirmation'] },
  { id: 3, title: 'Scheduled',  stages: ['interview_scheduled'] },
  { id: 4, title: 'Closed',     stages: ['rejected', 'on_hold'] },
];

export default function HiringPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showNewJob, setShowNewJob] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const [cr, jr, sr] = await Promise.all([
        apiClient.get('/hireflow/candidates'),
        apiClient.get('/hireflow/jobs'),
        apiClient.get('/hireflow/stats'),
      ]);
      setCandidates(cr.data.candidates || []);
      setJobs(jr.data.jobs || []);
      setStats(sr.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); const id = setInterval(load, 10000); return () => clearInterval(id); }, []);

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>💼 HireFlow Autopilot</h1>
          <p>Resume-to-Interview pipeline · Qwen AI scoring · 2 HITL checkpoints</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowNewJob(true)}>+ New Job</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>📤 Upload Resume</button>
        </div>
      </div>

      <div className="page">
        {/* Stats */}
        {stats && (
          <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', marginBottom: 24 }}>
            <div className="metric-card indigo"><div className="metric-glow"></div><div className="metric-icon">👤</div><div className="metric-value">{stats.totalCandidates || 0}</div><div className="metric-label">Total Candidates</div></div>
            <div className="metric-card orange"><div className="metric-glow"></div><div className="metric-icon">⏳</div><div className="metric-value">{(stats.stages?.awaiting_human_review || 0) + (stats.stages?.awaiting_schedule_confirmation || 0)}</div><div className="metric-label">Needs Action</div></div>
            <div className="metric-card green"><div className="metric-glow"></div><div className="metric-icon">🗓</div><div className="metric-value">{stats.stages?.interview_scheduled || 0}</div><div className="metric-label">Interviews Booked</div></div>
            <div className="metric-card sky"><div className="metric-glow"></div><div className="metric-icon">📋</div><div className="metric-value">{jobs.length}</div><div className="metric-label">Open Roles</div></div>
          </div>
        )}

        {/* Kanban */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: '0 auto', width: 24, height: 24, borderWidth: 3 }}></div></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, overflowX: 'auto', minWidth: 900 }}>
            {COLUMNS.map(col => {
              const colCandidates = candidates.filter(c => col.stages.includes(c.stage));
              return (
                <div key={col.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{col.title}</span>
                    <span style={{ fontSize: 11, background: 'rgba(99,102,241,.15)', color: '#a5b4fc', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>{colCandidates.length}</span>
                  </div>
                  <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
                    {colCandidates.map(c => (
                      <CandidateCard key={c.id} candidate={c} onClick={() => navigate(`/hiring/${c.id}`)} onAction={load} />
                    ))}
                    {colCandidates.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: '20px 0' }}>Empty</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modals */}
        {showUpload && <ResumeUploadModal jobs={jobs} onClose={() => setShowUpload(false)} onDone={load} />}
        {showNewJob && <NewJobModal onClose={() => setShowNewJob(false)} onDone={load} />}
      </div>
    </div>
  );
}

function CandidateCard({ candidate: c, onClick, onAction }: any) {
  const stage = STAGE_LABELS[c.stage] || { label: c.stage, color: '#6b7280' };
  const score = c.fit_score;

  const quickAction = async (action: string, data: any) => {
    try { await apiClient.post(`/hireflow/candidates/${c.id}/${action}`, data); onAction(); }
    catch {}
  };

  return (
    <div onClick={onClick} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', transition: 'border-color .15s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name || 'Unknown'}</div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.current_role || '—'}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: `${stage.color}15`, color: stage.color, border: `1px solid ${stage.color}30`, fontWeight: 600 }}>{stage.label}</span>
        {score != null && (
          <span style={{ fontSize: 10, fontWeight: 700, color: score >= 70 ? '#34d399' : score >= 50 ? '#fcd34d' : '#f87171' }}>{score}/100</span>
        )}
      </div>
      {c.stage === 'awaiting_human_review' && (
        <div style={{ marginTop: 8, display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
          <button className="btn btn-success" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => quickAction('decide', { decision: 'advance', reviewerId: 'admin' })}>✅ Advance</button>
          <button className="btn btn-danger" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => quickAction('decide', { decision: 'reject', reviewerId: 'admin' })}>❌ Reject</button>
        </div>
      )}
    </div>
  );
}

function ResumeUploadModal({ jobs, onClose, onDone }: any) {
  const [text, setText] = useState('');
  const [jobId, setJobId] = useState(jobs[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const r = await apiClient.post('/hireflow/resumes', { content: text, contentType: 'text', jobId: jobId || undefined });
      setResult(r.data);
      // Auto-score
      if (r.data.candidateId && r.data.confidence > 30) {
        await apiClient.post(`/hireflow/candidates/${r.data.candidateId}/score`, {});
      }
      onDone();
    } catch {}
    setLoading(false);
  };

  return (
    <Modal title="📤 Upload Resume" onClose={onClose}>
      {!result ? (
        <>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Job Position</label>
            <select className="form-input" value={jobId} onChange={e => setJobId(e.target.value)}>
              <option value="">— No specific job —</option>
              {jobs.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Resume Text</label>
            <textarea className="form-input" value={text} onChange={e => setText(e.target.value)} rows={10} placeholder="Paste resume text here (supports messy formats, typos, non-standard layouts)..." />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={!text.trim() || loading} onClick={submit}>
              {loading ? <><span className="spinner" style={{ width: 12, height: 12 }}></span> Parsing…</> : '🤖 Parse & Score'}
            </button>
          </div>
        </>
      ) : (
        <div>
          <div className="alert alert-success">
            <div>
              <strong>✅ Resume parsed!</strong>
              <div style={{ fontSize: 12, marginTop: 4 }}>Candidate: <strong>{result.parsed?.name}</strong> · Confidence: {result.confidence}% · Ambiguities: {result.ambiguities?.length}</div>
              {result.ambiguities?.length > 0 && <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 4 }}>⚠️ {result.ambiguities.join('; ')}</div>}
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={onClose}>Go to Dashboard</button>
        </div>
      )}
    </Modal>
  );
}

function NewJobModal({ onClose, onDone }: any) {
  const [form, setForm] = useState({ title: '', department: '', requirements: '' });
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!form.title || !form.requirements) return;
    setLoading(true);
    try { await apiClient.post('/hireflow/jobs', form); onDone(); onClose(); }
    catch {}
    setLoading(false);
  };
  return (
    <Modal title="+ New Job Position" onClose={onClose}>
      <div style={{ marginBottom: 12 }}><label className="form-label">Job Title</label><input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Senior Full-Stack Engineer" /></div>
      <div style={{ marginBottom: 12 }}><label className="form-label">Department</label><input className="form-input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="Engineering" /></div>
      <div style={{ marginBottom: 14 }}><label className="form-label">Requirements</label><textarea className="form-input" value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} rows={6} placeholder="Must-haves, nice-to-haves, seniority level..." /></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!form.title || !form.requirements || loading} onClick={submit}>{loading ? 'Creating…' : 'Create Job'}</button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: any) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: 'var(--shadow)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}
