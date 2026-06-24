# Design Document — HelpPilot IT Helpdesk Autopilot

## Overview

HelpPilot is a production-ready IT helpdesk automation system composed of four specialized AI agents orchestrated through a central pipeline. Tickets arrive via REST API, email, or a web form; they are classified, searched against a vector knowledge base, resolved or drafted for approval, delivered to the submitter, and logged — all with a human-in-the-loop guard on every outbound response.

**Technology choices:**

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | Node.js 20 LTS | Wide ecosystem; async I/O suits orchestration workloads |
| Web framework | Express 4 | Lightweight, well-understood, easy middleware composition |
| LLM | Claude 3.5 Sonnet via Amazon Bedrock | Low-latency, high-quality reasoning; unified API for classify/resolve/translate |
| Vector store | ChromaDB (JS client) | Local embeddings; simple Docker deployment; supports metadata filtering |
| Relational store | SQLite (better-sqlite3) | Zero-ops persistence; queryable by all required dimensions |
| Email | Nodemailer + optional SendGrid | Flexible transport; SendGrid for production reliability |
| Web search fallback | Brave Search API | Privacy-respecting; structured JSON response |
| Frontend | React 18 + Vite | Component model ideal for dashboard; fast HMR in dev |
| Property testing | fast-check (JS) | Mature PBT library; integrates with Jest/Vitest |
| File upload | multer | Multipart form-data parsing for image/audio attachments |
| SSE streaming | native Express res.write | Server-sent events for live reasoning trace; no WS dependency |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Ingestion Layer                             │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│   │ REST API     │  │ Email Parser │  │ Web Form Handler          │ │
│   │ POST/GET     │  │ (Nodemailer  │  │ (Express route)           │ │
│   │ /api/tickets │  │  IMAP/SMTP)  │  │                          │ │
│   └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘ │
│          └─────────────────┼──────────────────────  ┘              │
│                            │                                        │
│               ┌────────────▼──────────────┐                        │
│               │  MultiModalHandler        │  OCR / Whisper / email │
│               │  (if attachment present)  │  thread extraction     │
│               └────────────┬──────────────┘                        │
│                            │                                        │
│                    ┌───────▼────────┐                               │
│                    │  Ticket Store  │  (SQLite — tickets table)     │
│                    └───────┬────────┘                               │
└────────────────────────────┼────────────────────────────────────────┘
                             │  enqueue (in-process EventEmitter)
┌────────────────────────────▼────────────────────────────────────────┐
│                      Orchestration Pipeline                         │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Classifier  │  │  Emotion     │  │  KBSearcher  │              │
│  │  Agent       │  │  Analyzer    │  │  Agent       │              │
│  │              │  │  Agent       │  │              │              │
│  │ • Bedrock    │  │              │  │ • ChromaDB   │              │
│  │   Classify   │  │ • Bedrock    │  │   Vector     │              │
│  │ • Lang detect│  │   Emotion    │  │   Search     │              │
│  │ • Translate  │  │ • VIP check  │  │ • KB conf.   │              │
│  └──────┬───────┘  │ • Override   │  │   multiplier │              │
│         │          │   rules      │  │ • Brave API  │              │
│         └──────────┴──────────────┘  │   fallback   │              │
│                    │                 └──────┬───────┘              │
│                    └────────────────────────┘                      │
│                                     │                               │
│                             ┌───────▼────────┐                      │
│                             │    Resolver    │                      │
│                             │    Agent       │                      │
│                             │                │                      │
│                             │ • Bedrock      │                      │
│                             │   Draft        │                      │
│                             │ • Churn/emotion│                      │
│                             │   override     │                      │
│                             │ • Reasoning    │                      │
│                             │   trace emit   │                      │
│                             └───────┬────────┘                      │
└─────────────────────────────────────┼──────────────────────────────┘
                                      │
              ┌───────────────────────┘
              │
┌─────────────▼────────────────────────────────────────────────────┐
│                   HITL Approval Layer                             │
│                                                                   │
│  confidence > 85                confidence 60-85   confidence <60 │
│  & not critical                 or critical        or KB failure  │
│  & churn_risk not high/crit     or churn high/crit or agent error │
│       │                               │                 │        │
│  Auto-resolve                  Pending Approval    Escalate      │
│       │                               │                 │        │
│       │                     ┌─────────▼────────┐        │       │
│       │                     │  Admin Dashboard  │        │       │
│       │                     │  (React + REST)   │        │       │
│       │                     │  Approve/Edit/    │        │       │
│       │                     │  Reject           │        │       │
│       │                     │  + EmotionBadge   │        │       │
│       │                     │  + ReasoningTrace │        │       │
│       │                     └─────────┬─────────┘        │       │
└───────┼─────────────────────────────┼─────────────────── ┘       │
        │                             │                    │        │
┌───────▼─────────────────────────────▼────────────────────▼───────┐
│                      Delivery Layer                               │
│   ┌─────────────────────┐       ┌──────────────────────────────┐  │
│   │  Email Delivery     │       │  API/Web Response Update     │  │
│   │  (Nodemailer /      │       │  (ticket.status = resolved)  │  │
│   │   SendGrid)         │       │                              │  │
│   └─────────────────────┘       └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
        │
┌───────▼───────────────────────────────────────────────────────────┐
│                        Logger Agent                               │
│   ┌──────────────────────────┐   ┌───────────────────────────┐   │
│   │  SQLite Outcome Log      │   │  ChromaDB KB Feedback     │   │
│   │  (terminal state record) │   │  (success/failure counts) │   │
│   └──────────────────────────┘   └───────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│              PredictionEngine (Background Loop)                   │
│   ┌──────────────────────────┐   ┌───────────────────────────┐   │
│   │  MockEventStream         │   │  Incident Store (SQLite)  │   │
│   │  (error pattern monitor) │   │  Admin approval gate      │   │
│   └──────────────────────────┘   └───────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

### Event Bus

Internal agent-to-agent communication uses Node.js `EventEmitter` (wrapped in a typed `PipelineEventBus` class). This avoids introducing a message broker for the single-process deployment while allowing easy swap-out to SQS/Redis Streams in future.

Key events:
- `ticket.received` → triggers MultiModalHandler (if attachment) then Classifier
- `ticket.classified` → triggers EmotionAnalyzer + KBSearcher in parallel
- `ticket.emotion_analyzed` → stored on ticket; EmotionAnalyzer override rules fire
- `ticket.kb_searched` → triggers Resolver
- `ticket.draft_ready` → triggers HITL notification + Dashboard update
- `ticket.approved` / `ticket.rejected` → triggers Delivery or Escalation
- `ticket.terminal` → triggers Logger (KB feedback loop)
- `ticket.critical_churn` → triggers 60-second admin alert bypass
- `reasoning.step` → emitted by each agent; consumed by SSE endpoint and reasoning trace store
- `incident.detected` → triggers incident record creation + admin notification
- `incident.approved` → triggers outbound user notification dispatch

---

## Components and Interfaces

### 1. Ingestion Layer

#### REST Ingestion (`src/ingestion/rest.ts`)
- Validates `subject` (max 255) and `body` (max 10,000); requires at least one
- Assigns UUID v4 + `received_at` UTC
- Returns 400 with `{ error: "..." }` on validation failure
- Returns 201 with `{ ticketId, status }` on success

