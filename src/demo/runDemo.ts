// src/demo/runDemo.ts
// Feature: helppilot

import 'dotenv/config';
import fetch from 'node-fetch';
import { DEMO_TICKETS } from './demoTickets.js';

const BASE_URL = process.env.DEMO_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.HELPPILOT_API_KEYS?.split(',')[0]?.trim() || 'demo-key';

async function submitTicket(ticket: typeof DEMO_TICKETS[0]): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify({
      subject: ticket.subject,
      body: ticket.body,
      submitter_email: ticket.submitter_email,
    }),
  });

  if (!res.ok) throw new Error(`Failed to submit ticket: ${res.status}`);
  const data = (await res.json()) as { ticketId: string };
  return data.ticketId;
}

async function getTicket(ticketId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}/api/tickets/${ticketId}`, {
    headers: { 'X-API-Key': API_KEY },
  });
  return res.json() as Promise<Record<string, unknown>>;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function runDemo(): Promise<void> {
  console.log('🚀 HelpPilot Demo — submitting 10 test tickets\n');

  for (const ticket of DEMO_TICKETS) {
    console.log(`\n📋 ${ticket.description}`);
    console.log(`   Subject: ${ticket.subject.slice(0, 60)}...`);

    try {
      const ticketId = await submitTicket(ticket);
      console.log(`   ✅ Created: ${ticketId}`);

      // Wait for pipeline
      await sleep(5000);

      const stored = await getTicket(ticketId);
      console.log(`   Status: ${stored['status']} | Outcome: ${stored['outcome'] || 'pending'} | Priority: ${stored['priority']}`);
    } catch (err) {
      console.error(`   ❌ Error: ${String(err)}`);
    }

    await sleep(1000);
  }

  console.log('\n✅ Demo complete! Check the dashboard at http://localhost:3000');
}

runDemo().catch(console.error);
