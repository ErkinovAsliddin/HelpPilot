import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_BASE, LOOP_INCREMENT } from '../data/mockStats.ts';

const STAGES = [
  { n:'01', icon:'🤖', label:'Classify',          color:'#6366f1', result:'Category: shipping · Priority: high · Sentiment: negative' },
  { n:'02', icon:'💭', label:'Understand Emotion', color:'#8b5cf6', result:'Frustration score: 0.82 · Churn risk: medium' },
  { n:'03', icon:'🔍', label:'Search Knowledge',   color:'#0ea5e9', result:'Matched 3 KB articles (0.91 similarity)' },
  { n:'04', icon:'✍️', label:'Resolve',            color:'#10b981', result:'Draft resolved · within trust threshold · sent ✓' },
];

const STAGE_MS = 650;
const PAUSE_MS = 1600;

function useScrollReveal(ref: React.RefObject<HTMLElement>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e?.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return visible;
}

function useEaseCounter(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number>(0);
  const animate = useCallback((newTarget: number) => {
    const start = Date.now();
    const from = 0;
    const run = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setVal(Math.round(from + (newTarget - from) * ease));
      if (t < 1) rafRef.current = requestAnimationFrame(run);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(run);
  }, [duration]);
  useEffect(() => { animate(target); }, []);
  return [val, animate] as const;
}

