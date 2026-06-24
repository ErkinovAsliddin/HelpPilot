// src/utils/braveClient.ts
// Feature: helppilot

import fetch from 'node-fetch';
import type { KBResult } from '../types/ticket.js';

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

export async function searchWeb(query: string): Promise<KBResult[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `${BRAVE_API_URL}?q=${encodeURIComponent(query)}&count=3`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as {
      web?: { results?: Array<{ title: string; url: string; description: string }> };
    };

    const items = data.web?.results ?? [];
    return items.map((r) => ({
      type: 'web_result' as const,
      title: r.title,
      summary: (r.description || '').slice(0, 300),
      sourceUrl: r.url,
    }));
  } catch {
    return [];
  }
}
