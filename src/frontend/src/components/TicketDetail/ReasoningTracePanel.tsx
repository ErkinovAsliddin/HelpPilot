// src/frontend/src/components/TicketDetail/ReasoningTracePanel.tsx
import { useState, useEffect } from 'react';

interface AgentStep {
  agentName: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}

export default function ReasoningTracePanel({ ticketId }: { ticketId: string }) {
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const apiKey = sessionStorage.getItem('apiKey') ?? '';
    const es = new EventSource(`/api/tickets/${ticketId}/reasoning`);

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as AgentStep & { event?: string };
        if (data.event === 'terminal') { es.close(); return; }
        if (data.agentName) setSteps((prev) => [...prev, data]);
      } catch {}
    };

    return () => es.close();
  }, [ticketId]);

  if (steps.length === 0) return null;

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 16, marginTop: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <h3 style={{ marginTop: 0 }}>🔍 Reasoning Trace</h3>
      {steps.map((step, i) => (
        <div key={i} style={{ marginBottom: 8, border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{ width: '100%', padding: '10px 12px', textAlign: 'left', background: '#f8fafc', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
          >
            <span style={{ fontWeight: 600, fontSize: 13 }}>{step.agentName}</span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{step.durationMs}ms</span>
          </button>
          {open === i && (
            <div style={{ padding: 12, fontSize: 12, fontFamily: 'monospace', background: '#fff' }}>
              <strong>Outputs:</strong>
              <pre style={{ margin: '4px 0', color: '#374151' }}>{JSON.stringify(step.outputs, null, 2)}</pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
