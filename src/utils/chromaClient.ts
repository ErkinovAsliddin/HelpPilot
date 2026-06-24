// src/utils/chromaClient.ts
// Feature: helppilot

import { ChromaClient } from 'chromadb';
import type { KBResult } from '../types/ticket.js';
import { withRetry } from './retry.js';

export class KBUnavailableError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'KBUnavailableError';
  }
}

let _client: ChromaClient | null = null;

function getClient(): ChromaClient {
  if (!_client) {
    const url = process.env.CHROMA_URL || 'http://localhost:8000';
    _client = new ChromaClient({ path: url });
  }
  return _client;
}

export async function queryCollection(
  collectionName: string,
  embedding: number[],
  topK: number,
): Promise<KBResult[]> {
  return withRetry(async () => {
    let collection;
    try {
      collection = await getClient().getCollection({ name: collectionName });
    } catch (err) {
      throw new KBUnavailableError(`ChromaDB unavailable: ${String(err)}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: topK,
    } as any);

    const ids: string[] = (results.ids?.[0] ?? []) as string[];
    const distances: number[] = (results.distances?.[0] ?? []) as number[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadatas: Array<Record<string, unknown>> = (results.metadatas?.[0] ?? []) as any;

    return ids.map((id: string, i: number) => {
      const score = distances[i] !== undefined ? 1 - (distances[i] as number) : 0;
      const meta = metadatas[i] ?? {};
      return {
        type: (meta['type'] as KBResult['type']) || 'kb_article',
        title: String(meta['title'] || id),
        summary: String(meta['summary'] || ''),
        similarityScore: score,
        entryId: id,
      } satisfies KBResult;
    });
  });
}
