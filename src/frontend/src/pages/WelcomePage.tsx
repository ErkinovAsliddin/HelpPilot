import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_BASE } from '../data/mockStats.ts';

// ── Pipeline animation ────────────────────────────────────────────────────────
const STAGES = [
  { n:'01', icon:'🤖', label:'Classify',           color:'#6366f1', result:'Category: network-issue · Priority: high · Sentiment: frustrated' },
  { n:'02', icon:'💭', label:'Emotion Analysis',   color:'#8b5cf6', result:'Frustration: 7/10 · Churn risk: medium · VIP: yes' },
  { n:'03', icon:'🔍', label:'Search Knowledge',   color:'#0ea5e9', result:'3 KB articles matched · 0.91 similarity · confidence boost' },
  { n:'04', icon:'✍️', label:'Resolve',            color:'#10b981', result:'Draft sent · confidence 88% · auto-resolved ✓' },
];
const STAGE_MS = 700, PAUSE_MS = 1800;

// ── Features list ─────────────────────────────────────────────────────────────
const FEATURES = [
  { icon:'🤖', title:'Qwen-Powered AI',       desc:'Uses qwen-plus for high-quality responses and qwen-turbo for fast classification — right model for every task.' },
  { icon:'🎛', title:'Trust Dial',            desc:'Set AI autonomy per category: always ask, confidence threshold, or full autopilot. You control how much the AI does.' },
  { icon:'👤', title:'Human-in-the-Loop',     desc:'Every AI decision has a checkpoint. No ticket gets resolved without your explicit approval unless you configured it.' },
  { icon:'🔮', title:'Proactive Detection',   desc:'PredictionEngine monitors error patterns. When 5+ users hit the same issue, it creates an incident before users complain.' },
  { icon:'🌍', title:'Multilingual',          desc:'Detects and translates 6 languages automatically. French, Spanish, German, Japanese, Chinese — all processed natively.' },
  { icon:'📊', title:'Live Analytics',        desc:'Real-time metrics, burndown charts, anomaly detection, SLA monitoring — everything your team needs to stay on top.' },
  { icon:'💼', title:'HireFlow Autopilot',    desc:'Built-in hiring pipeline. Parse resumes, score candidates with AI, schedule interviews — end-to-end automation.' },
  { icon:'🔌', title:'MCP Integrations',      desc:'Slack notifications, calendar scheduling, and custom tool integrations via Model Context Protocol.' },
];

