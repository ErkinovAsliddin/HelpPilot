import { useState } from 'react';

const SECTIONS = [
  { id: 'why-multimodel', label: '🤖 Multi-Model Strategy' },
  { id: 'confidence',     label: '🎯 Confidence Score' },
  { id: 'resilience',    label: '🛡 Resilience & Retry' },
  { id: 'mcp',           label: '🔌 MCP Integration' },
  { id: 'limitations',   label: '⚠️ Limitations & Roadmap' },
];

export default function DocsPage() {
  const [active, setActive] = useState('why-multimodel');

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>📚 Technical Documentation</h1>
          <p>Architecture decisions, design tradeoffs, and engineering notes</p>
        </div>
        <span className="ai-badge">Hackathon Track 4</span>
      </div>

      <div className="page" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'start' }}>
        <div className="card" style={{ position: 'sticky', top: 80 }}>
          <div className="card-body" style={{ padding: 12 }}>
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setActive(s.id)} style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px',
                borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                background: active === s.id ? 'rgba(99,102,241,.15)' : 'transparent',
                color: active === s.id ? '#a5b4fc' : 'var(--text-muted)',
                marginBottom: 2, transition: 'all .15s',
              }}>{s.label}</button>
            ))}
          </div>
        </div>

        <div>
          {active === 'why-multimodel' && <MultiModelSection />}
          {active === 'confidence'     && <ConfidenceSection />}
          {active === 'resilience'     && <ResilienceSection />}
          {active === 'mcp'            && <MCPSection />}
          {active === 'limitations'    && <LimitationsSection />}
        </div>
      </div>
    </div>
  );
}

// ── Section components ────────────────────────────────────────────────────────

function MultiModelSection() {
  return (
    <DocSection title="🤖 Why a Multi-Model Approach?" badge="Cost × Quality tradeoff">
      <P>HelpPilot uses two Qwen Cloud models in the same pipeline, each chosen for a specific job:</P>
      <Table rows={[
        ['Task', 'Model', 'Why'],
        ['Ticket classification', 'qwen-turbo', 'Structured extraction task. 5–10× faster and fraction of the cost. Speed matters here — classification happens before the user sees any response.'],
        ['Emotion analysis', 'qwen-turbo', 'Same rationale: scoring frustration/urgency/churn is a structured JSON extraction. Fast + cheap wins.'],
        ['Response drafting', 'qwen-plus', 'Quality matters here — the draft is what the customer reads. qwen-plus produces more coherent, empathetic responses.'],
        ['Image OCR', 'qwen-vl-max', 'Vision capability only available in qwen-vl-max. Used for screenshot attachments.'],
        ['KB embeddings', 'text-embedding-v3', 'Dedicated embedding model for semantic similarity search.'],
      ]} />
      <Callout color="#6366f1">
        <strong>Key insight:</strong> Using qwen-plus for every call would increase costs 10× with no benefit for structured tasks. Using qwen-turbo for drafting reduces quality where it matters most. The split is deliberate.
      </Callout>
    </DocSection>
  );
}

