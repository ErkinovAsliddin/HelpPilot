// Feature 1: Live Reasoning Trace Visualizer
import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../api/client.ts';

const AGENTS = [
  { id: 'Classifier', label: '🤖 Classifier', key: 'classifier' },
  { id: 'EmotionAnalyzer', label: '💭 EmotionAnalyzer', key: 'emotion' },
  { id: 'KBSearcher', label: '🔍 KBSearcher', key: 'kb' },
  { id: 'Resolver', label: '✍️ Resolver', key: 'resolver' },
  { id: 'Done', label: '✅ Done', key: 'done' },
];

type StepState = 'idle' | 'active' | 'completed';

interface StepInfo {
  agent: string;
  duration?: number;
  output?: string;
  message?: string;
  timestamp?: string;
}

interface TraceTicket {
  ticketId: string;
  subject: string;
  status: string;
  steps: StepInfo[];
}

export default function PipelinePage() {
  const [recentTraces, setRecentTraces] = useState<TraceTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [agentStates, setAgentStates] = useState<Record<string, StepState>>({});
  const [agentTimings, setAgentTimings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    loadRecent();
  }, []);

  const loadRecent = async () => {
    try {
      const res = await apiClient.get<{ traces: TraceTicket[] }>('/pipeline/recent');
      setRecentTraces(res.data.traces || []);
    } catch {}
  };

  const connectSSE = (ticketId: string) => {
    if (esRef.current) { esRef.current.close(); }
    setSteps([]);
    setAgentStates({});
    setAgentTimings({});
    setConnected(true);
    setLoading(true);

    const key = sessionStorage.getItem('apiKey') || '';
    const es = new EventSource(`/api/pipeline/live/${ticketId}?key=${key}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'terminal') {
          setLoading(false);
          setConnected(false);
          es.close();
          // Mark any still-active agents as completed
          setAgentStates(prev => {
            const next = { ...prev };
            AGENTS.forEach(a => { if (next[a.key] === 'active') next[a.key] = 'completed'; });
            next['done'] = 'completed';
            return next;
          });
          return;
        }
        if (data.event === 'reasoning.step' || data.agent) {
          const step: StepInfo = { agent: data.agent || data.agentName || '', duration: data.durationMs, output: data.output, message: data.message, timestamp: data.timestamp || new Date().toISOString() };
          setSteps(prev => [...prev, step]);

          // Update agent states based on step
          const agentKey = mapAgentToKey(step.agent);
          if (agentKey) {
            setAgentStates(prev => {
              const next = { ...prev };
              // Complete previous agents
              const idx = AGENTS.findIndex(a => a.key === agentKey);
              for (let i = 0; i < idx; i++) {
                if (!next[AGENTS[i].key] || next[AGENTS[i].key] === 'active') next[AGENTS[i].key] = 'completed';
              }
              next[agentKey] = step.duration ? 'completed' : 'active';
              return next;
            });
            if (step.duration) {
              setAgentTimings(prev => ({ ...prev, [agentKey]: step.duration! }));
            }
          }
        }
      } catch {}
    };

    es.onerror = () => {
      setLoading(false);
      setConnected(false);
      es.close();
    };
  };

  const replayTrace = (trace: TraceTicket) => {
    setSelectedTicketId(trace.ticketId);
    setSteps([]);
    setAgentStates({});
    setAgentTimings({});

    let i = 0;
    const replay = () => {
      if (i >= trace.steps.length) {
        // Mark done
        setAgentStates(prev => {
          const next = { ...prev };
          AGENTS.forEach(a => { next[a.key] = 'completed'; });
          return next;
        });
        return;
      }
      const step = trace.steps[i++];
      setSteps(prev => [...prev, step]);
      const agentKey = mapAgentToKey(step.agent);
      if (agentKey) {
        setAgentStates(prev => {
          const next = { ...prev };
          const idx = AGENTS.findIndex(a => a.key === agentKey);
          for (let j = 0; j < idx; j++) next[AGENTS[j].key] = 'completed';
          next[agentKey] = 'completed';
          return next;
        });
        if (step.duration) setAgentTimings(prev => ({ ...prev, [agentKey]: step.duration! }));
      }
      setTimeout(replay, 400);
    };
    replay();
  };

  function mapAgentToKey(agent: string): string | null {
    const a = (agent || '').toLowerCase();
    if (a.includes('classif')) return 'classifier';
    if (a.includes('emotion')) return 'emotion';
    if (a.includes('kb') || a.includes('knowledge') || a.includes('search')) return 'kb';
    if (a.includes('resolv') || a.includes('generat')) return 'resolver';
    if (a.includes('done') || a.includes('terminal')) return 'done';
    return null;
  }

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>🔀 Pipeline Visualizer</h1>
          <p>Live reasoning trace for the AI processing pipeline</p>
        </div>
        <div className="topbar-actions">
          {connected && <span className="ai-badge">🔴 LIVE</span>}
        </div>
      </div>

      <div className="page">
        {/* Ticket selector */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title">🎯 Select Ticket to Trace</div>
          </div>
          <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="form-input" style={{ flex: 1, minWidth: 200 }}
              value={selectedTicketId}
              onChange={e => setSelectedTicketId(e.target.value)}
              placeholder="Enter ticket ID for live trace…"
            />
            <button className="btn btn-primary" onClick={() => selectedTicketId && connectSSE(selectedTicketId)} disabled={!selectedTicketId || loading}>
              {loading ? <><span className="spinner" style={{ width: 12, height: 12 }}></span> Connecting…</> : '▶ Live Trace'}
            </button>
            {recentTraces.length > 0 && (
              <select className="form-input" style={{ width: 280 }} onChange={e => {
                const t = recentTraces.find(r => r.ticketId === e.target.value);
                if (t) { setSelectedTicketId(t.ticketId); replayTrace(t); }
              }} defaultValue="">
                <option value="" disabled>Replay recent trace…</option>
                {recentTraces.map(t => (
                  <option key={t.ticketId} value={t.ticketId}>
                    {t.subject?.slice(0, 40) || t.ticketId.slice(0, 16)} ({t.status})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Pipeline diagram */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><div className="card-title">⚡ Pipeline Flow</div></div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', justifyContent: 'center' }}>
              {AGENTS.map((agent, idx) => {
                const state: StepState = agentStates[agent.key] || 'idle';
                return (
                  <div key={agent.key} style={{ display: 'flex', alignItems: 'center' }}>
                    <div className={`pipeline-box pipeline-box-${state}`} style={{
                      padding: '14px 18px',
                      borderRadius: 12,
                      border: `2px solid ${state === 'idle' ? 'var(--border)' : state === 'active' ? '#6366f1' : '#10b981'}`,
                      background: state === 'idle' ? 'rgba(255,255,255,0.02)' : state === 'active' ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.1)',
                      boxShadow: state === 'active' ? '0 0 20px rgba(99,102,241,0.6)' : 'none',
                      animation: state === 'active' ? 'pipelinePulse 1.5s ease-in-out infinite' : 'none',
                      minWidth: 120,
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      opacity: state === 'idle' ? 0.45 : 1,
                    }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>
                        {state === 'active' ? <span className="spinner" style={{ width: 20, height: 20, verticalAlign: 'middle' }}></span> :
                         state === 'completed' ? '✅' : agent.label.split(' ')[0]}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: state === 'active' ? '#a5b4fc' : state === 'completed' ? '#34d399' : 'var(--text-dim)' }}>
                        {agent.label.replace(/^[^ ]+ /, '')}
                      </div>
                      {state === 'completed' && agentTimings[agent.key] && (
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>
                          {agentTimings[agent.key]}ms
                        </div>
                      )}
                    </div>
                    {idx < AGENTS.length - 1 && (
                      <div style={{ padding: '0 8px', color: 'var(--text-dim)', fontSize: 18 }}>→</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live log */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📜 Reasoning Log</div>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{steps.length} steps</span>
          </div>
          <div className="card-body">
            {steps.length === 0 ? (
              <div className="empty" style={{ padding: 40 }}>
                <div className="empty-icon">🔍</div>
                <div className="empty-title">No steps yet</div>
                <div style={{ fontSize: 12 }}>Select a ticket or submit a new one to see the pipeline in action</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
                {steps.map((s, i) => (
                  <div key={i} style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.04)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 700, minWidth: 110, flexShrink: 0 }}>{s.agent || 'Pipeline'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: 'var(--text)' }}>{s.message || (typeof s.output === 'string' ? s.output.slice(0, 100) : JSON.stringify(s.output || {}).slice(0, 100))}</div>
                    </div>
                    {s.duration && <div style={{ fontSize: 10, color: 'var(--success)', flexShrink: 0 }}>{s.duration}ms</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pipelinePulse {
          0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.6); }
          50% { box-shadow: 0 0 35px rgba(99,102,241,0.9), 0 0 60px rgba(99,102,241,0.3); }
        }
      `}</style>
    </div>
  );
}
