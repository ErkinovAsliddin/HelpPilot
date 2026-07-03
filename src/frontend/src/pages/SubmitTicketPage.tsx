// Features 2 (Clarification Wizard) + 8 (Multilingual Demo)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.ts';

const EXAMPLES = [
  { subject: 'Cannot login - password forgotten', body: 'Hi, I forgot my Windows password and the reset link in my email is not working. I have an important presentation in 2 hours. Please help urgently!' },
  { subject: 'Office WiFi not connecting', body: 'The WiFi in conference room B keeps dropping every 10 minutes. This has been happening since this morning and is affecting our team meeting.' },
  { subject: 'Excel keeps crashing', body: 'Microsoft Excel crashes every time I try to open files larger than 5MB. Running Windows 11, Office 365. Already tried restarting.' },
];

const MULTILINGUAL_TICKETS = [
  { lang: 'FR', subject: 'Impossible de se connecter - mot de passe oublié', body: "Bonjour, j'ai oublié mon mot de passe Windows et le lien de réinitialisation dans mon e-mail ne fonctionne pas. J'ai une présentation importante dans 2 heures. Merci de m'aider d'urgence!" },
  { lang: 'ES', subject: 'No puedo conectarme a la VPN', body: 'Necesito ayuda urgente con la VPN. Cada vez que intento conectarme me aparece el error "Authentication failed". Trabajo desde casa y necesito acceso ahora mismo.' },
  { lang: 'JA', subject: 'パスワードをリセットできません', body: 'Windowsのパスワードを忘れました。リセットリンクも機能しません。重要な会議まであと2時間しかありません。至急対応をお願いします。' },
];

interface Question {
  id: string;
  text: string;
  options?: string[] | null;
}

type Step = 'form' | 'clarify' | 'done';

