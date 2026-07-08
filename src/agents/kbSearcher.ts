// src/agents/kbSearcher.ts
// Knowledge-base semantic search. Falls back to in-memory KB when ChromaDB is unavailable.
import { invokeEmbedding } from '../utils/bedrockClient.js';
import { logger } from '../utils/logger.js';
import type { Ticket, KBSearchOutput } from '../types/ticket.js';

export interface KBResult {
  id: string;
  title: string;
  summary: string;
  similarity: number;
  source: 'chroma' | 'mock';
}

// ── In-memory fallback KB ─────────────────────────────────────────
const MOCK_KB: Array<{ id: string; title: string; summary: string; keywords: string[] }> = [
  { id: 'kb-001', title: 'Active Directory Password Reset Guide', summary: 'Use Ctrl+Alt+Del → Change Password on domain PC, or visit https://password.helppilot.com for SSPR.', keywords: ['password', 'reset', 'active directory', 'ad', 'login', 'credentials'] },
  { id: 'kb-002', title: 'MFA / Authenticator Reset', summary: 'Re-register at MySignins or request a Temporary Access Pass (TAP) from IT.', keywords: ['mfa', 'authenticator', 'two-factor', '2fa', 'tap'] },
  { id: 'kb-003', title: 'Corporate VPN Connection Failure', summary: 'Set gateway to vpn.helppilot.com, flush DNS (ipconfig /flushdns), approve MFA prompt within 15 s.', keywords: ['vpn', 'globalprotect', '412', 'connection', 'remote', 'network'] },
  { id: 'kb-004', title: 'Wi-Fi and IP Assignment Issues', summary: 'Connect to HelpPilot-Secure (WPA3-Enterprise PEAP). Run ipconfig /renew if no IP assigned.', keywords: ['wifi', 'wi-fi', 'ip', 'dhcp', 'network', 'ethernet'] },
  { id: 'kb-005', title: 'Docker Desktop — Corporate Install', summary: 'Install via Software Center; it configures WSL 2 and docker-users group automatically.', keywords: ['docker', 'container', 'wsl', 'install', 'software center'] },
  { id: 'kb-006', title: 'Node.js and NVM Setup', summary: 'Install nvm then run: nvm install 20. Restart terminal after.', keywords: ['node', 'nodejs', 'nvm', 'npm', 'javascript'] },
  { id: 'kb-007', title: 'Microsoft Teams — Install and Cache Clear', summary: 'Install via Software Center or clear cache at %appdata%\\Microsoft\\Teams.', keywords: ['teams', 'microsoft', 'chat', 'meetings', 'cache'] },
  { id: 'kb-008', title: 'Laptop Battery Bulging — Safety Advisory', summary: 'POWER OFF IMMEDIATELY. Do not charge. Bring to IT Walk-up Bar (4F Block B) — fire hazard.', keywords: ['battery', 'bulge', 'bulging', 'swollen', 'swell', 'keyboard lift', 'trackpad'] },
  { id: 'kb-009', title: 'Overheating and Fan Noise', summary: 'Check Task Manager for CPU hogs. Ensure vents are clear. Book hardware check if persistent.', keywords: ['hot', 'heat', 'overheat', 'fan', 'loud', 'temperature'] },
  { id: 'kb-010', title: 'AWS Sandbox Budget Extensions', summary: 'Submit business justification to DevOps portal (devops.helppilot.com → Budget Extension Request).', keywords: ['aws', 'budget', 'ec2', 'cloud', 'sandbox', 'billing', 'limit'] },
  { id: 'kb-011', title: 'Software License Purchase', summary: 'Navigate to SaaS Catalog and enter department billing code for approval workflow.', keywords: ['license', 'subscription', 'saas', 'purchase', 'billing', 'cost'] },
  { id: 'kb-012', title: 'Proxy Server Configuration', summary: 'Set proxy to http://proxy.helppilot.com/proxy.pac in system Network Settings.', keywords: ['proxy', 'pac', 'firewall', 'http', 'blocked'] },
  { id: 'kb-013', title: 'OneDrive Backup Setup', summary: 'Back up Desktop, Documents, Pictures to OneDrive via Known Folder Move in settings.', keywords: ['onedrive', 'backup', 'sync', 'files', 'storage'] },
  { id: 'kb-014', title: 'IT Walk-up Service Bar', summary: 'Located: Head Office, 4th Floor Block B. Hours: Mon–Fri 8am–6pm.', keywords: ['walk-up', 'in-person', 'office', 'physical', 'location', 'hours'] },
  { id: 'kb-015', title: 'Printer Offline Troubleshooting', summary: 'Run Print Spooler restart: net stop spooler && net start spooler. Reconnect to \\\\printserver\\<name>.', keywords: ['printer', 'print', 'offline', 'spooler', 'queue'] },
];

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-9);
}

