import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) { setError('Please enter your API key'); return; }
    // Quick validation
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        sessionStorage.setItem('apiKey', key.trim());
        navigate('/tickets');
      } else {
        setError('Server error — check server is running');
      }
    } catch {
      setError('Cannot reach server — is HelpPilot running?');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🤖</div>
        <div className="login-title">HelpPilot</div>
        <div className="login-sub">IT Helpdesk Autopilot · Sign in to continue</div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error" style={{marginBottom:16}}>{error}</div>}
          <div className="form-group">
            <label className="form-label">API Key</label>
            <input
              className="form-input"
              type="password"
              value={key}
              onChange={e => { setKey(e.target.value); setError(''); }}
              placeholder="Enter your API key"
              autoFocus
            />
            <div style={{fontSize:11,color:'var(--text-dim)',marginTop:6}}>
              Default key: <code style={{color:'var(--primary-light)'}}>helppilot-demo-key-2024</code>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:'11px'}}>
            Sign In →
          </button>
        </form>

        <div style={{marginTop:24,padding:'14px',background:'rgba(99,102,241,0.08)',borderRadius:8,border:'1px solid rgba(99,102,241,0.2)'}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--primary-light)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em'}}>System Status</div>
          <div style={{fontSize:12,color:'var(--text-muted)'}}>Server running on <span style={{color:'var(--success)'}}>port 3000</span></div>
          <div style={{fontSize:12,color:'var(--text-muted)'}}>Pipeline: <span style={{color:'var(--success)'}}>active</span></div>
        </div>
      </div>
    </div>
  );
}
