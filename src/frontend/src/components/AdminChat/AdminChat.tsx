import { useState, useRef, useEffect } from 'react';
import { apiClient } from '../../api/client.ts';

interface Message { role: 'user'|'assistant'; text: string; ts: Date; }

const SUGGESTIONS = [
  'How many tickets today?',
  'Show critical tickets',
  'Auto-resolution rate?',
  'Which category is trending?',
  'Any VIP accounts?',
  'How many incidents open?',
];

export default function AdminChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role:'assistant', text:'👋 Hi! I\'m your Admin AI Assistant. Ask me anything about your helpdesk data — tickets, trends, metrics, incidents.', ts:new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const send = async (msg: string) => {
    if (!msg.trim() || loading) return;
    const userMsg: Message = { role:'user', text: msg.trim(), ts: new Date() };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const r = await apiClient.post('/chat/admin', { message: msg.trim() });
      setMessages(m => [...m, { role:'assistant', text: r.data.reply || 'No response', ts: new Date() }]);
    } catch {
      setMessages(m => [...m, { role:'assistant', text: 'Sorry, I\'m having trouble connecting. Please try again.', ts: new Date() }]);
    } finally { setLoading(false); }
  };

  // Simple markdown → JSX
  const renderText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const html = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.+?)`/g, '<code style="background:rgba(99,102,241,.15);padding:1px 5px;border-radius:3px;font-family:monospace;font-size:11px">$1</code>');
      if (line.startsWith('- ')) return <div key={i} style={{paddingLeft:12,display:'flex',gap:6}}><span style={{color:'#6366f1',flexShrink:0}}>›</span><span dangerouslySetInnerHTML={{__html:html.slice(2)}} /></div>;
      if (line.startsWith('## ') || line.startsWith('### ')) return <div key={i} style={{fontWeight:700,color:'#a5b4fc',marginTop:6,marginBottom:2}} dangerouslySetInnerHTML={{__html:html.replace(/^#+\s/,'')}} />;
      if (!line.trim()) return <div key={i} style={{height:4}} />;
      return <span key={i} dangerouslySetInnerHTML={{__html:html+' '}} />;
    });
  };

  return (
    <>
      {/* Toggle button */}
      <button onClick={() => setOpen(!open)} style={{
        position:'fixed', bottom:96, left:28, zIndex:200,
        width:52, height:52, borderRadius:'50%',
        background: open ? 'linear-gradient(135deg,#4338ca,#6366f1)' : 'linear-gradient(135deg,#1e2131,#252840)',
        border:'1px solid rgba(99,102,241,.4)', color: open ? '#fff' : '#a5b4fc',
        fontSize:22, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 4px 16px rgba(99,102,241,.25)', transition:'all .2s',
      }} title="Admin Chat Assistant">
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div style={{
          position:'fixed', bottom:158, left:28, zIndex:199,
          width:360, height:520, display:'flex', flexDirection:'column',
          background:'var(--card)', border:'1px solid rgba(99,102,241,.25)',
          borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,.6)', overflow:'hidden',
        }}>
          {/* Header */}
          <div style={{padding:'12px 16px',background:'var(--bg2)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:'linear-gradient(135deg,#6366f1,#4f46e5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>💬</div>
            <div>
              <div style={{fontWeight:700,fontSize:13}}>Admin AI Assistant</div>
              <div style={{fontSize:10,color:'var(--text-dim)'}}>Natural language · live data</div>
            </div>
            <span className="ai-badge" style={{marginLeft:'auto'}}>qwen-plus</span>
          </div>

          {/* Messages */}
          <div style={{flex:1,overflowY:'auto',padding:'12px 14px',display:'flex',flexDirection:'column',gap:8}}>
            {messages.map((msg, i) => (
              <div key={i} style={{display:'flex',flexDirection:'column',alignItems:msg.role==='user'?'flex-end':'flex-start'}}>
                <div style={{
                  maxWidth:'88%', padding:'9px 12px', borderRadius:msg.role==='user'?'12px 12px 2px 12px':'12px 12px 12px 2px',
                  background: msg.role==='user' ? 'linear-gradient(135deg,#6366f1,#4338ca)' : 'var(--bg2)',
                  border: msg.role==='assistant' ? '1px solid var(--border)' : 'none',
                  fontSize:13, lineHeight:1.5, color:'var(--text)',
                }}>
                  {msg.role==='assistant' ? <div style={{wordBreak:'break-word'}}>{renderText(msg.text)}</div> : msg.text}
                </div>
                <div style={{fontSize:10,color:'var(--text-dim)',marginTop:2,paddingLeft:2,paddingRight:2}}>
                  {msg.ts.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{alignSelf:'flex-start',padding:'9px 12px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'12px 12px 12px 2px',display:'flex',gap:4}}>
                {[0,1,2].map(j => <span key={j} style={{width:6,height:6,borderRadius:'50%',background:'#6366f1',animation:`dotBounce 1.2s ease-in-out ${j*0.2}s infinite`}}></span>)}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 2 && (
            <div style={{padding:'6px 12px',borderTop:'1px solid var(--border)',display:'flex',gap:4,flexWrap:'wrap'}}>
              {SUGGESTIONS.slice(0,4).map(s => (
                <button key={s} onClick={() => send(s)} style={{background:'rgba(99,102,241,.08)',border:'1px solid rgba(99,102,241,.15)',borderRadius:12,padding:'3px 9px',fontSize:11,color:'#a5b4fc',cursor:'pointer'}}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{padding:'10px 12px',borderTop:'1px solid var(--border)',display:'flex',gap:8}}>
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input);} }}
              placeholder="Ask about tickets, trends, metrics…"
              style={{flex:1,background:'rgba(0,0,0,.2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',color:'var(--text)',fontSize:13}}
              disabled={loading}
            />
            <button onClick={()=>send(input)} disabled={!input.trim()||loading}
              style={{width:36,height:36,borderRadius:8,background:'var(--primary)',border:'none',color:'#fff',fontSize:16,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',opacity:!input.trim()||loading?0.5:1}}>
              {loading ? <span className="spinner" style={{width:12,height:12}}/> : '→'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dotBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
      `}</style>
    </>
  );
}
