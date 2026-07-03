import { useState, useEffect } from 'react';
import { apiClient } from '../api/client.ts';

export default function AnomalyPage() {
  const [data, setData] = useState<any>(null);
  const [analysis, setAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = (refresh = false) => {
    setLoading(true);
    apiClient.get(`/anomalies${refresh?'?refresh=true':''}`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); const id = setInterval(() => load(), 120000); return () => clearInterval(id); }, []);

  const analyze = async () => {
    setAnalyzing(true); setAnalysis('');
    try {
      const r = await apiClient.post('/anomalies/analyze');
      setAnalysis(r.data.analysis);
    } catch { setAnalysis('Analysis unavailable.'); }
    finally { setAnalyzing(false); }
  };

  const sevColor = (s: string) => ({ critical:'var(--danger)', high:'var(--orange)', medium:'var(--warning)', low:'var(--text-dim)' } as any)[s] || 'var(--text-dim)';
  const sevBg    = (s: string) => ({ critical:'rgba(239,68,68,.1)', high:'rgba(249,115,22,.1)', medium:'rgba(245,158,11,.1)', low:'rgba(107,114,128,.08)' } as any)[s];

  const anomalies = data?.anomalies || [];
  const critical = anomalies.filter((a:any) => a.severity === 'critical').length;
  const high = anomalies.filter((a:any) => a.severity === 'high').length;

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>🔎 Anomaly Detector</h1>
          <p>AI-powered pattern analysis across your ticket history · auto-refreshes every 2 min</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-ghost btn-sm" onClick={() => load(true)}>🔄 Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={analyze} disabled={analyzing || anomalies.length === 0}>
            {analyzing ? <><span className="spinner" style={{width:12,height:12}}></span> Analyzing…</> : '🤖 AI Deep Analysis'}
          </button>
        </div>
      </div>

      <div className="page">
        <div className="metrics-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginBottom:24}}>
          <div className="metric-card red"><div className="metric-glow"></div><div className="metric-icon">🚨</div><div className="metric-value">{critical}</div><div className="metric-label">Critical</div></div>
          <div className="metric-card orange"><div className="metric-glow"></div><div className="metric-icon">⚠️</div><div className="metric-value">{high}</div><div className="metric-label">High</div></div>
          <div className="metric-card yellow"><div className="metric-glow"></div><div className="metric-icon">📊</div><div className="metric-value">{anomalies.filter((a:any)=>a.severity==='medium').length}</div><div className="metric-label">Medium</div></div>
          <div className="metric-card green"><div className="metric-glow"></div><div className="metric-icon">✅</div><div className="metric-value">{anomalies.length === 0 ? 'Clean' : anomalies.length}</div><div className="metric-label">{anomalies.length === 0 ? 'No Anomalies' : 'Total'}</div></div>
        </div>

        {analysis && (
          <div className="card" style={{marginBottom:16,border:'1px solid rgba(99,102,241,.25)'}}>
            <div className="card-header"><div className="card-title">🤖 AI Analysis</div><span className="ai-badge">qwen-turbo</span></div>
            <div className="card-body" style={{fontSize:14,lineHeight:1.7,color:'var(--text-muted)'}}>{analysis}</div>
          </div>
        )}

        {loading ? (
          <div style={{padding:48,textAlign:'center'}}><div className="spinner" style={{margin:'0 auto',width:24,height:24,borderWidth:3}}></div></div>
        ) : anomalies.length === 0 ? (
          <div className="empty"><div className="empty-icon">🛡️</div><div className="empty-title">No anomalies detected</div><div style={{fontSize:13}}>System operating within normal parameters</div></div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {anomalies.map((a: any) => (
              <div key={a.id} className="card" style={{border:`1px solid ${sevColor(a.severity)}33`}}>
                <div style={{padding:'14px 18px',display:'flex',alignItems:'flex-start',gap:12}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:sevColor(a.severity),flexShrink:0,marginTop:5,boxShadow:`0 0 6px ${sevColor(a.severity)}`}}></div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:5}}>
                      <span style={{fontWeight:700,fontSize:14}}>{a.title}</span>
                      <span style={{padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:700,background:sevBg(a.severity),color:sevColor(a.severity),textTransform:'uppercase',letterSpacing:'.05em'}}>{a.severity}</span>
                      <span style={{fontSize:11,color:'var(--text-dim)',marginLeft:'auto'}}>{new Date(a.detectedAt).toLocaleTimeString()}</span>
                    </div>
                    <div style={{fontSize:13,color:'var(--text-muted)'}}>{a.description}</div>
                    {a.category && <span className="tag" style={{marginTop:8,display:'inline-block'}}>{a.category.replace(/-/g,' ')}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {data?.cachedAt && <div style={{marginTop:12,fontSize:11,color:'var(--text-dim)',textAlign:'right'}}>Cached at {new Date(data.cachedAt).toLocaleTimeString()}</div>}
      </div>
    </div>
  );
}
