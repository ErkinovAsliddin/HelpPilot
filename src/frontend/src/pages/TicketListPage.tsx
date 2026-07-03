// Features 4 (SLA Warnings) + 7 (Confidence Tooltip in table)
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../hooks/useTickets.ts';
import { useMetrics } from '../hooks/useMetrics.ts';
import { apiClient } from '../api/client.ts';

interface Props { filterStatus?: string; }

interface SLAWarning {
  id: string;
  subject?: string;
  priority: string;
  category?: string;
  timeToBreachMs: number;
  breached: boolean;
  urgencyLevel: 'critical' | 'warning' | 'ok';
  ageMs: number;
  slaMs: number;
}

function useSLAWarnings() {
  const [warnings, setWarnings] = useState<SLAWarning[]>([]);
  const load = useCallback(async () => {
    try {
      const res = await apiClient.get<{ warnings: SLAWarning[] }>('/tickets/sla-warnings');
      setWarnings(res.data.warnings || []);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  return warnings;
}

function Countdown({ ms }: { ms: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = ms - (now - Date.now() + now - now); // ms is relative from when loaded
  // Just use ms directly since it's already relative
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const s = Math.floor((abs % 60000) / 1000);

  const fmt = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;

  if (ms < 0) return <span style={{ color: '#f87171', fontWeight: 700 }}>⚠️ BREACHED {fmt} ago</span>;
  return <span style={{ color: ms < 3600000 ? '#f87171' : '#fcd34d', fontWeight: 700 }}>{fmt} remaining</span>;
}

export default function TicketListPage({ filterStatus }: Props) {
  const navigate = useNavigate();
  const { tickets, loading } = useTickets();
  const metrics = useMetrics(tickets);
  const [search, setSearch] = useState('');
  const slaWarnings = useSLAWarnings();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const filtered = tickets
    .filter(t => !filterStatus || t.status === filterStatus)
    .filter(t => !search || (t.subject || '').toLowerCase().includes(search.toLowerCase()) || t.id.includes(search));

  const isApprovals = filterStatus === 'pending-approval';
  const activeWarnings = slaWarnings.filter(w => w.urgencyLevel !== 'ok');

  // Build a map for row coloring
  const slaMap: Record<string, SLAWarning> = {};
  slaWarnings.forEach(w => { slaMap[w.id] = w; });

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>{isApprovals ? '✅ Pending Approvals' : '📋 Tickets'}</h1>
          <p>{isApprovals ? `${filtered.length} tickets awaiting your decision` : `${filtered.length} total tickets tracked`}</p>
        </div>
        <div className="topbar-actions">
          <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍  Search tickets…" style={{ width: 220, padding: '7px 12px' }} />
          {!isApprovals && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/submit')}>
              + New Ticket
            </button>
          )}
        </div>
      </div>

      <div className="page">
        {/* SLA Warning Banner — Feature 4 */}
        {!bannerDismissed && activeWarnings.length > 0 && (
          <div style={{
            marginBottom: 20, padding: '14px 18px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 12,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#f87171', display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚠️ SLA Alerts — {activeWarnings.length} ticket{activeWarnings.length > 1 ? 's' : ''} need attention
              </div>
              <button onClick={() => setBannerDismissed(true)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activeWarnings.slice(0, 5).map(w => (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => navigate(`/tickets/${w.id}`)}>
                  <span className={`priority-badge ${w.priority}`}>{w.priority}</span>
                  <span style={{ flex: 1, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.subject || '(no subject)'}
                  </span>
                  <Countdown ms={w.timeToBreachMs} />
                </div>
              ))}
            </div>
          </div>
        )}

        {!isApprovals && (
          <div className="metrics-grid">
            <MetricCard color="indigo" icon="🎫" label="Total Tickets" value={metrics.totalProcessed} />
            <MetricCard color="green" icon="⚡" label="Auto-Resolved" value={`${metrics.autoResolutionRate.toFixed(1)}%`} />
            <MetricCard color="orange" icon="⏳" label="Pending" value={tickets.filter(t => t.status === 'pending-approval').length} />
            <MetricCard color="red" icon="🔺" label="Escalated" value={tickets.filter(t => t.status === 'escalated').length} />
            <MetricCard color="sky" icon="⏱" label="Avg Response" value={`${metrics.avgResponseTime.toFixed(0)}s`} />
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <div className="card-title">
              {isApprovals ? '⏳ Awaiting Your Review' : '📋 All Tickets'}
              <span className="tag">{filtered.length}</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Auto-refreshes every 5s</span>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 12px', width: 24, height: 24, borderWidth: 3 }}></div>
              <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Loading tickets…</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">{isApprovals ? '✅' : '📭'}</div>
              <div className="empty-title">{isApprovals ? 'All caught up!' : search ? 'No matching tickets' : 'No tickets yet'}</div>
              <div style={{ fontSize: 13 }}>{!isApprovals && !search && 'Submit a ticket using the button above.'}</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Priority</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>AI Confidence</th>
                    <th>Received</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const score = t.confidence_score;
                    const scoreClass = score != null ? (score > 85 ? 'high' : score > 60 ? 'medium' : 'low') : '';
                    const barClass = score != null ? (score > 85 ? 'green' : score > 60 ? 'yellow' : 'red') : 'indigo';
                    const sla = slaMap[t.id];
                    const rowBorder = sla?.breached ? '3px solid #ef4444' :
                                      sla?.urgencyLevel === 'warning' ? '3px solid #f97316' : undefined;
                    return (
                      <tr key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}
                        style={rowBorder ? { borderLeft: rowBorder } : undefined}>
                        <td style={{ maxWidth: 280 }}>
                          <div style={{ fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.status === 'pending-approval' && <span style={{ marginRight: 6 }}>🔔</span>}
                            {t.subject || '(no subject)'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'monospace' }}>{t.id.slice(0, 14)}…</div>
                        </td>
                        <td><span className={`priority-badge ${t.priority || 'low'}`}>{t.priority || '—'}</span></td>
                        <td style={{ color: 'var(--text-muted)' }}>{t.category ? t.category.replace(/-/g, ' ') : '—'}</td>
                        <td><span className={`badge ${t.status}`}>{t.status}</span></td>
                        <td style={{ width: 100 }}>
                          {score != null ? (
                            <div title={t.confidence_explanation || `Confidence: ${score.toFixed(0)}%`}>
                              <div className={`conf-score conf-${scoreClass}`}>{score.toFixed(0)}%</div>
                              <div className="progress" style={{ width: 70 }}>
                                <div className={`progress-bar ${barClass}`} style={{ width: `${score}%` }} />
                              </div>
                            </div>
                          ) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                        </td>
                        <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                          {new Date(t.received_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ color, icon, label, value }: { color: string; icon: string; label: string; value: any }) {
  return (
    <div className={`metric-card ${color}`}>
      <div className="metric-glow"></div>
      <div className="metric-icon">{icon}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}
