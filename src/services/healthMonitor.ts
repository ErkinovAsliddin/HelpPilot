// src/services/healthMonitor.ts
// Feature: helppilot

import { getDb } from '../db/schema.js';
import { log } from '../utils/logger.js';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { ChromaClient } from 'chromadb';

type ServiceStatus = 'healthy' | 'degraded' | 'unavailable';

let _autoResolutionEnabled = true;
let _bedrockUnavailableSince: Date | null = null;
let _bedrockAlertEmitted = false;

export function isAutoResolutionEnabled(): boolean {
  return _autoResolutionEnabled;
}

async function checkBedrock(): Promise<ServiceStatus> {
  try {
    const region = process.env.AWS_REGION || 'us-east-1';
    const client = new BedrockRuntimeClient({ region });
    const cmd = new InvokeModelCommand({
      modelId: 'amazon.titan-embed-text-v1',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({ inputText: 'health check' }),
    });
    await client.send(cmd);

    // Recovery
    if (!_autoResolutionEnabled) {
      _autoResolutionEnabled = true;
      _bedrockUnavailableSince = null;
      _bedrockAlertEmitted = false;
      log({ level: 'info', eventType: 'health.bedrock.recovered', message: 'Bedrock recovered — auto-resolution re-enabled' });
    }
    return 'healthy';
  } catch {
    const now = new Date();
    if (!_bedrockUnavailableSince) _bedrockUnavailableSince = now;

    const unavailableMs = now.getTime() - _bedrockUnavailableSince.getTime();
    if (unavailableMs >= 60000 && !_bedrockAlertEmitted) {
      _autoResolutionEnabled = false;
      _bedrockAlertEmitted = true;
      log({ level: 'error', eventType: 'health.bedrock.unavailable', message: 'Bedrock unavailable ≥60s — auto-resolution DISABLED' });
    }
    return 'unavailable';
  }
}

async function checkChroma(): Promise<ServiceStatus> {
  try {
    const url = process.env.CHROMA_URL || 'http://localhost:8000';
    const client = new ChromaClient({ path: url });
    await client.listCollections();
    return 'healthy';
  } catch {
    return 'unavailable';
  }
}

function checkSQLite(): ServiceStatus {
  try {
    const db = getDb();
    db.prepare('SELECT 1').get();
    return 'healthy';
  } catch {
    return 'unavailable';
  }
}

async function checkEmail(): Promise<ServiceStatus> {
  const smtpHost = process.env.SMTP_HOST;
  if (!smtpHost) return 'degraded';
  return 'healthy';
}

export interface HealthResult {
  status: 'healthy' | 'degraded' | 'unavailable';
  services: {
    bedrock: ServiceStatus;
    chromadb: ServiceStatus;
    sqlite: ServiceStatus;
    email: ServiceStatus;
  };
  autoResolutionEnabled: boolean;
  checkedAt: string;
}

export async function checkHealth(): Promise<HealthResult> {
  const [bedrock, chromadb, email] = await Promise.all([
    checkBedrock(),
    checkChroma(),
    checkEmail(),
  ]);
  const sqlite = checkSQLite();

  const statuses = [bedrock, chromadb, sqlite, email];
  let overall: ServiceStatus = 'healthy';
  if (statuses.includes('unavailable')) overall = 'unavailable';
  else if (statuses.includes('degraded')) overall = 'degraded';

  return {
    status: overall,
    services: { bedrock, chromadb, sqlite, email },
    autoResolutionEnabled: _autoResolutionEnabled,
    checkedAt: new Date().toISOString(),
  };
}
