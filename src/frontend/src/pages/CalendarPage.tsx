import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.ts';

interface CalEvent {
  id: string; type: string; title: string;
  start: string; end: string; color: string;
  url?: string; priority?: string;
}

const TYPE_LABELS: Record<string, string> = {
  ticket_review: '📋 Review',
  interview:     '🗓 Interview',
  stale:         '⚠️ Stale',
  incident:      '⚡ Incident',
};

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [today] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [view, setView] = useState<'month'|'week'|'list'>('month');
  const navigate = useNavigate();

  const load = () => {
    apiClient.get('/calendar/events').then(r => setEvents(r.data.events || [])).catch(() => {});
  };
  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, []);

  const getEventsForDay = (date: Date) => events.filter(e => {
    const d = new Date(e.start);
    return d.getFullYear()===date.getFullYear() && d.getMonth()===date.getMonth() && d.getDate()===date.getDate();
  });

  // Month grid
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const lastDay  = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 0);
  const startPad = firstDay.getDay();
  const cells: (Date|null)[] = [...Array(startPad).fill(null)];
  for (let d=1; d<=lastDay.getDate(); d++) cells.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1));

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];
  const upcomingEvents = events.filter(e => new Date(e.start) >= new Date()).sort((a,b) => new Date(a.start).getTime()-new Date(b.start).getTime()).slice(0,10);

  const counts = {
    ticket_review: events.filter(e=>e.type==='ticket_review').length,
    interview:     events.filter(e=>e.type==='interview').length,
    incident:      events.filter(e=>e.type==='incident').length,
    stale:         events.filter(e=>e.type==='stale').length,
  };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-left">
          <h1>📅 Calendar</h1>
          <p>Ticket deadlines · Interview schedules · Incidents — all in one view</p>
        </div>
        <div className="topbar-actions">
          {(['month','week','list'] as const).map(v => (
            <button key={v} className={`btn btn-sm ${view===v?'btn-primary':'btn-ghost'}`} onClick={() => setView(v)} style={{textTransform:'capitalize'}}>{v}</button>
          ))}
        </div>
      </div>

      <div className="page">
        {/* Summary row */}
        <div className="metrics-grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',marginBottom:20}}>
          <div className="metric-card orange"><div className="metric-glow"></div><div className="metric-icon">📋</div><div className="metric-value">{counts.ticket_review}</div><div className="metric-label">Pending Reviews</div></div>
          <div className="metric-card green"><div className="metric-glow"></div><div className="metric-icon">🗓</div><div className="metric-value">{counts.interview}</div><div className="metric-label">Interviews</div></div>
          <div className="metric-card purple"><div className="metric-glow"></div><div className="metric-icon">⚡</div><div className="metric-value">{counts.incident}</div><div className="metric-label">Incidents</div></div>
          <div className="metric-card red"><div className="metric-glow"></div><div className="metric-icon">⚠️</div><div className="metric-value">{counts.stale}</div><div className="metric-label">Stale Tickets</div></div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:16,alignItems:'start'}}>
          {/* Main calendar */}
          <div className="card" style={{overflow:'hidden'}}>
            {/* Nav */}
            <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <button className="btn btn-ghost btn-sm" onClick={prevMonth}>‹</button>
                <span style={{fontWeight:700,fontSize:15}}>{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                <button className="btn btn-ghost btn-sm" onClick={nextMonth}>›</button>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewDate(new Date())}>Today</button>
            </div>

            {view === 'month' && (
              <>
                {/* Day headers */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'1px solid var(--border)'}}>
                  {DAYS.map(d=><div key={d} style={{padding:'8px 4px',textAlign:'center',fontSize:11,fontWeight:700,color:'var(--text-dim)',textTransform:'uppercase',letterSpacing:'.05em'}}>{d}</div>)}
                </div>
                {/* Cells */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
                  {cells.map((date, i) => {
                    if (!date) return <div key={`e${i}`} style={{minHeight:80,borderRight:'1px solid rgba(31,41,55,.5)',borderBottom:'1px solid rgba(31,41,55,.5)'}}/>;
                    const dayEvents = getEventsForDay(date);
                    const isToday = date.toDateString()===today.toDateString();
                    const isSelected = selectedDay?.toDateString()===date.toDateString();
                    const isWeekend = date.getDay()===0||date.getDay()===6;
                    return (
                      <div key={i} onClick={() => setSelectedDay(date)}
                        style={{minHeight:80,padding:'6px 4px',borderRight:'1px solid rgba(31,41,55,.5)',borderBottom:'1px solid rgba(31,41,55,.5)',cursor:'pointer',background:isSelected?'rgba(99,102,241,.1)':isWeekend?'rgba(0,0,0,.08)':'transparent',transition:'background .15s'}}
                        onMouseEnter={e=>{if(!isSelected)e.currentTarget.style.background='rgba(99,102,241,.06)';}}
                        onMouseLeave={e=>{if(!isSelected)e.currentTarget.style.background=isWeekend?'rgba(0,0,0,.08)':'transparent';}}>
                        <div style={{display:'flex',justifyContent:'center',marginBottom:4}}>
                          <span style={{width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'50%',fontSize:12,fontWeight:isToday?800:500,background:isToday?'#6366f1':'transparent',color:isToday?'#fff':isWeekend?'var(--text-dim)':'var(--text)'}}>
                            {date.getDate()}
                          </span>
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:2}}>
                          {dayEvents.slice(0,2).map(ev=>(
                            <div key={ev.id} style={{fontSize:9,padding:'1px 4px',borderRadius:3,background:`${ev.color}22`,color:ev.color,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:600}}>
                              {ev.title.slice(0,18)}
                            </div>
                          ))}
                          {dayEvents.length>2&&<div style={{fontSize:9,color:'var(--text-dim)',paddingLeft:4}}>+{dayEvents.length-2} more</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {view === 'list' && (
              <div style={{padding:16,display:'flex',flexDirection:'column',gap:8}}>
                {upcomingEvents.length===0?<div style={{textAlign:'center',padding:32,color:'var(--text-dim)'}}>No upcoming events</div>:
                  upcomingEvents.map(ev=>(
                    <div key={ev.id} onClick={()=>ev.url&&navigate(ev.url)} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:10,background:'var(--bg2)',border:`1px solid ${ev.color}22`,cursor:ev.url?'pointer':'default',transition:'border-color .15s'}}
                      onMouseEnter={e=>{if(ev.url)e.currentTarget.style.borderColor=ev.color+'55';}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=ev.color+'22';}}>
                      <div style={{width:4,height:36,borderRadius:2,background:ev.color,flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.title}</div>
                        <div style={{fontSize:11,color:'var(--text-dim)',marginTop:2}}>{new Date(ev.start).toLocaleString()}</div>
                      </div>
                      <span style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:`${ev.color}15`,color:ev.color,fontWeight:700,flexShrink:0}}>{TYPE_LABELS[ev.type]||ev.type}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* Sidebar: selected day or upcoming */}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {selectedDay && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title" style={{fontSize:13}}>{selectedDay.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
                </div>
                <div className="card-body" style={{padding:'12px 14px'}}>
                  {selectedEvents.length===0?<div style={{fontSize:12,color:'var(--text-dim)',textAlign:'center',padding:'12px 0'}}>No events</div>:
                    selectedEvents.map(ev=>(
                      <div key={ev.id} onClick={()=>ev.url&&navigate(ev.url)} style={{padding:'8px 10px',borderRadius:8,marginBottom:8,cursor:ev.url?'pointer':'default',border:`1px solid ${ev.color}22`,background:`${ev.color}08`}}>
                        <div style={{fontSize:12,fontWeight:700,color:ev.color,marginBottom:3}}>{TYPE_LABELS[ev.type]||ev.type}</div>
                        <div style={{fontSize:12,color:'var(--text)'}}>{ev.title}</div>
                        <div style={{fontSize:11,color:'var(--text-dim)',marginTop:2}}>{new Date(ev.start).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-header"><div className="card-title" style={{fontSize:13}}>⏰ Upcoming</div></div>
              <div className="card-body" style={{padding:'10px 14px'}}>
                {upcomingEvents.slice(0,6).map(ev=>(
                  <div key={ev.id} onClick={()=>ev.url&&navigate(ev.url)} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:10,cursor:ev.url?'pointer':'default'}}>
                    <div style={{width:3,height:'100%',minHeight:32,borderRadius:2,background:ev.color,flexShrink:0,marginTop:3}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.title}</div>
                      <div style={{fontSize:10,color:'var(--text-dim)'}}>{new Date(ev.start).toLocaleDateString([],{month:'short',day:'numeric'})} · {new Date(ev.start).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                  </div>
                ))}
                {upcomingEvents.length===0&&<div style={{fontSize:12,color:'var(--text-dim)',textAlign:'center',padding:'8px 0'}}>No upcoming events</div>}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><div className="card-title" style={{fontSize:13}}>🔑 Legend</div></div>
              <div className="card-body" style={{padding:'10px 14px'}}>
                {[['#f97316','📋 Ticket Review Deadline'],['#10b981','🗓 Scheduled Interview'],['#8b5cf6','⚡ Incident'],['#6b7280','⚠️ Stale Ticket']].map(([c,l])=>(
                  <div key={l} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <div style={{width:12,height:12,borderRadius:3,background:c,flexShrink:0}}/>
                    <span style={{fontSize:12,color:'var(--text-muted)'}}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
