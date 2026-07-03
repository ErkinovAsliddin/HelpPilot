import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props { onComplete: () => void; }

const STEPS = [
  {
    id: 'welcome',
    badge: 'Track 4 · Autopilot Agent',
    headline: 'Welcome to HelpPilot',
    sub: 'AI helpdesk autopilot that classifies, resolves, and escalates tickets — with you always in control.',
    content: null,
  },
  {
    id: 'pipeline',
    badge: 'How it works',
    headline: 'Four agents. One pipeline.',
    sub: 'Every ticket flows through a multi-agent AI pipeline in seconds.',
    content: 'pipeline',
  },
  {
    id: 'hitl',
    badge: 'You\'re always in the loop',
    headline: 'The Trust Dial',
    sub: 'Set how much autonomy the AI has — per ticket category. You decide, always.',
    content: 'trustdial',
  },
  {
    id: 'go',
    badge: 'Ready',
    headline: 'Let\'s go',
    sub: 'Your dashboard, your AI, your rules.',
    content: 'cta',
  },
];

export default function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<'next'|'prev'>('next');
  const [sliderValue, setSliderValue] = useState(75);
  const touchStartX = useRef<number | null>(null);
  const navigate = useNavigate();

  const goto = useCallback((idx: number, dir: 'next'|'prev') => {
    if (animating || idx < 0 || idx >= STEPS.length) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => { setStep(idx); setAnimating(false); }, 200);
  }, [animating]);

  const next = () => step < STEPS.length - 1 ? goto(step + 1, 'next') : finish();
  const prev = () => goto(step - 1, 'prev');

  const finish = () => {
    localStorage.setItem('hasSeenOnboarding', '1');
    onComplete();
    navigate('/trust-dial');
  };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
    touchStartX.current = null;
  };

  const modeLabel = sliderValue < 40 ? 'Always Ask' : sliderValue < 80 ? `Threshold ${sliderValue}%` : 'Full Autopilot';
  const modeColor = sliderValue < 40 ? '#f97316' : sliderValue < 80 ? '#6366f1' : '#10b981';
  const modeDesc  = sliderValue < 40 ? 'Every ticket needs your approval' : sliderValue < 80 ? `AI auto-resolves when confidence ≥ ${sliderValue}%` : 'AI handles everything autonomously';

  const current = STEPS[step]!;

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(7,11,20,0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}>
        {/* Card */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            background: 'linear-gradient(160deg, #111827 0%, #0d1220 100%)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 20,
            width: '100%',
            maxWidth: 560,
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)',
            position: 'relative',
          }}
        >
          {/* Skip */}
          <button onClick={finish} style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', color: '#4b5563',
            fontSize: 13, cursor: 'pointer', padding: '4px 8px',
            borderRadius: 6, transition: 'color .15s',
            zIndex: 10,
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#9ca3af')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
          >
            Skip
          </button>

          {/* Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '40px 36px 24px',
            opacity: animating ? 0 : 1,
            transform: animating ? `translateX(${direction === 'next' ? '16px' : '-16px'})` : 'translateX(0)',
            transition: 'opacity .18s ease, transform .18s ease',
          }}>
            {/* Badge */}
            <div style={{
              display: 'inline-block', marginBottom: 20,
              padding: '4px 12px', borderRadius: 20,
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.25)',
              fontSize: 11, fontWeight: 700, color: '#818cf8',
              textTransform: 'uppercase', letterSpacing: '.08em',
            }}>
              {current.badge}
            </div>

            {/* Step 1 — Welcome */}
            {current.id === 'welcome' && (
              <>
                <div style={{ fontSize: 48, marginBottom: 16, textAlign: 'center' }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 36, boxShadow: '0 0 40px rgba(99,102,241,.4)',
                  }}>🤖</div>
                </div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f9fafb', marginBottom: 12, textAlign: 'center' }}>
                  {current.headline}
                </h1>
                <p style={{ fontSize: 16, color: '#9ca3af', textAlign: 'center', lineHeight: 1.6, marginBottom: 24 }}>
                  {current.sub}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    ['⚡','Qwen AI','qwen-plus · qwen-turbo'],
                    ['🎛','Trust Dial','Human control, per category'],
                    ['🔮','Prediction','Detect incidents before users report'],
                    ['🌍','Multilingual','6 languages out of the box'],
                  ].map(([icon, title, desc]) => (
                    <div key={title} style={{
                      padding: '12px 14px', borderRadius: 10,
                      background: 'rgba(99,102,241,0.05)',
                      border: '1px solid rgba(99,102,241,0.12)',
                    }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb', marginBottom: 2 }}>{title}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{desc}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Step 2 — Pipeline */}
            {current.id === 'pipeline' && (
              <>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#f9fafb', marginBottom: 8 }}>{current.headline}</h2>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 28 }}>{current.sub}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { n:'01', icon:'🤖', label:'Classify', desc:'Category · Priority · Sentiment · Language detection', color:'#6366f1' },
                    { n:'02', icon:'💭', label:'Understand Emotion', desc:'Frustration score · Churn risk · VIP detection', color:'#8b5cf6' },
                    { n:'03', icon:'🔍', label:'Search Knowledge Base', desc:'Vector similarity · Web fallback · Confidence scoring', color:'#0ea5e9' },
                    { n:'04', icon:'✍️', label:'Resolve', desc:'Draft response · Trust Dial check · HITL if needed', color:'#10b981' },
                  ].map((s, i, arr) => (
                    <div key={s.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                          background: `${s.color}22`, border: `1px solid ${s.color}44`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                        }}>{s.icon}</div>
                        {i < arr.length - 1 && <div style={{ width: 2, height: 16, background: 'rgba(55,65,81,0.6)', margin: '4px 0' }} />}
                      </div>
                      <div style={{ paddingTop: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#e5e7eb', marginBottom: 2 }}>
                          <span style={{ fontSize: 10, color: s.color, fontWeight: 800, marginRight: 6 }}>{s.n}</span>
                          {s.label}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Step 3 — Trust Dial */}
            {current.id === 'hitl' && (
              <>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#f9fafb', marginBottom: 8 }}>{current.headline}</h2>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>{current.sub}</p>

                {/* Interactive slider mockup */}
                <div style={{
                  padding: '20px', borderRadius: 14,
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(55,65,81,0.6)',
                  marginBottom: 20,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>Always Ask</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: modeColor }}>{modeLabel}</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>Full Autopilot</span>
                  </div>
                  <input type="range" min={0} max={100} value={sliderValue}
                    onChange={e => setSliderValue(Number(e.target.value))}
                    style={{ width: '100%', accentColor: modeColor, height: 20, cursor: 'pointer' }}
                  />
                  <div style={{
                    marginTop: 12, padding: '10px 14px', borderRadius: 8,
                    background: `${modeColor}11`, border: `1px solid ${modeColor}33`,
                    fontSize: 13, color: modeColor, textAlign: 'center', fontWeight: 500,
                  }}>
                    {modeDesc}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    ['👤','Always Ask','Every ticket goes to your inbox first'],
                    ['⚡','Threshold','AI resolves high-confidence tickets automatically'],
                    ['🚀','Full Autopilot','AI handles everything — you review only edge cases'],
                  ].map(([icon, mode, desc]) => (
                    <div key={mode} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.15)' }}>
                      <span style={{ fontSize: 16 }}>{icon}</span>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb' }}>{mode}</span>
                        <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>{desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Step 4 — Go */}
            {current.id === 'go' && (
              <div style={{ textAlign: 'center', paddingTop: 8 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
                  background: 'linear-gradient(135deg,#10b981,#059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 40, boxShadow: '0 0 40px rgba(16,185,129,.4)',
                }}>✓</div>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#f9fafb', marginBottom: 12 }}>{current.headline}</h2>
                <p style={{ fontSize: 15, color: '#9ca3af', marginBottom: 28, lineHeight: 1.6 }}>{current.sub}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
                  {[
                    ['📩','Submit Ticket','Test the AI pipeline'],
                    ['🎛','Trust Dial','Set your autonomy level'],
                    ['📋','Daily Summary','AI briefing with one click'],
                  ].map(([icon, label, hint]) => (
                    <div key={label} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      borderRadius: 10, background: 'rgba(99,102,241,0.06)',
                      border: '1px solid rgba(99,102,241,0.15)',
                    }}>
                      <span style={{ fontSize: 18 }}>{icon}</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb' }}>{label}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{hint}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={finish} style={{
                  width: '100%', padding: '14px', borderRadius: 12,
                  background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                  border: 'none', color: '#fff', fontSize: 16, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 0 24px rgba(99,102,241,.4)',
                  transition: 'transform .15s, box-shadow .15s', minHeight: 48,
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(99,102,241,.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 0 24px rgba(99,102,241,.4)'; }}
                >
                  Enter HelpPilot →
                </button>
              </div>
            )}
          </div>

          {/* Footer: dots + nav */}
          <div style={{
            padding: '16px 36px 24px',
            borderTop: '1px solid rgba(55,65,81,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {/* Dots */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {STEPS.map((_, i) => (
                <button key={i} onClick={() => goto(i, i > step ? 'next' : 'prev')} style={{
                  width: i === step ? 20 : 8,
                  height: 8, borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: i === step ? '#6366f1' : 'rgba(75,85,99,0.5)',
                  transition: 'width .25s ease, background .25s ease',
                  padding: 0,
                }} />
              ))}
              <span style={{ fontSize: 11, color: '#4b5563', marginLeft: 4 }}>{step+1} / {STEPS.length}</span>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              {step > 0 && (
                <button onClick={prev} style={{
                  padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(55,65,81,0.6)',
                  background: 'none', color: '#9ca3af', fontSize: 13, cursor: 'pointer', minHeight: 44,
                }}>← Back</button>
              )}
              {current.id !== 'go' && (
                <button onClick={next} style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 44,
                  boxShadow: '0 0 12px rgba(99,102,241,.3)',
                }}>
                  {step === STEPS.length - 2 ? "Let's go →" : 'Next →'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .onboarding-card { border-radius: 0 !important; max-height: 100vh !important; height: 100vh !important; }
        }
      `}</style>
    </>
  );
}