export default function SubmitTicketPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ subject: '', body: '', email: '' });
  const [step, setStep] = useState<Step>('form');
  const [ticketId, setTicketId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Multilingual demo
  const [mlLoading, setMlLoading] = useState(false);
  const [mlProgress, setMlProgress] = useState<Record<string, 'pending' | 'done' | 'error'>>({});
  const [mlResults, setMlResults] = useState<{ lang: string; ticketId: string }[]>([]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await apiClient.post<{ ticketId: string; clarifying: boolean; questions: Question[] }>('/tickets', {
        subject: form.subject, body: form.body,
        submitter_email: form.email || undefined,
      });
      const data = res.data;
      setTicketId(data.ticketId);

      if (data.clarifying) {
        // If server says clarifying but no questions, fetch them
        if (!data.questions?.length) {
          const cRes = await apiClient.post<{ shouldAsk: boolean; questions: Question[] }>('/clarify/check', {
            subject: form.subject, body: form.body,
          });
          if (cRes.data.shouldAsk && cRes.data.questions?.length) {
            setQuestions(cRes.data.questions);
          } else {
            navigate(`/tickets/${data.ticketId}`);
            return;
          }
        } else {
          setQuestions(data.questions);
        }
        setStep('clarify');
      } else {
        navigate(`/tickets/${data.ticketId}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit ticket');
    } finally { setLoading(false); }
  };

  const submitAnswers = async () => {
    setLoading(true); setError('');
    try {
      const answersArr = questions.map(q => ({
        id: q.id, question: q.text, text: answers[q.id] || '',
      }));
      await apiClient.post('/clarify/answer', { ticketId, answers: answersArr });
      navigate(`/tickets/${ticketId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit answers');
    } finally { setLoading(false); }
  };

  const skipClarify = () => navigate(`/tickets/${ticketId}`);

  const fill = (ex: typeof EXAMPLES[0]) => setForm(f => ({ ...f, subject: ex.subject, body: ex.body }));

  const submitMultilingual = async () => {
    setMlLoading(true);
    setMlProgress({ FR: 'pending', ES: 'pending', JA: 'pending' });
    setMlResults([]);

    const results = await Promise.allSettled(
      MULTILINGUAL_TICKETS.map(async (t) => {
        const res = await apiClient.post<{ ticketId: string }>('/tickets', {
          subject: t.subject, body: t.body,
        });
        setMlProgress(p => ({ ...p, [t.lang]: 'done' }));
        return { lang: t.lang, ticketId: res.data.ticketId };
      })
    );

    const successful = results
      .filter((r): r is PromiseFulfilledResult<{ lang: string; ticketId: string }> => r.status === 'fulfilled')
      .map(r => r.value);

    results.forEach((r, i) => {
      if (r.status === 'rejected') setMlProgress(p => ({ ...p, [MULTILINGUAL_TICKETS[i].lang]: 'error' }));
    });

    setMlResults(successful);
    setMlLoading(false);
  };

  if (step === 'clarify') {
    return (
      <div>
        <div className="topbar">
          <div className="topbar-left">
            <h1>🎯 Help us help you faster</h1>
            <p>A few quick questions to speed up your resolution</p>
          </div>
          <span className="tag">Step 2 of 2</span>
        </div>
        <div className="page">
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">🎯 Clarifying Questions</div>
                <span className="ai-badge">Qwen</span>
              </div>
              <div className="card-body">
                {error && <div className="alert alert-error">{error}</div>}
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                  Your ticket has been created (ID: <code style={{ fontFamily: 'monospace', fontSize: 11 }}>{ticketId.slice(0, 14)}…</code>).
                  Answering these questions helps us resolve it faster.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {questions.map((q, i) => (
                    <div key={q.id}>
                      <label className="form-label">{i + 1}. {q.text}</label>
                      {q.options && q.options.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {q.options.map((opt) => (
                            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                              <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt}
                                onChange={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                                style={{ accentColor: '#6366f1' }} />
                              {opt}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <textarea className="form-input" rows={3}
                          value={answers[q.id] || ''}
                          onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                          placeholder="Type your answer…" />
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                    onClick={submitAnswers} disabled={loading}>
                    {loading ? <><span className="spinner" style={{ width: 14, height: 14 }}></span> Submitting…</> : '✅ Submit with Answers'}
                  </button>
                  <button className="btn btn-ghost" onClick={skipClarify}>Skip →</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>📩 Submit New Ticket</h1>
          <p>The AI pipeline will automatically classify, analyze, and resolve your request</p>
        </div>
      </div>

      <div className="page">
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Form */}
          <div>
            <div className="card">
              <div className="card-header">
                <div className="card-title">✍️ Ticket Details</div>
                <span className="tag">Step 1 of 2</span>
              </div>
              <div className="card-body">
                <form onSubmit={submit}>
                  {error && <div className="alert alert-error">{error}</div>}

                  <div style={{ marginBottom: 16 }}>
                    <label className="form-label">Subject <span style={{ color: '#f87171' }}>*</span></label>
                    <input className="form-input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                      placeholder="Brief description of your issue" maxLength={255} />
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{form.subject.length}/255</div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label className="form-label">Description <span style={{ color: '#f87171' }}>*</span></label>
                    <textarea className="form-input" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                      placeholder="Describe your issue in detail — include any error messages, steps to reproduce, and urgency…" rows={6} maxLength={10000} />
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{form.body.length}/10,000</div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label className="form-label">Your Email <span style={{ color: 'var(--text-dim)' }}>(optional)</span></label>
                    <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="you@company.com" />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 14 }}
                    disabled={loading || (!form.subject && !form.body)}>
                    {loading ? <><span className="spinner" style={{ width: 14, height: 14 }}></span> Submitting…</> : '🚀 Submit Ticket'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right side info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Pipeline steps */}
            <div className="card">
              <div className="card-header"><div className="card-title">⚡ What happens next?</div></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { step: '1', icon: '🤖', title: 'AI Classification', desc: 'Qwen AI classifies priority, category & sentiment' },
                  { step: '2', icon: '💭', title: 'Emotion Analysis', desc: 'Detects urgency, frustration & churn risk' },
                  { step: '3', icon: '🔍', title: 'Knowledge Base Search', desc: 'Vector similarity search across IT articles' },
                  { step: '4', icon: '✍️', title: 'Response Generation', desc: 'Qwen Max generates a personalized solution' },
                  { step: '5', icon: '👤', title: 'Human Review', desc: 'Admin approves before sending (HITL)' },
                ].map(s => (
                  <div key={s.step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#a5b4fc', flexShrink: 0 }}>{s.step}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.icon} {s.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick fill examples */}
            <div className="card">
              <div className="card-header"><div className="card-title">💡 Quick Examples</div></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {EXAMPLES.map((ex, i) => (
                  <button key={i} onClick={() => fill(ex)} className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', textAlign: 'left' }}>
                    {ex.subject}
                  </button>
                ))}
              </div>
            </div>

            {/* Feature 8: Multilingual Demo */}
            <div className="card" style={{ border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.04)' }}>
              <div className="card-header" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
                <div className="card-title">🌍 Multilingual Demo</div>
                <span className="ai-badge">Hackathon</span>
              </div>
              <div className="card-body">
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                  Submit 3 tickets in different languages simultaneously — watch them get classified and translated automatically!
                </p>

                {mlResults.length === 0 ? (
                  <>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                      {MULTILINGUAL_TICKETS.map(t => (
                        <div key={t.lang} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 16 }}>{t.lang === 'FR' ? '🇫🇷' : t.lang === 'ES' ? '🇪🇸' : '🇯🇵'}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{t.lang}</span>
                          {mlLoading && (
                            <span>
                              {mlProgress[t.lang] === 'done' ? '✅' :
                               mlProgress[t.lang] === 'error' ? '❌' :
                               <span className="spinner" style={{ width: 10, height: 10 }}></span>}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                      onClick={submitMultilingual} disabled={mlLoading}>
                      {mlLoading
                        ? <><span className="spinner" style={{ width: 14, height: 14 }}></span> Submitting 3 tickets…</>
                        : '🚀 Submit tickets in 3 languages simultaneously'}
                    </button>
                  </>
                ) : (
                  <div>
                    <div className="alert alert-success" style={{ marginBottom: 12 }}>
                      ✅ {mlResults.length} tickets submitted in {mlResults.map(r => r.lang).join('/')} — watch them get classified and translated automatically!
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {mlResults.map(r => (
                        <button key={r.ticketId} className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}
                          onClick={() => navigate(`/tickets/${r.ticketId}`)}>
                          <span>{r.lang === 'FR' ? '🇫🇷' : r.lang === 'ES' ? '🇪🇸' : '🇯🇵'}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.ticketId.slice(0, 16)}…</span>
                          <span style={{ marginLeft: 'auto' }}>→</span>
                        </button>
                      ))}
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
                      onClick={() => { setMlResults([]); setMlProgress({}); }}>
                      Reset Demo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
