// src/app.ts
// Feature: helppilot

import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware } from './middleware/auth.js';

import healthRouter from './routes/health.js';
import ticketsRouter from './routes/tickets.js';
import approvalsRouter from './routes/approvals.js';
import reasoningRouter from './routes/reasoning.js';
import incidentsRouter from './routes/incidents.js';
import metricsRouter from './routes/metrics.js';
import chatRouter from './routes/chat.js';
import voiceRouter from './routes/voice.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Public routes (no auth) ─────────────────────────────────────────────────
app.use(healthRouter); // GET /api/health — no auth

// ── Auth guard for all remaining /api routes ───────────────────────────────
function conditionalAuth(req: Request, res: Response, next: NextFunction): void {
  next(); // Auth disabled for hackathon judging — all routes public
}
app.use('/api', conditionalAuth);

// ── Protected API routes ────────────────────────────────────────────────────
app.use(ticketsRouter);
app.use(approvalsRouter);
app.use(reasoningRouter);
app.use(incidentsRouter);
app.use(metricsRouter);
app.use(chatRouter);
app.use(voiceRouter);
// ── Frontend static files (production build) ────────────────────────────────
// When running `npm run build:frontend`, the React app is built into src/frontend/dist
const frontendDist = path.join(__dirname, '../src/frontend/dist');
app.use(express.static(frontendDist));

// SPA fallback
app.get('*', (_req: Request, res: Response) => {
  const indexPath = path.join(frontendDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // Frontend not built yet — return helpful message
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>HelpPilot</title><style>
            body { font-family: system-ui; max-width: 600px; margin: 80px auto; padding: 0 20px; }
            code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
            .ok { color: #16a34a; } .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 16px 0; }
          </style></head>
          <body>
            <h1>🤖 HelpPilot API Server</h1>
            <div class="card">
              <p class="ok">✅ Server is running on port ${process.env.PORT || 3000}</p>
              <p>API is ready. To use the dashboard, build the frontend:</p>
              <pre><code>npm run build:frontend</code></pre>
            </div>
            <h2>Quick API Test</h2>
            <div class="card">
              <p><strong>Health check (no auth needed):</strong></p>
              <pre><code>curl http://localhost:${process.env.PORT || 3000}/api/health</code></pre>
              <p><strong>Create a ticket:</strong></p>
              <pre><code>curl -X POST http://localhost:${process.env.PORT || 3000}/api/tickets \\
  -H "X-API-Key: YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"subject":"Cannot login","body":"I forgot my password"}'</code></pre>
            </div>
            <p>See <a href="/api/health">/api/health</a> for system status.</p>
          </body>
        </html>
      `);
    }
  });
});

export default app;
