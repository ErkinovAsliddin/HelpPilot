// src/frontend/src/hooks/useTickets.ts
import { useState, useEffect } from 'react';
import { apiClient, type Ticket } from '../api/client.ts';

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetch = async () => {
      try {
        const res = await apiClient.get<{ tickets: Ticket[] }>('/tickets');
        if (active) setTickets(res.data.tickets);
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    };

    fetch();
    const id = setInterval(fetch, 5000);
    return () => { active = false; clearInterval(id); };
  }, []);

  return { tickets, loading };
}
