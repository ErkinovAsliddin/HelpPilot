import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.ts';

export default function IncidentListPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    try { const r = await apiClient.get<{incidents:any[]}>('/incidents'); setIncidents(r.data.incidents); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); const id = setInterval(load, 8000); return () => clearInterval(id); }, []);

  const approve = async (id: string) => {
    try { await apiClient.post(`/incidents/${id}/approve`, { adminId: 'admin-' + Date.now() }); load(); }
    catch {}
  };
  const close = async (id: string) => {
    try { await apiClient.post(`/incidents/${id}/close`); load(); }
    catch {}
  };

  const statusColor = (s: string) => ({ draft: 'orange', approved: 'success', sending: 'success', closed: '' })[s] || '';

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>🔍 Proactive Incidents</h1>
          <p>AI-detected IT patterns across user event streams · {incidents.filter(i => i.status === 'draft').length} pending</p>
        </div>
        <span className="ai-badge">PredictionEngine</span>
      </div>

      <div className="page">
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
          {[
            { color: 'orange', icon: '⚠️', label: 'Draft', val: incidents.filter(i => i.status === 'draft').length },
            { color: 'green', icon: '✅', label: 'Approved', val: incidents.filter(i => i.status === 'approved').length },
            { color: 'sky', icon: '📤', label: 'Sending', val: incidents.filter(i => i.status === 'sending').length },
            { color: 'teal', icon: '🏁', label: 'Closed', val: incidents.filter(i => i.status === 'closed').length },
          ].map(m => (
            <div key={m.label} className={`metric-card ${m.color}`}>
              <div className="metric-glow"></div>
              <div className="metric-icon">{m.icon}</div>
              <div className="metric-value">{m.val}</div>
              <div className="metric-label">{m.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner" style={{ margin: '0 auto', width: 24, height: 24, borderWidth: 3 }}></div>
          </div>
        ) : incidents.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🛡️</div>
            <div className="empty-title">No incidents detected yet</div>
            <div style={{ fontSize: 13 }}>The PredictionEngine monitors for patterns affecting 5+ users</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {incidents.map(inc => (
              <div key={inc.id} className="card" style={{ border: inc.status === 'draft' ? '1px solid rgba(249,115,22,.25)' : '1px solid var(--border)' }}>
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'monospace', color: inc.status === 'draft' ? '#fb923c' : 'var(--text)' }}>
                        {inc.error_signature}
                      </span>
                      <span className={`badge ${inc.status}`}>{inc.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                      <span>👥 {inc.affected_count} users affected</span>
                      <span>🕒 {new Date(inc.detected_at).toLocaleString()}</span>
                      {inc.suggested_fix && <span>💡 Fix available</span>}
                    </div>
                    {inc.suggested_fix && (
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic', maxWidth: 500 }}>
                        Suggested: {inc.suggested_fix}
                      </div>
                    )}
                  </div>
                  {inc.status === 'draft' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-success btn-sm" onClick={() => approve(inc.id)}>
                        ✅ Approve & Notify
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => close(inc.id)}>
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
