import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../api/client.ts';

export default function SummaryPage() {
  const [text, setText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const [ctx, setCtx] = useState<any>(null);
  const esRef = useRef<EventSource | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiClient.get('/summary/context').then(r => setCtx(r.data)).catch(() => {});
  }, []);

  // Auto-scroll as content streams
  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [text]);

  const generate = () => {
    if (streaming) { esRef.current?.close(); setStreaming(false); return; }
    setText(''); setDone(false); setStreaming(true);

    const key = sessionStorage.getItem('apiKey') || '';
    const es = new EventSource(`/api/summary/daily?key=${encodeURIComponent(key)}`);
    esRef.current = es;

    es.onmessage = (evt) => {
      if (evt.data === '[DONE]') { setStreaming(false); setDone(true); es.close(); return; }
      try {
        const d = JSON.parse(evt.data);
        if (d.text) setText(prev => prev + d.text);
      } catch {}
    };

    es.onerror = () => { setStreaming(false); es.close(); };
  };

  // Simple markdown renderer
  const renderMarkdown = (raw: string) => {
    const lines = raw.split('\n');
    const els: React.ReactNode[] = [];
    let key = 0;

    for (const line of lines) {
      if (line.startsWith('## ')) {
        els.push(<h2 key={key++} style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, marginTop: 8, background: 'linear-gradient(135deg,#f9fafb,#a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{line.slice(3)}</h2>);
      } else if (line.startsWith('### ')) {
        els.push(<h3 key={key++} style={{ fontSize: 15, fontWeight: 700, color: '#a5b4fc', marginBottom: 10, marginTop: 20, borderLeft: '3px solid #6366f1', paddingLeft: 10 }}>{line.slice(4)}</h3>);
      } else if (line.startsWith('- ')) {
        const content = line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        els.push(<div key={key++} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <span style={{ color: '#6366f1', flexShrink: 0 }}>›</span>
          <span dangerouslySetInnerHTML={{ __html: content }} />
        </div>);
      } else if (line.trim()) {
        const content = line.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text)">$1</strong>');
        els.push(<p key={key++} style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 8 }} dangerouslySetInnerHTML={{ __html: content }} />);
      } else {
        els.push(<div key={key++} style={{ height: 8 }} />);
      }
    }
    return els;
  };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>📋 Daily Summary Agent</h1>
          <p>Qwen AI generates a live summary of today's helpdesk activity · perfect for end-of-day briefings</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="ai-badge">qwen-plus · streaming</span>
          <button className={`btn ${streaming ? 'btn-danger' : 'btn-primary'}`} onClick={generate}>
            {streaming ? '⏹ Stop' : done ? '🔄 Regenerate' : '⚡ Generate Summary'}
          </button>
        </div>
      </div>

      <div className="page">
        {/* Live context stats */}
        {ctx && (
          <div className="metrics-grid" style={{ marginBottom: 24 }}>
            <div className="metric-card indigo"><div className="metric-glow"></div><div className="metric-icon">🎫</div><div className="metric-value">{ctx.today.total}</div><div className="metric-label">Today's Tickets</div></div>
            <div className="metric-card green"><div className="metric-glow"></div><div className="metric-icon">🤖</div><div className="metric-value">{ctx.today.autoRate}%</div><div className="metric-label">Auto-Resolution</div></div>
            <div className="metric-card orange"><div className="metric-glow"></div><div className="metric-icon">⏳</div><div className="metric-value">{ctx.today.pending}</div><div className="metric-label">Pending</div></div>
            <div className="metric-card red"><div className="metric-glow"></div><div className="metric-icon">🔺</div><div className="metric-value">{ctx.today.criticalCount}</div><div className="metric-label">Critical</div></div>
            <div className="metric-card yellow"><div className="metric-glow"></div><div className="metric-icon">⚡</div><div className="metric-value">{ctx.today.avgResolutionSec}s</div><div className="metric-label">Avg Resolution</div></div>
            <div className="metric-card sky"><div className="metric-glow"></div><div className="metric-icon">🎯</div><div className="metric-value">{ctx.today.avgConfidence}%</div><div className="metric-label">Avg Confidence</div></div>
            <div className="metric-card purple"><div className="metric-glow"></div><div className="metric-icon">💰</div><div className="metric-value">{ctx.session.costSaved}</div><div className="metric-label">Cost Saved</div></div>
            <div className="metric-card teal"><div className="metric-glow"></div><div className="metric-icon">📚</div><div className="metric-value">{ctx.session.solutionsLearned}</div><div className="metric-label">KB Learned</div></div>
          </div>
        )}

        {/* Main summary area */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              {streaming && <span className="spinner" style={{ width: 14, height: 14 }}></span>}
              {!streaming && !done && <span>📝</span>}
              {done && <span>✅</span>}
              <span>AI Summary Report</span>
              {ctx && <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 400 }}>{ctx.date}</span>}
            </div>
            {done && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  const blob = new Blob([text], { type: 'text/markdown' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = `helppilot-summary-${new Date().toISOString().slice(0,10)}.md`;
                  a.click();
                }}>⬇ Export .md</button>
                <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(text)}>📋 Copy</button>
              </div>
            )}
          </div>
          <div className="card-body">
            {!text && !streaming && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: 52, marginBottom: 16, opacity: 0.5 }}>📋</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Daily Summary Agent</div>
                <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                  Click "Generate Summary" to have Qwen AI analyze today's ticket data and produce a comprehensive briefing — streamed in real-time.
                </div>
                <button className="btn btn-primary" onClick={generate} style={{ padding: '12px 28px', fontSize: 15 }}>
                  ⚡ Generate Daily Summary
                </button>
              </div>
            )}

            {(text || streaming) && (
              <div ref={boxRef} style={{ maxHeight: 560, overflowY: 'auto', paddingRight: 8 }}>
                {renderMarkdown(text)}
                {streaming && (
                  <span style={{ display: 'inline-block', width: 8, height: 16, background: '#6366f1', borderRadius: 2, animation: 'cursorBlink 0.8s step-end infinite', verticalAlign: 'middle' }} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Category breakdown */}
        {ctx && Object.keys(ctx.today.byCategory).length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <div className="card">
              <div className="card-header"><div className="card-title">🏷 By Category</div></div>
              <div className="card-body">
                {Object.entries(ctx.today.byCategory).sort((a: any, b: any) => b[1] - a[1]).map(([cat, count]: any) => (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', flex: 1, textTransform: 'capitalize' }}>{cat.replace(/-/g, ' ')}</div>
                    <div style={{ flex: 2 }}>
                      <div className="progress">
                        <div className="progress-bar indigo" style={{ width: `${ctx.today.total > 0 ? (count / ctx.today.total) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, minWidth: 20, textAlign: 'right' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">🔺 By Priority</div></div>
              <div className="card-body">
                {['critical', 'high', 'medium', 'low'].filter(p => ctx.today.byPriority[p]).map(p => (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span className={`priority-badge ${p}`} style={{ minWidth: 70 }}>{p}</span>
                    <div style={{ flex: 2 }}>
                      <div className="progress">
                        <div className={`progress-bar ${p === 'critical' || p === 'high' ? 'red' : p === 'medium' ? 'yellow' : 'green'}`}
                          style={{ width: `${ctx.today.total > 0 ? ((ctx.today.byPriority[p] || 0) / ctx.today.total) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, minWidth: 20, textAlign: 'right' }}>{ctx.today.byPriority[p] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        `}</style>
      </div>
    </div>
  );
}
