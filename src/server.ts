// src/server.ts — HelpPilot main server entry point
// Feature: helppilot

import 'dotenv/config';
import { app } from './app.js';
import { initDb } from './db/schema.js';
import { chromaInit } from './db/chromaInit.js';
import { PipelineOrchestrator } from './pipeline/orchestrator.js';
import { startHitlNotifier } from './services/hitlNotifier.js';
import { startReasoningTraceService } from './services/reasoningTraceService.js';
import { initSession } from './services/sessionMetricsService.js';
import { startIncidentNotifier } from './services/incidentNotifier.js';
import { PredictionEngine } from './agents/predictionEngine.js';
import { log } from './utils/logger.js';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function main(): Promise<void> {
  // Init SQLite database
  initDb();
  log({ level: 'info', eventType: 'server.db.ready', message: 'SQLite database initialized' });

  // Init ChromaDB KB seed (non-fatal — server still starts if ChromaDB unavailable)
  try {
    await chromaInit();
  } catch (err) {
    log({ level: 'warn', eventType: 'server.chroma.skipped', message: `ChromaDB KB seed skipped: ${String(err)}` });
  }

  // Start all services
  startReasoningTraceService();
  startHitlNotifier();
  startIncidentNotifier();
  initSession();

  // Start pipeline orchestrator
  const orchestrator = new PipelineOrchestrator();
  orchestrator.start();

  // Start prediction engine
  const predictionEngine = new PredictionEngine();
  predictionEngine.start();

  // Start HTTP server
  app.listen(PORT, () => {
    log({ level: 'info', eventType: 'server.ready', message: `HelpPilot running at http://localhost:${PORT}` });
    console.log(`\n🚀 HelpPilot is running!`);
    console.log(`   → API:       http://localhost:${PORT}/api/health`);
    console.log(`   → Dashboard: http://localhost:${PORT}`);
    console.log(`   → Default API key: ${process.env.HELPPILOT_API_KEYS?.split(',')[0] ?? '(set HELPPILOT_API_KEYS in .env)'}\n`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
