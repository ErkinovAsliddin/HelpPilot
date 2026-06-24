// src/types/log.ts
// Feature: helppilot

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  eventType: string;
  message: string;
  ticketId?: string;
  [key: string]: unknown;
}
