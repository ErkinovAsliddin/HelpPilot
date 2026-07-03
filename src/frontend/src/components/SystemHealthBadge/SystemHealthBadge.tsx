import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client.ts';

export default function SystemHealthBadge() {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    const load = () => apiClient.get('/system/health').then(r => setHealth(r.data)).catch(() => {});
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  if (!health) return null;

  const status = health.ai?.status || 'unknown';
  const cfg = {
    healthy:          { color: '#10b981', label: 'AI healthy',        icon: '●' },
    degraded:         { color: '#f59e0b', label: 'AI degraded',       icon: '◐' },
    'fallback-active':{ color: '#f97316', label: 'Fallback active',   icon: '⚠' },
    unavailable:      { color: '#ef4444', label: 'AI unavailable',    icon: '○' },
    unknown:          { color: '#6b7280', label: 'Checking…',         icon: '·' },
  } as any;

  const c = cfg[status] || cfg.unknown;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
      borderRadius: 8, background: `${c.color}0d`, border: `1px solid ${c.color}22`,
      marginBottom: 6, cursor: 'default',
    }} title={`qwen-plus: ${health.ai?.qwenPlus?.state} · qwen-turbo: ${health.ai?.qwenTurbo?.state}`}>
      <span style={{ color: c.color, fontSize: 10 }}>{c.icon}</span>
      <span style={{ fontSize: 11, color: c.color, fontWeight: 600 }}>{c.label}</span>
      {health.mcp?.slack?.configured && (
        <span style={{ fontSize: 9, color: '#6b7280', marginLeft: 'auto' }}>MCP✓</span>
      )}
    </div>
  );
}
