// src/frontend/src/pages/SubmitTicketPage.tsx
import React, { useState } from 'react';
import { apiClient } from '../api/client.ts';

export default function SubmitTicketPage() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await apiClient.post('/tickets', { subject, body, submitter_email: email });
      setResult(res.data);
      setSubject(''); setBody(''); setEmail('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit ticket');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <h1 style={{ marginTop: 0, fontSize: 22 }}>📩 Submit a Ticket</h1>
      <form onSubmit={submit} style={{ background: '#fff', borderRadius: 8, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Subject</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={255}
            placeholder="e.g. Cannot login to my account"
            style={{ width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Body <span style={{ color: '#6b7280', fontWeight: 400 }}>(describe your issue)</span></label>
          <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={10000} rows={5}
            placeholder="I forgot my password and the reset link is not working..."
            style={{ width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14, resize: 'vertical' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Your Email <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional)</span></label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email"
            placeholder="you@company.com"
            style={{ width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14 }} />
        </div>
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 4, padding: 10, color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {result && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 4, padding: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: 600, color: '#15803d', marginBottom: 4 }}>✅ Ticket submitted!</div>
            <div style={{ fontSize: 13, color: '#374151' }}>ID: <code>{result.ticketId}</code></div>
            <div style={{ fontSize: 13, color: '#374151' }}>Status: {result.status} — processing has started automatically.</div>
          </div>
        )}
        <button type="submit" disabled={loading || (!subject && !body)}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Submitting…' : 'Submit Ticket'}
        </button>
      </form>
    </div>
  );
}
