import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../hooks/useTickets.ts';
import { useMetrics } from '../hooks/useMetrics.ts';

interface Props { filterStatus?: string; }

export default function TicketListPage({ filterStatus }: Props) {
  const navigate = useNavigate();
  const { tickets, loading } = useTickets();
  const metrics = useMetrics(tickets);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('received_at');

  const filtered = tickets
    .filter(t => !filterStatus || t.status === filterStatus)
    .filter(t => !search || (t.subject||'').toLowerCase().includes(search.toLowerCase()) || t.id.includes(search))
    .sort((a,b) => {
      if (sortBy === 'received_at') return new Date(b.received_at).getTime() - new Date(a.received_at).getTime();
      if (sortBy === 'priority') { const p=['critical','high','medium','low']; return p.indexOf(a.priority||'low')-p.indexOf(b.priority||'low'); }
      return 0;
    });

  const title = filterStatus === 'pending-approval' ? '⚡ Pending Approvals' : '📋 Tickets';
  const subtitle = filterStatus === 'pending-approval' ? 'Tickets awaiting your review' : 'All support tickets';

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">{title}</div>
          <div className="topbar-subtitle">{subtitle}</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input className="form-input" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search tickets…" style={{width:200,padding:'7px 12px'}} />
          <select className="form-input" value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{width:'auto',padding:'7px 12px'}}>
            <option value="received_at">Newest first</option>
            <option value="priority">By priority</option>
          </select>
        </div>
      </div>

      <div className="page">
        {!filterStatus && (
          <div className="metrics-grid">
            <div className="metric-card indigo"><div className="metric-value">{metrics.totalProcessed}</div><div className="metric-label">Total Tickets</div></div>
            <div className="metric-card green"><div className="metric-value">{metrics.autoResolutionRate.toFixed(1)}%</div><div className="metric-label">Auto-Resolved</div></div>
            <div className="metric-card orange"><div className="metric-value">{tickets.filter(t=>t.status==='pending-approval').length}</div><div className="metric-label">Pending Approval</div></div>
            <div className="metric-card yellow"><div className="metric-value">{metrics.avgConfidenceScore.toFixed(0)}</div><div className="metric-label">Avg Confidence</div></div>
            <div className="metric-card sky"><div className="metric-value">{metrics.avgResponseTime.toFixed(0)}s</div><div className="metric-label">Avg Response Time</div></div>
          </div>
        )}

        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {loading ? (
            <div style={{padding:40,textAlign:'center'}}><div className="spinner" style={{margin:'0 auto'}}></div></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">{search ? 'No matching tickets' : filterStatus ? 'No pending approvals' : 'No tickets yet'}</div>
              <div className="empty-state-desc">{!filterStatus && 'Submit a ticket to get started.'}</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Priority</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Confidence</th>
                    <th>Received</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}>
                      <td>
                        <div style={{fontWeight:600,marginBottom:2}}>{t.subject||'(no subject)'}</div>
                        <div style={{fontSize:11,color:'var(--text-dim)',fontFamily:'monospace'}}>{t.id.slice(0,12)}…</div>
                      </td>
                      <td><span className={`badge-priority ${t.priority||'low'}`}>{t.priority||'—'}</span></td>
                      <td style={{color:'var(--text-muted)'}}>{t.category||'—'}</td>
                      <td><span className={`badge-status ${t.status}`}>{t.status}</span></td>
                      <td>
                        {t.confidence_score != null ? (
                          <div>
                            <div style={{fontSize:12,fontWeight:700,marginBottom:3,color:t.confidence_score>85?'var(--success)':t.confidence_score>60?'var(--warning)':'var(--danger)'}}>
                              {t.confidence_score.toFixed(0)}%
                            </div>
                            <div className="progress" style={{width:60}}>
                              <div className={`progress-bar ${t.confidence_score>85?'green':t.confidence_score>60?'':'red'}`} style={{width:`${t.confidence_score}%`}}/>
                            </div>
                          </div>
                        ) : <span style={{color:'var(--text-dim)'}}>—</span>}
                      </td>
                      <td style={{color:'var(--text-dim)',fontSize:12}}>{new Date(t.received_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
