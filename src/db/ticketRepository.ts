// src/db/ticketRepository.ts
import { getDb } from './schema.js';
import type { Ticket } from '../types/ticket.js';

export interface TicketFilters {
  status?: string;
  category?: string;
  priority?: string;
  adminId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface Pagination {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
}

export function insertTicket(ticket: Partial<Ticket> & { id: string; received_at: string }): void {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO tickets (
      id, subject, body, source_channel, submitter_email, status,
      received_at, source_modality
    ) VALUES (
      @id, @subject, @body, @source_channel, @submitter_email, @status,
      @received_at, @source_modality
    )
  `).run({
    id: ticket.id,
    subject: ticket.subject ?? null,
    body: ticket.body ?? null,
    source_channel: ticket.source_channel ?? 'api',
    submitter_email: ticket.submitter_email ?? null,
    status: ticket.status ?? 'received',
    received_at: ticket.received_at,
    source_modality: ticket.source_modality ?? 'text',
  });
}

export function getTicketById(id: string): Ticket | undefined {
  return getDb().prepare('SELECT * FROM tickets WHERE id = ?').get(id) as Ticket | undefined;
}

export function updateTicket(id: string, updates: Partial<Ticket>): void {
  const db = getDb();
  const entries = Object.entries(updates).filter(([k]) => k !== 'id' && k !== 'attachments');
  if (!entries.length) return;
  const sets = entries.map(([k]) => `${k} = @${k}`).join(', ');
  const params = Object.fromEntries(entries) as Record<string, unknown>;
  params['id'] = id;
  db.prepare(`UPDATE tickets SET ${sets} WHERE id = @id`).run(params);
}

export function listTickets(filters: TicketFilters = {}, pagination: Pagination = {}): Ticket[] {
  const db = getDb();
  const conds: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters.status) { conds.push('status = @status'); params['status'] = filters.status; }
  if (filters.category) { conds.push('category = @category'); params['category'] = filters.category; }
  if (filters.priority) { conds.push('priority = @priority'); params['priority'] = filters.priority; }
  if (filters.adminId) { conds.push('admin_id = @adminId'); params['adminId'] = filters.adminId; }
  if (filters.fromDate) { conds.push('received_at >= @fromDate'); params['fromDate'] = filters.fromDate; }
  if (filters.toDate) { conds.push('received_at <= @toDate'); params['toDate'] = filters.toDate; }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const sortBy = (pagination.sortBy || 'received_at').replace(/[^a-z_]/gi, '');
  const sortOrder = pagination.sortOrder === 'asc' ? 'ASC' : 'DESC';
  const pageSize = Math.min(Math.max(pagination.pageSize || 100, 1), 100);
  const offset = ((pagination.page || 1) - 1) * pageSize;
  params['pageSize'] = pageSize;
  params['offset'] = offset;

  return db.prepare(
    `SELECT * FROM tickets ${where} ORDER BY ${sortBy} ${sortOrder} LIMIT @pageSize OFFSET @offset`
  ).all(params) as Ticket[];
}

export function countTickets(filters: TicketFilters = {}): number {
  const db = getDb();
  const conds: string[] = [];
  const params: Record<string, unknown> = {};
  if (filters.status) { conds.push('status = @status'); params['status'] = filters.status; }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const row = db.prepare(`SELECT COUNT(*) as cnt FROM tickets ${where}`).get(params) as { cnt: number };
  return row.cnt;
}
