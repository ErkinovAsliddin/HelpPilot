// src/frontend/src/components/TicketTable/TicketTable.tsx
import { useNavigate } from 'react-router-dom';
import type { Ticket } from '../../api/client.ts';
import StatusBadge from '../shared/StatusBadge.tsx';
import PriorityBadge from '../shared/PriorityBadge.tsx';

export default function TicketTable({ tickets }: { tickets: Ticket[] }) {
  const navigate = useNavigate();
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <thead>
        <tr style={{ background: '#f8fafc' }}>
          {['Received', 'Subject', 'Priority', 'Category', 'Status'].map((h) => (
            <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tickets.map((t) => (
          <tr
            key={t.id}
            onClick={() => navigate(`/tickets/${t.id}`)}
            style={{ cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '')}
          >
            <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>
              {new Date(t.received_at).toLocaleString()}
            </td>
            <td style={{ padding: '12px 16px', fontSize: 13, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.subject || '(no subject)'}
            </td>
            <td style={{ padding: '12px 16px' }}><PriorityBadge priority={t.priority} /></td>
            <td style={{ padding: '12px 16px', fontSize: 13 }}>{t.category || '—'}</td>
            <td style={{ padding: '12px 16px' }}><StatusBadge status={t.status} /></td>
          </tr>
        ))}
        {tickets.length === 0 && (
          <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>No tickets found</td></tr>
        )}
      </tbody>
    </table>
  );
}
