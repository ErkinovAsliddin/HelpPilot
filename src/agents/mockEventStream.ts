// src/agents/mockEventStream.ts
// Feature: helppilot

import type { PipelineEventBus } from '../pipeline/eventBus.js';

const ERROR_SIGNATURES = [
  'VPN_AUTH_FAIL',
  'LDAP_TIMEOUT',
  'PRINTER_OFFLINE',
  'EMAIL_BOUNCE',
  'DISK_QUOTA_EXCEEDED',
  'MFA_DEVICE_LOST',
  'AD_REPLICATION_FAIL',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randomUserId(): string {
  return `user-${Math.floor(Math.random() * 1000)}`;
}

type ErrorEvent = { errorSignature: string; userId: string; timestamp: string };

export class MockEventStream {
  private intervalId?: ReturnType<typeof setInterval>;
  private handlers: Array<(event: ErrorEvent) => void> = [];

  on(handler: (event: ErrorEvent) => void): void {
    this.handlers.push(handler);
  }

  start(intervalMs = 5000): void {
    this.intervalId = setInterval(() => {
      const count = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < count; i++) {
        const event: ErrorEvent = {
          errorSignature: randomItem(ERROR_SIGNATURES),
          userId: randomUserId(),
          timestamp: new Date().toISOString(),
        };
        this.handlers.forEach((h) => h(event));
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}

export function startStream(
  _bus: PipelineEventBus,
  intervalMs = 5000,
): MockEventStream {
  const stream = new MockEventStream();
  stream.start(intervalMs);
  return stream;
}
