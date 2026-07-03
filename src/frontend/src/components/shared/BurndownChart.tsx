// Feature 9: Burndown Chart — pure SVG, no chart library
import { useState, useCallback } from 'react';
import type { Ticket } from '../../api/client.ts';

interface Props {
  tickets: Ticket[];
}

interface TooltipData {
  x: number;
  y: number;
  hour: string;
  received: number;
  resolved: number;
  backlog: number;
  manualBacklog: number;
}

const AVG_MANUAL_MINS = 120; // 2 hours per ticket manually
const HOURS = 24;
const CHART_W = 700;
const CHART_H = 220;
const PAD = { top: 20, right: 20, bottom: 40, left: 50 };
const W = CHART_W - PAD.left - PAD.right;
const H = CHART_H - PAD.top - PAD.bottom;

export default function BurndownChart({ tickets }: Props) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const now = new Date();
  const hourStart = new Date(now);
  hourStart.setMinutes(0, 0, 0);

  // Build hourly data points for last 24 hours
  const points = Array.from({ length: HOURS + 1 }, (_, i) => {
    const hour = new Date(hourStart.getTime() - (HOURS - i) * 3600000);
    const hourLabel = hour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    // Cumulative received up to this hour
    const received = tickets.filter(t => new Date(t.received_at) <= hour).length;
    // Cumulative resolved up to this hour
    const resolved = tickets.filter(t => t.terminal_at && new Date(t.terminal_at) <= hour).length;
    const backlog = received - resolved;
    // Manual baseline: each ticket takes 2h, so backlog grows differently
    const manualBacklog = Math.max(0, received - Math.floor((i * 60) / AVG_MANUAL_MINS));

    return { hour: hourLabel, received, resolved, backlog: Math.max(0, backlog), manualBacklog };
  });

  const maxVal = Math.max(1, ...points.map(p => Math.max(p.received, p.manualBacklog)));

  const scaleX = (i: number) => PAD.left + (i / HOURS) * W;
  const scaleY = (v: number) => PAD.top + H - (v / maxVal) * H;

  const pathD = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)} ${scaleY(v).toFixed(1)}`).join(' ');

  const areaD = (values: number[]) =>
    `${pathD(values)} L ${scaleX(HOURS).toFixed(1)} ${scaleY(0).toFixed(1)} L ${scaleX(0).toFixed(1)} ${scaleY(0).toFixed(1)} Z`;

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (CHART_W / rect.width);
    const chartX = svgX - PAD.left;
    if (chartX < 0 || chartX > W) { setTooltip(null); return; }
    const idx = Math.round((chartX / W) * HOURS);
    const p = points[Math.min(idx, HOURS)];
    if (!p) return;
    setTooltip({ x: scaleX(idx), y: 40, hour: p.hour, received: p.received, resolved: p.resolved, backlog: p.backlog, manualBacklog: p.manualBacklog });
  }, [points]);

  const xTicks = [0, 6, 12, 18, 24];

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">📉 Ticket Burndown — AI vs Manual</div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 11 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 16, height: 3, background: '#ef4444', display: 'inline-block', borderRadius: 2 }}></span>Received</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 16, height: 3, background: '#10b981', display: 'inline-block', borderRadius: 2 }}></span>Resolved</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 16, height: 3, background: '#6366f1', borderTop: '2px dashed #6366f1', display: 'inline-block' }}></span>Manual baseline</span>
        </div>
      </div>
      <div className="card-body" style={{ overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="resGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(frac => {
            const y = PAD.top + H * (1 - frac);
            const val = Math.round(frac * maxVal);
            return (
              <g key={frac}>
                <line x1={PAD.left} y1={y} x2={PAD.left + W} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">{val}</text>
              </g>
            );
          })}

          {/* X axis ticks */}
          {xTicks.map(i => {
            const x = scaleX(i);
            return (
              <g key={i}>
                <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + H} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                <text x={x} y={PAD.top + H + 16} textAnchor="middle" fontSize="10" fill="#6b7280">{points[i]?.hour || ''}</text>
              </g>
            );
          })}

          {/* Backlog shaded area between received and resolved */}
          <clipPath id="backlogClip">
            <path d={`${pathD(points.map(p => p.received))} L ${scaleX(HOURS)} ${scaleY(0)} L ${scaleX(0)} ${scaleY(0)} Z`} />
          </clipPath>
          <path d={areaD(points.map(p => p.received))} fill="url(#recGrad)" opacity="0.6" />
          <path d={areaD(points.map(p => p.resolved))} fill="url(#resGrad)" />

          {/* Manual baseline dotted */}
          <path d={pathD(points.map(p => p.manualBacklog))} fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="6,4" opacity="0.7" />

          {/* Received line */}
          <path d={pathD(points.map(p => p.received))} fill="none" stroke="#ef4444" strokeWidth="2.5" />

          {/* Resolved line */}
          <path d={pathD(points.map(p => p.resolved))} fill="none" stroke="#10b981" strokeWidth="2.5" />

          {/* X/Y axes */}
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + H} stroke="#374151" strokeWidth="1" />
          <line x1={PAD.left} y1={PAD.top + H} x2={PAD.left + W} y2={PAD.top + H} stroke="#374151" strokeWidth="1" />

          {/* Axis labels */}
          <text x={PAD.left + W / 2} y={CHART_H - 4} textAnchor="middle" fontSize="10" fill="#6b7280">Last 24 hours</text>
          <text x={12} y={PAD.top + H / 2} textAnchor="middle" fontSize="10" fill="#6b7280" transform={`rotate(-90, 12, ${PAD.top + H / 2})`}>Tickets</text>

          {/* Tooltip vertical line */}
          {tooltip && (
            <line x1={tooltip.x} y1={PAD.top} x2={tooltip.x} y2={PAD.top + H} stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="4,2" />
          )}

          {/* Tooltip box */}
          {tooltip && (
            <g>
              <rect
                x={Math.min(tooltip.x + 8, CHART_W - 160)}
                y={tooltip.y}
                width="150" height="76"
                rx="8" fill="#1a2035"
                stroke="rgba(99,102,241,0.4)" strokeWidth="1"
              />
              <text x={Math.min(tooltip.x + 16, CHART_W - 152)} y={tooltip.y + 16} fontSize="10" fill="#a5b4fc" fontWeight="700">{tooltip.hour}</text>
              <text x={Math.min(tooltip.x + 16, CHART_W - 152)} y={tooltip.y + 32} fontSize="10" fill="#f87171">▲ Received: {tooltip.received}</text>
              <text x={Math.min(tooltip.x + 16, CHART_W - 152)} y={tooltip.y + 46} fontSize="10" fill="#34d399">✓ Resolved: {tooltip.resolved}</text>
              <text x={Math.min(tooltip.x + 16, CHART_W - 152)} y={tooltip.y + 60} fontSize="10" fill="#fcd34d">~ Backlog: {tooltip.backlog}</text>
              <text x={Math.min(tooltip.x + 16, CHART_W - 152)} y={tooltip.y + 74} fontSize="10" fill="#a5b4fc">⚡ Manual: {tooltip.manualBacklog}</text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