#### Email Parser (`src/ingestion/email.ts`)
- Polls configured IMAP mailbox via `imap` npm package
- Parses raw MIME with `mailparser`
- On parse failure: discards message, emits structured `error` log, does not create ticket
- Extracted fields: `subject`, `body`, `from` (submitter email), `received_at`

#### Web Form Handler (`src/ingestion/webform.ts`)
- Express route `POST /api/tickets` with `Content-Type: application/x-www-form-urlencoded`
- Delegates to the same validation logic as REST ingestion
- Target: ticket creation within 2 s of form submission

---

### 2. Orchestration Pipeline (`src/pipeline/orchestrator.ts`)

Central class `PipelineOrchestrator` that:
1. Listens on `ticket.received`
2. Calls `MultiModalHandlerAgent.run(ticket)` if attachments are present — normalizes to text
3. Calls `ClassifierAgent.run(ticket)` — updates ticket with classification output
4. Calls `EmotionAnalyzerAgent.run(ticket)` in parallel with or immediately after Classifier — attaches emotion output; fires override rules
5. Routes based on `suggestedAgent` result and `churn_risk` override
6. Calls `KBSearcherAgent.run(ticket)` — attaches KB results with confidence multiplier applied
7. Calls `ResolverAgent.run(ticket)` — produces draft or escalation; applies emotion tone rewrite if needed; emits reasoning steps
8. Emits `ticket.draft_ready` or `ticket.escalated`
9. On terminal state, calls `LoggerAgent.run(ticket)` — writes outcome + updates KB success/failure counts

Retry wrapper `withRetry(fn, maxAttempts=3, initialDelay=1000, cap=30000)` is applied to all external calls (Bedrock, ChromaDB, Brave, email).

---

### 3. Classifier Agent (`src/agents/classifier.ts`)

**Interface:**
```typescript
interface ClassifierInput {
  ticketId: string;
  subject: string;
  body: string;
}

interface ClassifierOutput {
  category: Category;
  priority: Priority;
  sentiment: Sentiment;
  suggestedAgent: 'KBSearcher' | 'Resolver' | 'human-review';
  detectedLanguage?: string;        // BCP-47 code, e.g. 'fr', 'ja'
  translatedSubject?: string;
  translatedBody?: string;
}
```

**Bedrock prompt strategy:** Single structured JSON-output prompt requesting all four classification fields simultaneously. Temperature 0 for determinism.

**Language handling:**
1. If Bedrock returns `detectedLanguage !== 'en'`, translate `subject` + `body` using a separate Bedrock call
2. Store `translatedSubject` / `translatedBody` on the ticket
3. Downstream agents always use translated text if available

**Fallback:** On any exception or empty response → `{ category: 'other', priority: 'high', suggestedAgent: 'human-review', sentiment: 'neutral' }`

---

### 4. KBSearcher Agent (`src/agents/kbSearcher.ts`)

**Interface:**
```typescript
interface KBResult {
  type: 'kb_article' | 'logged_resolution' | 'web_result';
  title: string;
  summary: string;          // max 500 chars for KB; max 300 for web
  similarityScore?: number; // 0–1 for vector results
  sourceUrl?: string;       // web results only
}

interface KBSearchOutput {
  results: KBResult[];
  kbStatus: 'ok' | 'no_results' | 'search_error' | 'kb_unavailable';
}
```

**Search flow:**
1. Embed ticket text with Bedrock `amazon.titan-embed-text-v1`
2. Query ChromaDB `top_k=10`, filter `score > 0`
3. For each result, compute adjusted score: `adjustedScore = rawScore * kb_confidence_multiplier` where `kb_confidence_multiplier = success_count / (success_count + failure_count)`; entries with zero uses default to `kb_confidence_multiplier = 1.0`
4. Entries with `kb_confidence_multiplier < 0.4` are placed after all entries with multiplier ≥ 0.4 (deprioritized)
5. If max adjusted score ≤ 0.5 OR ChromaDB unavailable → fallback to Brave Search API
6. Merge static KB articles and logged resolutions in a single ChromaDB collection; rank together by descending adjusted score
7. Return top 3 overall

**ChromaDB collection:** `helppilot_kb`  
**Brave API endpoint:** `https://api.search.brave.com/res/v1/web/search?q={query}&count=3`

---

### 5. Resolver Agent (`src/agents/resolver.ts`)

**Interface:**
```typescript
interface ResolverOutput {
  action: 'auto_resolve' | 'pending_approval' | 'escalate';
  draftResponse?: string;
  confidenceScore: number;       // 0–100
  confidenceExplanation: string;
  sourcesUsed: string[];         // KB article titles
  translatedResponse?: string;   // back-translated if non-English
}
```

**Routing logic (enforced in code, not delegated to LLM):**
```
if (kbStatus !== 'ok') → escalate
else if (priority === 'critical') → pending_approval (always)
else if (churn_risk === 'critical' || churn_risk === 'high') → pending_approval (emotion override)
else if (confidenceScore > 85) → auto_resolve
else if (confidenceScore >= 60) → pending_approval
else → escalate
```

**Emotion tone rewrite:** If `emotional_state !== 'calm'`, a second Bedrock call rewrites only the opening sentence of the draft to match `recommended_tone` before the draft is stored.

**Reasoning trace:** After each routing decision, emits a `reasoning.step` event with `{ agentName: 'Resolver', inputs, outputs, durationMs }`.

**Draft prompt:** Instructs Claude to produce a response containing only complete sentences addressed to the submitter. A post-generation sanitizer strips any pattern matching `ticketId`, numeric confidence values, or agent names before storing the draft.

**Back-translation:** If `detectedLanguage` is set and supported, a final Bedrock call translates the English draft to the source language.

---

### 6. Logger Agent (`src/agents/logger.ts`)

**Responsibilities:**
- Writes complete terminal-state record to SQLite `tickets` table
- On `outcome IN ('SUCCESS_ADMIN', 'SUCCESS_AUTO')` and `successfully_resolved = true`: upserts a ChromaDB KB entry (keyed on `ticketId` to prevent duplicates) with initial `success_count = 1`, `failure_count = 0`
- On `SUCCESS_ADMIN` or `SUCCESS_AUTO`: increments `success_count` on every KB entry that was used as a source (`metadata.entryId` present in `sourcesUsed`)
- On rejection or `delivery-failed`: increments `failure_count` on those same KB entries
- Emits a structured `info` log for every write
- All ChromaDB metadata writes use `withRetry` (3 attempts); on exhaustion emits structured error with KB entry ID

---

### 6b. MultiModal Handler Agent (`src/agents/multiModalHandler.ts`)

**Interface:**
```typescript
interface MultiModalInput {
  subject?: string;
  body?: string;
  attachments?: Array<{
    type: 'image' | 'audio';
    filename: string;
    buffer: Buffer;
    sizeMb: number;
  }>;
}

interface MultiModalOutput {
  subject: string;
  body: string;                              // enriched body with extracted text appended
  source_modality: 'text' | 'image' | 'voice' | 'email_thread';
  processing_notes: string[];               // failure messages appended here
}
```

