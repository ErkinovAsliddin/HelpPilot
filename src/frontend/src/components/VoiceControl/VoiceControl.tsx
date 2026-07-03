import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client.ts';

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

interface VoiceResult {
  action: string;
  message: string;
  speak: string;
  target?: string;
  navigate?: string;
  data?: any;
}

export default function VoiceControl() {
  const navigate = useNavigate();
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<Array<{ transcript: string; result: VoiceResult; time: Date }>>([]);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => { recognitionRef.current?.stop(); synthRef.current?.cancel(); };
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    // Prefer a natural English voice
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v => v.lang === 'en-US' && v.name.includes('Google'))
      || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setState('speaking');
    utterance.onend = () => setState('idle');
    synthRef.current.speak(utterance);
  }, []);

  const startListening = useCallback(() => {
    if (state !== 'idle') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setState('error'); return; }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => { setState('listening'); setTranscript(''); setResult(null); };

    recognition.onresult = (event: any) => {
      const current = event.results[event.results.length - 1];
      const text = current[0].transcript;
      setTranscript(text);
    };

    recognition.onend = async () => {
      if (!transcript && recognitionRef.current) {
        // Get final transcript from last result
        setState('idle'); return;
      }
      setState('processing');
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech') setState('error');
      else setState('idle');
    };

    recognition.start();

    // Auto-stop after 8 seconds
    setTimeout(() => { try { recognition.stop(); } catch {} }, 8000);
  }, [state, transcript]);

  const stopAndProcess = useCallback(async () => {
    recognitionRef.current?.stop();
    if (!transcript.trim()) { setState('idle'); return; }
    setState('processing');
    try {
      const res = await apiClient.post<VoiceResult>('/voice/command', { transcript });
      const r = res.data;
      setResult(r);
      setHistory(h => [{ transcript, result: r, time: new Date() }, ...h.slice(0, 9)]);
      if (r.speak) speak(r.speak);
      if (r.target) navigate(r.target);
      if (r.navigate) navigate(r.navigate);
    } catch {
      setState('error');
      speak('Sorry, I could not process that command.');
    }
  }, [transcript, navigate, speak]);

  // Process when recognition ends with a transcript
  useEffect(() => {
    if (state === 'processing' && transcript) {
      stopAndProcess();
    }
  }, [state]);

  const stateConfig = {
    idle:       { color: 'var(--text-dim)',    icon: '🎤', label: 'Tap to speak',    bg: 'rgba(107,114,128,.1)' },
    listening:  { color: '#ef4444',            icon: '🔴', label: 'Listening…',      bg: 'rgba(239,68,68,.15)' },
    processing: { color: '#f59e0b',            icon: '⚙️', label: 'Processing…',     bg: 'rgba(245,158,11,.15)' },
    speaking:   { color: '#6366f1',            icon: '🔊', label: 'Speaking…',       bg: 'rgba(99,102,241,.15)' },
    error:      { color: '#f87171',            icon: '⚠️', label: 'Try again',       bg: 'rgba(239,68,68,.1)' },
  };

  const cfg = stateConfig[state];

  if (!isSupported) return null;

  return (
    <>
      {/* Floating voice button */}
      <button
        onClick={() => { if (state === 'idle' || state === 'error') { setIsOpen(true); startListening(); } else if (state === 'listening') { stopAndProcess(); } }}
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 200,
          width: 56, height: 56, borderRadius: '50%',
          background: state === 'listening'
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, #6366f1, #4f46e5)',
          border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer',
          boxShadow: state === 'listening'
            ? '0 0 0 8px rgba(239,68,68,.2), 0 8px 24px rgba(239,68,68,.4)'
            : '0 0 0 0 transparent, 0 8px 24px rgba(99,102,241,.4)',
          transition: 'all .3s',
          animation: state === 'listening' ? 'voicePulse 1.2s ease-in-out infinite' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title={state === 'listening' ? 'Stop listening' : 'Start voice command'}
      >
        {state === 'processing' ? <span style={{ fontSize: 14 }} className="spinner"></span> : state === 'speaking' ? '🔊' : state === 'listening' ? '⏹' : '🎤'}
      </button>

      {/* Voice panel */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 96, right: 28, zIndex: 199,
          width: 340, background: 'var(--card)',
          border: '1px solid var(--border)', borderRadius: 16,
          boxShadow: '0 16px 48px rgba(0,0,0,.5)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 16 }}>🎤</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Voice Control</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Qwen AI-powered · en-US</div>
              </div>
            </div>
            <button onClick={() => { setIsOpen(false); synthRef.current?.cancel(); recognitionRef.current?.stop(); setState('idle'); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 16, padding: 4 }}>✕</button>
          </div>

          {/* Visualizer */}
          <div style={{ padding: '20px 16px 16px', textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto 14px',
              background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, border: `2px solid ${cfg.color}`,
              animation: state === 'listening' ? 'voiceRing 1.5s ease-in-out infinite' : 'none',
            }}>
              {cfg.icon}
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: cfg.color, marginBottom: 8 }}>{cfg.label}</div>

            {transcript && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', background: 'rgba(0,0,0,.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontStyle: 'italic' }}>
                "{transcript}"
              </div>
            )}

            {result && (
              <div style={{
                padding: '10px 12px', borderRadius: 8, marginBottom: 10, textAlign: 'left', fontSize: 13,
                background: result.action === 'error' ? 'rgba(239,68,68,.08)' : 'rgba(99,102,241,.08)',
                border: `1px solid ${result.action === 'error' ? 'rgba(239,68,68,.2)' : 'rgba(99,102,241,.2)'}`,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 4, color: result.action === 'error' ? '#f87171' : '#a5b4fc' }}>
                  {result.action === 'navigate' ? '↗ Navigating' : result.action === 'info' ? '💬 Answer' : result.action === 'ticket_created' ? '✅ Ticket Created' : result.action === 'approved' ? '✅ Approved' : result.action === 'help' ? '💡 Help' : '🤖 Result'}
                </div>
                <div style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{result.message}</div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
              {(state === 'idle' || state === 'error') && (
                <button className="btn btn-primary btn-sm" onClick={() => { setState('idle'); startListening(); }}>
                  🎤 Speak
                </button>
              )}
              {state === 'listening' && (
                <button className="btn btn-danger btn-sm" onClick={stopAndProcess}>
                  ⏹ Stop
                </button>
              )}
              {state === 'speaking' && (
                <button className="btn btn-ghost btn-sm" onClick={() => synthRef.current?.cancel()}>
                  🔇 Stop Speaking
                </button>
              )}
            </div>

            {/* Quick commands */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Quick commands</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {[
                  'Show tickets', 'Open metrics',
                  'How many pending', 'Approve first ticket',
                  'Open incidents', 'System status',
                ].map(cmd => (
                  <button key={cmd} onClick={() => { setTranscript(cmd); setState('processing'); }}
                    style={{ background: 'rgba(99,102,241,.06)', border: '1px solid rgba(99,102,241,.12)', borderRadius: 6, padding: '5px 8px', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', textAlign: 'left' }}>
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '10px 16px', maxHeight: 140, overflowY: 'auto' }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>History</div>
              {history.slice(0, 5).map((h, i) => (
                <div key={i} style={{ marginBottom: 6, fontSize: 11, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>{h.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span style={{ color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{h.transcript}"</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes voicePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,.4), 0 8px 24px rgba(239,68,68,.4); }
          50% { box-shadow: 0 0 0 12px rgba(239,68,68,.1), 0 8px 24px rgba(239,68,68,.4); }
        }
        @keyframes voiceRing {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
      `}</style>
    </>
  );
}