export default function WelcomePage() {
  const navigate = useNavigate();
  const enter = () => navigate('/trust-dial');

  const [activeStage, setActiveStage] = useState(-1);
  const [doneStages, setDoneStages] = useState<number[]>([]);
  const [loopCount, setLoopCount] = useState(0);
  const loopRef = useRef<ReturnType<typeof setTimeout>>();

  const [tickets,  animateTickets]  = useEaseCounter(DEMO_BASE.ticketsProcessed);
  const [avgTime,  animateAvgTime]  = useEaseCounter(DEMO_BASE.avgResolutionSec);
  const [autoRate, animateAutoRate] = useEaseCounter(DEMO_BASE.autoResolveRate);

  const [dialStop, setDialStop] = useState(1);

  const trustSec  = useRef<HTMLDivElement>(null);
  const burnSec   = useRef<HTMLDivElement>(null);
  const poweredBy = useRef<HTMLDivElement>(null);
  const trustVis  = useScrollReveal(trustSec as React.RefObject<HTMLElement>);
  const burnVis   = useScrollReveal(burnSec as React.RefObject<HTMLElement>);
  const powVis    = useScrollReveal(poweredBy as React.RefObject<HTMLElement>);

  useEffect(() => {
    let stage = 0;
    let done: number[] = [];
    const tick = () => {
      if (stage < STAGES.length) {
        setActiveStage(stage); done = [...done, stage]; setDoneStages([...done]); stage++;
        loopRef.current = setTimeout(tick, STAGE_MS);
      } else {
        setLoopCount(lc => {
          const next = lc + 1;
          animateTickets(DEMO_BASE.ticketsProcessed + next * LOOP_INCREMENT.ticketsProcessed);
          animateAutoRate(Math.min(94, DEMO_BASE.autoResolveRate + next));
          return next;
        });
        loopRef.current = setTimeout(() => { stage = 0; done = []; setActiveStage(-1); setDoneStages([]);
          loopRef.current = setTimeout(tick, 200); }, PAUSE_MS);
      }
    };
    loopRef.current = setTimeout(tick, 400);
    return () => clearTimeout(loopRef.current);
  }, []);

  const DIAL_STOPS = [
    { label:'Always Ask',    color:'#f97316', icon:'👤', desc:'Every ticket requires your approval before any response is sent.',          sub:'Maximum control. Zero AI autonomy.' },
    { label:'Threshold',     color:'#6366f1', icon:'⚡', desc:'AI auto-resolves tickets above your confidence threshold. Below it, you review.', sub:'Balanced. High-confidence tickets flow; edge cases come to you.' },
    { label:'Full Autopilot',color:'#10b981', icon:'🚀', desc:'AI handles everything. You only see critical escalations.',               sub:'Maximum automation. Stay in loop only when it matters.' },
  ];
  const dial = DIAL_STOPS[dialStop]!;

  return (
    <div style={{ minHeight:'100vh', background:'#070b14', color:'#f9fafb', fontFamily:"'Inter',-apple-system,sans-serif", overflowX:'hidden' }}>

      {/* ── HERO ──────────────────────────────────────────── */}
      <div style={{ maxWidth:800, margin:'0 auto', padding:'80px 24px 60px', textAlign:'center',
        background:'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(99,102,241,.2) 0%, transparent 65%)' }}>
        <div style={{ display:'inline-block', marginBottom:18, padding:'4px 14px', borderRadius:20,
          background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.25)',
          fontSize:11, fontWeight:700, color:'#34d399', textTransform:'uppercase', letterSpacing:'.1em' }}>
          Qwen Cloud Hackathon · Track 4: Autopilot Agent
        </div>
        <div style={{ width:80, height:80, borderRadius:22, margin:'0 auto 24px',
          background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:42,
          boxShadow:'0 0 60px rgba(99,102,241,.5), 0 0 120px rgba(99,102,241,.15)' }}>🤖</div>
        <h1 style={{ fontSize:'clamp(36px,7vw,60px)', fontWeight:900, lineHeight:1.05, marginBottom:20,
          background:'linear-gradient(135deg,#f9fafb 30%,#a5b4fc)', WebkitBackgroundClip:'text',
          WebkitTextFillColor:'transparent', backgroundClip:'text' }}>HelpPilot</h1>
        <p style={{ fontSize:'clamp(16px,2.5vw,22px)', color:'#9ca3af', maxWidth:560, margin:'0 auto 12px', lineHeight:1.5 }}>
          AI helpdesk autopilot that classifies, resolves, and escalates tickets —
          <strong style={{ color:'#e5e7eb' }}> with you always in control.</strong>
        </p>
        <p style={{ fontSize:14, color:'#4b5563', marginBottom:40 }}>Multi-agent pipeline · Qwen Cloud API · Human-in-the-loop by design</p>
        <button onClick={enter} style={{ padding:'15px 40px', borderRadius:14, minHeight:54, minWidth:240, fontSize:17, fontWeight:700,
          background:'linear-gradient(135deg,#6366f1,#4f46e5)', border:'none', color:'#fff', cursor:'pointer',
          boxShadow:'0 0 40px rgba(99,102,241,.5), 0 4px 16px rgba(0,0,0,.4)', transition:'all .2s' }}
          onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 0 60px rgba(99,102,241,.65), 0 8px 24px rgba(0,0,0,.4)';}}
          onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 0 40px rgba(99,102,241,.5), 0 4px 16px rgba(0,0,0,.4)';}}>
          Enter HelpPilot →
        </button>
      </div>

      {/* ── LIVE DEMO ─────────────────────────────────────── */}
      <div style={{ background:'rgba(13,18,32,.9)', borderTop:'1px solid #1f2937', borderBottom:'1px solid #1f2937' }}>
        <div style={{ maxWidth:860, margin:'0 auto', padding:'64px 24px' }}>
          <div style={{ textAlign:'center', marginBottom:40 }}>
            <div style={{ fontSize:11,fontWeight:700,color:'#6366f1',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10 }}>How it works · Live demo</div>
            <h2 style={{ fontSize:'clamp(22px,4vw,32px)', fontWeight:800, color:'#f9fafb' }}>Watch a ticket go from inbox to resolved</h2>
          </div>

          {/* Stat counters — from shared source */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:36 }}>
            {[
              { icon:'🎫', value:tickets.toLocaleString(),   label:'Tickets Processed' },
              { icon:'⚡', value:`${avgTime}s`,              label:'Avg Resolution Time' },
              { icon:'🤖', value:`${autoRate}%`,             label:'Auto-Resolved' },
            ].map(s => (
              <div key={s.label} style={{ textAlign:'center', padding:'16px 12px', borderRadius:12, background:'#111827', border:'1px solid #1f2937' }}>
                <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
                <div style={{ fontSize:26, fontWeight:800, color:'#f9fafb', fontVariantNumeric:'tabular-nums', transition:'all .1s' }}>{s.value}</div>
                <div style={{ fontSize:11, color:'#6b7280', marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Sample ticket */}
          <div style={{ padding:'14px 18px', borderRadius:10, marginBottom:20,
            background:'rgba(99,102,241,.07)', border:'1px solid rgba(99,102,241,.2)',
            display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:18, flexShrink:0 }}>📧</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:'#6b7280', marginBottom:3 }}>Incoming ticket</div>
              <div style={{ fontSize:15, fontWeight:600, color:'#e5e7eb' }}>"My order hasn't arrived and it's been 2 weeks!"</div>
            </div>
            <div style={{ flexShrink:0, padding:'3px 10px', borderRadius:20,
              background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.2)',
              fontSize:11, fontWeight:700, color:'#34d399',
              animation:'pulseGreen 2s ease-in-out infinite' }}>Processing…</div>
          </div>

          {/* Progress connector bar */}
          <div style={{ position:'relative', marginBottom:8 }}>
            <div style={{ height:3, background:'#1f2937', borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:'100%', background:'linear-gradient(90deg,#6366f1,#10b981)',
                width:`${doneStages.length >= STAGES.length ? 100 : (doneStages.length / STAGES.length) * 100}%`,
                transition:'width .5s ease', borderRadius:2 }} />
            </div>
          </div>

          {/* Stages */}
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {STAGES.map((s, i) => {
              const isActive = activeStage === i;
              const isDone   = doneStages.includes(i) && !isActive;
              const pending  = !isActive && !isDone;
              return (
                <div key={s.n} style={{ padding:'13px 16px', borderRadius:12, transition:'all .35s ease',
                  background: isActive ? `${s.color}16` : isDone ? `${s.color}08` : 'rgba(0,0,0,.18)',
                  border:`1px solid ${isActive ? s.color+'66' : isDone ? s.color+'20' : '#1f2937'}`,
                  opacity: pending ? 0.42 : 1,
                  boxShadow: isActive ? `0 0 20px ${s.color}30` : 'none',
                  animation: isActive ? 'stagePulse 1.2s ease-in-out infinite' : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:38,height:38,borderRadius:10,flexShrink:0, transition:'all .35s',
                      background: isActive?`${s.color}22`:isDone?`${s.color}12`:'rgba(55,65,81,.2)',
                      border:`1px solid ${isActive?s.color+'55':'transparent'}`,
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,
                      boxShadow:isActive?`0 0 14px ${s.color}55`:'none' }}>{s.icon}</div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                        <span style={{ fontSize:10,fontWeight:800,color:s.color,letterSpacing:'.06em',flexShrink:0 }}>{s.n}</span>
                        <span style={{ fontSize:14,fontWeight:700,color:isActive||isDone?'#e5e7eb':'#4b5563',transition:'color .35s' }}>{s.label}</span>
                        {isActive && <span style={{ width:12,height:12,borderRadius:'50%',flexShrink:0,border:`2px solid ${s.color}`,borderTopColor:'transparent',animation:'spin .6s linear infinite',display:'inline-block' }} />}
                        {isDone && <span style={{ color:s.color,fontSize:14,transition:'opacity .3s' }}>✓</span>}
                      </div>
                      <div style={{ fontSize:12,color:s.color,maxHeight:isActive||isDone?'20px':'0px',
                        opacity:isActive||isDone?1:0,marginTop:isActive||isDone?4:0,
                        overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',transition:'all .3s ease' }}>
                        {s.result}
                      </div>
                    </div>
                    {isDone && <span style={{ fontSize:10,color:'#4b5563',padding:'2px 8px',borderRadius:8,background:'rgba(0,0,0,.2)' }}>{(i+1)*0.4}s</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop:10,padding:'10px 16px',borderRadius:10,textAlign:'center',
            background:doneStages.length===STAGES.length?'rgba(16,185,129,.08)':'transparent',
            border:`1px solid ${doneStages.length===STAGES.length?'rgba(16,185,129,.2)':'transparent'}`,
            fontSize:13,color:'#34d399',fontWeight:600,transition:'all .4s ease',
            opacity:doneStages.length===STAGES.length?1:0 }}>
            ✅ Ticket resolved in 1.8s — zero human time required
          </div>
        </div>
      </div>

      {/* ── EMBEDDED BURNDOWN (ROI at a glance) ───────────── */}
      <div ref={burnSec} style={{ background:'rgba(13,18,32,.6)', borderTop:'1px solid #1f2937', borderBottom:'1px solid #1f2937',
        opacity:burnVis?1:0, transform:burnVis?'translateY(0)':'translateY(28px)', transition:'opacity .4s ease, transform .4s ease' }}>
        <div style={{ maxWidth:860, margin:'0 auto', padding:'56px 24px' }}>
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ fontSize:11,fontWeight:700,color:'#10b981',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10 }}>Real-time impact · ROI at a glance</div>
            <h2 style={{ fontSize:'clamp(20px,3.5vw,28px)', fontWeight:800, color:'#f9fafb' }}>
              {DEMO_BASE.autoResolveRate}% of tickets resolved without human time
            </h2>
          </div>
          <MiniburndownChart />
          <div style={{ textAlign:'center', marginTop:16, fontSize:13, color:'#6b7280' }}>
            Based on {DEMO_BASE.ticketsProcessed.toLocaleString()} tickets · {DEMO_BASE.autoResolved.toLocaleString()} auto-resolved · {DEMO_BASE.avgResolutionSec}s avg resolution
          </div>
        </div>
      </div>

      {/* ── TRUST DIAL ────────────────────────────────────── */}
      <div ref={trustSec} style={{ maxWidth:860, margin:'0 auto', padding:'64px 24px',
        opacity:trustVis?1:0, transform:trustVis?'translateY(0)':'translateY(28px)', transition:'opacity .4s ease .1s, transform .4s ease .1s' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontSize:11,fontWeight:700,color:'#f59e0b',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10 }}>What makes HelpPilot different</div>
          <h2 style={{ fontSize:'clamp(22px,4vw,32px)', fontWeight:800, color:'#f9fafb', marginBottom:12 }}>The Trust Dial — try it</h2>
          <p style={{ fontSize:15, color:'#6b7280', maxWidth:460, margin:'0 auto' }}>Drag the slider. Every category has its own autonomy level. Your team decides.</p>
        </div>
        <div style={{ background:'linear-gradient(135deg,rgba(99,102,241,.07),rgba(139,92,246,.04))',
          border:`1px solid ${dial.color}33`, borderRadius:18, padding:'36px 32px', transition:'border-color .4s' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            {DIAL_STOPS.map((d,i) => (
              <div key={d.label} style={{ fontSize:12, fontWeight:dialStop===i?700:400, color:dialStop===i?d.color:'#4b5563',
                transition:'color .3s', textAlign:i===1?'center':i===0?'left':'right', flex:1 }}>
                {d.icon} {d.label}
              </div>
            ))}
          </div>
          <input type="range" min={0} max={2} step={1} value={dialStop} onChange={e=>setDialStop(Number(e.target.value))}
            style={{ width:'100%', height:6, accentColor:dial.color, cursor:'pointer', marginBottom:28 }} />
          <div style={{ textAlign:'center', transition:'all .3s' }}>
            <div style={{ display:'inline-flex',alignItems:'center',gap:8,marginBottom:14,padding:'6px 18px',borderRadius:24,
              background:`${dial.color}16`,border:`1px solid ${dial.color}44` }}>
              <span style={{ fontSize:20 }}>{dial.icon}</span>
              <span style={{ fontSize:16,fontWeight:800,color:dial.color }}>{dial.label}</span>
            </div>
            <p style={{ fontSize:15,color:'#d1d5db',marginBottom:8,lineHeight:1.5 }}>{dial.desc}</p>
            <p style={{ fontSize:13,color:'#6b7280' }}>{dial.sub}</p>
          </div>
          <div style={{ marginTop:24 }}>
            <div style={{ display:'flex',justifyContent:'space-between',fontSize:11,color:'#4b5563',marginBottom:6 }}>
              <span>Human control</span><span>AI autonomy</span>
            </div>
            <div style={{ height:8,borderRadius:4,background:'#1f2937',overflow:'hidden' }}>
              <div style={{ height:'100%',borderRadius:4,background:`linear-gradient(90deg,${dial.color},${dial.color}aa)`,
                width:dialStop===0?'8%':dialStop===1?'55%':'95%',transition:'width .5s cubic-bezier(.4,0,.2,1)' }} />
            </div>
          </div>
        </div>
        <div style={{ marginTop:14,padding:'13px 18px',borderRadius:10,background:'rgba(0,0,0,.2)',border:'1px solid #1f2937',
          fontSize:13,color:'#6b7280',textAlign:'center' }}>
          Unlike generic AI chatbots, HelpPilot never sends a response without permission unless you configure it to.
          <strong style={{ color:'#9ca3af' }}> That's the difference.</strong>
        </div>
      </div>

      {/* ── POWERED BY ────────────────────────────────────── */}
      <div ref={poweredBy} style={{ background:'rgba(13,18,32,.8)', borderTop:'1px solid #1f2937',
        opacity:powVis?1:0, transform:powVis?'translateY(0)':'translateY(20px)', transition:'opacity .35s ease .05s, transform .35s ease .05s' }}>
        <div style={{ maxWidth:800,margin:'0 auto',padding:'40px 24px',textAlign:'center' }}>
          <div style={{ fontSize:11,fontWeight:700,color:'#4b5563',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:20 }}>Powered by</div>
          <div style={{ display:'flex',flexWrap:'wrap',gap:10,justifyContent:'center' }}>
            {[['Qwen Cloud API','#10b981'],['qwen-plus','#34d399'],['qwen-turbo','#34d399'],['qwen-vl-max','#34d399'],
              ['text-embedding-v3','#34d399'],['SQLite','#6366f1'],['ChromaDB','#6366f1'],['React + Vite','#a5b4fc'],
              ['Slack MCP','#f59e0b'],['Circuit Breaker','#ef4444']
            ].map(([l,c]) => (
              <span key={l} style={{ padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:600,background:`${c}11`,border:`1px solid ${c}33`,color:c as string }}>{l}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── FINAL CTA ─────────────────────────────────────── */}
      <div style={{ maxWidth:600,margin:'0 auto',padding:'72px 24px',textAlign:'center' }}>
        <h2 style={{ fontSize:28,fontWeight:800,color:'#f9fafb',marginBottom:12 }}>Ready to see it in action?</h2>
        <p style={{ fontSize:15,color:'#6b7280',marginBottom:36 }}>Submit a ticket and watch the full pipeline run in real time.</p>
        <button onClick={enter} style={{ padding:'16px 48px',borderRadius:14,minHeight:56,display:'block',
          width:'100%',maxWidth:320,margin:'0 auto',
          background:'linear-gradient(135deg,#6366f1,#4f46e5)',border:'none',color:'#fff',
          fontSize:18,fontWeight:700,cursor:'pointer',
          boxShadow:'0 0 40px rgba(99,102,241,.45)',transition:'all .2s' }}
          onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 12px 48px rgba(99,102,241,.55)';}}
          onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 0 40px rgba(99,102,241,.45)';}}>
          Enter HelpPilot →
        </button>
        <div style={{ marginTop:20,fontSize:12,color:'#374151' }}>
          API Key: <code style={{ color:'#6b7280',background:'rgba(99,102,241,.08)',padding:'2px 6px',borderRadius:4 }}>helppilot-demo-key-2024</code>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulseGreen { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(16,185,129,.4)} 50%{opacity:.8;box-shadow:0 0 0 4px transparent} }
        @keyframes stagePulse { 0%,100%{box-shadow:var(--stage-shadow,none)} 50%{box-shadow:0 0 0 3px transparent} }
        @media(max-width:768px) {
          input[type=range]{height:28px!important}
        }
      `}</style>
    </div>
  );
}

// ── Mini burndown chart (canvas) ─────────────────────────────────────────────
function MiniburndownChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pts = DEMO_BASE.burndownPoints;
    const w = canvas.width, h = canvas.height;
    const pad = { top:14, right:16, bottom:32, left:40 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;
    const maxVal = Math.max(...pts.map(p => p.total), 1);

    ctx.clearRect(0, 0, w, h);

    const x = (i: number) => pad.left + (cw / (pts.length - 1)) * i;
    const y = (v: number) => pad.top + ch - (v / maxVal) * ch;

    // Grid lines
    ctx.strokeStyle = 'rgba(55,65,81,.35)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const yy = pad.top + (ch / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.left, yy); ctx.lineTo(pad.left + cw, yy); ctx.stroke();
      ctx.fillStyle = '#6b7280'; ctx.font = '9px Inter';
      ctx.fillText(String(Math.round(maxVal - (maxVal / 4) * i)), 4, yy + 3);
    }

    // AI fill
    ctx.beginPath(); ctx.moveTo(x(0), y(0));
    pts.forEach((p, i) => ctx.lineTo(x(i), y(p.aiResolved)));
    ctx.lineTo(x(pts.length - 1), y(0)); ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
    grad.addColorStop(0, 'rgba(16,185,129,.3)'); grad.addColorStop(1, 'rgba(16,185,129,.04)');
    ctx.fillStyle = grad; ctx.fill();

    // AI line
    ctx.beginPath(); ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2.5;
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(x(i), y(p.aiResolved)) : ctx.lineTo(x(i), y(p.aiResolved)));
    ctx.stroke();

    // Total line
    ctx.beginPath(); ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2;
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(x(i), y(p.total)) : ctx.lineTo(x(i), y(p.total)));
    ctx.stroke();

    // Manual baseline
    ctx.beginPath(); ctx.strokeStyle = 'rgba(107,114,128,.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.moveTo(x(0), y(0)); ctx.lineTo(x(pts.length - 1), y(pts[pts.length - 1]!.total));
    ctx.stroke(); ctx.setLineDash([]);

    // X labels
    ctx.fillStyle = '#6b7280'; ctx.font = '9px Inter';
    pts.forEach((p, i) => { if (i % 3 === 0) ctx.fillText(p.label, x(i) - 12, h - 6); });
  }, []);

  return (
    <div>
      <div style={{ display:'flex', gap:16, justifyContent:'center', marginBottom:12, fontSize:12 }}>
        <span style={{ color:'#10b981' }}>● AI auto-resolved</span>
        <span style={{ color:'#f97316' }}>● Total tickets</span>
        <span style={{ color:'rgba(107,114,128,.7)' }}>- - Manual baseline</span>
      </div>
      <canvas ref={canvasRef} width={760} height={200}
        style={{ width:'100%', height:'auto', display:'block', maxWidth:760, margin:'0 auto' }} />
    </div>
  );
}

// Make DIAL_STOPS accessible inside WelcomePage
const DIAL_STOPS = [
  { label:'Always Ask',    color:'#f97316', icon:'👤', desc:'Every ticket requires your approval before any response is sent.',          sub:'Maximum control. Zero AI autonomy.' },
  { label:'Threshold',     color:'#6366f1', icon:'⚡', desc:'AI auto-resolves tickets above your confidence threshold. Below it, you review.', sub:'Balanced. High-confidence tickets flow; edge cases come to you.' },
  { label:'Full Autopilot',color:'#10b981', icon:'🚀', desc:'AI handles everything. You only see critical escalations.',               sub:'Maximum automation. Stay in loop only when it matters.' },
];
