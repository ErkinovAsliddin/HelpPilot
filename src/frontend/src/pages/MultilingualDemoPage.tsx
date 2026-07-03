import { useState } from 'react';
import { apiClient } from '../api/client.ts';

const DEMO_TICKET = { subject: 'Cannot login to VPN', body: 'I am unable to connect to the company VPN. It shows an authentication error every time I try. I need access urgently for a client presentation tomorrow morning.' };

const LANGUAGES = [
  { code: 'fr', name: 'French 🇫🇷',    subject: 'Impossible de se connecter au VPN', body: 'Je n\'arrive pas à me connecter au VPN de l\'entreprise. Il affiche une erreur d\'authentification à chaque tentative. J\'ai besoin d\'un accès urgent pour une présentation client demain matin.' },
  { code: 'es', name: 'Spanish 🇪🇸',   subject: 'No puedo conectarme a la VPN', body: 'No puedo conectarme a la VPN de la empresa. Muestra un error de autenticación cada vez que lo intento. Necesito acceso urgente para una presentación con el cliente mañana por la mañana.' },
  { code: 'ja', name: 'Japanese 🇯🇵',  subject: 'VPNに接続できません', body: '会社のVPNに接続できません。試みるたびに認証エラーが表示されます。明日の朝のクライアントプレゼンテーションに向けて、緊急でアクセスが必要です。' },
  { code: 'de', name: 'German 🇩🇪',    subject: 'Kann keine VPN-Verbindung herstellen', body: 'Ich kann keine Verbindung zum VPN des Unternehmens herstellen. Es zeigt jedes Mal einen Authentifizierungsfehler an. Ich brauche dringend Zugang für eine Kundenpräsentation morgen früh.' },
  { code: 'zh', name: 'Chinese 🇨🇳',   subject: '无法连接VPN', body: '我无法连接公司VPN。每次尝试都显示认证错误。我明天上午有客户演示，急需访问权限。' },
];

interface TicketResult { lang: string; name: string; ticketId?: string; status: 'idle'|'submitting'|'submitted'|'error'; category?: string; priority?: string; sentiment?: string; detected_language?: string; error?: string; }