function useEaseCounter(duration = 900) {
  const [val, setVal] = useState(0);
  const raf = useRef(0);
  const animate = useCallback((target: number) => {
    const start = Date.now();
    const run = () => {
      const t = Math.min((Date.now()-start)/duration, 1);
      const ease = 1 - Math.pow(1-t, 4);
      setVal(Math.round(target * ease));
      if (t < 1) raf.current = requestAnimationFrame(run);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(run);
  }, [duration]);
  return [val, animate] as const;
}

export default function WelcomePage() {
  const navigate = useNavigate();
  const enter = () => navigate('/trust-dial');

  const [activeStage, setActiveStage] = useState(-1);
  const [doneStages, setDoneStages] = useState<number[]>([]);
  const loopRef = useRef<ReturnType<typeof setTimeout>>();

  const [tickets,  animTickets]  = useEaseCounter();
  const [autoRate, animAutoRate] = useEaseCounter();
  const [avgTime,  animAvgTime]  = useEaseCounter(600);
  const loopCount = useRef(0);

  const [dialStop, setDialStop] = useState(1);

  const DIAL_STOPS = [
    { label:'Always Ask',    color:'#f97316', icon:'👤', desc:'Every ticket requires your approval before any response is sent.',                    sub:'Maximum control. Zero AI autonomy.' },
    { label:'Threshold',     color:'#6366f1', icon:'⚡', desc:'AI auto-resolves tickets above your confidence threshold. Below it, you review.',   sub:'Balanced. High-confidence flows; edge cases come to you.' },
    { label:'Full Autopilot',color:'#10b981', icon:'🚀', desc:'AI handles everything autonomously. You only see critical escalations.',             sub:'Maximum automation. Stay in loop only when it matters.' },
  ];
  const dial = DIAL_STOPS[dialStop]!;

  // Pipeline loop
  useEffect(() => {
    let stage = 0, done: number[] = [];
    const tick = () => {
      if (stage < STAGES.length) {
        setActiveStage(stage); done=[...done,stage]; setDoneStages([...done]); stage++;
        loopRef.current = setTimeout(tick, STAGE_MS);
      } else {
        loopCount.current++;
        const lc = loopCount.current;
        animTickets(DEMO_BASE.ticketsProcessed + lc*3);
        animAutoRate(Math.min(94, DEMO_BASE.autoResolveRate + lc));
        animAvgTime(DEMO_BASE.avgResolutionSec);
        loopRef.current = setTimeout(() => {
          stage=0; done=[]; setActiveStage(-1); setDoneStages([]);
          loopRef.current = setTimeout(tick,200);
        }, PAUSE_MS);
      }
    };
    animTickets(DEMO_BASE.ticketsProcessed);
    animAutoRate(DEMO_BASE.autoResolveRate);
    animAvgTime(DEMO_BASE.avgResolutionSec);
    loopRef.current = setTimeout(tick, 500);
    return () => clearTimeout(loopRef.current);
  }, []);

  return (
    <div style={{ minHeight:'100vh', background:'#070b14', color:'#f9fafb', fontFamily:"'Inter',-apple-system,sans-serif", overflowX:'hidden' }}>
      {/* ── HERO ────────────────────────────────────────────── */}
      <div style={{ position:'relative', overflow:'hidden' }}>
        {/* Background glow */}
        <div style={{ position:'absolute', top:'-20%', left:'50%', transform:'translateX(-50%)', width:'800px', height:'600px',
          background:'radial-gradient(ellipse, rgba(99,102,241,.22) 0%, transparent 65%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:'30%', left:'-10%', width:'400px', height:'400px',
          background:'radial-gradient(ellipse, rgba(139,92,246,.12) 0%, transparent 70%)', pointerEvents:'none' }} />

        <div style={{ maxWidth:900, margin:'0 auto', padding:'clamp(60px,10vw,100px) clamp(16px,5vw,40px) 60px', textAlign:'center', position:'relative' }}>
          {/* Logo */}
          <div style={{ width:'clamp(64px,12vw,84px)', height:'clamp(64px,12vw,84px)', borderRadius:'clamp(16px,4vw,22px)',
            margin:'0 auto clamp(20px,4vw,28px)',
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'clamp(30px,7vw,44px)',
            boxShadow:'0 0 60px rgba(99,102,241,.55), 0 0 120px rgba(99,102,241,.15)' }}>🤖</div>

          {/* Badge */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginBottom:16, padding:'5px 14px', borderRadius:20,
            background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.25)',
            fontSize:'clamp(10px,2.5vw,12px)', fontWeight:700, color:'#34d399', textTransform:'uppercase', letterSpacing:'.1em' }}>
            <span>⚡</span> AI-Powered IT Helpdesk Automation
          </div>

          <h1 style={{ fontSize:'clamp(36px,9vw,68px)', fontWeight:900, lineHeight:1.05, marginBottom:20,
            background:'linear-gradient(135deg,#f9fafb 20%,#a5b4fc 60%,#6366f1)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>HelpPilot</h1>

          <p style={{ fontSize:'clamp(15px,3vw,20px)', color:'#9ca3af', maxWidth:600, margin:'0 auto 14px', lineHeight:1.6 }}>
            Classify, resolve, and escalate support tickets automatically —
            <strong style={{ color:'#e5e7eb' }}> with human oversight at every critical decision.</strong>
          </p>
          <p style={{ fontSize:'clamp(12px,2.5vw,14px)', color:'#4b5563', marginBottom:'clamp(28px,5vw,44px)' }}>
            Multi-agent AI pipeline · Trust Dial HITL control · Real-time analytics · 6 languages
          </p>

          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={enter} style={{ padding:'clamp(12px,3vw,15px) clamp(24px,5vw,40px)', borderRadius:14,
              background:'linear-gradient(135deg,#6366f1,#4f46e5)', border:'none', color:'#fff',
              fontSize:'clamp(14px,3vw,17px)', fontWeight:700, cursor:'pointer',
              boxShadow:'0 0 40px rgba(99,102,241,.5)', transition:'all .2s',
              minHeight:52, minWidth:200 }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 12px 48px rgba(99,102,241,.6)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 0 40px rgba(99,102,241,.5)';}}>
              Open Dashboard →
            </button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({behavior:'smooth'})}
              style={{ padding:'clamp(12px,3vw,15px) clamp(24px,5vw,40px)', borderRadius:14, background:'transparent',
              border:'1px solid rgba(99,102,241,.35)', color:'#a5b4fc',
              fontSize:'clamp(14px,3vw,17px)', fontWeight:600, cursor:'pointer', transition:'all .2s', minHeight:52 }}>
              See Features ↓
            </button>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ──────────────────────────────────────── */}
      <div style={{ background:'rgba(13,18,32,.95)', borderTop:'1px solid #1f2937', borderBottom:'1px solid #1f2937' }}>
        <div style={{ maxWidth:860, margin:'0 auto', padding:'28px clamp(16px,4vw,40px)',
          display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:16 }}>
          {[
            { icon:'🎫', value:`${tickets.toLocaleString()}+`, label:'Tickets Processed' },
            { icon:'⚡', value:`${autoRate}%`,                 label:'Auto-Resolved' },
            { icon:'⏱', value:`${avgTime}s`,                  label:'Avg Resolution' },
            { icon:'🌍', value:'6',                            label:'Languages Supported' },
          ].map(s=>(
            <div key={s.label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:'clamp(22px,4vw,30px)', fontWeight:800, color:'#f9fafb', fontVariantNumeric:'tabular-nums' }}>{s.value}</div>
              <div style={{ fontSize:'clamp(10px,2vw,12px)', color:'#6b7280', marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── LIVE PIPELINE DEMO ─────────────────────────────── */}
      <div style={{ maxWidth:860, margin:'0 auto', padding:'clamp(48px,8vw,72px) clamp(16px,4vw,40px)' }}>
        <div style={{ textAlign:'center', marginBottom:'clamp(24px,5vw,40px)' }}>
          <div style={{ fontSize:'clamp(10px,2vw,11px)', fontWeight:700, color:'#6366f1', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 }}>
            Live Demo
          </div>
          <h2 style={{ fontSize:'clamp(20px,4vw,32px)', fontWeight:800, color:'#f9fafb', marginBottom:10 }}>
            Watch a ticket resolve in real time
          </h2>
          <p style={{ fontSize:'clamp(13px,2.5vw,15px)', color:'#6b7280', maxWidth:500, margin:'0 auto' }}>
            Every ticket flows through 4 AI agents automatically
          </p>
        </div>

        {/* Sample ticket */}
        <div style={{ padding:'clamp(12px,3vw,16px) clamp(14px,3vw,20px)', borderRadius:12, marginBottom:20,
          background:'rgba(99,102,241,.07)', border:'1px solid rgba(99,102,241,.2)',
          display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <span style={{ fontSize:20, flexShrink:0 }}>📧</span>
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ fontSize:'clamp(10px,2vw,11px)', color:'#6b7280', marginBottom:3 }}>Incoming ticket</div>
            <div style={{ fontSize:'clamp(13px,2.5vw,15px)', fontWeight:600, color:'#e5e7eb' }}>
              "Our entire office VPN has been down since 9am. 40 people can't work!"
            </div>
          </div>
          <div style={{ flexShrink:0, padding:'3px 10px', borderRadius:20,
            background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.2)',
            fontSize:'clamp(10px,2vw,11px)', fontWeight:700, color:'#34d399',
            animation:'pulseGreen 2s ease-in-out infinite' }}>Live</div>
        </div>

        {/* Progress bar */}
        <div style={{ height:3, background:'#1f2937', borderRadius:2, overflow:'hidden', marginBottom:10 }}>
          <div style={{ height:'100%', background:'linear-gradient(90deg,#6366f1,#10b981)',
            width:`${doneStages.length >= STAGES.length ? 100 : (doneStages.length/STAGES.length)*100}%`,
            transition:'width .5s ease', borderRadius:2 }} />
        </div>

        {/* Stages */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {STAGES.map((s,i) => {
            const isActive=activeStage===i, isDone=doneStages.includes(i)&&!isActive, isPending=!isActive&&!isDone;
            return (
              <div key={s.n} style={{ padding:'clamp(10px,2vw,14px) clamp(12px,3vw,18px)', borderRadius:12,
                background:isActive?`${s.color}16`:isDone?`${s.color}08`:'rgba(0,0,0,.18)',
                border:`1px solid ${isActive?s.color+'66':isDone?s.color+'20':'#1f2937'}`,
                opacity:isPending?.42:1, transition:'all .35s ease',
                boxShadow:isActive?`0 0 20px ${s.color}30`:'none',
                animation:isActive?'stagePulse 1.2s ease-in-out infinite':'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:38,height:38,borderRadius:10,flexShrink:0, transition:'all .35s',
                    background:isActive?`${s.color}22`:isDone?`${s.color}12`:'rgba(55,65,81,.2)',
                    border:`1px solid ${isActive?s.color+'55':'transparent'}`,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,
                    boxShadow:isActive?`0 0 14px ${s.color}55`:'none' }}>{s.icon}</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' }}>
                      <span style={{ fontSize:10,fontWeight:800,color:s.color,letterSpacing:'.06em',flexShrink:0 }}>{s.n}</span>
                      <span style={{ fontSize:'clamp(12px,2.5vw,14px)',fontWeight:700,color:isActive||isDone?'#e5e7eb':'#4b5563',transition:'color .35s' }}>{s.label}</span>
                      {isActive && <span style={{ width:11,height:11,borderRadius:'50%',flexShrink:0,border:`2px solid ${s.color}`,borderTopColor:'transparent',animation:'spin .6s linear infinite',display:'inline-block' }} />}
                      {isDone && <span style={{ color:s.color,fontSize:14 }}>✓</span>}
                    </div>
                    <div style={{ fontSize:'clamp(11px,2vw,12px)',color:s.color,maxHeight:isActive||isDone?'20px':'0',opacity:isActive||isDone?1:0,marginTop:isActive||isDone?3:0,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',transition:'all .3s ease' }}>
                      {s.result}
                    </div>
                  </div>
                  {isDone && <span style={{ fontSize:10,color:'#4b5563',padding:'2px 8px',borderRadius:8,background:'rgba(0,0,0,.2)',flexShrink:0 }}>{(i+1)*0.4}s</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop:10,padding:'10px 16px',borderRadius:10,textAlign:'center',
          background:doneStages.length===STAGES.length?'rgba(16,185,129,.08)':'transparent',
          border:`1px solid ${doneStages.length===STAGES.length?'rgba(16,185,129,.2)':'transparent'}`,
          fontSize:'clamp(12px,2.5vw,13px)',color:'#34d399',fontWeight:600,transition:'all .4s ease',
          opacity:doneStages.length===STAGES.length?1:0 }}>
          ✅ Ticket resolved in 1.6s — zero human time required
        </div>
      </div>

      {/* ── FEATURES GRID ─────────────────────────────────── */}
      <div id="features" style={{ background:'rgba(13,18,32,.8)', borderTop:'1px solid #1f2937', borderBottom:'1px solid #1f2937' }}>
        <div style={{ maxWidth:960, margin:'0 auto', padding:'clamp(48px,8vw,72px) clamp(16px,4vw,40px)' }}>
          <div style={{ textAlign:'center', marginBottom:'clamp(28px,5vw,48px)' }}>
            <div style={{ fontSize:'clamp(10px,2vw,11px)', fontWeight:700, color:'#6366f1', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 }}>Everything included</div>
            <h2 style={{ fontSize:'clamp(22px,4vw,34px)', fontWeight:800, color:'#f9fafb', marginBottom:12 }}>Built for real IT teams</h2>
            <p style={{ fontSize:'clamp(13px,2.5vw,15px)', color:'#6b7280', maxWidth:500, margin:'0 auto' }}>Not just another AI chatbot — a complete helpdesk autopilot with the controls your team actually needs.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(clamp(200px,40vw,280px),1fr))', gap:14 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ padding:'clamp(16px,3vw,22px)', borderRadius:14, background:'#111827',
                border:'1px solid #1f2937', transition:'all .2s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(99,102,241,.3)';e.currentTarget.style.transform='translateY(-3px)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#1f2937';e.currentTarget.style.transform='';}}>
                <div style={{ fontSize:'clamp(22px,4vw,28px)', marginBottom:12 }}>{f.icon}</div>
                <div style={{ fontSize:'clamp(13px,2.5vw,14px)', fontWeight:700, color:'#e5e7eb', marginBottom:6 }}>{f.title}</div>
                <div style={{ fontSize:'clamp(11px,2vw,12px)', color:'#6b7280', lineHeight:1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TRUST DIAL ────────────────────────────────────── */}
      <div style={{ maxWidth:860, margin:'0 auto', padding:'clamp(48px,8vw,72px) clamp(16px,4vw,40px)' }}>
        <div style={{ textAlign:'center', marginBottom:'clamp(24px,5vw,40px)' }}>
          <div style={{ fontSize:'clamp(10px,2vw,11px)', fontWeight:700, color:'#f59e0b', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 }}>Key differentiator</div>
          <h2 style={{ fontSize:'clamp(22px,4vw,32px)', fontWeight:800, color:'#f9fafb', marginBottom:12 }}>The Trust Dial — drag it</h2>
          <p style={{ fontSize:'clamp(13px,2.5vw,15px)', color:'#6b7280', maxWidth:460, margin:'0 auto' }}>Every ticket category gets its own autonomy level. Drag the slider to feel the difference.</p>
        </div>
        <div style={{ background:'linear-gradient(135deg,rgba(99,102,241,.07),rgba(139,92,246,.04))',
          border:`1px solid ${dial.color}33`, borderRadius:18, padding:'clamp(24px,5vw,36px) clamp(20px,4vw,32px)', transition:'border-color .4s' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            {DIAL_STOPS.map((d,i)=>(
              <div key={d.label} style={{ fontSize:'clamp(10px,2vw,12px)', fontWeight:dialStop===i?700:400,
                color:dialStop===i?d.color:'#4b5563', transition:'color .3s',
                textAlign:i===1?'center':i===0?'left':'right', flex:1 }}>{d.icon} {d.label}</div>
            ))}
          </div>
          <input type="range" min={0} max={2} step={1} value={dialStop} onChange={e=>setDialStop(Number(e.target.value))}
            style={{ width:'100%', height:8, accentColor:dial.color, cursor:'pointer', marginBottom:28 }} />
          <div style={{ textAlign:'center', transition:'all .3s' }}>
            <div style={{ display:'inline-flex',alignItems:'center',gap:8,marginBottom:14,padding:'6px 18px',borderRadius:24,
              background:`${dial.color}16`,border:`1px solid ${dial.color}44` }}>
              <span style={{ fontSize:20 }}>{dial.icon}</span>
              <span style={{ fontSize:'clamp(14px,3vw,16px)',fontWeight:800,color:dial.color }}>{dial.label}</span>
            </div>
            <p style={{ fontSize:'clamp(13px,2.5vw,15px)',color:'#d1d5db',marginBottom:8,lineHeight:1.5 }}>{dial.desc}</p>
            <p style={{ fontSize:'clamp(11px,2vw,13px)',color:'#6b7280' }}>{dial.sub}</p>
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
      </div>

      {/* ── HOW IT COMPARES ───────────────────────────────── */}
      <div style={{ background:'rgba(13,18,32,.8)', borderTop:'1px solid #1f2937', borderBottom:'1px solid #1f2937' }}>
        <div style={{ maxWidth:760, margin:'0 auto', padding:'clamp(48px,8vw,72px) clamp(16px,4vw,40px)' }}>
          <h2 style={{ fontSize:'clamp(20px,4vw,28px)', fontWeight:800, color:'#f9fafb', textAlign:'center', marginBottom:32 }}>
            Not just AI — <span style={{ color:'#a5b4fc' }}>intelligent automation with control</span>
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16 }}>
            {[
              { label:'Generic AI chatbot', items:['One-size-fits-all responses','No human oversight','No escalation logic','No KB learning','No ticket tracking'], bad:true },
              { label:'HelpPilot', items:['Category-specific AI behavior','Trust Dial HITL on every decision','Smart escalation + clarification','Self-learning knowledge base','Full audit trail + analytics'], bad:false },
            ].map(col => (
              <div key={col.label} style={{ padding:'clamp(18px,3vw,24px)', borderRadius:14,
                background:col.bad?'rgba(0,0,0,.2)':'rgba(99,102,241,.08)',
                border:`1px solid ${col.bad?'#374151':'rgba(99,102,241,.25)'}` }}>
                <div style={{ fontSize:'clamp(13px,2.5vw,14px)', fontWeight:700, marginBottom:16,
                  color:col.bad?'#6b7280':'#a5b4fc' }}>{col.label}</div>
                {col.items.map(item => (
                  <div key={item} style={{ display:'flex',alignItems:'flex-start',gap:8,marginBottom:8,fontSize:'clamp(11px,2vw,13px)',color:col.bad?'#6b7280':'var(--text-muted)' }}>
                    <span style={{ flexShrink:0,color:col.bad?'#ef4444':'#10b981' }}>{col.bad?'✕':'✓'}</span>{item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── POWERED BY ────────────────────────────────────── */}
      <div style={{ maxWidth:800, margin:'0 auto', padding:'clamp(32px,6vw,48px) clamp(16px,4vw,40px)', textAlign:'center' }}>
        <div style={{ fontSize:'clamp(10px,2vw,11px)', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:16 }}>Technology</div>
        <div style={{ display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center' }}>
          {[['Qwen Cloud API','#10b981'],['qwen-plus','#34d399'],['qwen-turbo','#34d399'],['qwen-vl-max','#34d399'],
            ['text-embedding-v3','#34d399'],['SQLite','#6366f1'],['ChromaDB','#6366f1'],
            ['React + Vite','#a5b4fc'],['Slack MCP','#f59e0b'],['Circuit Breaker','#ef4444'],['Node.js 20','#6b7280']
          ].map(([l,c])=>(
            <span key={l} style={{ padding:'5px 12px',borderRadius:20,fontSize:'clamp(10px,2vw,12px)',fontWeight:600,background:`${c}11`,border:`1px solid ${c}33`,color:c as string }}>{l}</span>
          ))}
        </div>
      </div>

      {/* ── FINAL CTA ─────────────────────────────────────── */}
      <div style={{ maxWidth:600, margin:'0 auto', padding:'clamp(40px,8vw,72px) clamp(16px,4vw,40px)', textAlign:'center' }}>
        <h2 style={{ fontSize:'clamp(22px,4vw,30px)', fontWeight:800, color:'#f9fafb', marginBottom:12 }}>Start automating your helpdesk today</h2>
        <p style={{ fontSize:'clamp(13px,2.5vw,15px)', color:'#6b7280', marginBottom:32, lineHeight:1.6 }}>
          Submit your first ticket and watch the full AI pipeline work — classify, analyze, search, draft, and optionally auto-resolve — in seconds.
        </p>
        <button onClick={enter} style={{ padding:'clamp(14px,3vw,16px) clamp(32px,6vw,48px)', borderRadius:14,
          background:'linear-gradient(135deg,#6366f1,#4f46e5)', border:'none', color:'#fff',
          fontSize:'clamp(15px,3vw,18px)', fontWeight:700, cursor:'pointer',
          boxShadow:'0 0 40px rgba(99,102,241,.45)', transition:'all .2s',
          display:'block', width:'100%', maxWidth:320, margin:'0 auto 20px' }}
          onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 12px 48px rgba(99,102,241,.55)';}}
          onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 0 40px rgba(99,102,241,.45)';}}>
          Open HelpPilot →
        </button>
        <div style={{ fontSize:'clamp(11px,2vw,12px)', color:'#374151' }}>
          API Key: <code style={{ color:'#6b7280', background:'rgba(99,102,241,.08)', padding:'2px 6px', borderRadius:4 }}>helppilot-demo-key-2024</code>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulseGreen { 0%,100%{opacity:1} 50%{opacity:.7} }
        @keyframes stagePulse { 0%,100%{opacity:1} 50%{opacity:.85} }
        @media(max-width:600px){
          .stats-counters{grid-template-columns:repeat(2,1fr)!important}
        }
      `}</style>
    </div>
  );
}
