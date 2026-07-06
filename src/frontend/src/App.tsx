import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import RequireAuth from './components/shared/RequireAuth.tsx';
import LoginPage from './pages/LoginPage.tsx';
import TicketListPage from './pages/TicketListPage.tsx';
import TicketDetailPage from './pages/TicketDetailPage.tsx';
import IncidentListPage from './pages/IncidentListPage.tsx';
import SubmitTicketPage from './pages/SubmitTicketPage.tsx';
import MetricsPage from './pages/MetricsPage.tsx';
import HealthPage from './pages/HealthPage.tsx';
import TrustDialPage from './pages/TrustDialPage.tsx';
import SummaryPage from './pages/SummaryPage.tsx';
import AnomalyPage from './pages/AnomalyPage.tsx';
import SLAPage from './pages/SLAPage.tsx';
import ClustersPage from './pages/ClustersPage.tsx';
import MultilingualDemoPage from './pages/MultilingualDemoPage.tsx';
import BurndownPage from './pages/BurndownPage.tsx';
import DocsPage from './pages/DocsPage.tsx';
import WelcomePage from './pages/WelcomePage.tsx';
import HiringPage from './pages/HiringPage.tsx';
import CandidateDetailPage from './pages/CandidateDetailPage.tsx';
import CalendarPage from './pages/CalendarPage.tsx';
import OnboardingFlow from './components/OnboardingFlow/OnboardingFlow.tsx';
import AdminChat from './components/AdminChat/AdminChat.tsx';
import VoiceControl from './components/VoiceControl/VoiceControl.tsx';
import SystemHealthBadge from './components/SystemHealthBadge/SystemHealthBadge.tsx';
import { apiClient } from './api/client.ts';

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const loc = useLocation();
  const [counts, setCounts] = useState({ tickets: 0, pending: 0, incidents: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const [tr, ir] = await Promise.all([
          apiClient.get<{tickets:any[]}>('/tickets?pageSize=100'),
          apiClient.get<{incidents:any[]}>('/incidents'),
        ]);
        const tickets = tr.data.tickets;
        setCounts({
          tickets: tickets.length,
          pending: tickets.filter((t:any) => t.status === 'pending-approval').length,
          incidents: ir.data.incidents.filter((i:any) => i.status === 'draft').length,
        });
      } catch {}
    };
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  if (loc.pathname === '/login') return null;
  if (!sessionStorage.getItem('apiKey')) return null;

  const link = (to: string, icon: string, label: string, badge?: number, badgeClass?: string) => (
    <NavLink to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end={to === '/tickets'}>
      <span className="nav-icon">{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge ? <span className={`nav-badge ${badgeClass || ''}`}>{badge}</span> : null}
    </NavLink>
  );

  return (
    <>
      {/* Mobile overlay */}
      <div className={`sidebar-overlay${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">🤖</div>
          <div className="brand-text">
            <div className="name">HelpPilot</div>
            <div className="tagline">AI Helpdesk Autopilot</div>
          </div>
          {/* Close button on mobile */}
          <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--text-dim)', fontSize:20, cursor:'pointer', padding:'4px 6px', display:'flex', alignItems:'center' }}>✕</button>
        </div>

      <nav className="sidebar-nav">
        <div className="nav-section">Tickets</div>
        {link('/trust-dial', '🎛', 'Trust Dial')}
        {link('/tickets', '📋', 'All Tickets', counts.tickets || undefined, 'purple')}
        {link('/submit', '📩', 'Submit Ticket')}
        {link('/approvals', '✅', 'Approvals', counts.pending || undefined, '')}

        <div className="nav-section">HireFlow</div>
        {link('/hiring', '💼', 'Hiring Pipeline')}
        {link('/calendar', '📅', 'Calendar')}

        <div className="nav-section">Operations</div>
        {link('/summary', '📋', 'Daily Summary')}
        {link('/burndown', '📉', 'Burndown Chart')}
        {link('/anomalies', '🔎', 'Anomaly Detector')}
        {link('/sla', '⏱', 'SLA Monitor')}
        {link('/clusters', '🔗', 'Clusters')}
        {link('/incidents', '⚡', 'Incidents', counts.incidents || undefined)}
        {link('/multilingual', '🌍', 'Multilingual Demo')}
        {link('/metrics', '📊', 'Metrics & Analytics')}

        <div className="nav-section">System</div>
        {link('/health', '💚', 'Health Check')}
        {link('/architecture', '🏗', 'Architecture')}
        {link('/docs', '📚', 'Technical Docs')}
      </nav>

      <div className="sidebar-footer">        <div className="status-bar">
          <div className="pulse"></div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Server · port 3000</span>
          <span className="ai-badge" style={{ marginLeft: 'auto' }}>Qwen</span>
        </div>
        <SystemHealthBadge />
        <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '0 10px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>🎤</span>
          <span>Voice · 💬 Chat · both active</span>
        </div>
        <button className="nav-link" style={{ color: 'var(--text-dim)', fontSize: 12 }}
          onClick={() => { localStorage.removeItem('hasSeenOnboarding'); window.location.href='/trust-dial'; }}>
          <span>🔁</span><span>Replay Intro</span>
        </button>
        <button className="nav-link" style={{ color: 'var(--danger)', width: '100%' }}
          onClick={() => { sessionStorage.removeItem('apiKey'); window.location.href = '/login'; }}>
          <span className="nav-icon">🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
    </>
  );
}

function Shell({ children, showOnboarding, onOnboardingComplete }: { children: React.ReactNode; showOnboarding?: boolean; onOnboardingComplete?: () => void }) {
  const loc = useLocation();
  const isLoggedIn = !!sessionStorage.getItem('apiKey');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loc.pathname === '/login' || loc.pathname === '/welcome') return <>{children}</>;
  return (
    <div className="layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main">
        {/* Mobile topbar with hamburger — hidden on desktop via CSS */}
        <div className="mobile-topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
          <span style={{ fontWeight: 700, fontSize: 15 }}>🤖 HelpPilot</span>
        </div>
        {children}
      </main>
      {isLoggedIn && <VoiceControl />}
      {isLoggedIn && <AdminChat />}
      {isLoggedIn && showOnboarding && <OnboardingFlow onComplete={onOnboardingComplete || (() => {})} />}
    </div>
  );
}

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Show onboarding once per session (not if already seen)
    return !localStorage.getItem('hasSeenOnboarding');
  });

  return (
    <BrowserRouter>
      <Shell showOnboarding={showOnboarding} onOnboardingComplete={() => setShowOnboarding(false)}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/trust-dial" element={<RequireAuth><TrustDialPage /></RequireAuth>} />
          <Route path="/summary" element={<RequireAuth><SummaryPage /></RequireAuth>} />
          <Route path="/burndown" element={<RequireAuth><BurndownPage /></RequireAuth>} />
          <Route path="/anomalies" element={<RequireAuth><AnomalyPage /></RequireAuth>} />
          <Route path="/sla" element={<RequireAuth><SLAPage /></RequireAuth>} />
          <Route path="/clusters" element={<RequireAuth><ClustersPage /></RequireAuth>} />
          <Route path="/multilingual" element={<RequireAuth><MultilingualDemoPage /></RequireAuth>} />
          <Route path="/tickets" element={<RequireAuth><TicketListPage /></RequireAuth>} />
          <Route path="/tickets/:id" element={<RequireAuth><TicketDetailPage /></RequireAuth>} />
          <Route path="/submit" element={<RequireAuth><SubmitTicketPage /></RequireAuth>} />
          <Route path="/approvals" element={<RequireAuth><TicketListPage filterStatus="pending-approval" /></RequireAuth>} />
          <Route path="/incidents" element={<RequireAuth><IncidentListPage /></RequireAuth>} />
          <Route path="/metrics" element={<RequireAuth><MetricsPage /></RequireAuth>} />
          <Route path="/health" element={<RequireAuth><HealthPage /></RequireAuth>} />
          <Route path="/architecture" element={<RequireAuth><ArchitecturePage /></RequireAuth>} />
          <Route path="/docs" element={<RequireAuth><DocsPage /></RequireAuth>} />
          <Route path="/hiring" element={<RequireAuth><HiringPage /></RequireAuth>} />
          <Route path="/hiring/:id" element={<RequireAuth><CandidateDetailPage /></RequireAuth>} />
          <Route path="/calendar" element={<RequireAuth><CalendarPage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/trust-dial" replace />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}

function ArchitecturePage() {
  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>🏗 Architecture</h1>
          <p>HelpPilot system design — Qwen Cloud Hackathon Track 4: Autopilot Agent</p>
        </div>
        <span className="ai-badge">Qwen Cloud</span>
      </div>
      <div className="page" style={{maxWidth:900}}>
        <div className="card">
          <div className="card-body" style={{padding:32}}>
            <svg viewBox="0 0 820 880" style={{width:'100%',height:'auto',display:'block'}} xmlns="http://www.w3.org/2000/svg">
              <defs>
                <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#6366f1"/>
                </marker>
                <style>{`
                  .box{fill:#1e2131;stroke:#2d3148;stroke-width:1.5;rx:8;}
                  .box-primary{fill:rgba(99,102,241,.15);stroke:#6366f1;stroke-width:1.5;}
                  .box-qwen{fill:rgba(16,185,129,.1);stroke:#10b981;stroke-width:1.5;}
                  .box-infra{fill:rgba(245,158,11,.1);stroke:#f59e0b;stroke-width:1.5;}
                  .lbl{font-family:Inter,sans-serif;font-size:13px;fill:#f1f5f9;font-weight:600;}
                  .sub{font-family:Inter,sans-serif;font-size:10px;fill:#9ca3af;}
                  .badge{font-family:Inter,sans-serif;font-size:9px;fill:#a5b4fc;font-weight:700;}
                  .arr{stroke:#6366f1;stroke-width:1.5;fill:none;marker-end:url(#arr);}
                  .sec{font-family:Inter,sans-serif;font-size:11px;fill:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:1px;}
                `}</style>
              </defs>

              {/* Browser */}
              <rect x="260" y="10" width="300" height="60" rx="8" className="box-primary"/>
              <text x="410" y="36" textAnchor="middle" className="lbl">🌐 Browser</text>
              <text x="410" y="54" textAnchor="middle" className="sub">🎤 Voice Input · ✍️ Text Ticket · Admin Dashboard</text>

              {/* Arrow */}
              <line x1="410" y1="70" x2="410" y2="110" className="arr"/>

              {/* Frontend */}
              <rect x="200" y="110" width="420" height="70" rx="8" className="box-primary"/>
              <text x="410" y="135" textAnchor="middle" className="lbl">🖥 HelpPilot Frontend (React + Vite)</text>
              <text x="410" y="152" textAnchor="middle" className="sub">🎛 Trust Dial · 📋 Tickets · ✅ HITL Approvals · 🔍 Incidents · 📊 Metrics · 🏗 Architecture</text>
              <text x="410" y="169" textAnchor="middle" className="badge">Voice Control (Web Speech API → Qwen)</text>

              <line x1="410" y1="180" x2="410" y2="220" className="arr"/>

              {/* Qwen Cloud */}
              <rect x="180" y="220" width="460" height="70" rx="8" className="box-qwen"/>
              <text x="410" y="248" textAnchor="middle" className="lbl" style={{fill:'#34d399'}}>⚡ Qwen Cloud API (dashscope-intl.aliyuncs.com)</text>
              <text x="410" y="266" textAnchor="middle" className="sub">qwen-plus: Classification + Resolution · qwen-turbo: Emotion + Intent</text>
              <text x="410" y="282" textAnchor="middle" className="badge">qwen-vl-max: OCR · text-embedding-v3: KB Embeddings</text>

              <line x1="410" y1="290" x2="410" y2="330" className="arr"/>

              {/* Pipeline */}
              <text x="410" y="348" textAnchor="middle" className="sec">Orchestration Pipeline</text>
              <rect x="30" y="355" width="175" height="64" rx="8" className="box"/>
              <text x="118" y="378" textAnchor="middle" className="lbl" style={{fontSize:12}}>🤖 Classifier</text>
              <text x="118" y="394" textAnchor="middle" className="sub">Category · Priority</text>
              <text x="118" y="410" textAnchor="middle" className="sub">Sentiment · Language</text>

              <rect x="225" y="355" width="175" height="64" rx="8" className="box"/>
              <text x="313" y="378" textAnchor="middle" className="lbl" style={{fontSize:12}}>💭 EmotionAnalyzer</text>
              <text x="313" y="394" textAnchor="middle" className="sub">Frustration · Churn Risk</text>
              <text x="313" y="410" textAnchor="middle" className="sub">VIP Detection</text>

              <rect x="420" y="355" width="175" height="64" rx="8" className="box"/>
              <text x="508" y="378" textAnchor="middle" className="lbl" style={{fontSize:12}}>🔍 KBSearcher</text>
              <text x="508" y="394" textAnchor="middle" className="sub">Vector Similarity</text>
              <text x="508" y="410" textAnchor="middle" className="sub">Confidence Multiplier</text>

              <rect x="615" y="355" width="175" height="64" rx="8" className="box"/>
              <text x="703" y="378" textAnchor="middle" className="lbl" style={{fontSize:12}}>✍️ Resolver</text>
              <text x="703" y="394" textAnchor="middle" className="sub">Draft + Trust Dial</text>
              <text x="703" y="410" textAnchor="middle" className="sub">Emotion Rewrite</text>

              {/* Pipeline arrows */}
              <line x1="205" y1="387" x2="225" y2="387" className="arr"/>
              <line x1="400" y1="387" x2="420" y2="387" className="arr"/>
              <line x1="595" y1="387" x2="615" y2="387" className="arr"/>

              <line x1="410" y1="419" x2="410" y2="459" className="arr"/>

              {/* HITL */}
              <rect x="200" y="459" width="420" height="60" rx="8" className="box-primary"/>
              <text x="410" y="482" textAnchor="middle" className="lbl">👤 HITL Checkpoint — Trust Dial</text>
              <text x="410" y="499" textAnchor="middle" className="sub">always_ask | confidence threshold | full_autopilot · per category control</text>
              <text x="410" y="514" textAnchor="middle" className="badge">Every decision logs reasoning trace with Trust Dial context</text>

              <line x1="280" y1="519" x2="200" y2="559" className="arr"/>
              <line x1="540" y1="519" x2="620" y2="559" className="arr"/>

              {/* Delivery paths */}
              <rect x="60" y="559" width="270" height="50" rx="8" className="box"/>
              <text x="195" y="580" textAnchor="middle" className="lbl" style={{fontSize:12}}>✅ Auto-Resolve</text>
              <text x="195" y="597" textAnchor="middle" className="sub">Sent immediately (Gmail simulated)</text>

              <rect x="490" y="559" width="270" height="50" rx="8" className="box"/>
              <text x="625" y="580" textAnchor="middle" className="lbl" style={{fontSize:12}}>⏳ Pending Approval</text>
              <text x="625" y="597" textAnchor="middle" className="sub">Admin reviews → approve/edit/reject</text>

              <line x1="195" y1="609" x2="360" y2="649" className="arr"/>
              <line x1="625" y1="609" x2="460" y2="649" className="arr"/>

              {/* Logger */}
              <rect x="200" y="649" width="420" height="55" rx="8" className="box"/>
              <text x="410" y="672" textAnchor="middle" className="lbl">📝 Logger + KB Feedback Loop</text>
              <text x="410" y="690" textAnchor="middle" className="sub">SQLite terminal state · ChromaDB success/failure counts · Self-learning KB</text>

              <line x1="410" y1="704" x2="410" y2="740" className="arr"/>

              {/* Infrastructure */}
              <text x="410" y="758" textAnchor="middle" className="sec">Alibaba Cloud Infrastructure</text>
              <rect x="30" y="764" width="340" height="55" rx="8" className="box-infra"/>
              <text x="200" y="787" textAnchor="middle" className="lbl" style={{fontSize:12,fill:'#fcd34d'}}>🗄 Data Layer</text>
              <text x="200" y="804" textAnchor="middle" className="sub">SQLite (tickets) · ChromaDB (KB vectors)</text>
              <text x="200" y="818" textAnchor="middle" className="badge">Deployed on Alibaba Cloud ECS</text>

              <rect x="450" y="764" width="340" height="55" rx="8" className="box-infra"/>
              <text x="620" y="787" textAnchor="middle" className="lbl" style={{fontSize:12,fill:'#fcd34d'}}>⚡ PredictionEngine</text>
              <text x="620" y="804" textAnchor="middle" className="sub">5+ users → incident → diagnose → remediate</text>
              <text x="620" y="818" textAnchor="middle" className="badge">Mock IT Env API (simulated for demo)</text>
            </svg>
          </div>
        </div>

        <div style={{marginTop:20,display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div className="card">
            <div className="card-header"><div className="card-title">🤖 Qwen Model Usage</div></div>
            <div className="card-body" style={{fontSize:13,lineHeight:1.8}}>
              <div style={{marginBottom:8}}><strong style={{color:'#34d399'}}>qwen-plus</strong> — Response generation, remediation diagnosis</div>
              <div style={{marginBottom:8}}><strong style={{color:'#38bdf8'}}>qwen-turbo</strong> — Classification, emotion analysis, voice commands</div>
              <div style={{marginBottom:8}}><strong style={{color:'#c084fc'}}>qwen-vl-max</strong> — Image OCR for screenshot attachments</div>
              <div><strong style={{color:'#fcd34d'}}>text-embedding-v3</strong> — KB vector embeddings</div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">🔌 Integrations</div></div>
            <div className="card-body" style={{fontSize:13,lineHeight:1.8}}>
              <div style={{marginBottom:8}}><strong>Gmail MCP</strong> — <span style={{color:'var(--text-dim)'}}>Simulated for demo</span></div>
              <div style={{marginBottom:8}}><strong>Calendar MCP</strong> — <span style={{color:'var(--text-dim)'}}>Simulated for demo</span></div>
              <div style={{marginBottom:8}}><strong>Mock IT Env API</strong> — <span style={{color:'var(--success)'}}>Live (local)</span></div>
              <div><strong>Voice Control</strong> — <span style={{color:'var(--success)'}}>Live (Web Speech API + Qwen)</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
