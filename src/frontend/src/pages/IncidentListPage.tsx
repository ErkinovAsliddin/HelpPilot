// src/frontend/src/pages/IncidentListPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, type Incident } from '../api/client.ts';

export default function IncidentListPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const fetch = async () => {
      try {
        const res = await apiClient.get<{ incidents: Incident[] }>('/incidents');
        if (active) setIncidents(res.data.incidents);
      } catch {}
    };
    fetch();
    const id = setInterval(fetch, 5000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const approve = async (id: string) => {
    await apiClient.post(`/incidents/${id}/approve`, { adminId: 'admin-' + Date.now() });
    setIncidents((prev) => prev.map((i) => i.id === id ? { ...i, status: 'approved' } : i));
  };

  const close = async (id: string) => {
    await apiClient.post(`/incidents/${id}/close`);
    setIncidents((prev) => prev.map((i) => i.id === id ? { ...i, status: 'closed' } : i));
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>⚡ Incidents</h1>
      {incidents.length === 0 && <p style={{ color: '#9ca3af' }}>No incidents detected yet.</p>}
      {incidents.map((inc) => (
        <div key={inc.id} style={{ background: '#fff', borderRadius: 8, padding: 16, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{inc.error_signature}</strong>
              <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>
                {inc.affected_count} users · {new Date(inc.detected_at).toLocaleString()}
              </span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: inc.status === 'draft' ? '#fef3c7' : '#dcfce7', color: inc.status === 'draft' ? '#92400e' : '#166534' }}>
              {inc.status}
            </span>
          </div>
          {inc.status === 'draft' && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button onClick={() => approve(inc.id)} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', fontWeight: 600 }}>
                Approve & Notify Users
              </button>
              <button onClick={() => close(inc.id)} style={{ background: '#6b7280', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px' }}>
                Close
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
