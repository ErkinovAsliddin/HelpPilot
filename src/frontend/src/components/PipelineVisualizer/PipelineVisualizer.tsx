import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client.ts';

interface AgentStep { agentName: string; durationMs: number; outputs: Record<string,any>; completedAt: string; }
interface Props { ticketId: string; status: string; }

const AGENTS = ['Classifier','EmotionAnalyzer','KBSearcher','Resolver'];
const AGENT_ICONS: Record<string,string> = { Classifier:'🤖', EmotionAnalyzer:'💭', KBSearcher:'🔍', Resolver:'✍️' };
const AGENT_DESC: Record<string,string> = { Classifier:'Category · Priority · Language', EmotionAnalyzer:'Sentiment · Churn Risk', KBSearcher:'KB Articles · Web Fallback', Resolver:'Draft · Confidence' };

export default function PipelineVisualizer({ ticketId, status }: Props) {
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [activeAgent, setActiveAgent] = useState<string|null>(null);
  const [esOpen, setEsOpen] = useState(false);

  const isTerminal = ['resolved','escalated','delivery-failed','pending-approval','pending-clarification'].includes(status);

  useEffect(() => {
    // Try to load stored trace first
    apiClient.get(`/tickets/${ticketId}/reasoning`).then(r => {
      if (r.data.steps) setSteps(r.data.steps);
    }).catch(() => {});

    if (!isTerminal) {
      // Live SSE stream for in-progress tickets
      const es = new EventSource(`/api/tickets/${ticketId}/reasoning`);
      setEsOpen(true);
      es.onmessage = (evt) => {
        try {
          const d = JSON.parse(evt.data);
          if (d.event === 'terminal') { es.close(); setEsOpen(false); setActiveAgent(null); return; }
          if (d.agentName) {
            setActiveAgent(d.agentName);
            setSteps(prev => {
              const existing = prev.findIndex(s => s.agentName === d.agentName);
              if (existing >= 0) { const n=[...prev]; n[existing]=d; return n; }
              return [...prev, d];
            });
          }
        } catch {}
      };
      es.onerror = () => { es.close(); setEsOpen(false); };
      return () => { es.close(); setEsOpen(false); };
    }
  }, [ticketId, isTerminal]);

  const getStepForAgent = (name: string) => steps.find(s => s.agentName === name);
  const isCompleted = (name: string) => !!getStepForAgent(name);
  const isActive = (name: string) => activeAgent === name;
  const isUpcoming = (name: string) => !isCompleted(name) && !isActive(name);

  return (
    <div className="card" style={{marginTop:16}}>
      <div className="card-header">
        <div className="card-title">
          ⚡ Live Pipeline
          {esOpen && <span style={{fontSize:10,color:'var(--success)',fontWeight:400,display:'flex',alignItems:'center',gap:4}}>
            <span className="pulse" style={{width:6,height:6}}></span>streaming
          </span>}
        </div>
        <span style={{fontSize:11,color:'var(--text-dim)'}}>{steps.length}/{AGENTS.length} agents complete</span>
      </div>
      <div className="card-body">
        {/* Pipeline flow */}
        <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:20,overflowX:'auto'}}>
          {AGENTS.map((agent, i) => {
            const step = getStepForAgent(agent);
            const active = isActive(agent);
            const done = isCompleted(agent);
            const upcoming = isUpcoming(agent);
            const color = done ? 'var(--success)' : active ? '#f59e0b' : 'var(--border2)';

            return (
              <div key={agent} style={{display:'flex',alignItems:'center',flex:1}}>
                <div style={{
                  display:'flex',flexDirection:'column',alignItems:'center',flex:1,
                  padding:'10px 6px',borderRadius:10,
                  background: active ? 'rgba(245,158,11,.1)' : done ? 'rgba(16,185,129,.06)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(245,158,11,.3)' : done ? 'rgba(16,185,129,.2)' : 'var(--border)'}`,
                  transition:'all .3s',
                  animation: active ? 'agentPulse 1.5s ease-in-out infinite' : 'none',
                  minWidth:80,
                }}>
                  <div style={{fontSize:22,marginBottom:4}}>
                    {done ? '✅' : active ? '⚙️' : AGENT_ICONS[agent]}
                  </div>
                  <div style={{fontSize:11,fontWeight:700,color: done ? 'var(--success)' : active ? '#fcd34d' : 'var(--text-muted)',textAlign:'center'}}>
                    {agent}
                  </div>
                  <div style={{fontSize:9,color:'var(--text-dim)',textAlign:'center',marginTop:2}}>
                    {AGENT_DESC[agent]}
                  </div>
                  {step && (
                    <div style={{fontSize:10,color:'var(--text-dim)',marginTop:4}}>
                      {step.durationMs}ms
                    </div>
                  )}
                  {active && <span className="spinner" style={{width:10,height:10,marginTop:4}} />}
                </div>
                {i < AGENTS.length - 1 && (
                  <div style={{width:24,height:2,background: done ? 'var(--success)' : 'var(--border)',margin:'0 2px',flexShrink:0,transition:'background .5s'}} />
                )}
              </div>
            );
          })}
        </div>

        {/* Agent outputs */}
        {steps.length > 0 && (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {steps.map(step => (
              <div key={step.agentName} style={{padding:'10px 12px',background:'rgba(0,0,0,.15)',borderRadius:8,border:'1px solid var(--border)'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                  <span style={{fontSize:13}}>{AGENT_ICONS[step.agentName]}</span>
                  <span style={{fontSize:12,fontWeight:700}}>{step.agentName}</span>
                  <span style={{fontSize:10,color:'var(--text-dim)',marginLeft:'auto'}}>{step.durationMs}ms</span>
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {Object.entries(step.outputs || {}).filter(([k]) => !['aiEngine','ticketId'].includes(k)).map(([k,v]) => (
                    <span key={k} style={{fontSize:11,background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.15)',borderRadius:4,padding:'1px 6px',color:'#a5b4fc'}}>
                      {k}: <strong>{String(v).slice(0,30)}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {steps.length === 0 && !esOpen && (
          <div style={{textAlign:'center',padding:'16px 0',fontSize:13,color:'var(--text-dim)'}}>
            Pipeline trace not available for this ticket.
          </div>
        )}
      </div>
      <style>{`@keyframes agentPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.3)}50%{box-shadow:0 0 0 6px transparent}}`}</style>
    </div>
  );
}
