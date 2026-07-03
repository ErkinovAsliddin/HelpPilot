import { useSessionMetrics } from '../hooks/useSessionMetrics.ts';
import { useTickets } from '../hooks/useTickets.ts';
import BurndownChart from '../components/shared/BurndownChart.tsx';

export default function MetricsPage() {
  const metrics = useSessionMetrics();
  const { tickets } = useTickets();

  const byStatus = tickets.reduce((acc: any, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});
  const byCategory = tickets.reduce((acc: any, t) => { if (t.category) acc[t.category] = (acc[t.category] || 0) + 1; return acc; }, {});
  const byPriority = tickets.reduce((acc: any, t) => { if (t.priority) acc[t.priority] = (acc[t.priority] || 0) + 1; return acc; }, {});

  const m = metrics || {} as any;

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>📊 Metrics & Analytics</h1>
          <p>Real-time session performance dashboard</p>
        </div>
        <span className="ai-badge">Live Data</span>
      </div>

      <div className="page">
        {/* Session metrics */}
        <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Session Metrics</div>
        <div className="metrics-grid" style={{ marginBottom: 28 }}>
          <MetricCard color="indigo" icon="🎫" label="Total Processed" value={m.tickets_total ?? 0} />
          <MetricCard color="green" icon="⚡" label="Auto-Resolved" value={m.tickets_auto_resolved ?? 0} />
          <MetricCard color="orange" icon="👤" label="Escalated" value={m.tickets_escalated ?? 0} />
          <MetricCard color="purple" icon="🧠" label="Solutions Learned" value={m.solutions_learned ?? 0} />
          <MetricCard color="sky" icon="🛡" label="Incidents Prevented" value={m.tickets_prevented ?? 0} />
          <MetricCard color="yellow" icon="💛" label="Auto-Resolve %" value={`${m.autoResolutionRate ?? 0}%`} />
          <MetricCard color="teal" icon="⏱" label="Avg Response" value={`${m.avgResolutionTimeSeconds ?? 0}s`} />
          <MetricCard color="red" icon="💰" label="Cost Saved" value={m.estimatedCostSavedUsd ?? '$0.00'} />
        </div>

        <div className="grid-2" style={{ gap: 20 }}>
          {/* By Status */}
          <div className="card">
            <div className="card-header"><div className="card-title">📈 Tickets by Status</div></div>
            <div className="card-body">
              {Object.entries(byStatus).length === 0 ? <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No data yet</div> :
                Object.entries(byStatus).sort((a: any, b: any) => b[1] - a[1]).map(([status, count]: any) => (
                  <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span className={`badge ${status}`} style={{ minWidth: 130 }}>{status}</span>
                    <div style={{ flex: 1 }}>
                      <div className="progress">
                        <div className="progress-bar indigo" style={{ width: `${(count / tickets.length) * 100}%` }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, minWidth: 24, textAlign: 'right' }}>{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* By Category */}
          <div className="card">
            <div className="card-header"><div className="card-title">🏷 Tickets by Category</div></div>
            <div className="card-body">
              {Object.entries(byCategory).length === 0 ? <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No data yet</div> :
                Object.entries(byCategory).sort((a: any, b: any) => b[1] - a[1]).map(([cat, count]: any) => (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 13, flex: 1, color: 'var(--text-muted)' }}>{cat.replace(/-/g, ' ')}</div>
                    <div style={{ flex: 2 }}>
                      <div className="progress">
                        <div className="progress-bar green" style={{ width: `${(count / tickets.length) * 100}%` }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, minWidth: 24, textAlign: 'right' }}>{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* By Priority */}
          <div className="card">
            <div className="card-header"><div className="card-title">🔺 Priority Distribution</div></div>
            <div className="card-body">
              {Object.entries(byPriority).length === 0 ? <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No data yet</div> :
                ['critical', 'high', 'medium', 'low'].filter(p => byPriority[p]).map(p => (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span className={`priority-badge ${p}`} style={{ minWidth: 70 }}>{p}</span>
                    <div style={{ flex: 1 }}>
                      <div className="progress">
                        <div className={`progress-bar ${p === 'critical' ? 'red' : p === 'high' ? 'red' : p === 'medium' ? 'yellow' : 'green'}`}
                          style={{ width: `${((byPriority[p] || 0) / tickets.length) * 100}%` }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, minWidth: 24, textAlign: 'right' }}>{byPriority[p] || 0}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* AI Performance */}
          <div className="card">
            <div className="card-header"><div className="card-title">🤖 AI Performance</div></div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Auto-Resolution Rate', value: m.autoResolutionRate ?? 0, max: 100, unit: '%' },
                  { label: 'Avg Confidence Score', value: (() => { const scored = tickets.filter(t => t.confidence_score != null); return scored.length ? (scored.reduce((s, t) => s + (t.confidence_score || 0), 0) / scored.length) : 0; })(), max: 100, unit: '%' },
                ].map(({ label, value, max, unit }) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <span style={{ fontWeight: 700 }}>{Number(value).toFixed(1)}{unit}</span>
                    </div>
                    <div className="progress" style={{ height: 6 }}>
                      <div className="progress-bar green" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 4, padding: 12, background: 'rgba(99,102,241,.06)', borderRadius: 8, border: '1px solid rgba(99,102,241,.12)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>AI ENGINE</div>
                  <div className="ai-badge" style={{ fontSize: 12, padding: '4px 10px' }}>⚡ Qwen (qwen-max + qwen-turbo)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 9: Burndown Chart */}
        <div style={{ marginTop: 24 }}>
          <BurndownChart tickets={tickets} />
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
