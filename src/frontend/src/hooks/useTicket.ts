// src/frontend/src/hooks/useTicket.ts
import { useState, useEffect } from 'react';
import { apiClient, type Ticket } from '../api/client.ts';

const TERMINAL = new Set(['resolved', 'escalated', 'delivery-failed', 'enqueue-failed']);

export function useTicket(id: string) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetch = async () => {
      try {
        const res = await apiClient.get<Ticket>(`/tickets/${id}`);
        if (active) setTicket(res.data);
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    };

    fetch();
    const id_ = setInterval(() => {
      if (!ticket || !TERMINAL.has(ticket.status)) fetch();
    }, 5000);

    return () => { active = false; clearInterval(id_); };
  }, [id]);

  return { ticket, loading };
}
