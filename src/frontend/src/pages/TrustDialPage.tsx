import { useState, useEffect } from 'react';
import { apiClient } from '../api/client.ts';

const CATEGORIES = ['global','password-reset','network-issue','software-install','hardware-failure','billing','other'];
const MODE_LABELS: Record<string,string> = {
  always_ask: '👤 Always Ask',
  threshold: '⚡ Threshold',
  full_autopilot: '🚀 Full Autopilot',
};
const MODE_DESC: Record<string,string> = {
  always_ask:    'Every ticket requires human approval, regardless of confidence.',
  threshold:     'Auto-resolve when confidence ≥ threshold. Otherwise ask.',
  full_autopilot:'AI resolves everything below critical priority automatically.',
};

export default function TrustDialPage() {
  const [data, setData] = useState<any>(null);
  const [saving, setSaving] = useState<string|null>(null);

  const load = async () => {
    try { const r = await apiClient.get('/trust-dial'); setData(r.data); }
    catch {}
  };

  useEffect(() => { load(); const id = setInterval(load, 8000); return () => clearInterval(id); }, []);

  const update = async (cat: string, mode: string, threshold: number) => {
    setSaving(cat);
    try { await apiClient.put(`/trust-dial/${cat}`, { mode, threshold }); await load(); }
    catch {}
    finally { setSaving(null); }
  };

  if (!data) return <div style={{padding:48,textAlign:'center'}}><div className="spinner" style={{margin:'0 auto',width:24,height:24,borderWidth:3}}></div></div>;

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>🎛 Trust Dial</h1>
          <p>Control AI autonomy per ticket category — the centerpiece of HelpPilot's HITL design</p>
        </div>
        <span className="ai-badge">Live · auto-refreshes</span>
      </div>

      <div className="page">
        {/* Summary stats */}
        <div className="metrics-grid" style={{marginBottom:28}}>
          {['global'].map(cat => {
            const s = data.stats?.[cat] || {};
            const total = s.total || 0;
            const autoRate = total > 0 ? Math.round((s.auto_resolved/total)*100) : 0;
            return [
              <div key="total" className="metric-card indigo"><div className="metric-glow"></div><div className="metric-icon">🎫</div><div className="metric-value">{total}</div><div className="metric-label">Total Tickets</div></div>,
              <div key="auto" className="metric-card green"><div className="metric-glow"></div><div className="metric-icon">🤖</div><div className="metric-value">{s.auto_resolved||0}</div><div className="metric-label">Auto-Resolved</div></div>,
              <div key="approved" className="metric-card sky"><div className="metric-glow"></div><div className="metric-icon">✅</div><div className="metric-value">{s.approved||0}</div><div className="metric-label">Human Approved</div></div>,
              <div key="escalated" className="metric-card red"><div className="metric-glow"></div><div className="metric-icon">🔺</div><div className="metric-value">{s.escalated||0}</div><div className="metric-label">Escalated</div></div>,
              <div key="rate" className="metric-card yellow"><div className="metric-glow"></div><div className="metric-icon">📊</div><div className="metric-value">{autoRate}%</div><div className="metric-label">Auto-Resolution Rate</div></div>,
            ];
          })}
        </div>

        {/* Per-category dials */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {CATEGORIES.map(cat => {
            const setting = data.settings?.[cat] || { mode:'threshold', threshold:75 };
            const stats = data.stats?.[cat] || {};
            const isGlobal = cat === 'global';

            return (
              <CategoryDial
                key={cat}
                category={cat}
                setting={setting}
                stats={stats}
                isGlobal={isGlobal}
                saving={saving === cat}
                onUpdate={(mode: string, threshold: number) => update(cat, mode, threshold)}
              />
            );
          })}
        </div>

        {/* Info box */}
        <div style={{marginTop:24,padding:16,background:'rgba(99,102,241,.06)',border:'1px solid rgba(99,102,241,.15)',borderRadius:12}}>
          <div style={{fontSize:13,fontWeight:700,color:'#a5b4fc',marginBottom:8}}>💡 How Trust Dial Works</div>
          <div style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.7}}>
            Every AI decision references the current Trust Dial setting in its reasoning trace.
            For example: <em style={{color:'var(--text)'}}>
              "Confidence 82% ≥ threshold 75% → auto-resolving without human approval (Trust Dial: threshold mode)"
            </em>.
            The global setting applies to all categories unless overridden.
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryDial({ category, setting, stats, isGlobal, saving, onUpdate }: any) {
  const [mode, setMode] = useState(setting.mode);
  const [threshold, setThreshold] = useState(setting.threshold);
  const total = stats.total || 0;

  const modeColor = { always_ask:'var(--orange)', threshold:'var(--primary)', full_autopilot:'var(--success)' } as any;

  return (
    <div className="card" style={{ border: isGlobal ? '1px solid rgba(99,102,241,.3)' : undefined }}>
      <div className="card-header">
        <div className="card-title" style={{gap:12}}>
          {isGlobal ? '🌐' : getCatIcon(category)}
          <span style={{textTransform:'capitalize'}}>{isGlobal ? 'Global Default' : category.replace(/-/g,' ')}</span>
          <span style={{padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:700,background:modeColor[mode]+'22',color:modeColor[mode],border:`1px solid ${modeColor[mode]}44`}}>
            {MODE_LABELS[mode]}
          </span>
        </div>
        {total > 0 && (
          <div style={{display:'flex',gap:12,fontSize:12,color:'var(--text-dim)'}}>
            <span>🤖 {stats.auto_resolved||0} auto</span>
            <span>✅ {stats.approved||0} approved</span>
            <span>🔺 {stats.escalated||0} escalated</span>
          </div>
        )}
      </div>
      <div className="card-body" style={{display:'flex',gap:24,alignItems:'flex-start',flexWrap:'wrap'}}>
        {/* Mode selector */}
        <div style={{flex:1,minWidth:220}}>
          <div className="form-label">Autonomy Mode</div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {['always_ask','threshold','full_autopilot'].map(m => (
              <label key={m} style={{display:'flex',alignItems:'flex-start',gap:8,cursor:'pointer',padding:'8px 10px',borderRadius:8,background:mode===m?'rgba(99,102,241,.08)':'transparent',border:`1px solid ${mode===m?'rgba(99,102,241,.25)':'transparent'}`,transition:'all .15s'}}>
                <input type="radio" name={`mode-${category}`} value={m} checked={mode===m} onChange={()=>setMode(m)} style={{marginTop:3,accentColor:'#6366f1'}} />
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:mode===m?'#a5b4fc':'var(--text-muted)'}}>{MODE_LABELS[m]}</div>
                  <div style={{fontSize:11,color:'var(--text-dim)'}}>{MODE_DESC[m]}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Threshold slider */}
        <div style={{flex:1,minWidth:200}}>
          {mode === 'threshold' && (
            <>
              <div className="form-label" style={{display:'flex',justifyContent:'space-between'}}>
                <span>Confidence Threshold</span>
                <span style={{color:'#a5b4fc',fontWeight:700}}>{threshold}%</span>
              </div>
              <input type="range" min={0} max={100} value={threshold}
                onChange={e=>setThreshold(Number(e.target.value))}
                style={{width:'100%',accentColor:'#6366f1',marginBottom:8}} />
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--text-dim)'}}>
                <span>0% — always approve</span>
                <span>100% — never approve</span>
              </div>
              <div style={{marginTop:8,padding:'8px 10px',background:'rgba(99,102,241,.06)',borderRadius:6,fontSize:12,color:'var(--text-muted)'}}>
                Tickets with AI confidence ≥ {threshold}% resolve automatically.<br/>
                Below {threshold}% → sent to approvals queue.
              </div>
            </>
          )}
          {mode !== 'threshold' && (
            <div style={{padding:16,background:'rgba(0,0,0,.1)',borderRadius:8,fontSize:12,color:'var(--text-dim)',lineHeight:1.6}}>
              {mode === 'always_ask' ? '⚠️ All tickets in this category will require manual approval, regardless of AI confidence.' : '🚀 AI will resolve tickets autonomously. Only critical priority and high-churn tickets will request approval.'}
            </div>
          )}
        </div>

        <div style={{alignSelf:'flex-end'}}>
          <button className="btn btn-primary btn-sm" disabled={saving} onClick={()=>onUpdate(mode,threshold)}>
            {saving ? <><span className="spinner" style={{width:12,height:12}}></span> Saving</> : '💾 Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function getCatIcon(cat: string) {
  const icons: Record<string,string> = {
    'password-reset':'🔑','network-issue':'🌐','software-install':'💾',
    'hardware-failure':'🖥','billing':'💳','other':'📁',
  };
  return icons[cat] || '📁';
}