**Image OCR:** Pass image as base64 in a Bedrock `claude-3-5-sonnet` vision message. Prompt: "Extract all visible text from this screenshot. Return only the extracted text, no commentary." Append result to body. On failure: append `"Image attachment could not be processed"`.

**Audio transcription:** Invoke AWS Transcribe (`StartTranscriptionJob`) or a local Whisper-compatible endpoint configured via `WHISPER_ENDPOINT` env. Poll for result. Append transcript to body. On failure: append `"Audio attachment could not be transcribed"`.

**Email thread parsing:** Apply regex to strip lines beginning with `>` and blocks matching `From:.*\nSent:.*\nTo:.*\nSubject:` patterns. Use the last non-quoted segment as the effective body.

**Size enforcement:** Validated in the Express middleware layer using `multer` limits (image: 10 MB, audio: 25 MB); oversized uploads receive HTTP 413 before the handler is invoked.

---

### 6c. EmotionAnalyzer Agent (`src/agents/emotionAnalyzer.ts`)

**Interface:**
```typescript
interface EmotionAnalyzerInput {
  ticketId: string;
  subject: string;
  body: string;
  submitterEmail?: string;
}

interface EmotionAnalyzerOutput {
  frustration_score: number;        // integer 0–10
  urgency_score: number;            // integer 0–10
  churn_risk: 'low' | 'medium' | 'high' | 'critical';
  emotional_state: 'calm' | 'stressed' | 'angry' | 'desperate';
  recommended_tone: 'professional' | 'empathetic' | 'urgent' | 'crisis';
  trigger_words: string[];
  reasoning: string;
  vip_flag: boolean;
}
```

**Bedrock call:** Single structured JSON-output prompt. Temperature 0. All seven fields requested simultaneously.

**VIP check:** Before calling Bedrock, query SQLite: `SELECT COUNT(*) FROM tickets WHERE submitter_email = ? AND received_at > datetime('now', '-7 days')`. If count ≥ 3, set `vip_flag = true` in the prompt context.

**Override rules (fired after Bedrock returns):**
- `churn_risk === 'critical'` → emit `ticket.critical_churn` event; `hitlNotifier` handles the 60-second alert
- `urgency_score > 8` and current time within `BUSINESS_HOURS_START`/`BUSINESS_HOURS_END` env window → send Slack ping via `slackWebhook`
- `trigger_words` intersects `['cancel','quit','manager','lawsuit']` → send lead notification via `LEAD_NOTIFICATION_CHANNEL` env

**Fallback:** On any exception or timeout → return default safe values and emit error log.

**Reasoning trace:** Emits `reasoning.step` event with full output.

---

### 6d. PredictionEngine (`src/agents/predictionEngine.ts`)

Runs as a background service started at process boot, independent of the per-ticket pipeline.

**Mock event stream:** `MockEventStream` class generates realistic IT error events at a configurable rate for demo use. Production deployments swap to a real source via `EVENT_STREAM_SOURCE` env.

**Detection logic:**
```typescript
// Rolling window: Map<errorSignature, Map<userId, firstSeenAt>>
// Sweep every PREDICTION_INTERVAL_MS (default 30 000 ms)
// Incident threshold: 5+ distinct users within INCIDENT_WINDOW_MS (default 300 000 ms)
```

**On detection:**
1. Query ChromaDB for KB match (adjusted score > 0.5)
2. Create incident record in SQLite with `status = 'draft'`
3. Emit `incident.detected` → admin notification sent via `hitlNotifier`
4. Block outbound user notifications until admin approves via `POST /api/incidents/:id/approve`

**After approval:**
1. Look up last-used contact channel per user from `tickets` table
2. Send email or API webhook; retry 3× with exponential backoff; record per-user status in `notification_log`

**Cooldown:** On admin close, set `cooldown_until = now + 30 min`; suppress re-detection of same signature until cooldown expires.

---

### 6e. Reasoning Trace Service (`src/services/reasoningTraceService.ts`)

**Storage:** Each agent emits a `reasoning.step` event. The service appends each step to an in-memory buffer keyed by `ticketId`, then flushes to the `reasoning_traces` SQLite table on `ticket.terminal`.

**SSE endpoint:** `GET /api/tickets/:id/reasoning`
- For in-progress tickets: opens SSE connection, streams `reasoning.step` events as they arrive
- For completed tickets: returns full JSON trace immediately
- Clients use standard SSE reconnect on disconnect

---

### 7. HITL Notification Service (`src/services/hitlNotifier.ts`)

- On `ticket.draft_ready`: sends admin notification via configured channel (email via Nodemailer or Slack webhook)
- On `ticket.critical_churn`: sends priority alert within 60 seconds, bypassing normal queue
- On no admin action after 4 hours: re-sends notification, sets `status = 'stale'`
- Stale-check implemented as a `setInterval` sweep every 5 minutes

---

### 8. Delivery Service (`src/services/deliveryService.ts`)

- `sendEmailResponse(ticket, response)`: Nodemailer SMTP or SendGrid HTTP API
- `updateApiResponse(ticket, response)`: SQLite status update to `resolved`, attaches `responseText`, `deliveredAt`, `deliveryChannel`
- Retry policy: up to 3 attempts, exponential backoff starting 5 s, max 60 s
- On all retries exhausted: set `status = 'delivery-failed'`, notify admin channel

---

### 9. Admin Dashboard (`src/frontend/`)

React 18 + Vite SPA served from Express static middleware.

Components:
- `<TicketListPage>` — sortable table (received_at DESC default), 100/page, polling every 5 s via `useInterval`
- `<TicketDetailPage>` — full ticket text, classification output, KB results, draft, confidence, HITL history
- `<ApprovalPanel>` — Approve / Edit / Reject controls; shown only when `status === 'pending-approval'`
- `<MetricsSummary>` — total tickets, auto-resolution %, avg confidence, avg response time
- `<LoginPage>` — API key entry; stored in `sessionStorage`; all API calls include `X-API-Key` header

---

### 10. Health Monitor (`src/services/healthMonitor.ts`)

Tracks live status of Bedrock, ChromaDB, SQLite, email provider.  
Bedrock outage: if unavailable ≥ 60 s → emit one health alert, disable auto-resolution, route all tickets to `human-review`. Re-enable automatically when Bedrock responds.

---

## Data Models

### Ticket (SQLite — `tickets` table)

