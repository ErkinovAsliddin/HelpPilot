import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) { setError('API key is required'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        sessionStorage.setItem('apiKey', key.trim());
        navigate('/welcome');
      } else {
        setError('Server error — make sure HelpPilot is running');
      }
    } catch {
      setError('Cannot reach server at localhost:3000');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-wrap">
        <div className="login-hero">
          <div className="login-logo">🤖</div>
          <div className="login-title">HelpPilot</div>
          <div className="login-sub">AI-Powered IT Helpdesk Autopilot · Qwen-Powered</div>
        </div>

        <div className="login-card">
          <form onSubmit={submit}>
            {error && <div className="alert alert-error">{error}</div>}
            <div style={{marginBottom:20}}>
              <label className="form-label">API Key</label>
              <input className="form-input" type="password" value={key}
                onChange={e => { setKey(e.target.value); setError(''); }}
                placeholder="Enter your API key" autoFocus autoComplete="off" />
              <div style={{fontSize:11,color:'var(--text-dim)',marginTop:7,lineHeight:1.4}}>
                Default: <code style={{color:'var(--primary-light,#a5b4fc)',background:'rgba(99,102,241,.1)',padding:'1px 6px',borderRadius:3}}>helppilot-demo-key-2024</code>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:'11px 0',fontSize:14}}
              disabled={loading}>
              {loading ? <><span className="spinner" style={{width:14,height:14}}></span> Signing in…</> : <>Sign In →</>}
            </button>
          </form>

          <hr className="divider" />

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[
              ['🤖','Qwen AI','qwen-max + qwen-turbo'],
              ['🔒','HITL','Human-in-the-loop'],
              ['⚡','Pipeline','Multi-agent workflow'],
              ['📊','Analytics','Real-time metrics'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{background:'rgba(99,102,241,.04)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px'}}>
                <div style={{fontSize:14,marginBottom:3}}>{icon} <span style={{fontSize:12,fontWeight:600,color:'var(--text-muted)'}}>{title}</span></div>
                <div style={{fontSize:11,color:'var(--text-dim)'}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
