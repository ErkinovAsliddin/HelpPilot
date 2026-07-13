// src/db/chromaInit.ts
// Feature: helppilot

import { ChromaClient } from 'chromadb';
import { ALL_KB_ARTICLES } from './kbSeed.js';
import { embedText } from '../utils/qwenClient.js';
import { log } from '../utils/logger.js';

const COLLECTION_NAME = 'helppilot_kb';

export async function chromaInit(): Promise<void> {
  const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
  const client = new ChromaClient({ path: chromaUrl });

  let collection;
  try {
    collection = await client.getOrCreateCollection({ name: COLLECTION_NAME });
  } catch (err) {
    log({ level: 'warn', eventType: 'chroma.init.skip', message: `ChromaDB unavailable, skipping KB seed: ${String(err)}` });
    return;
  }

  const existing = await collection.get({ ids: ALL_KB_ARTICLES.map((e) => e.id) });
  const existingIds = new Set(existing.ids);

  const toInsert = ALL_KB_ARTICLES.filter((e) => !existingIds.has(e.id));
  if (toInsert.length === 0) {
    log({ level: 'info', eventType: 'chroma.init.done', message: 'KB already seeded, nothing to add.' });
    return;
  }

  const embeddings: number[][] = [];
  for (const entry of toInsert) {
    try {
      const emb = await embedText(entry.document);
      embeddings.push(emb);
    } catch {
      embeddings.push(new Array(1536).fill(0) as number[]);
    }
  }

  await collection.add({
    ids: toInsert.map((e) => e.id),
    documents: toInsert.map((e) => e.document),
    metadatas: toInsert.map((e) => e.metadata as Record<string, string | number | boolean>),
    embeddings,
  });

  log({ level: 'info', eventType: 'chroma.init.done', message: `Seeded ${toInsert.length} KB articles.` });
}