```sql
CREATE TABLE tickets (
  id                  TEXT PRIMARY KEY,          -- UUID v4
  subject             TEXT,
  body                TEXT,
  source_channel      TEXT NOT NULL,             -- 'api' | 'email' | 'webform'
  submitter_email     TEXT,
  status              TEXT NOT NULL DEFAULT 'received',
                                                 -- received | classifying | kb_searching |
                                                 -- resolving | pending-approval | auto-resolving |
                                                 -- resolved | escalated | stale |
                                                 -- delivery-failed | enqueue-failed
  category            TEXT,                      -- Classification enum
  priority            TEXT,                      -- Priority enum
  sentiment           TEXT,                      -- Sentiment enum
  suggested_agent     TEXT,
  detected_language   TEXT,                      -- BCP-47 code
  translated_subject  TEXT,
  translated_body     TEXT,
  confidence_score    REAL,
  confidence_explanation TEXT,
  draft_response      TEXT,
  translated_response TEXT,
  final_response      TEXT,
  resolution_action   TEXT,                      -- auto_resolve | pending_approval | escalate
  outcome             TEXT,                      -- SUCCESS_ADMIN | SUCCESS_AUTO | ESCALATED | DELIVERY_FAILED
  successfully_resolved INTEGER DEFAULT 0,       -- SQLite boolean
  admin_id            TEXT,
  admin_action        TEXT,                      -- approve | edit-approve | reject
  admin_notes         TEXT,
  admin_action_at     TEXT,                      -- ISO 8601 UTC
  delivery_channel    TEXT,
  delivered_at        TEXT,                      -- ISO 8601 UTC
  kb_status           TEXT,
  kb_results          TEXT,                      -- JSON array
  received_at         TEXT NOT NULL,             -- ISO 8601 UTC
  classified_at       TEXT,
  resolved_at         TEXT,
  terminal_at         TEXT,
  enqueue_attempts    INTEGER DEFAULT 0,
  -- Emotion analysis fields
  frustration_score   INTEGER,
  urgency_score       INTEGER,
  churn_risk          TEXT,
  emotional_state     TEXT,
  recommended_tone    TEXT,
  trigger_words       TEXT,              -- JSON array of matched terms
  emotion_reasoning   TEXT,
  vip_flag            INTEGER DEFAULT 0, -- SQLite boolean
  -- Multi-modal fields
  source_modality     TEXT DEFAULT 'text',  -- text | image | voice | email_thread
  multimodal_notes    TEXT,              -- JSON array of processing notes
  -- Reasoning trace
  escalation_reason   TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tickets_status   ON tickets(status);
CREATE INDEX idx_tickets_category ON tickets(category);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_received ON tickets(received_at);
CREATE INDEX idx_tickets_admin    ON tickets(admin_id);
```

### KB Entry (ChromaDB — collection `helppilot_kb`)

```typescript
interface KBEntry {
  id: string;            // UUID — ticketId for logged resolutions; article slug for static
  document: string;      // ticket body or article content (used for embedding)
  metadata: {
    title: string;
    summary: string;     // max 500 chars
    type: 'kb_article' | 'logged_resolution';
    category: string;
    source: 'static' | 'logged';
    ticketId?: string;   // only for logged_resolution entries
    createdAt: string;   // ISO 8601 UTC
    success_count: number;   // incremented on SUCCESS_ADMIN/SUCCESS_AUTO outcomes
    failure_count: number;   // incremented on rejection/delivery-failed outcomes
    // kb_confidence_multiplier is computed at query time: success/(success+failure), defaults to 1.0 if both are 0
  };
}
```

### HITL Log (SQLite — `hitl_log` table)

```sql
CREATE TABLE hitl_log (
  id          TEXT PRIMARY KEY,   -- UUID v4
  ticket_id   TEXT NOT NULL REFERENCES tickets(id),
  admin_id    TEXT NOT NULL,
  action      TEXT NOT NULL,      -- approve | edit-approve | reject
  notes       TEXT,
  actioned_at TEXT NOT NULL       -- ISO 8601 UTC
);
CREATE INDEX idx_hitl_ticket ON hitl_log(ticket_id);
```

### Incident (SQLite — `incidents` table)

```sql
CREATE TABLE incidents (
  id                TEXT PRIMARY KEY,       -- UUID v4
  error_signature   TEXT NOT NULL,          -- hashed/normalized error string
  affected_users    TEXT NOT NULL,          -- JSON array of user identifiers
  affected_count    INTEGER NOT NULL,
  first_occurrence  TEXT NOT NULL,          -- ISO 8601 UTC
  detected_at       TEXT NOT NULL,          -- ISO 8601 UTC
  suggested_fix     TEXT,                   -- from KB, may be null
  kb_entry_id       TEXT,
  status            TEXT NOT NULL DEFAULT 'draft',  -- draft | approved | sending | closed
  admin_id          TEXT,
  approved_at       TEXT,                   -- ISO 8601 UTC
  closed_at         TEXT,                   -- ISO 8601 UTC
  notification_log  TEXT NOT NULL DEFAULT '[]',    -- JSON array of { userId, channel, status, attempts }
  cooldown_until    TEXT                    -- ISO 8601 UTC; null when not in cooldown
);
CREATE INDEX idx_incidents_status    ON incidents(status);
CREATE INDEX idx_incidents_signature ON incidents(error_signature);
CREATE INDEX idx_incidents_detected  ON incidents(detected_at);
```

### Reasoning Trace (SQLite — `reasoning_traces` table)

```sql
CREATE TABLE reasoning_traces (
  ticket_id   TEXT PRIMARY KEY REFERENCES tickets(id),
  trace       TEXT NOT NULL,    -- JSON blob of AgentStep[]
  created_at  TEXT NOT NULL     -- ISO 8601 UTC
);
```

**AgentStep type:**

```typescript
interface AgentStep {
  agentName: 'MultiModalHandler' | 'Classifier' | 'EmotionAnalyzer' | 'KBSearcher' | 'Resolver';
  startedAt: string;       // ISO 8601 UTC
  completedAt: string;     // ISO 8601 UTC
  durationMs: number;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}

interface ReasoningTrace {
  ticketId: string;
  steps: AgentStep[];
  escalationReason?: string;  // human-readable explanation when action = 'escalate'
}
```

### Session Metrics (in-memory, persisted to SQLite `sessions` table)

```sql
CREATE TABLE sessions (
  id                        TEXT PRIMARY KEY,  -- UUID v4; set at server start
  started_at                TEXT NOT NULL,
  tickets_auto_resolved     INTEGER DEFAULT 0,
  tickets_escalated         INTEGER DEFAULT 0,
  tickets_total             INTEGER DEFAULT 0,
  solutions_learned         INTEGER DEFAULT 0,
  tickets_prevented         INTEGER DEFAULT 0,
  emotion_escalations       INTEGER DEFAULT 0,
  total_resolution_time_ms  INTEGER DEFAULT 0,  -- sum for avg calculation
  avg_handling_time_minutes REAL DEFAULT 5.0,   -- configurable
  cost_per_hour_usd         REAL DEFAULT 50.0   -- configurable
);
```

### Structured Log Entry (JSON — stdout / log file)

```typescript
interface LogEntry {
  timestamp: string;   // ISO 8601 UTC
  level: 'info' | 'warn' | 'error' | 'debug';
  eventType: string;   // e.g. 'ticket.received', 'classification.complete', 'error.classifier'
  ticketId?: string;
  message: string;
  data?: Record<string, unknown>;   // never contains credential values
  stack?: string;      // only on error level
}
```

---

## API Endpoint Specifications

### Authentication

All endpoints (GET and mutating) require `X-API-Key: <key>` header.  
Missing or invalid key → `HTTP 401 { "error": "Unauthorized" }` (no ticket data in body).

---

### `POST /api/tickets`

Create a new ticket. Accepts both `application/json` and `multipart/form-data` (for file attachments).

**JSON Request:**
```json
{
  "subject": "Cannot connect to VPN",
  "body": "I get error 412 when trying to connect to the corporate VPN from home.",
  "submitterEmail": "alice@example.com"
}
```

