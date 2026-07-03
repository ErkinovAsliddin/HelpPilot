import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.ts';

export default function ClustersPage() {
  const [data, setData] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = () => apiClient.get('/clusters').then(r => setData(r.data)).catch(()=>{});
    load(); const id = setInterval(load, 15000); return () => clearInterval(id);
  }, []);

  const clusters = data?.clusters || [];

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>🔗 Ticket Clusters</h1>
          <p>Similar tickets grouped together — early incident detection signal</p>
        </div>
        <span className="ai-badge">Early Signal</span>
      </div>

      <div className="page">
        {clusters.length === 0 ? (
          <div className="empty"><div className="empty-icon">🔗</div><div className="empty-title">No clusters detected</div><div style={{fontSize:13}}>Clusters appear when 2+ open tickets share similar keywords or category</div></div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {clusters.map((c:any) => (
              <div key={c.id} className="card" style={{border: c.possibleIncident ? '1px solid rgba(249,115,22,.3)' : undefined}}>
                <div className="card-header">
                  <div className="card-title" style={{gap:10}}>
                    <span>{c.count >= 5 ? '🚨' : c.count >= 3 ? '⚠️' : '🔗'}</span>
                    <span style={{textTransform:'capitalize'}}>{c.category.replace(/-/g,' ')} — "{c.keyword}"</span>
                    <span style={{padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:700,
                      background: c.severity==='critical'?'rgba(239,68,68,.15)':c.severity==='high'?'rgba(249,115,22,.15)':'rgba(245,158,11,.15)',
                      color: c.severity==='critical'?'#f87171':c.severity==='high'?'#fb923c':'#fcd34d',
                    }}>{c.count} tickets</span>
                    {c.possibleIncident && <span className="badge pending-approval">⚡ Possible Incident</span>}
                  </div>
                  {c.hasCritical && <span className="badge escalated">Has Critical</span>}
                </div>
                <div className="card-body" style={{paddingTop:8}}>
                  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                    {c.tickets.map((t:any) => (
                      <div key={t.id} onClick={() => navigate(`/tickets/${t.id}`)} style={{cursor:'pointer',padding:'8px 12px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,fontSize:12,transition:'all .15s'}}
                        onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--primary)')}
                        onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--border)')}>
                        <div style={{fontWeight:600,marginBottom:2}}>{t.subject.slice(0,40)}{t.subject.length>40?'…':''}</div>
                        <div style={{display:'flex',gap:6,alignItems:'center'}}>
                          <span className={`priority-badge ${t.priority||'medium'}`} style={{fontSize:9,padding:'1px 6px'}}>{t.priority}</span>
                          <span className={`badge ${t.status}`} style={{fontSize:9}}>{t.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {c.possibleIncident && (
                    <div style={{marginTop:12,padding:'8px 12px',background:'rgba(249,115,22,.08)',borderRadius:6,fontSize:12,color:'#fb923c',border:'1px solid rgba(249,115,22,.2)'}}>
                      ⚡ <strong>{c.count} similar tickets</strong> suggest a potential systemic issue. Consider opening an incident in the Incidents dashboard.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
