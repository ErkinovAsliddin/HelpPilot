import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.ts';

export default function SLAPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = () => apiClient.get('/sla/predictions').then(r => setData(r.data)).catch(()=>{}).finally(()=>setLoading(false));
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const formatTime = (min: number) => {
    if (min <= 0) return 'BREACHED';
    if (min < 60) return `${min}m`;
    return `${Math.floor(min/60)}h ${min%60}m`;
  };

  const preds = data?.predictions || [];
  const breached = preds.filter((p:any) => p.breached);
  const warning  = preds.filter((p:any) => p.warning && !p.breached);
  const healthy  = preds.filter((p:any) => !p.breached && !p.warning && !p.critical);

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>⏱ SLA Monitor</h1>
          <p>Predictive SLA breach warnings · auto-refreshes every 30s</p>
        </div>
        {breached.length > 0 && (
          <div style={{background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.3)',borderRadius:8,padding:'8px 14px',fontSize:13,fontWeight:700,color:'#f87171',animation:'criticalPulse 2s infinite'}}>
            🚨 {breached.length} SLA BREACHED
          </div>
        )}
      </div>

      <div className="page">
        <div className="metrics-grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:24}}>
          <div className="metric-card red"><div className="metric-glow"></div><div className="metric-icon">🚨</div><div className="metric-value">{breached.length}</div><div className="metric-label">SLA Breached</div></div>
          <div className="metric-card orange"><div className="metric-glow"></div><div className="metric-icon">⚠️</div><div className="metric-value">{warning.length}</div><div className="metric-label">Warning (&lt;30min)</div></div>
          <div className="metric-card green"><div className="metric-glow"></div><div className="metric-icon">✅</div><div className="metric-value">{healthy.length}</div><div className="metric-label">On Track</div></div>
        </div>

        {loading ? (
          <div style={{padding:48,textAlign:'center'}}><div className="spinner" style={{margin:'0 auto',width:24,height:24,borderWidth:3}}></div></div>
        ) : preds.length === 0 ? (
          <div className="empty"><div className="empty-icon">✅</div><div className="empty-title">No active tickets to monitor</div></div>
        ) : (
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div className="card-header"><div className="card-title">📋 Active Ticket SLAs</div><span style={{fontSize:11,color:'var(--text-dim)'}}>SLA targets: Critical 30min · High 2h · Medium 8h · Low 24h</span></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Ticket</th><th>Priority</th><th>Age</th><th>SLA Remaining</th><th>Progress</th><th>Status</th></tr></thead>
                <tbody>
                  {preds.map((p:any) => (
                    <tr key={p.id} onClick={() => navigate(`/tickets/${p.id}`)}>
                      <td>
                        <div style={{fontWeight:600,fontSize:13}}>{p.subject || '(no subject)'}</div>
                        <div style={{fontSize:11,color:'var(--text-dim)',fontFamily:'monospace'}}>{p.id.slice(0,12)}…</div>
                      </td>
                      <td><span className={`priority-badge ${p.priority}`}>{p.priority}</span></td>
                      <td style={{color:'var(--text-muted)',fontSize:13}}>{formatTime(p.ageMin)}</td>
                      <td>
                        <span style={{
                          fontWeight:700,fontSize:13,
                          color: p.breached ? 'var(--danger)' : p.critical ? 'var(--danger)' : p.warning ? 'var(--orange)' : 'var(--success)',
                        }}>
                          {formatTime(p.remainingMin)}
                        </span>
                      </td>
                      <td style={{width:120}}>
                        <div className="progress" style={{height:6}}>
                          <div className={`progress-bar ${p.breached||p.critical?'red':p.warning?'':'green'}`}
                            style={{width:`${Math.min(100,p.pctUsed)}%`, background: p.breached?'var(--danger)':p.warning?'var(--orange)':'var(--success)'}} />
                        </div>
                        <div style={{fontSize:10,color:'var(--text-dim)',marginTop:2}}>{p.pctUsed}% of SLA used</div>
                      </td>
                      <td>
                        {p.breached  && <span className="badge escalated">Breached</span>}
                        {p.critical  && !p.breached && <span className="badge escalated">Critical</span>}
                        {p.warning   && !p.breached && !p.critical && <span className="badge pending-approval">Warning</span>}
                        {!p.breached && !p.warning  && !p.critical && <span className="badge resolved">On Track</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