**Multipart Request:** same fields as form fields, plus optional `attachment` file field (image: JPEG/PNG/GIF ≤10 MB; audio: MP3/WAV/M4A ≤25 MB).

At least one of `subject` or `body` required.

**Response 201:**
```json
{
  "ticketId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "received",
  "receivedAt": "2025-01-15T10:30:00.000Z"
}
```

**Response 400:**
```json
{ "error": "At least one of 'subject' or 'body' is required." }
```

---

### `GET /api/tickets`

List tickets with filtering and pagination.

**Query params:** `status`, `category`, `priority`, `adminId`, `from` (ISO date), `to` (ISO date), `sort` (`received_at|priority|status`), `order` (`asc|desc`), `page` (default 1), `limit` (default 100, max 100)

**Response 200:**
```json
{
  "tickets": [ { ...TicketSummary } ],
  "total": 342,
  "page": 1,
  "limit": 100
}
```

---

### `GET /api/tickets/:id`

Get full ticket detail.

**Response 200:** Full `Ticket` object including KB results, draft, confidence, HITL history.  
**Response 404:** `{ "error": "Ticket not found" }`

---

### `POST /api/approvals`

Submit an admin approval action.

**Request:**
```json
{
  "ticketId": "550e8400-e29b-41d4-a716-446655440000",
  "action": "approve",          // "approve" | "edit-approve" | "reject"
  "editedResponse": "...",      // required if action = "edit-approve"
  "notes": "Looks good"
}
```

**Response 200:** `{ "ticketId", "status", "actionedAt" }`  
**Response 409:** `{ "error": "Concurrent action conflict — ticket already actioned" }`  
**Response 422:** `{ "error": "editedResponse required for edit-approve action" }`

---

### `GET /api/health`

No authentication required.

**Response 200:**
```json
{
  "status": "healthy",
  "services": {
    "bedrock":       { "status": "healthy" },
    "chromadb":      { "status": "healthy" },
    "sqlite":        { "status": "healthy" },
    "emailProvider": { "status": "degraded", "detail": "SMTP connection slow" }
  },
  "autoResolutionEnabled": true,
  "checkedAt": "2025-01-15T10:30:00.000Z"
}
```

Each service `status` is one of `healthy | degraded | unavailable`.  
Top-level `status` is the worst of all individual statuses.

---

### `GET /api/tickets/:id/reasoning`

Returns the reasoning trace for a ticket. For in-progress tickets, upgrades to SSE stream.

**Response 200 (completed ticket):**
```json
{
  "ticketId": "...",
  "steps": [
    { "agentName": "Classifier", "startedAt": "...", "completedAt": "...", "durationMs": 1200, "outputs": { "category": "network-issue", "priority": "high" } },
    { "agentName": "EmotionAnalyzer", "outputs": { "emotional_state": "stressed", "churn_risk": "medium" } },
    { "agentName": "KBSearcher", "outputs": { "matched": 3, "topScore": 0.89, "kbStatus": "ok" } },
    { "agentName": "Resolver", "outputs": { "confidenceScore": 87, "action": "auto_resolve" } }
  ],
  "escalationReason": null
}
```

**SSE stream (in-progress ticket):** `Content-Type: text/event-stream`; each event is `data: { "step": { AgentStep } }\n\n`

---

### `GET /api/incidents`

List incident reports.

**Query params:** `status` (`draft|approved|sending|closed`), `from`, `to`

**Response 200:** `{ "incidents": [ { IncidentSummary } ], "total": 5 }`

---

### `GET /api/incidents/:id`

Get full incident detail including `notification_log`.

**Response 200:** Full `Incident` object.  
**Response 404:** `{ "error": "Incident not found" }`

---

### `POST /api/incidents/:id/approve`

Admin approves an incident report, triggering outbound notifications.

**Request:** `{ "adminId": "admin-001" }`  
**Response 200:** `{ "incidentId", "status": "sending", "approvedAt" }`  
**Response 409:** `{ "error": "Incident already approved or closed" }`

---

### `POST /api/incidents/:id/close`

Admin closes an incident (starts 30-minute cooldown).

**Request:** `{ "adminId": "admin-001", "notes": "Issue resolved by infra team" }`  
**Response 200:** `{ "incidentId", "status": "closed", "cooldownUntil" }`

---

### `GET /api/metrics/session`

Returns current session metrics for the Metrics Panel.

**Response 200:**
```json
{
  "sessionId": "...",
  "startedAt": "2025-01-15T09:00:00.000Z",
  "ticketsAutoResolved": 42,
  "ticketsEscalated": 11,
  "ticketsTotal": 53,
  "autoResolutionRate": 79.25,
  "avgResolutionTimeSeconds": 8.3,
  "solutionsLearnedThisSession": 4,
  "ticketsPreventedProactively": 12,
  "emotionEscalationsTriggered": 3,
  "estimatedTimeSavedMinutes": 210,
  "estimatedCostSavedUsd": "175.00"
}
```

---

## Agent Pipeline Data Flow

```
Ticket Created (with optional attachment)
     │
     ▼
[MultiModalHandler] (only if attachment present)
  Image → Bedrock vision OCR → append extracted text to body
  Audio → AWS Transcribe / Whisper → append transcript to body
  Email thread → regex strip quotes → use most recent segment
  Output: { subject, body, source_modality, processing_notes }
     │
     ▼
[Classifier Agent]
  Input:  { ticketId, subject, body }
  Bedrock call → JSON { category, priority, sentiment, suggestedAgent, detectedLanguage }
  If non-English → Bedrock translate call → { translatedSubject, translatedBody }
  Output: ClassifierOutput saved to ticket record
  Emits: reasoning.step
     │
     ├─ (parallel) ──────────────────────────────────┐
     ▼                                                ▼
[EmotionAnalyzer Agent]               (normal pipeline continues)
  Input: { ticketId, subject, body, submitterEmail }
  SQLite VIP check (ticket count last 7 days)
  Bedrock call → emotion JSON output
  Override rules fire: critical_churn alert, Slack ping, lead notify
  Output: EmotionAnalyzerOutput saved to ticket record
  Emits: reasoning.step, ticket.emotion_analyzed
     │
     └──────────────────────────────────────────────┘
                            │
     ├── suggestedAgent = 'human-review' → skip to HITL (no KB search)
     ├── churn_risk = 'critical' → bypass queue → 60s alert → HITL
     │
     ▼
[KBSearcher Agent]
  Input:  { ticketId, subject/translatedSubject, body/translatedBody }
  Bedrock embed → vector → ChromaDB query (top 10, score > 0)
  Apply kb_confidence_multiplier: adjustedScore = rawScore * (success/total)
  Entries with multiplier < 0.4 deprioritized
  If max adjusted score ≤ 0.5 → Brave Search API fallback
  Output: KBSearchOutput saved to ticket record
  Emits: reasoning.step
     │
     ▼
[Resolver Agent]
  Input:  { ticket, kbResults, kbStatus, priority, detectedLanguage, emotionOutput }
  Routing decision (deterministic code):
    kbStatus !== 'ok'                         → escalate
    priority = critical                       → pending_approval
    churn_risk = 'critical' or 'high'         → pending_approval (emotion override)
    confidence > 85                           → auto_resolve
    confidence 60–85                          → pending_approval
    confidence < 60                           → escalate
  If emotional_state !== 'calm' → rewrite opening sentence to match recommended_tone
  Bedrock draft call → sanitize metadata → back-translate if needed
  Output: ResolverOutput saved to ticket record
  Emits: reasoning.step
     │
     ├── action = 'escalate' → set status='escalated', notify admin, → Logger
     ├── action = 'auto_resolve' → Delivery → Logger
     └── action = 'pending_approval' → HITL → (Approve → Delivery → Logger)
                                                (Reject  → set escalated → Logger)

[PredictionEngine] (background loop, independent)
  MockEventStream → rolling window error signature counter
  5+ distinct users same signature within 5 min → detect incident
  Create incident record (status=draft) → admin notification
  After admin approval → outbound notifications to affected users
  Admin close → 30-min cooldown for that signature
```