function ConfidenceSection() {
  return (
    <DocSection title="🎯 How Confidence Score is Calculated" badge="Trust Dial signal">
      <P>The confidence score (0–100) drives every Trust Dial routing decision. It is a <strong>composite signal</strong> — not a single number from one source.</P>

      <H3>Inputs to the score</H3>
      <Table rows={[
        ['Signal', 'Weight', 'Description'],
        ['Model self-assessment', 'Primary', 'qwen-plus is instructed to return a confidence estimate (0–100) as part of its JSON output, based on how specific, complete, and unambiguous the ticket information is.'],
        ['KB similarity score', 'Primary', 'ChromaDB vector search returns cosine similarity. High match (>0.85) means the KB has a proven answer. This is the strongest positive signal.'],
        ['kb_confidence_multiplier', 'Modifier', 'Each KB entry tracks success_count / (success_count + failure_count). High-performing articles boost confidence; low-performing ones reduce it.'],
        ['Ticket ambiguity flag', 'Penalty', 'If the ClassifierAgent flags human-review (vague/unclear ticket), a confidence penalty is applied before routing.'],
        ['Priority override', 'Hard rule', 'critical priority tickets always route to pending_approval regardless of confidence.'],
      ]} />

      <H3>Routing thresholds (Trust Dial — Threshold mode)</H3>
      <Table rows={[
        ['Confidence range', 'Action', 'Explanation'],
        ['> 85%', 'auto_resolve', 'AI sends response immediately (if Trust Dial allows and not critical)'],
        ['60–85%', 'pending_approval', 'Human reviews draft before sending'],
        ['< 60%', 'Clarification → escalate', 'Agent asks one clarifying question first; if still low confidence, escalates'],
        ['0% (KB failure)', 'Always escalate', 'Never draft without a KB match — safety rule'],
      ]} />

      <H3>Worked examples</H3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {[
          {
            label: 'Ticket A — Auto-resolved',
            color: '#10b981',
            detail: '"Cannot login — VPN password expired" → KB match: 0.91 similarity · Model confidence: 88 · Priority: medium · kb_multiplier: 1.0 → Composite: 89 → Trust Dial threshold 75% → auto_resolve ✓',
          },
          {
            label: 'Ticket B — Routed to human',
            color: '#f59e0b',
            detail: '"Something is broken with my computer" → KB match: 0.43 (low similarity) · Model confidence: 62 · Ambiguity penalty: -8 → Composite: 54 → Below threshold → pending_approval',
          },
          {
            label: 'Ticket C — Critical override',
            color: '#ef4444',
            detail: '"Entire network is down, all 200 users affected" → Model confidence: 91 · Priority: critical → Hard override → pending_approval regardless of score',
          },
        ].map(ex => (
          <div key={ex.label} style={{ padding: '12px 14px', borderRadius: 10, background: `${ex.color}08`, border: `1px solid ${ex.color}22` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: ex.color, marginBottom: 4 }}>{ex.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{ex.detail}</div>
          </div>
        ))}
      </div>

      <Callout color="#6366f1">
        <strong>Trust Dial interaction:</strong> Admins can raise or lower thresholds per category. Setting "network-issue" to 90% means only very high-confidence network answers auto-resolve. This lets experienced admins tune autonomy based on actual observed accuracy.
      </Callout>
    </DocSection>
  );
}

function ResilienceSection() {
  return (
    <DocSection title="🛡 Resilience, Retry & Fallback Architecture" badge="Production-readiness">
      <P>HelpPilot is designed to <strong>never fail silently</strong>. Every Qwen API failure is caught, retried, escalated, or routed to a human — in that order.</P>

      <H3>Retry Policy (exponential backoff)</H3>
      <Table rows={[
        ['Attempt', 'Delay', 'Total elapsed'],
        ['1st (initial)', 'Immediate', '0s'],
        ['2nd retry', '1 second', '1s'],
        ['3rd retry', '2 seconds', '3s'],
        ['4th retry', '4 seconds', '7s'],
        ['Give up', '—', 'Fallback chain triggers'],
      ]} />
      <P>Applied to: all Qwen API calls (ClassifierAgent, EmotionAnalyzerAgent, ResolverAgent, KBSearcher embeddings). Implemented in <code style={{background:'rgba(99,102,241,.1)',padding:'1px 6px',borderRadius:3,fontSize:12}}>dist/utils/retry.js</code> using exponential backoff with ±10% jitter.</P>

      <H3>Fallback Chain</H3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0', flexWrap: 'wrap' }}>
        {[
          ['qwen-plus (primary)', '#10b981'],
          ['→ fails after 3 retries', '#6b7280'],
          ['qwen-turbo (fallback)', '#f59e0b'],
          ['→ also fails', '#6b7280'],
          ['Simulation mode', '#ef4444'],
          ['→ route to always_ask', '#6b7280'],
          ['Human review ✓', '#6366f1'],
        ].map(([label, color]) => (
          <span key={label} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${color}12`, border: `1px solid ${color}33`, color: color as string }}>{label}</span>
        ))}
      </div>
      <P>The fallback from qwen-plus to qwen-turbo produces a slightly shorter, less nuanced response — degraded but functional. The ticket still gets handled; it just goes to human review instead of auto-resolving.</P>

      <H3>Circuit Breaker</H3>
      <P>A circuit breaker (<code style={{background:'rgba(99,102,241,.1)',padding:'1px 6px',borderRadius:3,fontSize:12}}>dist/utils/circuitBreaker.js</code>) wraps all qwen-plus calls:</P>
      <Table rows={[
        ['State', 'Trigger', 'Behavior'],
        ['CLOSED', 'Normal operation', 'All calls pass through normally'],
        ['OPEN', '5 consecutive failures', 'Fail-fast (no API calls). Forces ALL ticket categories to always_ask mode. Logs one health alert.'],
        ['HALF_OPEN', '60s after OPEN', 'Sends 2 probe calls. On success: closes circuit + restores routing. On failure: back to OPEN.'],
      ]} />

      <H3>System Health Indicator</H3>
      <P>The sidebar shows a live status badge that reads directly from the circuit breaker state:</P>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {[['● AI healthy','#10b981'],['◐ AI degraded','#f59e0b'],['⚠ Fallback active','#f97316'],['○ AI unavailable','#ef4444']].map(([l,c])=>(
          <span key={l} style={{padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:700,background:`${c}12`,border:`1px solid ${c}33`,color:c as string}}>{l}</span>
        ))}
      </div>
      <P>Also exposed via <code style={{background:'rgba(99,102,241,.1)',padding:'1px 6px',borderRadius:3,fontSize:12}}>GET /api/system/health</code> for programmatic monitoring.</P>

      <Callout color="#ef4444">
        <strong>Fail-safe guarantee:</strong> When the circuit opens, HelpPilot never drops a ticket or sends a bad AI response. Every ticket goes to a human. The system degrades gracefully, with a visible status indicator, never silently.
      </Callout>
    </DocSection>
  );
}

function MCPSection() {
  return (
    <DocSection title="🔌 MCP Integration — Slack" badge="Model Context Protocol">
      <P>HelpPilot integrates with Slack using the <strong>Model Context Protocol (MCP)</strong> — a standard for AI agents to call external tools with typed inputs and outputs. This is a first-class pipeline integration, not just a webhook call.</P>

      <H3>Why MCP instead of a direct API call?</H3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {[
          ['🏠 Workflow-native', 'IT admins live in Slack. Forcing them to open a new dashboard creates friction. MCP brings the approval workflow to where they already are — they see the draft, click Approve, and never leave Slack.'],
          ['📐 Typed contract', 'The tool schema defines exactly what inputs the agent must provide (ticketId, draftResponse, confidenceScore) and what comes back. This prevents silent failures and enables testing.'],
          ['🔄 Swappable', 'Replacing Slack with Teams, Linear, or email is a tool configuration change, not a code change. The agent just calls a different tool with the same MCP interface.'],
          ['📋 Auditable', 'Every MCP tool invocation is logged with inputs/outputs — giving a complete audit trail of what the agent sent, when, and what the human decided.'],
        ].map(([title, desc]) => (
          <div key={title as string} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(99,102,241,.05)', border: '1px solid rgba(99,102,241,.12)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', marginBottom: 3 }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>

      <H3>Pipeline integration point</H3>
      <P>The MCP call happens inside <code style={{background:'rgba(99,102,241,.1)',padding:'1px 6px',borderRadius:3,fontSize:12}}>PipelineOrchestrator</code> immediately after a ticket reaches <code style={{background:'rgba(99,102,241,.1)',padding:'1px 6px',borderRadius:3,fontSize:12}}>pending-approval</code>:</P>
      <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(0,0,0,.25)', border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: 12, color: '#a5b4fc', lineHeight: 1.7, marginBottom: 16 }}>
        Resolver → action=pending_approval<br/>
        └── updateTicket(status=pending-approval)<br/>
        └── bus.emit('ticket.draft_ready')<br/>
        └── <strong style={{color:'#10b981'}}>slackMCP.callTool('slack_notify_hitl', &#123;ticketId, draft, confidence…&#125;)</strong><br/>
        └── Slack: Posts Approve/Edit/Reject buttons to channel<br/>
        └── Admin clicks → HelpPilot dashboard for final action
      </div>

      <H3>Available MCP tools</H3>
      <Table rows={[
        ['Tool name', 'Triggered by', 'Slack payload'],
        ['slack_notify_hitl', 'Ticket reaches pending-approval', 'Subject, AI draft, confidence score, Approve/Edit/Reject buttons linking to dashboard'],
        ['slack_notify_incident', 'PredictionEngine: 5+ users same error', 'Error signature, affected count, suggested fix, Approve & Notify Users button'],
        ['slack_notify_anomaly', 'AnomalyDetector: critical pattern', 'Anomaly title, severity badge, description'],
      ]} />

      <P>Browse full tool schemas: <code style={{color:'#a5b4fc'}}>GET /api/mcp/tools</code></P>

      <Callout color="#6366f1">
        <strong>Configuration:</strong> Add <code style={{background:'rgba(99,102,241,.1)',padding:'1px 6px',borderRadius:3,fontSize:12}}>SLACK_WEBHOOK_URL=https://hooks.slack.com/…</code> to .env to activate. Without it, all MCP calls are logged as "simulated" — the pipeline still works, just without Slack notifications.
      </Callout>
    </DocSection>
  );
}

function LimitationsSection() {
  return (
    <DocSection title="⚠️ Current Limitations & Roadmap" badge="Honest scope assessment">
      <P>HelpPilot was built under hackathon conditions. Here's what's real, what's simulated, and what would be built next.</P>

      <H3 color="#f87171">Current limitations</H3>
      <Table rows={[
        ['Area', 'Current state', 'Production fix'],
        ['ChromaDB', 'Optional — KB search falls back to Brave API if unavailable', 'Deploy ChromaDB on Alibaba Cloud ECS alongside the app'],
        ['Gmail MCP', 'Simulated (no live Gmail polling)', 'Wire imap/mailparser ingestion with real Gmail OAuth credentials'],
        ['Calendar MCP', 'Simulated — no live Google Calendar writes', 'Add googleapis SDK + service account for calendar event creation'],
        ['Slack MCP', 'Real implementation — requires SLACK_WEBHOOK_URL in .env', 'Add Slack Bot API for threaded replies and reaction-based approvals'],
        ['SQLite', 'Single-file database — fine for demo', 'Replace with PostgreSQL on Alibaba Cloud RDS for multi-instance'],
        ['Auth', 'Simple API key — no user management', 'Add JWT auth with per-user Trust Dial settings and audit logs'],
      ]} />

      <H3 color="#34d399">Roadmap (priority order)</H3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          ['1','Live Gmail polling','Complete email→ticket→pipeline→reply end-to-end','#6366f1'],
          ['2','Multi-tenant auth','Each admin gets their own Trust Dial config and audit log','#8b5cf6'],
          ['3','KB feedback loop tuning','Expose success/failure rates in UI so admins see which KB articles underperform','#0ea5e9'],
          ['4','Streaming Resolver','Stream qwen-plus token-by-token for real-time draft generation UX','#10b981'],
          ['5','Alibaba Cloud deployment','ECS + RDS + OSS for file storage + CloudMonitor for health dashboard','#f59e0b'],
        ].map(([n,title,desc,color]) => (
          <div key={n} style={{ display:'flex',gap:12,padding:'12px 14px',borderRadius:10,background:'#111827',border:'1px solid var(--border)' }}>
            <div style={{ width:28,height:28,borderRadius:8,background:`${color}18`,border:`1px solid ${color}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:color as string,flexShrink:0 }}>{n}</div>
            <div>
              <div style={{ fontSize:13,fontWeight:700,color:'#e5e7eb',marginBottom:2 }}>{title}</div>
              <div style={{ fontSize:12,color:'#6b7280' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </DocSection>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function DocSection({ title, badge, children }: { title: string; badge: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{title}</div>
        <span style={{ fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10,background:'rgba(99,102,241,.12)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,.2)' }}>{badge}</span>
      </div>
      <div className="card-body" style={{ fontSize:14,color:'var(--text-muted)',lineHeight:1.7 }}>{children}</div>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ marginBottom: 14 }}>{children}</p>;
}

function H3({ children, color = '#a5b4fc' }: { children: React.ReactNode; color?: string }) {
  return <h3 style={{ fontSize:14,fontWeight:700,color,margin:'20px 0 10px' }}>{children}</h3>;
}

function Table({ rows }: { rows: string[][] }) {
  const [header, ...body] = rows;
  return (
    <div className="table-wrap" style={{ marginBottom: 16 }}>
      <table>
        <thead><tr>{header!.map((h,i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>
          {body.map((row,i) => (
            <tr key={i} style={{ cursor:'default' }}>
              {row.map((cell,j) => <td key={j} style={{ fontSize:13,color:j===0?'#e5e7eb':'var(--text-muted)' }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{ padding:'12px 16px',borderRadius:10,background:`${color}08`,border:`1px solid ${color}25`,marginTop:16,fontSize:13,color:'var(--text-muted)',lineHeight:1.6 }}>
      {children}
    </div>
  );
}