function keywordScore(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  const matches = keywords.filter(k => lower.includes(k)).length;
  return Math.min(1, matches / Math.max(1, keywords.length) * 1.5);
}

export async function searchKB(
  query: string,
  category: string,
  topK = 3
): Promise<{ results: KBResult[]; status: 'ok' | 'mock' }> {
  logger.info('[KBSearcher] searching KB', { query: query.slice(0, 60), category });

  // Try ChromaDB first
  try {
    const chromaUrl = process.env.CHROMA_URL ?? 'http://localhost:8000';
    const { ChromaClient } = await import('chromadb');
    const chroma = new ChromaClient({ path: chromaUrl });

    const { embedding } = await invokeEmbedding(query);
    const collection = await chroma.getOrCreateCollection({ name: 'helppilot-kb' });
    const queryResult = await collection.query({
      queryEmbeddings: [embedding],
      nResults: topK,
    });

    if (queryResult.ids[0] && queryResult.ids[0].length > 0) {
      const results: KBResult[] = queryResult.ids[0].map((id, i) => ({
        id: String(id),
        title: String(queryResult.metadatas?.[0]?.[i]?.['title'] ?? 'KB Article'),
        summary: String(queryResult.documents?.[0]?.[i] ?? ''),
        similarity: 1 - (queryResult.distances?.[0]?.[i] ?? 0.5),
        source: 'chroma' as const,
      }));
      return { results, status: 'ok' };
    }
  } catch {
    logger.warn('[KBSearcher] ChromaDB unavailable, using in-memory KB');
  }

  // Fallback: keyword + embedding similarity on mock KB
  const { embedding: queryEmbed } = await invokeEmbedding(query);
  const scored = await Promise.all(
    MOCK_KB.map(async entry => {
      const kw = keywordScore(query, entry.keywords);
      const { embedding: entryEmbed } = await invokeEmbedding(entry.title + ' ' + entry.summary);
      const cos = cosineSimilarity(queryEmbed, entryEmbed);
      return { entry, score: kw * 0.6 + cos * 0.4 };
    })
  );

  scored.sort((a, b) => b.score - a.score);
  const results: KBResult[] = scored.slice(0, topK).map(({ entry, score }) => ({
    id: entry.id,
    title: entry.title,
    summary: entry.summary,
    similarity: parseFloat(Math.min(0.99, score * 1.1).toFixed(3)),
    source: 'mock',
  }));

  return { results, status: 'mock' };
}

// ── Class wrapper for PipelineOrchestrator ──────────────────────────────────
export class KBSearcherAgent {
  async run(ticket: Ticket): Promise<KBSearchOutput> {
    const query = ticket.translated_body || ticket.body || ticket.subject || '';
    const { results, status } = await searchKB(query, ticket.category || 'other');

    const mappedResults = results.map((r) => ({
      type: 'kb_article' as const,
      title: r.title,
      summary: r.summary,
      similarityScore: r.similarity,
      entryId: r.id,
    }));

    const kbStatus: KBSearchOutput['kbStatus'] =
      results.length === 0 ? 'no_results' : 'ok';

    return { results: mappedResults, kbStatus: status === 'mock' && results.length === 0 ? 'kb_unavailable' : kbStatus };
  }
}