---

## Error Handling

See [Error Handling and Retry Strategy](#error-handling-and-retry-strategy) below for the full matrix.

---

## Error Handling and Retry Strategy

### Retry Configuration

```typescript
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelay: 1000,    // ms
  cap: 30000,            // ms
  multiplier: 2,
};
```

The `withRetry` wrapper uses exponential backoff: `delay = min(initialDelay * 2^attempt, cap)` with ±10% jitter to avoid thundering herd.

Applied to: Bedrock API, ChromaDB, Brave Search API, email delivery, SQLite writes.

### Delivery Retry (per Req 5.3 / 6.3)

Email delivery uses a separate extended policy: up to 5 attempts (approval dispatch) or 3 attempts (initial delivery), starting at 5 s, doubling to max 60 s.

### Error Escalation Matrix

| Error | Handling |
|---|---|
| Classifier exception / timeout | Fallback classification (`other/high/human-review`), emit error log |
| EmotionAnalyzer exception / timeout | Default safe values (`calm/professional/low`), emit error log, pipeline continues |
| MultiModalHandler OCR failure | Append `"Image attachment could not be processed"` note to body, continue |
| MultiModalHandler transcription failure | Append `"Audio attachment could not be transcribed"` note to body, continue |
| KBSearcher ChromaDB down | `kbStatus = 'kb_unavailable'`, fallback to Brave |
| KBSearcher Brave API error | `kbStatus = 'search_error'`, return empty results |
| Resolver exception | Escalate ticket, log with stack trace |
| Delivery exhausted retries | `status = 'delivery-failed'`, notify admin |
| Logger write failure (after retries) | Emit structured error log (ticketId, target, error class, timestamp); ticket continues |
| Logger KB count update failure | Retry 3×; emit structured error with KB entry ID; ticket outcome unaffected |
| Bedrock unavailable ≥ 60 s | Disable auto-resolution, route all new tickets to `human-review`; emit single health alert |
| Enqueue failure (after 3 retries) | `status = 'enqueue-failed'` |
| Concurrent HITL action | HTTP 409; first-committed wins (SQLite transaction with `WHERE status = 'pending-approval'`) |
| PredictionEngine notification failure | Retry 3×; record per-user status in `notification_log`; incident status unaffected |
| Incident admin approval conflict | HTTP 409 if already approved or closed |

### Concurrency Control

HITL action updates use a SQLite transaction:

```sql
BEGIN IMMEDIATE;
UPDATE tickets
SET status = ?, admin_id = ?, admin_action = ?, admin_action_at = ?
WHERE id = ? AND status = 'pending-approval';
-- If rows_affected = 0 → rollback → HTTP 409
COMMIT;
```

This is safe for single-process SQLite; if scaled to multi-process, replace with a row-level lock or optimistic concurrency via a `version` column.

---

## Security Architecture

### API Key Authentication

- All API endpoints require `X-API-Key` header (see Requirements 11.1–11.2)
- Keys stored in environment variable `HELPPILOT_API_KEYS` as a comma-separated list (supports key rotation)
- Middleware `src/middleware/auth.ts` validates on every request; returns `401` with no ticket data on failure
- Dashboard stores the API key in `sessionStorage` (cleared on tab close); never in `localStorage`

### Credential Management

- All secrets (Bedrock credentials, ChromaDB URL, Brave API key, SMTP credentials, admin Slack webhook) stored as environment variables — never in source code or config files committed to VCS
- Log sanitizer `src/utils/logSanitizer.ts` strips known secret patterns before any log entry is written
- API error responses never include raw exception messages that might leak configuration

### Input Validation

- `subject` max 255 chars, `body` max 10,000 chars enforced at ingestion
- All database writes use parameterized queries (better-sqlite3 prepared statements)
- KB search query is sanitized before embedding; no SQL injection risk since ChromaDB uses vector distance, not SQL

### Data in Transit

- Express server should be deployed behind HTTPS termination (nginx / ALB)
- Bedrock and Brave API calls use HTTPS by default via AWS SDK and node-fetch

### Admin Dashboard Auth

- Login page collects API key; all subsequent fetch calls attach `X-API-Key` header
- Unauthenticated users are redirected to login; no ticket content is rendered until auth succeeds
- React Router guard: `<RequireAuth>` wrapper checks `sessionStorage` key presence

---

## Frontend Component Structure

```
src/frontend/
├── index.html
├── main.tsx                    # React entry; Router setup
├── App.tsx                     # Route definitions
├── api/
│   └── client.ts               # Axios instance with X-API-Key interceptor
├── hooks/
│   ├── useTickets.ts           # SWR polling for ticket list (5s interval)
│   ├── useTicket.ts            # SWR for single ticket detail
│   ├── useMetrics.ts           # Derived metrics from ticket list
│   ├── useSessionMetrics.ts    # Polls /api/metrics/session every 5s
│   ├── useReasoningTrace.ts    # SSE connection to /api/tickets/:id/reasoning
│   └── useIncidents.ts         # SWR polling for incident list
├── pages/
│   ├── LoginPage.tsx
│   ├── TicketListPage.tsx
│   ├── TicketDetailPage.tsx
│   ├── IncidentListPage.tsx    # Table of PredictionEngine incidents
│   ├── IncidentDetailPage.tsx  # Incident detail + approve/close controls
│   └── NotFoundPage.tsx
├── components/
│   ├── TicketTable/
│   │   ├── TicketTable.tsx     # Sortable; columns: received, priority, status, category, emotion
│   │   ├── TicketRow.tsx
│   │   └── PaginationBar.tsx
│   ├── TicketDetail/
│   │   ├── TicketHeader.tsx    # Subject, submitter, timestamps, source modality badge
│   │   ├── ClassificationPanel.tsx
│   │   ├── KBResultsPanel.tsx
│   │   ├── DraftResponsePanel.tsx
│   │   ├── HITLHistory.tsx
│   │   └── ReasoningTracePanel.tsx   # SSE-connected live agent steps + confidence bars
│   ├── ApprovalPanel/
│   │   ├── ApprovalPanel.tsx   # Conditionally rendered when status=pending-approval
│   │   ├── EditableResponse.tsx
│   │   ├── ApprovalButtons.tsx
│   │   └── EmotionBadge.tsx    # emotional_state + frustration/urgency scores, color-coded
│   ├── MetricsPanel/
│   │   ├── MetricsPanel.tsx    # 6 live counters + cost saved; polls /api/metrics/session
│   │   └── MetricCard.tsx
│   ├── MetricsSummary/
│   │   ├── MetricsSummary.tsx
│   │   └── MetricCard.tsx
│   ├── ActivityLogStream/
│   │   └── ActivityLogStream.tsx  # Real-time scrolling SSE log of agent events
│   ├── Incidents/
│   │   ├── IncidentTable.tsx
│   │   ├── IncidentRow.tsx
│   │   └── IncidentApprovalBar.tsx  # Approve / Close controls
│   └── shared/
│       ├── StatusBadge.tsx
│       ├── PriorityBadge.tsx
│       ├── ModalityBadge.tsx   # text | image | voice | email_thread indicator
│       └── RequireAuth.tsx     # Route guard
└── utils/
    ├── formatters.ts           # Date, confidence %, response time, currency
    └── constants.ts            # Status/category/priority/modality/emotion enums
```

**Polling strategy:** `useTickets` uses `setInterval` inside a `useEffect` with a 5-second cadence. The interval is cleared on unmount. On the detail page, `useTicket` polls the single-ticket endpoint every 5 s while `status` is in a non-terminal state. `useReasoningTrace` opens an SSE connection and switches to JSON polling once the ticket reaches a terminal state. `useSessionMetrics` polls every 5 s.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

After performing prework analysis across all 11 requirements and their acceptance criteria, and applying property reflection to eliminate redundancy, the following properties apply. PBT is appropriate here because the core logic (validation, classification output structure, routing decisions, log/record structure, metrics computation) consists of pure functions over structured data with large input spaces where 100+ iterations meaningfully reveal edge cases.

---

### Property 1: Ticket Validation Accepts Any Valid Combination of subject/body

*For any* ticket submission where at least one of `subject` (length 1–255) or `body` (length 1–10,000) is present, the ingestion layer SHALL accept the ticket and create a record with a UUID v4 `id` and a valid UTC `received_at` timestamp.

*For any* ticket submission where both `subject` and `body` are absent or empty, the ingestion layer SHALL reject the request with HTTP 400 and an `error` field.

**Validates: Requirements 1.1, 1.5, 1.6**

---

### Property 2: Classification Output is Always Valid and Complete

*For any* ticket text input (including arbitrary Unicode, whitespace, informal language, spelling errors, very short or very long strings), the Classifier SHALL return an output where:
- `category` is exactly one of `[password-reset, network-issue, software-install, hardware-failure, billing, other]`
- `priority` is exactly one of `[low, medium, high, critical]`
- `sentiment` is exactly one of `[neutral, frustrated, urgent, positive]`
- `suggestedAgent` is exactly one of `[KBSearcher, Resolver, human-review]`

This property subsumes requirements 2.1–2.5 (enumeration constraints hold for all inputs).

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

---

### Property 3: Non-English Tickets Always Have Language Recorded

*For any* non-English ticket, the Classifier output SHALL always include a non-empty `detectedLanguage` field. If language detection fails, the field SHALL default to `'en'` (never null or undefined).

**Validates: Requirements 2.6, 9.1**

---

### Property 4: Confidence Score Routing is Deterministic and Exhaustive

*For any* ticket with a resolved `confidenceScore` (0–100) and `priority`, the Resolver SHALL produce exactly one of `[auto_resolve, pending_approval, escalate]` according to the routing rules, with no input combination producing an undefined or null `action`. Specifically:
- `priority === 'critical'` always produces `pending_approval` regardless of confidence score
- `confidenceScore > 85 && priority !== 'critical'` always produces `auto_resolve`
- `60 <= confidenceScore <= 85` always produces `pending_approval`
- `confidenceScore < 60` always produces `escalate`

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

---

### Property 5: Draft Responses Never Contain Internal System Metadata

*For any* generated draft response string, the text SHALL NOT contain patterns matching:
- UUID v4 format (`/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i`)
- Numeric confidence values preceded by "confidence" keyword (case-insensitive)
- Agent names: `Classifier`, `KBSearcher`, `Resolver`, `Logger`

**Validates: Requirements 4.9**

---

### Property 6: KB Search Results are Always Sorted by Descending Similarity Score

*For any* KB search result list, the results SHALL be ordered by `similarityScore` descending, and no result SHALL have a `similarityScore` of 0 or below. If the input list has n valid results (score > 0), the output list has exactly `min(n, 3)` entries.

**Validates: Requirements 3.1, 3.2**

---

### Property 7: HITL Log Entries Always Contain Required Fields

*For any* admin approval action (approve / edit-approve / reject), the HITL log entry written to SQLite SHALL contain non-null, non-empty values for `ticketId`, `adminId`, `action`, and `actionedAt` (valid ISO 8601 UTC string).

**Validates: Requirements 5.6**

---

### Property 8: Terminal State Logger Records Always Contain Required Fields

*For any* ticket reaching a terminal state, the Logger SHALL write a SQLite record containing non-null values for: `ticketId`, `category`, `priority`, `outcome`, `terminal_at`. Fields `confidenceScore` and `responseText` SHALL be present when `outcome` is `SUCCESS_ADMIN` or `SUCCESS_AUTO`.

**Validates: Requirements 7.1**

---

### Property 9: Successful Resolution KB Round-Trip

*For any* ticket resolved with `successfully_resolved = true` and `outcome` in `['SUCCESS_ADMIN', 'SUCCESS_AUTO']`, querying ChromaDB with the ticket's body as the search text SHALL return at least one result with `metadata.ticketId` equal to the resolved ticket's ID (confirming the entry was persisted).

**Validates: Requirements 7.2**

---

### Property 10: Structured Log Entries Always Contain Required Fields

*For any* structured log entry emitted by HelpPilot, the JSON object SHALL contain non-null, non-empty values for `timestamp` (valid ISO 8601 UTC), `level` (one of `info|warn|error|debug`), `eventType` (non-empty string), and `message` (non-empty string). Log entries SHALL NOT contain values matching known secret patterns (API keys, SMTP passwords, webhook URLs).

**Validates: Requirements 10.1, 10.2, 11.5**

---

### Property 11: Aggregate Metrics Are Computed Correctly

*For any* dataset of ticket records, the metrics computation function SHALL produce:
- `totalProcessed` = count of all records with terminal status
- `autoResolutionRate` = (count where `resolution_action = 'auto_resolve'` / totalProcessed) × 100, rounded to 2 decimal places
- `avgConfidenceScore` = arithmetic mean of `confidence_score` across all records with a non-null confidence score
- `avgResponseTime` = arithmetic mean of `(terminal_at - received_at)` in seconds

These values must be consistent regardless of ticket ordering in the input dataset.

**Validates: Requirements 8.4**

---

### Property 12: API Authentication Always Enforced

*For any* HTTP request to a protected endpoint (`POST/GET /api/tickets`, `GET /api/tickets/:id`, `POST /api/approvals`) that does not include a valid `X-API-Key` header, the response SHALL be HTTP 401 with no ticket data in the body, regardless of request method, path parameters, or request body content.

**Validates: Requirements 11.1, 11.2**

---

### Property 13: EmotionAnalyzer Output Always Has Valid Fields

*For any* ticket text input, the EmotionAnalyzer SHALL return an output where:
- `frustration_score` is an integer in `[0, 10]`
- `urgency_score` is an integer in `[0, 10]`
- `churn_risk` is exactly one of `[low, medium, high, critical]`
- `emotional_state` is exactly one of `[calm, stressed, angry, desperate]`
- `recommended_tone` is exactly one of `[professional, empathetic, urgent, crisis]`
- `trigger_words` is an array (may be empty)
- `vip_flag` is a boolean

On exception, the fallback output SHALL satisfy all the same constraints with default values.

**Validates: Requirements 12.1, 12.7**

---

### Property 14: KB Confidence Multiplier Is Always in [0, 1] and Deprioritization Rule Holds

*For any* list of KB entries with arbitrary `success_count` and `failure_count` values (both ≥ 0), the computed `kb_confidence_multiplier` SHALL be a number in `[0, 1]`. Entries with both counts at 0 SHALL use multiplier `1.0`. After ranking, no entry with `kb_confidence_multiplier < 0.4` SHALL appear before any entry with `kb_confidence_multiplier ≥ 0.4` in the final results list.

**Validates: Requirements 13.5, 13.6**

---

### Property 15: Emotion Override Prevents Auto-Resolution for High/Critical Churn

*For any* combination of `confidenceScore` (0–100), `priority`, and `churn_risk`, when `churn_risk` is `high` or `critical`, the Resolver SHALL produce `pending_approval` and SHALL NOT produce `auto_resolve`, regardless of the confidence score value.

**Validates: Requirements 17.3, 17.7**

---

### Property 16: Session Metrics Never Produce NaN or Division-by-Zero

*For any* session state (including zero tickets processed, zero auto-resolved, zero resolved), the session metrics computation SHALL return numeric values for all counters with no `NaN`, `Infinity`, or `undefined` values. Rates and averages default to `0` when the denominator is zero.

**Validates: Requirements 18.1, 18.2**

---

### Property 17: MultiModal Normalization Always Produces Valid Ticket Format

*For any* combination of input modalities (text only, image only, audio only, email thread, or any combination), the MultiModalHandler SHALL return an output where `subject` is a string (may be empty), `body` is a non-null string, and `source_modality` is exactly one of `[text, image, voice, email_thread]`.

**Validates: Requirements 14.5**

---

### Property 18: Incident Detection Threshold is Exactly 5 Users

*For any* stream of error events, an incident SHALL be detected if and only if the count of distinct user IDs observing the same error signature within the configured time window is ≥ 5. A count of 4 SHALL NOT trigger detection. A count of 5 SHALL trigger detection.

**Validates: Requirements 16.2**

Key principles:
- No unhandled promise rejections: every agent's `run()` method is wrapped in try/catch
- Structured errors always include `ticketId` so incidents can be correlated
- Graceful degradation: individual agent failures route tickets to humans rather than dropping them
- Credential values are never present in any thrown error message (sanitized at log layer)

---

## Testing Strategy

### Dual Testing Approach

Unit tests verify specific examples, edge cases, and error conditions. Property-based tests verify universal invariants across hundreds of generated inputs. Both are required.

### Property-Based Tests (fast-check)

Library: **fast-check** (`npm install --save-dev fast-check`)  
Framework: **Vitest** (or Jest)  
Minimum iterations per property: **100** (fast-check default is 100; configure via `{ numRuns: 100 }`)

Each property test is tagged with a comment referencing its design property:
```
// Feature: helppilot, Property N: <property text>
```

Properties to implement as PBT tests:
- **Property 1** — Ticket validation accepts/rejects based on subject/body presence and length
- **Property 2** — Classification output always valid and complete (mock Bedrock, test output schema)
- **Property 3** — Non-English tickets always have `detectedLanguage` populated
- **Property 4** — Confidence routing is deterministic and exhaustive (pure routing function, no external calls)
- **Property 5** — Draft responses never contain internal metadata (sanitizer function)
- **Property 6** — KB results always sorted by descending score, filtered for positive scores
- **Property 7** — HITL log entries always contain required fields
- **Property 8** — Terminal state records always contain required fields
- **Property 9** — KB round-trip for successful resolutions (integration property, use test ChromaDB)
- **Property 10** — Structured log entries always contain required fields and no credential patterns
- **Property 11** — Metrics computation correctness for arbitrary ticket datasets
- **Property 12** — API authentication always enforced for protected endpoints
- **Property 13** — EmotionAnalyzer output always has valid enum fields and numeric ranges
- **Property 14** — KB confidence multiplier always in [0,1]; deprioritization rule holds for any entry mix
- **Property 15** — Emotion override: churn_risk high/critical always prevents auto-resolve
- **Property 16** — Session metrics never NaN/divide-by-zero for any counter state including zeros
- **Property 17** — MultiModal normalization always produces valid ticket format for any input modality
- **Property 18** — Incident detection threshold: exactly 5+ users triggers, 4 does not

### Unit / Example-Based Tests

- Email parser: 3 malformed email types → no ticket created
- Web form submission: 2-second response time target
- Classifier fallback: exception → `other/high/human-review` output
- EmotionAnalyzer fallback: exception → default safe values returned
- EmotionAnalyzer VIP flag: 3+ tickets in 7 days → `vip_flag: true`
- MultiModalHandler: email thread with quotes → only most recent segment used
- MultiModalHandler: oversized image → HTTP 413 returned
- KB error states: each `kbStatus` value (no_results, search_error, kb_unavailable)
- KB confidence multiplier: entry with success=0, failure=5 → multiplier < 0.4 → deprioritized
- Resolver emotion override: churn_risk=high + confidence=90 → pending_approval (not auto_resolve)
- Resolver error escalation: exception during draft generation
- Approval panel rendering: visible for `pending-approval` only; shows EmotionBadge
- Ticket detail view: all required fields rendered including reasoning trace
- HITL concurrent action: second action returns 409
- Stale ticket marking: no action after 4-hour threshold
- PredictionEngine: 4 users same error → no incident; 5 users → incident created
- PredictionEngine cooldown: same signature re-detected within 30 min → suppressed
- Session metrics: zero tickets → all counters return 0, no NaN values

### Integration Tests

- Full pipeline smoke test: ticket → multimodal normalize → classification → emotion analysis → KB search → draft → approve → delivered
- Emotion override smoke test: ticket with `churn_risk=critical` → bypasses queue → admin alert within 60s
- Proactive prediction smoke test: inject 5 matching error events → incident created → admin approves → notifications dispatched
- KB self-learning round-trip: resolve ticket → KB entry created → same query returns entry with multiplier applied
- Reasoning trace smoke test: ticket processed → SSE stream emits all 5 agent steps → trace persisted to SQLite
- Bedrock unavailability: auto-resolution disabled, tickets routed to human review
- Email delivery retry: SMTP failure × 3 → `delivery-failed` + admin notification
- Logger ChromaDB write failure: retry × 3 → structured error log emitted
- Health endpoint: reflects actual service state for each dependency
- Session metrics panel: 10 auto-resolved tickets → cost saved = `10 × 5 min / 60 × $50 = $41.67`

### Test Configuration

```typescript
// vitest.config.ts
export default {
  test: {
    globals: true,
    environment: 'node',
    coverage: { provider: 'v8', threshold: { lines: 80 } },
  },
};
```
