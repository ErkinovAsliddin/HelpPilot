import { useState, useEffect } from 'react';

export default function HealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const r = await fetch('/api/health'); setHealth(await r.json()); }
    catch { setHealth({ status: 'error' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const id = setInterval(load, 10000); return () => clearInterval(id); }, []);

  const statusColor = (s: string) => s === 'healthy' ? '#34d399' : s === 'degraded' || s === 'unconfigured' ? '#fcd34d' : '#f87171';
  const statusIcon = (s: string) => s === 'healthy' ? '✅' : s === 'degraded' || s === 'unconfigured' ? '⚠️' : s === 'unavailable' ? '❌' : '⚙️';

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>💚 System Health</h1>
          <p>Real-time status of all integrated services · refreshes every 10s</p>
        </div>
        {health && (
          <span style={{ fontWeight: 700, color: statusColor(health.status), fontSize: 13 }}>
            {statusIcon(health.status)} Overall: {health.status?.toUpperCase()}
          </span>
        )}
      </div>

      <div className="page">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner" style={{ margin: '0 auto', width: 24, height: 24, borderWidth: 3 }}></div>
          </div>
        ) : health ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="grid-2">
              {/* AI Services */}
              <div className="card">
                <div className="card-header"><div className="card-title">🤖 AI Services</div><span className="ai-badge">Primary Engine</span></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <ServiceRow name="Qwen (qwen-max / qwen-turbo)" status={health.services?.qwen} model={health.services?.qwenModel} />
                  <ServiceRow name="Amazon Bedrock (fallback)" status={health.services?.bedrock} />
                  <div style={{ marginTop: 4, padding: 10, background: 'rgba(99,102,241,.06)', borderRadius: 8, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-dim)' }}>Active engine: </span>
                    <span style={{ fontWeight: 700, color: '#a5b4fc' }}>{health.aiEngine || 'none'}</span>
                    {' · '}
                    <span style={{ color: 'var(--text-dim)' }}>Auto-resolution: </span>
                    <span style={{ fontWeight: 700, color: health.autoResolutionEnabled ? '#34d399' : '#f87171' }}>
                      {health.autoResolutionEnabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Infrastructure */}
              <div className="card">
                <div className="card-header"><div className="card-title">🏗 Infrastructure</div></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <ServiceRow name="SQLite Database" status={health.services?.sqlite} />
                  <ServiceRow name="ChromaDB Vector Store" status={health.services?.chromadb} optional />
                  <ServiceRow name="Email Provider (SMTP)" status={health.services?.email} optional />
                </div>
              </div>
            </div>

            {/* Setup Guide */}
            {(health.services?.qwen === 'unconfigured' || health.services?.qwen === 'error') && (
              <div className="card" style={{ border: '1px solid rgba(245,158,11,.3)' }}>
                <div className="card-header" style={{ borderColor: 'rgba(245,158,11,.2)' }}>
                  <div className="card-title" style={{ color: '#fcd34d' }}>⚙️ Configure Qwen API</div>
                </div>
                <div className="card-body">
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                    <p>To enable AI-powered classification and response generation, add your Qwen API key to <code style={{ background: 'rgba(99,102,241,.1)', padding: '1px 6px', borderRadius: 3 }}>.env</code>:</p>
                    <pre style={{ margin: '12px 0', padding: 14, background: 'rgba(0,0,0,.3)', borderRadius: 8, fontSize: 12, lineHeight: 1.6, color: '#a5b4fc', overflow: 'auto' }}>{`DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxx
QWEN_MODEL=qwen-max
QWEN_FAST_MODEL=qwen-turbo`}</pre>
                    <p>Get your key at: <a href="https://dashscope.aliyuncs.com" target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>dashscope.aliyuncs.com</a></p>
                    <p style={{ marginTop: 8, color: 'var(--text-dim)' }}>Without Qwen, tickets will automatically escalate to human review (safe fallback).</p>
                  </div>
                </div>
              </div>
            )}

            <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'right' }}>
              Last checked: {health.checkedAt ? new Date(health.checkedAt).toLocaleTimeString() : '—'}
            </div>
          </div>
        ) : <div className="alert alert-error">Failed to fetch health data</div>}
      </div>
    </div>
  );
}

function ServiceRow({ name, status, model, optional }: { name: string; status: string; model?: string; optional?: boolean }) {
  const color = status === 'healthy' ? '#34d399' : status === 'degraded' || status === 'unconfigured' ? '#fcd34d' : '#f87171';
  const icon = status === 'healthy' ? '●' : status === 'degraded' || status === 'unconfigured' ? '◐' : '○';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color, fontSize: 10 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 13 }}>{name} {optional && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>(optional)</span>}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.05em' }}>{status || 'unknown'}</span>
        {model && <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{model}</div>}
      </div>
    </div>
  );
}