export default function MultilingualDemoPage() {
  const [results, setResults] = useState<TicketResult[]>(LANGUAGES.map(l => ({ lang: l.code, name: l.name, status: 'idle' })));
  const [running, setRunning] = useState(false);

  const runDemo = async () => {
    setRunning(true);
    setResults(LANGUAGES.map(l => ({ lang: l.code, name: l.name, status: 'submitting' })));

    await Promise.all(LANGUAGES.map(async (lang, i) => {
      try {
        const res = await apiClient.post('/tickets', { subject: lang.subject, body: lang.body, submitter_email: `demo-${lang.code}@test.com` });
        const { ticketId } = res.data;
        setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'submitted', ticketId } : r));

        // Poll for classification result
        for (let attempt = 0; attempt < 20; attempt++) {
          await new Promise(r => setTimeout(r, 2000));
          const t = await apiClient.get(`/tickets/${ticketId}`);
          const ticket = t.data;
          if (ticket.category) {
            setResults(prev => prev.map((r, idx) => idx === i ? {
              ...r, status: 'submitted', category: ticket.category,
              priority: ticket.priority, sentiment: ticket.sentiment,
              detected_language: ticket.detected_language,
            } : r));
            break;
          }
        }
      } catch (e: any) {
        setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'error', error: e.message } : r));
      }
    }));

    setRunning(false);
  };

  const reset = () => { setResults(LANGUAGES.map(l => ({ lang: l.code, name: l.name, status: 'idle' }))); setRunning(false); };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>🌍 Multilingual Demo</h1>
          <p>Submit the same ticket in 5 languages simultaneously — watch Qwen detect, translate, and classify in real-time</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-ghost btn-sm" onClick={reset} disabled={running}>Reset</button>
          <button className="btn btn-primary" onClick={runDemo} disabled={running} style={{padding:'8px 20px'}}>
            {running ? <><span className="spinner" style={{width:14,height:14}}></span> Running Demo…</> : '🚀 Launch Multilingual Demo'}
          </button>
        </div>
      </div>

      <div className="page">
        {/* Original ticket */}
        <div className="card" style={{marginBottom:20,border:'1px solid rgba(99,102,241,.3)'}}>
          <div className="card-header"><div className="card-title">📄 Original Ticket (English)</div></div>
          <div className="card-body">
            <div style={{fontWeight:700,marginBottom:4}}>{DEMO_TICKET.subject}</div>
            <div style={{fontSize:13,color:'var(--text-muted)'}}>{DEMO_TICKET.body}</div>
          </div>
        </div>

        {/* Language results grid */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
          {results.map((r, i) => {
            const lang = LANGUAGES[i];
            return (
              <div key={r.lang} className="card" style={{border: r.status==='submitted' && r.category ? '1px solid rgba(16,185,129,.25)' : undefined}}>
                <div className="card-header" style={{paddingBottom:12}}>
                  <div className="card-title" style={{fontSize:15}}>{r.name}</div>
                  {r.status === 'submitting' && <span className="spinner" style={{width:14,height:14}}></span>}
                  {r.status === 'submitted' && r.category && <span style={{color:'var(--success)',fontSize:12}}>✅ Classified</span>}
                  {r.status === 'error' && <span style={{color:'var(--danger)',fontSize:12}}>❌ Error</span>}
                </div>
                <div className="card-body" style={{paddingTop:0}}>
                  {/* Translated subject */}
                  <div style={{fontSize:12,color:'var(--text-dim)',fontStyle:'italic',marginBottom:10,lineHeight:1.5}}>
                    "{lang.subject}"
                  </div>

                  {r.status === 'idle' && <div style={{fontSize:12,color:'var(--text-dim)',textAlign:'center',padding:'16px 0'}}>Ready to submit</div>}
                  {r.status === 'submitting' && (
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {['Submitting…','Detecting language…','Translating…','Classifying…'].map((step, si) => (
                        <div key={si} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--text-dim)',opacity: si === 0 ? 1 : 0.5}}>
                          <span className="spinner" style={{width:10,height:10,opacity:si===0?1:0.3}}></span>{step}
                        </div>
                      ))}
                    </div>
                  )}
                  {r.status === 'submitted' && r.category && (
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                        <span className="tag">🌐 {r.detected_language || r.lang}</span>
                        <span className="tag">📁 {r.category?.replace(/-/g,' ')}</span>
                        <span className={`priority-badge ${r.priority||'medium'}`}>{r.priority}</span>
                      </div>
                      <div style={{fontSize:11,color:'var(--text-dim)',marginTop:4}}>
                        ✅ Detected as <strong style={{color:'var(--text)'}}>{r.detected_language || r.lang}</strong> → translated to English → classified as <strong style={{color:'var(--text)'}}>{r.category}</strong>
                      </div>
                    </div>
                  )}
                  {r.status === 'submitted' && !r.category && (
                    <div style={{fontSize:12,color:'var(--text-muted)',textAlign:'center',padding:'8px 0'}}>
                      <span className="spinner" style={{width:12,height:12}}></span> Processing pipeline…
                    </div>
                  )}
                  {r.status === 'error' && <div style={{fontSize:12,color:'#f87171'}}>{r.error}</div>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{marginTop:20,padding:16,background:'rgba(99,102,241,.06)',borderRadius:12,border:'1px solid rgba(99,102,241,.15)',fontSize:13,color:'var(--text-muted)',lineHeight:1.7}}>
          <strong style={{color:'var(--text)'}}>How it works:</strong> Each ticket is submitted simultaneously. The ClassifierAgent calls <strong>qwen-turbo</strong> to detect the language, then issues a second call to translate to English before classifying. All 5 tickets should reach the same category (<strong>network-issue</strong>) and priority, proving language-agnostic accuracy.
        </div>
      </div>
    </div>
  );
}
