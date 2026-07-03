import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.ts';
import { DEMO_BASE } from '../data/mockStats.ts';

export default function BurndownPage() {
  const [liveTickets, setLiveTickets] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();

  // Fetch real ticket data to overlay on demo baseline
  useEffect(() => {
    apiClient.get('/tickets?pageSize=100&sortBy=received_at&sortOrder=asc')
      .then(r => setLiveTickets(r.data.tickets || []))
      .catch(() => {});
    const id = setInterval(() => {
      apiClient.get('/tickets?pageSize=100&sortBy=received_at&sortOrder=asc')
        .then(r => setLiveTickets(r.data.tickets || []))
        .catch(() => {});
    }, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { drawChart(); }, [liveTickets]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width, h = canvas.height;
    const pad = { top: 20, right: 24, bottom: 44, left: 52 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    // Use demo baseline data
    const pts = DEMO_BASE.burndownPoints;
    const maxVal = Math.max(...pts.map(p => p.total), 1);

    const x = (i: number) => pad.left + (cw / (pts.length - 1)) * i;
    const y = (v: number) => pad.top + ch - (v / maxVal) * ch;

    // Grid
    ctx.strokeStyle = 'rgba(55,65,81,0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const yy = pad.top + (ch / 5) * i;
      ctx.beginPath(); ctx.moveTo(pad.left, yy); ctx.lineTo(pad.left + cw, yy); ctx.stroke();
      ctx.fillStyle = '#6b7280'; ctx.font = '10px Inter';
      ctx.fillText(String(Math.round(maxVal - (maxVal / 5) * i)), 4, yy + 4);
    }

    // AI resolved area fill
    ctx.beginPath();
    ctx.moveTo(x(0), y(0));
    pts.forEach((p, i) => ctx.lineTo(x(i), y(p.aiResolved)));
    ctx.lineTo(x(pts.length - 1), y(0));
    ctx.closePath();
    const greenGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
    greenGrad.addColorStop(0, 'rgba(16,185,129,0.25)');
    greenGrad.addColorStop(1, 'rgba(16,185,129,0.04)');
    ctx.fillStyle = greenGrad; ctx.fill();

    // AI resolved line
    ctx.beginPath(); ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2.5;
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(x(i), y(p.aiResolved)) : ctx.lineTo(x(i), y(p.aiResolved)));
    ctx.stroke();

    // Total tickets line (orange)
    ctx.beginPath(); ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2;
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(x(i), y(p.total)) : ctx.lineTo(x(i), y(p.total)));
    ctx.stroke();

    // Manual baseline (dashed gray — what it would look like without AI)
    ctx.beginPath(); ctx.strokeStyle = 'rgba(107,114,128,0.45)'; ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.moveTo(x(0), y(0));
    ctx.lineTo(x(pts.length - 1), y(pts[pts.length - 1]!.total));
    ctx.stroke(); ctx.setLineDash([]);

    // X-axis labels
    ctx.fillStyle = '#6b7280'; ctx.font = '9px Inter';
    pts.forEach((p, i) => {
      if (i % 2 === 0) ctx.fillText(p.label, x(i) - 14, h - 8);
    });

    // Legend
    const legend = [
      [10, '#10b981', '● AI auto-resolved'],
      [24, '#f97316', '● Total processed'],
      [38, 'rgba(107,114,128,0.7)', '- - Manual baseline (no AI)'],
    ];
    legend.forEach(([yy, col, lbl]) => {
      ctx.fillStyle = col as string; ctx.font = '10px Inter';
      ctx.fillText(lbl as string, pad.left, Number(yy));
    });

    // Also overlay any real tickets from the live session
    if (liveTickets.length > 2) {
      const liveAutoR = liveTickets.filter(t => t.outcome === 'SUCCESS_AUTO').length;
      ctx.fillStyle = '#a5b4fc'; ctx.font = 'bold 11px Inter';
      ctx.fillText(`Live session: ${liveTickets.length} tickets, ${liveAutoR} auto-resolved`, pad.left, h - 28);
    }
  };

  const stats = DEMO_BASE;
  const liveAutoR = liveTickets.filter(t => t.outcome === 'SUCCESS_AUTO').length;

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>📉 Burndown Chart</h1>
          <p>AI pipeline vs. manual processing — real-time ROI visualization</p>
        </div>
        <span className="ai-badge">Live + Demo data</span>
      </div>

      <div className="page">
        {/* Demo baseline metrics — from shared source */}
        <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 8, background: 'rgba(99,102,241,.06)', border: '1px solid rgba(99,102,241,.15)', fontSize: 12, color: '#a5b4fc' }}>
          📊 <strong>Demo baseline data</strong> — consistent with /welcome and all dashboard metrics
        </div>

        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
          <div className="metric-card indigo"><div className="metric-glow"></div><div className="metric-icon">🎫</div><div className="metric-value">{stats.ticketsProcessed.toLocaleString()}</div><div className="metric-label">Total Processed</div></div>
          <div className="metric-card green"><div className="metric-glow"></div><div className="metric-icon">🤖</div><div className="metric-value">{stats.autoResolved.toLocaleString()}</div><div className="metric-label">AI Auto-Resolved</div></div>
          <div className="metric-card orange"><div className="metric-glow"></div><div className="metric-icon">⏳</div><div className="metric-value">{stats.ticketsProcessed - stats.autoResolved}</div><div className="metric-label">Human Reviewed</div></div>
          <div className="metric-card yellow"><div className="metric-glow"></div><div className="metric-icon">📊</div><div className="metric-value">{stats.autoResolveRate}%</div><div className="metric-label">Automation Rate</div></div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">📉 Ticket Burndown — Today</div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <span style={{ color: '#10b981' }}>● AI auto-resolved</span>
              <span style={{ color: '#f97316' }}>● Total tickets</span>
              <span style={{ color: 'rgba(107,114,128,.7)' }}>- - Manual baseline</span>
            </div>
          </div>
          <div className="card-body">
            <canvas ref={canvasRef} width={800} height={300} style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        </div>

        {/* Live session overlay */}
        {liveTickets.length > 0 && (
          <div className="card" style={{ marginTop: 16, border: '1px solid rgba(99,102,241,.2)' }}>
            <div className="card-header"><div className="card-title">⚡ Live Session</div></div>
            <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12 }}>
              {[
                ['🎫', liveTickets.length, 'Tickets this session'],
                ['🤖', liveAutoR, 'Auto-resolved'],
                ['📊', liveTickets.length > 0 ? Math.round((liveAutoR / liveTickets.length) * 100) + '%' : '0%', 'Session auto-rate'],
              ].map(([icon, val, label]) => (
                <div key={String(label)} style={{ textAlign: 'center', padding: 12, background: 'rgba(0,0,0,.15)', borderRadius: 8 }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{val}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, padding: 16, background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.15)', borderRadius: 12, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--success)' }}>ROI Story:</strong> The green area is the time your team <em>didn't spend</em> handling tickets manually. At <strong style={{ color: 'var(--text)' }}>{stats.autoResolveRate}% auto-resolution</strong>, your team only touches <strong style={{ color: 'var(--text)' }}>{100 - stats.autoResolveRate}%</strong> of tickets — the hard ones that genuinely need human judgment.
        </div>
      </div>
    </div>
  );
}
