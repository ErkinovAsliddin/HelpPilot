import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import RequireAuth from './components/shared/RequireAuth.tsx';
import LoginPage from './pages/LoginPage.tsx';
import TicketListPage from './pages/TicketListPage.tsx';
import TicketDetailPage from './pages/TicketDetailPage.tsx';
import IncidentListPage from './pages/IncidentListPage.tsx';
import SubmitTicketPage from './pages/SubmitTicketPage.tsx';
import MetricsPage from './pages/MetricsPage.tsx';
import { apiClient } from './api/client.ts';

function SidebarContent() {
  const loc = useLocation();
  const [ticketCount, setTicketCount] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [tr, ir] = await Promise.all([
          apiClient.get<{tickets:any[]}>('/tickets?pageSize=100'),
          apiClient.get<{incidents:any[]}>('/incidents'),
        ]);
        setTicketCount(tr.data.tickets.length);
        setPendingCount(tr.data.tickets.filter((t:any)=>t.status==='pending-approval').length);
        setIncidentCount(ir.data.incidents.filter((i:any)=>i.status==='draft').length);
      } catch {}
    };
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  if (loc.pathname === '/login') return null;
  if (!sessionStorage.getItem('apiKey')) return null;

  const nl = (to: string, icon: string, label: string, badge?: number, badgeColor?: string) => (
    <NavLink to={to} className={({isActive}) => `nav-item${isActive?' active':''}`}>
      <span style={{fontSize:16}}>{icon}</span>
      <span>{label}</span>
      {badge ? <span className={`badge${badgeColor?' '+badgeColor:''}`}>{badge}</span> : null}
    </NavLink>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-title">🤖 HelpPilot</div>
        <div className="sidebar-logo-sub">IT Helpdesk Autopilot</div>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-section">Main</div>
        {nl('/tickets','📋','Tickets', ticketCount || undefined)}
        {nl('/submit','📩','Submit Ticket')}

        <div className="sidebar-section">Management</div>
        {nl('/approvals','⚡','Approvals', pendingCount||undefined, 'red')}
        {nl('/incidents','🔍','Incidents', incidentCount||undefined, 'red')}
        {nl('/metrics','📊','Metrics')}

        <div className="sidebar-section">System</div>
        {nl('/health','💚','Health Check')}
      </nav>
      <div className="sidebar-footer">
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',marginBottom:8}}>
          <span className="pulse-dot"></span>
          <span style={{fontSize:12,color:'var(--text-muted)'}}>Server online · port 3000</span>
        </div>
        <button className="nav-item" style={{color:'var(--danger)'}} onClick={()=>{sessionStorage.removeItem('apiKey');window.location.href='/login';}}>
          <span>🚪</span><span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  if (loc.pathname === '/login') return <>{children}</>;
  return (
    <div className="layout">
      <SidebarContent />
      <main className="main">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/tickets" element={<RequireAuth><TicketListPage /></RequireAuth>} />
          <Route path="/tickets/:id" element={<RequireAuth><TicketDetailPage /></RequireAuth>} />
          <Route path="/submit" element={<RequireAuth><SubmitTicketPage /></RequireAuth>} />
          <Route path="/approvals" element={<RequireAuth><TicketListPage filterStatus="pending-approval" /></RequireAuth>} />
          <Route path="/incidents" element={<RequireAuth><IncidentListPage /></RequireAuth>} />
          <Route path="/metrics" element={<RequireAuth><MetricsPage /></RequireAuth>} />
          <Route path="/health" element={<RequireAuth><HealthPage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/tickets" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

function HealthPage() {
  const [health, setHealth] = useState<any>(null);
  useEffect(() => {
    fetch('/api/health').then(r=>r.json()).then(setHealth).catch(()=>{});
    const id = setInterval(()=>fetch('/api/health').then(r=>r.json()).then(setHealth).catch(()=>{}), 10000);
    return () => clearInterval(id);
  }, []);
  const svc = (name: string, status: string) => {
    const color = status==='healthy'?'var(--success)':status==='degraded'?'var(--warning)':'var(--danger)';
    return (
      <div key={name} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
        <span style={{fontSize:14,fontWeight:500}}>{name}</span>
        <span style={{fontSize:12,fontWeight:700,color,textTransform:'uppercase',letterSpacing:'0.05em'}}>{status||'unknown'}</span>
      </div>
    );
  };
  return (
    <div className="page">
      <div className="topbar" style={{position:'static',background:'transparent',border:'none',padding:'0 0 24px'}}>
        <div><div className="topbar-title">💚 Health Check</div><div className="topbar-subtitle">System service status</div></div>
        <span style={{fontSize:12,color:'var(--text-dim)'}}>Auto-refreshes every 10s</span>
      </div>
      {health ? (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <div className="card">
            <div className="card-title">Services</div>
            {svc('Bedrock (AI)', health.services?.bedrock)}
            {svc('ChromaDB (Vector DB)', health.services?.chromadb)}
            {svc('SQLite (Database)', health.services?.sqlite)}
            {svc('Email Provider', health.services?.email)}
          </div>
          <div className="card">
            <div className="card-title">Pipeline</div>
            {svc('Overall Status', health.status)}
            {svc('Auto-Resolution', health.autoResolutionEnabled?'healthy':'degraded')}
            <div style={{padding:'12px 0',fontSize:12,color:'var(--text-dim)'}}>Checked at: {new Date(health.checkedAt).toLocaleTimeString()}</div>
          </div>
        </div>
      ) : <div style={{textAlign:'center',padding:40,color:'var(--text-dim)'}}><div className="spinner" style={{margin:'0 auto'}}></div></div>}
    </div>
  );
}
