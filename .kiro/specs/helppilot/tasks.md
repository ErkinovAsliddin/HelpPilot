# Implementation Plan: HelpPilot IT Helpdesk Autopilot

## Overview

Implement HelpPilot as a Node.js 20 / TypeScript monorepo with an Express backend, four AI agents orchestrated through an event-driven pipeline, a SQLite + ChromaDB persistence layer, a React 18 + Vite admin dashboard, and a comprehensive test suite using Vitest and fast-check. Tasks are ordered so every step builds on the previous one and wires into the running system without leaving orphaned code.

---

## Tasks

- [ ] 1. Project scaffolding, tooling, and environment
  - [x] 1.1 Initialise Node.js 20 project with TypeScript strict mode
    - Run `npm init`, install `typescript`, `tsx`, `@types/node`; create `tsconfig.json` with `"strict": true`, `"target": "ES2022"`, `"module": "NodeNext"`
    - Create the directory tree: `src/agents/`, `src/ingestion/`, `src/pipeline/`, `src/services/`, `src/middleware/`, `src/utils/`, `src/frontend/`, `tests/unit/`, `tests/integration/`, `tests/property/`
    - Add `.env.example` listing all required environment variables (`HELPPILOT_API_KEYS`, `AWS_REGION`, `BEDROCK_MODEL_ID`, `CHROMA_URL`, `BRAVE_API_KEY`, `SMTP_*`, `SLACK_WEBHOOK_URL`)
    - _Requirements: 10.4, 11.4_

  - [ ] 1.2 Install and configure all backend dependencies
    - Install `express`, `better-sqlite3`, `chromadb`, `@aws-sdk/client-bedrock-runtime`, `nodemailer`, `uuid`, `imap`, `mailparser`, `node-fetch`
    - Install dev deps: `vitest`, `fast-check`, `@vitest/coverage-v8`, `supertest`, `@types/express`, `@types/better-sqlite3`, `@types/nodemailer`, `@types/uuid`
    - Configure `vitest.config.ts` with `globals: true`, `environment: 'node'`, coverage threshold `lines: 80`
    - Add `npm` scripts: `build`, `start`, `dev`, `test`, `test:run`
    - _Requirements: 10.4_

  - [ ] 1.3 Create shared TypeScript type definitions
    - Write `src/types/ticket.ts` — full `Ticket` interface mirroring the SQLite schema; export `Category`, `Priority`, `Sentiment`, `TicketStatus` enums/union types; export `KBResult`, `KBSearchOutput`, `ClassifierOutput`, `ResolverOutput` interfaces
    - Write `src/types/log.ts` — `LogEntry` interface
    - Write `src/types/events.ts` — `PipelineEventMap` type mapping each event name to its payload type
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.2, 4.6, 10.1_

  - [ ] 1.4 Implement structured logger and log sanitizer
    - Write `src/utils/logger.ts` — exports `log(entry: Omit<LogEntry, 'timestamp'>)` that stamps UTC timestamp and writes JSON to stdout
    - Write `src/utils/logSanitizer.ts` — strips API keys, SMTP passwords, webhook URLs matching known patterns before any log write
    - _Requirements: 10.1, 10.2, 11.5_

  - [ ] 1.5 Implement retry utility
    - Write `src/utils/retry.ts` — `withRetry<T>(fn, { maxAttempts=3, initialDelay=1000, cap=30000, multiplier=2 })` with ±10 % jitter
    - _Requirements: 10.4_

- [ ] 2. SQLite schema, migrations, and knowledge base seed
  - [ ] 2.1 Create SQLite schema and database initialisation module
    - Write `src/db/schema.ts` — executes `CREATE TABLE IF NOT EXISTS tickets (...)` with all columns from the design; creates `hitl_log` table; creates all five indexes (`status`, `category`, `priority`, `received_at`, `admin_id`); exports `getDb()` returning a singleton `better-sqlite3` `Database` instance
    - _Requirements: 1.6, 7.1, 7.5_

  - [ ] 2.2 Implement ticket repository
    - Write `src/db/ticketRepository.ts` — prepared-statement CRUD: `insertTicket`, `getTicketById`, `updateTicket`, `listTickets(filters, pagination)`, `countTickets(filters)`; all writes use parameterized statements
    - `listTickets` supports filtering by `status`, `category`, `priority`, `adminId`, date range, and sorting by `received_at | priority | status`
    - _Requirements: 7.5, 8.1_

  - [ ] 2.3 Implement HITL log repository
    - Write `src/db/hitlRepository.ts` — `insertHitlEntry(entry)`, `getHitlEntriesForTicket(ticketId)` using prepared statements
    - _Requirements: 5.6, 7.1_

  - [ ] 2.4 Seed knowledge base with 50+ IT solution articles
    - Write `src/db/kbSeed.ts` — defines an array of at least 50 `KBEntry` objects across the five categories (`password-reset`, `network-issue`, `software-install`, `hardware-failure`, `billing`, `other`) plus an `other` category
    - Write `src/db/chromaInit.ts` — initialises ChromaDB client, creates collection `helppilot_kb` if absent, calls Bedrock Titan embed for each seed article, upserts all entries; idempotent (skips entries whose ID already exists)
    - _Requirements: 3.1, 3.8_

- [ ] 3. Core middleware and Express application skeleton
  - [ ] 3.1 Implement API key authentication middleware
    - Write `src/middleware/auth.ts` — reads `HELPPILOT_API_KEYS` env var, splits on comma, validates `X-API-Key` header; returns `401 { "error": "Unauthorized" }` with no ticket data on failure; passes on success
    - _Requirements: 11.1, 11.2_

  - [ ] 3.2 Bootstrap Express application
    - Write `src/app.ts` — creates Express app, mounts JSON + urlencoded body parsers, mounts `auth` middleware on all `/api/*` routes except `GET /api/health`, mounts static middleware pointing at `dist/frontend` (built Vite output), exports `app`
    - Write `src/server.ts` — imports `app`, calls `initDb()`, calls `chromaInit()`, starts HTTP server on `PORT` env var (default 3000), emits structured `info` log on ready
    - _Requirements: 1.1, 10.1, 11.1_

  - [ ] 3.3 Implement health endpoint
    - Write `src/routes/health.ts` — `GET /api/health` probes Bedrock, ChromaDB, SQLite, email provider; returns `{ status, services, autoResolutionEnabled, checkedAt }` per design spec; no auth required
    - Mount router in `app.ts`
    - _Requirements: 10.7_

  - [ ] 3.4 Implement tickets REST routes (stub handlers)
    - Write `src/routes/tickets.ts` — skeleton handlers for `POST /api/tickets`, `GET /api/tickets`, `GET /api/tickets/:id`; each validates input and returns `501 Not Implemented` until wired to real logic in task 5
    - Mount router in `app.ts` under auth middleware
    - _Requirements: 1.1, 1.5, 1.6_

  - [ ] 3.5 Implement approvals REST route (stub handler)
    - Write `src/routes/approvals.ts` — skeleton handler for `POST /api/approvals`; validates payload shape, returns `501 Not Implemented` until wired in task 8
    - Mount router in `app.ts` under auth middleware
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

- [ ] 4. Checkpoint — Foundation passes smoke test
  - Start server (`npm run dev`), confirm `GET /api/health` returns 200, `POST /api/tickets` without `X-API-Key` returns 401, and `POST /api/tickets` with a valid key returns 501. Ensure all tests pass; ask the user if questions arise.

- [ ] 5. Classifier Agent
  - [ ] 5.1 Implement Bedrock client wrapper
    - Write `src/utils/bedrockClient.ts` — wraps `@aws-sdk/client-bedrock-runtime` `InvokeModelCommand`; exports `invokeModel(modelId, body)` with `withRetry` applied; exports `embedText(text): Promise<number[]>` using `amazon.titan-embed-text-v1`
    - _Requirements: 2.8, 10.4_

  - [ ] 5.2 Implement Classifier Agent
    - Write `src/agents/classifier.ts` — class `ClassifierAgent` with `run(input: ClassifierInput): Promise<ClassifierOutput>`
    - Sends single structured-JSON prompt to Claude 3.5 Sonnet (temperature 0) requesting `category`, `priority`, `sentiment`, `suggestedAgent`, `detectedLanguage`
    - If `detectedLanguage !== 'en'` and is in the supported list, issues separate Bedrock translate call for `subject` + `body`; stores `translatedSubject`, `translatedBody`
    - Wraps all Bedrock calls in `withRetry`
    - On any exception or empty response → returns fallback `{ category: 'other', priority: 'high', suggestedAgent: 'human-review', sentiment: 'neutral' }`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 9.1, 9.2_

  - [ ] 5.3 Write property test for Classifier output schema (Property 2)
    - **Property 2: Classification Output is Always Valid and Complete**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
    - Mock Bedrock; generate arbitrary Unicode `subject`/`body` strings with fast-check; assert all four enum fields are within allowed sets for every generated input
    - Tag: `// Feature: helppilot, Property 2`

  - [ ] 5.4 Write property test for non-English language recording (Property 3)
    - **Property 3: Non-English Tickets Always Have Language Recorded**
    - **Validates: Requirements 2.6, 9.1**
    - Mock Bedrock returning non-English `detectedLanguage`; assert output always has a non-empty string `detectedLanguage`, never null/undefined
    - Tag: `// Feature: helppilot, Property 3`

- [ ] 6. KBSearcher Agent
  - [ ] 6.1 Implement ChromaDB client wrapper
    - Write `src/utils/chromaClient.ts` — initialises `ChromaClient`; exports `queryCollection(collectionName, embedding, topK)` returning `KBResult[]`; wraps in `withRetry`; on connection failure throws typed `KBUnavailableError`
    - _Requirements: 3.1, 3.6, 10.4_

  - [ ] 6.2 Implement Brave Search API client
    - Write `src/utils/braveClient.ts` — `searchWeb(query: string): Promise<KBResult[]>` using `node-fetch`; caps snippets at 300 chars; returns empty array on 4xx/5xx or network error; sets `kbStatus` appropriately
    - _Requirements: 3.3, 3.4, 3.5_

  - [ ] 6.3 Implement KBSearcher Agent
    - Write `src/agents/kbSearcher.ts` — class `KBSearcherAgent` with `run(ticket): Promise<KBSearchOutput>`
    - Embeds translated text (falls back to original) via `embedText`; queries `helppilot_kb` collection `top_k=3` excluding score ≤ 0
    - If max score ≤ 0.5 or ChromaDB unavailable → calls Brave API fallback
    - Returns top 3 results sorted by descending similarity score, including both `kb_article` and `logged_resolution` entries
    - Sets `kbStatus` to `ok | no_results | search_error | kb_unavailable` per requirements
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ] 6.4 Write property test for KB result ordering (Property 6)
    - **Property 6: KB Search Results are Always Sorted by Descending Similarity Score**
    - **Validates: Requirements 3.1, 3.2**
    - Generate arbitrary lists of `KBResult` objects with fast-check; pass through the sort/filter function; assert descending order and no score ≤ 0; assert length is `min(n, 3)`
    - Tag: `// Feature: helppilot, Property 6`

- [ ] 7. Resolver Agent
  - [ ] 7.1 Implement routing decision function
    - Write `src/agents/resolverRouter.ts` — pure function `determineAction(priority, kbStatus, confidenceScore): ResolverOutput['action']` implementing the exact routing rules from the design (critical → pending_approval; confidence > 85 → auto_resolve; 60–85 → pending_approval; < 60 → escalate; kbStatus !== 'ok' → escalate)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 7.2 Implement draft sanitizer
    - Write `src/utils/draftSanitizer.ts` — `sanitizeDraft(text: string): string` strips UUID v4 patterns, "confidence" + numeric patterns, and agent name strings (`Classifier`, `KBSearcher`, `Resolver`, `Logger`) from draft text
    - _Requirements: 4.9_

  - [ ] 7.3 Implement Resolver Agent
    - Write `src/agents/resolver.ts` — class `ResolverAgent` with `run(ticket, kbOutput): Promise<ResolverOutput>`
    - Calls `determineAction` first (no Bedrock call if escalating due to kbStatus or low confidence)
    - For `auto_resolve` and `pending_approval`: calls Claude 3.5 Sonnet to generate draft; applies `sanitizeDraft`; if `detectedLanguage` is set and supported, back-translates via Bedrock
    - Returns `ResolverOutput` with `confidenceScore`, `confidenceExplanation`, `sourcesUsed`, optional `draftResponse`, optional `translatedResponse`
    - On exception: escalates ticket, logs error with stack trace
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 9.3, 9.4, 9.5, 9.6_

  - [ ] 7.4 Write property test for routing determinism (Property 4)
    - **Property 4: Confidence Score Routing is Deterministic and Exhaustive**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
    - Use fast-check to generate arbitrary `(priority, kbStatus, confidenceScore 0–100)` tuples; assert `determineAction` always returns exactly one of the three valid actions; assert routing rules are fully covered with no undefined result
    - Tag: `// Feature: helppilot, Property 4`

  - [ ] 7.5 Write property test for draft sanitizer (Property 5)
    - **Property 5: Draft Responses Never Contain Internal System Metadata**
    - **Validates: Requirements 4.9**
    - Use fast-check to generate arbitrary strings (including injected UUIDs, confidence numbers, agent names); pass through `sanitizeDraft`; assert output matches no forbidden patterns
    - Tag: `// Feature: helppilot, Property 5`

- [ ] 8. Logger Agent
  - [ ] 8.1 Implement Logger Agent
    - Write `src/agents/logger.ts` — class `LoggerAgent` with `run(ticket): Promise<void>`
    - Writes complete terminal-state record to `tickets` table via `updateTicket`; wraps in `withRetry`
    - On `outcome IN ('SUCCESS_ADMIN', 'SUCCESS_AUTO')` and `successfully_resolved = true`: upserts ChromaDB entry keyed on `ticketId` (checks for existing entry first)
    - On write failure after all retries: emits structured error log with `ticketId`, target store, error class, timestamp — does NOT rethrow
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 8.2 Write property test for terminal state record fields (Property 8)
    - **Property 8: Terminal State Logger Records Always Contain Required Fields**
    - **Validates: Requirements 7.1**
    - Use fast-check to generate arbitrary terminal ticket objects; assert `LoggerAgent.buildRecord` always produces non-null values for `ticketId`, `category`, `priority`, `outcome`, `terminal_at`; assert `confidenceScore` and `responseText` are present when outcome is `SUCCESS_*`
    - Tag: `// Feature: helppilot, Property 8`

- [ ] 9. Pipeline Orchestrator
  - [ ] 9.1 Implement PipelineEventBus
    - Write `src/pipeline/eventBus.ts` — typed wrapper around Node.js `EventEmitter` using `PipelineEventMap`; exports singleton `bus`
    - _Requirements: 1.7, 10.3_

  - [ ] 9.2 Implement Pipeline Orchestrator
    - Write `src/pipeline/orchestrator.ts` — class `PipelineOrchestrator` that subscribes to `ticket.received`; runs `ClassifierAgent → KBSearcherAgent → ResolverAgent` in sequence; updates ticket status at each stage (`classifying`, `kb_searching`, `resolving`); emits `ticket.draft_ready`, `ticket.escalated`, `ticket.terminal` at the right moments; calls `LoggerAgent.run` on every terminal event
    - Routes `suggestedAgent = 'human-review'` directly to HITL (skips KB search)
    - Wraps `ClassifierAgent.run` in try/catch; on exception applies fallback classification
    - Handles `ticket.approved` and `ticket.rejected` events from the approval flow
    - _Requirements: 1.7, 2.7, 4.8, 10.3_

  - [ ] 9.3 Wire ticket ingestion routes to pipeline
    - Update `src/routes/tickets.ts` — `POST /api/tickets` creates SQLite record, emits `ticket.received`, returns 201; `GET /api/tickets` calls `listTickets`; `GET /api/tickets/:id` calls `getTicketById` (404 if not found)
    - Start `PipelineOrchestrator` in `server.ts`
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 1.7_

- [ ] 10. Checkpoint — Full pipeline smoke test
  - Submit a test ticket via `POST /api/tickets` and trace it through classification → KB search → draft → Logger; verify the ticket reaches a terminal state in SQLite. Ensure all unit tests pass; ask the user if questions arise.

- [ ] 11. HITL Notification Service and Approval Flow
  - [ ] 11.1 Implement HITL Notifier Service
    - Write `src/services/hitlNotifier.ts` — `notifyAdmin(ticket)` sends notification via Slack webhook (`SLACK_WEBHOOK_URL` env) or Nodemailer email (configurable); must send within 30 s of `ticket.draft_ready`
    - Registers `setInterval` stale-check sweep every 5 minutes; queries SQLite for `status = 'pending-approval'` tickets older than 4 hours; re-notifies and sets `status = 'stale'`
    - Subscribes to `ticket.draft_ready` on `bus`
    - _Requirements: 5.1, 5.7_

  - [ ] 11.2 Implement Delivery Service
    - Write `src/services/deliveryService.ts` — `sendEmailResponse(ticket, response)`: Nodemailer SMTP (primary) or SendGrid HTTP (alternate, detected by `SENDGRID_API_KEY` presence); wraps in `withRetry` (3 attempts, 5 s start, 2× doubling, 60 s cap)
    - `updateApiResponse(ticket, response)`: updates SQLite `status = 'resolved'`, sets `final_response`, `delivered_at`, `delivery_channel`; wraps in `withRetry`
    - On all retries exhausted: sets `status = 'delivery-failed'`, calls `notifyAdmin`
    - _Requirements: 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ] 11.3 Wire approval route to pipeline
    - Update `src/routes/approvals.ts` — `POST /api/approvals` validates `action` enum; uses SQLite transaction (`BEGIN IMMEDIATE … WHERE status = 'pending-approval'`) to prevent concurrent actions; returns 409 if rows_affected = 0; inserts `hitl_log` entry; emits `ticket.approved` or `ticket.rejected` on `bus`; returns 200 on success; returns 422 if `editedResponse` missing for `edit-approve`
    - Orchestrator handles `ticket.approved` → `DeliveryService.sendEmailResponse` or `updateApiResponse`; `ticket.rejected` → set `status = 'escalated'`, record notes
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.8_

  - [ ] 11.4 Write property test for HITL log entry fields (Property 7)
    - **Property 7: HITL Log Entries Always Contain Required Fields**
    - **Validates: Requirements 5.6**
    - Use fast-check to generate arbitrary approval action objects; assert `insertHitlEntry` always produces records with non-null `ticketId`, `adminId`, `action`, `actionedAt`
    - Tag: `// Feature: helppilot, Property 7`

- [ ] 12. Email Ingestion and Web Form Handler
  - [ ] 12.1 Implement Email Parser ingestion
    - Write `src/ingestion/email.ts` — polls IMAP mailbox using `imap` + `mailparser`; extracts `subject`, `body`, `from`, `received_at`; on parse failure discards message and emits structured error log (no ticket created); emits `ticket.received` on success
    - _Requirements: 1.2, 1.3_

  - [ ] 12.2 Implement Web Form handler
    - Write `src/ingestion/webform.ts` — Express `POST /api/tickets` handler for `application/x-www-form-urlencoded`; delegates to same validation logic as REST ingestion; target: ticket creation within 2 s
    - Register route in `app.ts`
    - _Requirements: 1.4_

- [ ] 13. Health Monitor
  - [ ] 13.1 Implement Health Monitor service
    - Write `src/services/healthMonitor.ts` — probes Bedrock, ChromaDB, SQLite, email provider on each `GET /api/health` request; tracks Bedrock consecutive-unavailability duration; after 60 s disables `autoResolutionEnabled` flag (shared module state), emits one health-alert log; re-enables when Bedrock responds
    - Expose `isAutoResolutionEnabled()` function consumed by `PipelineOrchestrator`
    - _Requirements: 10.5, 10.6, 10.7_

- [ ] 14. Checkpoint — Backend feature-complete
  - Verify the full pipeline including email notifications, approval flow, delivery, and stale ticket sweep works end-to-end. Run `npm test -- --run`. Ensure all tests pass; ask the user if questions arise.

- [ ] 15. React admin dashboard
  - [ ] 15.1 Scaffold Vite + React 18 TypeScript project
    - Run `npm create vite@latest src/frontend -- --template react-ts`; install `axios`, `react-router-dom`; configure Vite `server.proxy` to forward `/api` to Express in dev mode
    - Configure Express `app.ts` to serve `src/frontend/dist` as static files in production
    - _Requirements: 8.6_

  - [ ] 15.2 Implement API client and shared hooks
    - Write `src/frontend/api/client.ts` — Axios instance; request interceptor reads API key from `sessionStorage` and attaches `X-API-Key` header
    - Write `src/frontend/hooks/useTickets.ts` — polls `GET /api/tickets` every 5 s via `setInterval` in `useEffect`; clears on unmount
    - Write `src/frontend/hooks/useTicket.ts` — polls `GET /api/tickets/:id` every 5 s while status is non-terminal; clears on unmount
    - Write `src/frontend/hooks/useMetrics.ts` — derives `totalProcessed`, `autoResolutionRate`, `avgConfidenceScore`, `avgResponseTime` from ticket list
    - _Requirements: 8.4, 8.5_

  - [ ] 15.3 Implement authentication components and route guard
    - Write `src/frontend/pages/LoginPage.tsx` — input for API key; stores to `sessionStorage` on submit; redirects to `/tickets`
    - Write `src/frontend/components/shared/RequireAuth.tsx` — checks `sessionStorage` for key; redirects to `/login` if absent
    - Write `src/frontend/App.tsx` — React Router `<Routes>` with `<RequireAuth>` wrapping all ticket routes
    - _Requirements: 8.6, 11.3_

  - [ ] 15.4 Implement Ticket List page
    - Write `src/frontend/pages/TicketListPage.tsx` — uses `useTickets` hook; renders `<TicketTable>` with columns: received_at (DESC default), priority, status, category; default 100/page
    - Write `src/frontend/components/TicketTable/TicketTable.tsx`, `TicketRow.tsx`, `PaginationBar.tsx`
    - Write `src/frontend/components/shared/StatusBadge.tsx`, `PriorityBadge.tsx`
    - _Requirements: 8.1, 8.5_

  - [ ] 15.5 Implement Ticket Detail page
    - Write `src/frontend/pages/TicketDetailPage.tsx` — uses `useTicket` hook; renders full ticket text, classification output, KB results, draft response, confidence score, HITL history
    - Write `src/frontend/components/TicketDetail/TicketHeader.tsx`, `ClassificationPanel.tsx`, `KBResultsPanel.tsx`, `DraftResponsePanel.tsx`, `HITLHistory.tsx`
    - _Requirements: 8.2_

  - [ ] 15.6 Implement Approval Panel
    - Write `src/frontend/components/ApprovalPanel/ApprovalPanel.tsx` — conditionally rendered when `ticket.status === 'pending-approval'`; contains Approve, Edit (editable textarea), Reject buttons
    - Write `EditableResponse.tsx`, `ApprovalButtons.tsx`
    - On submit calls `POST /api/approvals`; handles 409 (concurrent conflict) with user-visible error
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 8.3_

  - [ ] 15.7 Implement Metrics Summary panel
    - Write `src/frontend/components/MetricsSummary/MetricsSummary.tsx` and `MetricCard.tsx`
    - Uses `useMetrics` to display total tickets, auto-resolution %, avg confidence, avg response time
    - _Requirements: 8.4_

- [ ] 16. Property-based tests (all 12 properties)
  - [ ] 16.1 Write property test for ticket validation (Property 1)
    - Write `tests/property/ticketValidation.test.ts`
    - **Property 1: Ticket Validation Accepts Any Valid Combination of subject/body**
    - **Validates: Requirements 1.1, 1.5, 1.6**
    - Generate arbitrary valid subject (1–255 chars) + body (1–10,000 chars) combinations; assert 201 returned with UUID v4 `ticketId` and valid UTC `receivedAt`
    - Generate inputs with both fields absent/empty; assert 400 with `error` field
    - Tag: `// Feature: helppilot, Property 1`

  - [ ] 16.2 Consolidate Property 2 test
    - Move/refine Property 2 test from task 5.3 into `tests/property/classifierOutput.test.ts`; ensure it runs 100 iterations; assert all four enum constraints hold
    - Tag: `// Feature: helppilot, Property 2`

  - [ ] 16.3 Consolidate Property 3 test
    - Move/refine Property 3 test from task 5.4 into `tests/property/languageDetection.test.ts`
    - Tag: `// Feature: helppilot, Property 3`

  - [ ] 16.4 Consolidate Property 4 test
    - Move/refine Property 4 test from task 7.4 into `tests/property/routingDeterminism.test.ts`
    - Tag: `// Feature: helppilot, Property 4`

  - [ ] 16.5 Consolidate Property 5 test
    - Move/refine Property 5 test from task 7.5 into `tests/property/draftSanitizer.test.ts`
    - Tag: `// Feature: helppilot, Property 5`

  - [ ] 16.6 Consolidate Property 6 test
    - Move/refine Property 6 test from task 6.4 into `tests/property/kbResultOrdering.test.ts`
    - Tag: `// Feature: helppilot, Property 6`

  - [ ] 16.7 Consolidate Property 7 test
    - Move/refine Property 7 test from task 11.4 into `tests/property/hitlLogFields.test.ts`
    - Tag: `// Feature: helppilot, Property 7`

  - [ ] 16.8 Consolidate Property 8 test
    - Move/refine Property 8 test from task 8.2 into `tests/property/terminalStateRecord.test.ts`
    - Tag: `// Feature: helppilot, Property 8`

  - [ ] 16.9 Write property test for KB round-trip (Property 9)
    - Write `tests/property/kbRoundTrip.test.ts`
    - **Property 9: Successful Resolution KB Round-Trip**
    - **Validates: Requirements 7.2**
    - Use a test ChromaDB instance; generate arbitrary resolved ticket objects with `successfully_resolved = true`; run `LoggerAgent.run`; query ChromaDB with ticket body; assert at least one result has matching `metadata.ticketId`
    - Tag: `// Feature: helppilot, Property 9`

  - [ ] 16.10 Write property test for structured log fields (Property 10)
    - Write `tests/property/logEntryFields.test.ts`
    - **Property 10: Structured Log Entries Always Contain Required Fields**
    - **Validates: Requirements 10.1, 10.2, 11.5**
    - Generate arbitrary log call parameters with fast-check; assert every emitted JSON has non-empty `timestamp` (ISO 8601), `level` ∈ `[info,warn,error,debug]`, `eventType`, `message`; assert no credential-pattern strings appear in output
    - Tag: `// Feature: helppilot, Property 10`

  - [ ] 16.11 Write property test for metrics computation (Property 11)
    - Write `tests/property/metricsComputation.test.ts`
    - **Property 11: Aggregate Metrics Are Computed Correctly**
    - **Validates: Requirements 8.4**
    - Use fast-check to generate arbitrary datasets of ticket records; assert `useMetrics` (or the pure computation function) produces correct `totalProcessed`, `autoResolutionRate` (rounded to 2 dp), `avgConfidenceScore`, `avgResponseTime`; assert results are order-independent
    - Tag: `// Feature: helppilot, Property 11`

  - [ ] 16.12 Write property test for API authentication enforcement (Property 12)
    - Write `tests/property/apiAuthentication.test.ts`
    - **Property 12: API Authentication Always Enforced**
    - **Validates: Requirements 11.1, 11.2**
    - Use `supertest` + fast-check to generate arbitrary paths, methods, headers, and bodies for protected endpoints; assert every request lacking a valid `X-API-Key` returns 401 with no ticket data in body
    - Tag: `// Feature: helppilot, Property 12`

- [ ] 17. Integration tests
  - [ ] 17.1 Write full pipeline smoke integration test
    - Write `tests/integration/pipeline.test.ts` — submits a test ticket, mocks Bedrock and ChromaDB, traces ticket through all stages; asserts terminal SQLite record exists with correct `outcome`
    - _Requirements: 1.7, 2.1, 3.1, 4.1, 7.1_

  - [ ] 17.2 Write Bedrock unavailability integration test
    - Write `tests/integration/bedrockOutage.test.ts` — simulate Bedrock unreachable for 60+ s; assert `autoResolutionEnabled = false`, tickets routed to `human-review`, exactly one health alert emitted; simulate recovery, assert re-enable
    - _Requirements: 10.5, 10.6_

  - [ ] 17.3 Write email delivery retry integration test
    - Write `tests/integration/deliveryRetry.test.ts` — mock SMTP to fail 3 times; assert ticket ends up `delivery-failed` with admin notification emitted
    - _Requirements: 6.3, 6.4_

  - [ ] 17.4 Write health endpoint integration test
    - Write `tests/integration/health.test.ts` — probe each dependency in degraded/unavailable state; assert `GET /api/health` response reflects the worst status; assert endpoint returns 200 without auth header
    - _Requirements: 10.7, 11.1_

- [ ] 18. Demo scenarios and documentation
  - [ ] 18.1 Create demo seed tickets
    - Write `src/demo/demoTickets.ts` — defines 5 representative test tickets: (1) password-reset (should auto-resolve), (2) network-issue critical (should go to pending-approval), (3) French-language software-install (multilingual flow), (4) vague low-confidence ticket (should escalate), (5) billing inquiry (KB fallback to Brave)
    - Write `src/demo/runDemo.ts` — script that submits all 5 tickets sequentially via the REST API; logs each ticket's journey to stdout
    - _Requirements: 1.1, 2.6, 4.1, 4.3, 4.4_

  - [ ] 18.2 Write project README
    - Write `README.md` with: architecture diagram (ASCII, matching design.md), quick-start instructions (env vars, Docker for ChromaDB, `npm run dev`, `npm test`), API reference summary, demo run instructions, and a section explaining the HITL approval workflow
    - _Requirements: all — serves as developer onboarding_

- [ ] 19. Final checkpoint — All tests pass
  - Run `npm test -- --run`; confirm all unit, property, and integration tests pass with ≥ 80% line coverage. Ensure all tests pass; ask the user if questions arise.

- [ ] 20. Multi-Modal Input Handler (Requirement 14)
  - [ ] 20.1 Install multer and configure multipart ingestion
    - Install `multer` and `@types/multer`; write `src/middleware/upload.ts` — `multer` instance with `limits: { fileSize: 25 * 1024 * 1024 }` for audio and a separate instance with `limits: { fileSize: 10 * 1024 * 1024 }` for images; exports `uploadMiddleware` that rejects files beyond type-specific limits with HTTP 413 and JSON `{ error, max_size_mb }`
    - Update `POST /api/tickets` route to accept `multipart/form-data` in addition to JSON
    - _Requirements: 14.8_

  - [ ] 20.2 Implement image OCR via Bedrock vision
    - Write the image branch in `src/agents/multiModalHandler.ts` — reads image buffer, encodes as base64, invokes `claude-3-5-sonnet` via Bedrock with vision prompt "Extract all visible text from this screenshot. Return only the extracted text, no commentary."; appends extracted text to body; on failure appends `"Image attachment could not be processed"` to `processing_notes`
    - _Requirements: 14.1, 14.6_

  - [ ] 20.3 Implement audio transcription
    - Write the audio branch in `multiModalHandler.ts` — if `WHISPER_ENDPOINT` env is set, POST audio buffer as multipart to that endpoint; otherwise use AWS Transcribe `StartTranscriptionJob` (polling until complete); appends transcript to body; on failure appends `"Audio attachment could not be transcribed"`
    - _Requirements: 14.2, 14.7_

  - [ ] 20.4 Implement email thread parser
    - Write `src/utils/emailThreadParser.ts` — `extractLatestMessage(body: string): string` strips lines beginning with `>` and blocks matching `From:.*Sent:.*To:.*Subject:` header patterns using regex; returns the most recent non-quoted segment
    - Wire into `multiModalHandler.ts` when no file attachment is present but body contains thread markers
    - _Requirements: 14.3_

  - [ ] 20.5 Wire MultiModalHandler into pipeline orchestrator
    - Update `src/pipeline/orchestrator.ts` — before calling `ClassifierAgent.run`, if ticket has `attachments` or `source_modality === 'email_thread'`, call `MultiModalHandlerAgent.run(ticket)` first; update ticket `body` and `source_modality` fields from output; `source_modality` persisted to SQLite
    - Add `source_modality` and `multimodal_notes` columns to `tickets` table migration (if not already present from schema update)
    - _Requirements: 14.4, 14.5_

  - [ ] 20.6 Write property test for MultiModal normalization (Property 17)
    - Write `tests/property/multiModalNormalization.test.ts`
    - **Property 17: MultiModal Normalization Always Produces Valid Ticket Format**
    - **Validates: Requirements 14.5**
    - Use fast-check to generate arbitrary combinations of subject/body strings and modality types; assert `MultiModalHandlerAgent` always returns a non-null `body` string and `source_modality` within the allowed enum; mock Bedrock and Transcribe
    - Tag: `// Feature: helppilot, Property 17`

- [ ] 21. Emotion-Aware Escalation Engine (Requirement 12)
  - [ ] 21.1 Add emotion columns to tickets SQLite schema
    - Update `src/db/schema.ts` — add `frustration_score INTEGER`, `urgency_score INTEGER`, `churn_risk TEXT`, `emotional_state TEXT`, `recommended_tone TEXT`, `trigger_words TEXT`, `emotion_reasoning TEXT`, `vip_flag INTEGER DEFAULT 0` columns to the `tickets` table via `ALTER TABLE IF column NOT EXISTS` or schema versioning
    - _Requirements: 12.1_

  - [ ] 21.2 Implement EmotionAnalyzer Agent
    - Write `src/agents/emotionAnalyzer.ts` — class `EmotionAnalyzerAgent` with `run(input: EmotionAnalyzerInput): Promise<EmotionAnalyzerOutput>`
    - VIP check: `SELECT COUNT(*) FROM tickets WHERE submitter_email = ? AND received_at > datetime('now', '-7 days')`; if ≥ 3, set `vip_flag = true` in prompt context
    - Single Bedrock call (temperature 0) requesting all seven fields as structured JSON
    - Override rules post-response: `churn_risk === 'critical'` → emit `ticket.critical_churn`; `urgency_score > 8` + business hours → Slack ping via `slackWebhook`; trigger_words intersection with `['cancel','quit','manager','lawsuit']` → lead notification via `LEAD_NOTIFICATION_CHANNEL` env
    - On exception: return default safe values, emit error log with `ticketId` and failure reason
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.7_

  - [ ] 21.3 Wire EmotionAnalyzer into orchestrator
    - Update `src/pipeline/orchestrator.ts` — after `ClassifierAgent.run`, call `EmotionAnalyzerAgent.run` (can run in parallel using `Promise.all`); save emotion output to ticket record; if `churn_risk === 'critical' || churn_risk === 'high'` force Resolver action to `pending_approval` regardless of confidence score
    - Update `src/agents/resolverRouter.ts` — add `churn_risk` parameter to `determineAction`; insert override rule before confidence-based routing
    - _Requirements: 12.2, 17.3, 17.7_

  - [ ] 21.4 Update HITL notifier for critical churn bypass
    - Update `src/services/hitlNotifier.ts` — subscribe to `ticket.critical_churn` event; send admin alert within 60 seconds; log the alert with timestamp and `ticketId`
    - _Requirements: 12.2_

  - [ ] 21.5 Update Resolver for emotion tone rewrite
    - Update `src/agents/resolver.ts` — after draft is generated, if `emotional_state !== 'calm'`, issue a second Bedrock call to rewrite only the opening sentence of the draft to match `recommended_tone`; replace original opening sentence in draft before sanitization
    - _Requirements: 12.6_

  - [ ] 21.6 Write property test for EmotionAnalyzer output (Property 13)
    - Write `tests/property/emotionAnalyzerOutput.test.ts`
    - **Property 13: EmotionAnalyzer Output Always Has Valid Fields**
    - **Validates: Requirements 12.1, 12.7**
    - Mock Bedrock; generate arbitrary ticket text inputs with fast-check; assert all seven output fields satisfy their type and enum constraints; assert fallback values also pass the same constraints
    - Tag: `// Feature: helppilot, Property 13`

  - [ ] 21.7 Write property test for emotion routing override (Property 15)
    - Write `tests/property/emotionRoutingOverride.test.ts`
    - **Property 15: Emotion Override Prevents Auto-Resolution for High/Critical Churn**
    - **Validates: Requirements 17.3, 17.7**
    - Use fast-check to generate arbitrary `(confidenceScore, priority, churn_risk)` tuples where `churn_risk ∈ ['high','critical']`; assert `determineAction` always returns `pending_approval` and never `auto_resolve`
    - Tag: `// Feature: helppilot, Property 15`

- [ ] 22. Self-Learning Memory Loop (Requirement 13)
  - [ ] 22.1 Extend KB metadata schema for success/failure tracking
    - Update `src/db/chromaInit.ts` — add `success_count: 0` and `failure_count: 0` to all seed KB entry metadata; update `LoggerAgent` KB upsert to include these fields with `success_count: 1` on first write
    - _Requirements: 13.1, 13.2_

  - [ ] 22.2 Implement KB confidence multiplier in KBSearcher
    - Update `src/agents/kbSearcher.ts` — after receiving ChromaDB results, compute `kb_confidence_multiplier = success_count / (success_count + failure_count)` per entry (default 1.0 if both are 0); compute `adjustedScore = rawScore * multiplier`; sort by `adjustedScore` descending; entries with `multiplier < 0.4` placed after all entries with `multiplier ≥ 0.4`; use adjusted scores for the 0.5 threshold check
    - Change `top_k` from 3 to 10 to give the multiplier enough candidates to work with; return top 3 after adjustment
    - _Requirements: 13.5, 13.6_

  - [ ] 22.3 Implement success/failure count updates in Logger
    - Update `src/agents/logger.ts` — on `SUCCESS_ADMIN` or `SUCCESS_AUTO`: for each KB entry ID in `ticket.kb_results` that has `type !== 'web_result'`, fetch current metadata from ChromaDB, increment `success_count`, upsert back; on rejection or `delivery-failed`: same but increment `failure_count`; wrap each ChromaDB update in `withRetry`; on exhaustion emit structured error log with KB entry ID
    - _Requirements: 13.3, 13.4, 13.8_

  - [ ] 22.4 Write property test for KB confidence multiplier (Property 14)
    - Write `tests/property/kbConfidenceMultiplier.test.ts`
    - **Property 14: KB Confidence Multiplier Is Always in [0, 1] and Deprioritization Rule Holds**
    - **Validates: Requirements 13.5, 13.6**
    - Use fast-check to generate arbitrary `success_count` and `failure_count` pairs (both ≥ 0); assert computed multiplier is always in `[0, 1]`; generate arbitrary mixed lists of KB entries; assert entries with `multiplier < 0.4` always appear after those with `multiplier ≥ 0.4` in the sorted output
    - Tag: `// Feature: helppilot, Property 14`

- [ ] 23. Explainable Reasoning Dashboard (Requirement 15)
  - [ ] 23.1 Implement reasoning trace types and SQLite table
    - Update `src/db/schema.ts` — add `reasoning_traces` table with `ticket_id TEXT PRIMARY KEY REFERENCES tickets(id)`, `trace TEXT NOT NULL`, `created_at TEXT NOT NULL`
    - Add `AgentStep` and `ReasoningTrace` TypeScript interfaces to `src/types/reasoning.ts`
    - _Requirements: 15.1, 15.8_

  - [ ] 23.2 Emit reasoning.step events from all agents
    - Update each agent (`Classifier`, `EmotionAnalyzer`, `KBSearcher`, `Resolver`) to emit `reasoning.step` event on `bus` after completing, with `{ agentName, startedAt, completedAt, durationMs, inputs, outputs }` payload
    - Add `reasoning.step` to `PipelineEventMap` type
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ] 23.3 Implement Reasoning Trace Service
    - Write `src/services/reasoningTraceService.ts` — maintains `Map<ticketId, AgentStep[]>` in memory; appends steps on `reasoning.step` events; on `ticket.terminal` flushes the completed trace to `reasoning_traces` SQLite table; if escalation, adds `escalationReason` field
    - _Requirements: 15.6, 15.8_

  - [ ] 23.4 Implement SSE reasoning endpoint
    - Write `src/routes/reasoning.ts` — `GET /api/tickets/:id/reasoning`; for in-progress tickets: sets `Content-Type: text/event-stream`, subscribes to `reasoning.step` events for that `ticketId`, streams each step as `data: {step}\n\n`, closes on `ticket.terminal`; for completed tickets: queries `reasoning_traces` table and returns JSON immediately; register in `app.ts`
    - _Requirements: 15.1, 15.7, 15.8_

  - [ ] 23.5 Implement ReasoningTracePanel frontend component
    - Write `src/frontend/hooks/useReasoningTrace.ts` — opens `EventSource` to `/api/tickets/:id/reasoning`; appends each received step to state array; falls back to JSON fetch for completed tickets
    - Write `src/frontend/components/TicketDetail/ReasoningTracePanel.tsx` — renders each `AgentStep` as a collapsible row showing agent name, duration, key outputs, and a confidence bar where applicable; shows `escalationReason` banner when present
    - Integrate into `TicketDetailPage.tsx`
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [ ] 23.6 Implement ActivityLogStream frontend component
    - Write `src/frontend/components/ActivityLogStream/ActivityLogStream.tsx` — SSE-connected to `/api/tickets/:id/reasoning` or a dedicated activity SSE endpoint; auto-scrolling list of agent events with UTC timestamp, event type, ticket ID, and outcome; updates at ≤ 2 s cadence
    - Add to `TicketListPage` sidebar or modal
    - _Requirements: 15.7_

  - [ ] 23.7 Update ApprovalPanel to show EmotionBadge
    - Write `src/frontend/components/ApprovalPanel/EmotionBadge.tsx` — displays `emotional_state` (color-coded: calm=green, stressed=yellow, angry=orange, desperate=red), `frustration_score`, `urgency_score` as numeric badges
    - Update `ApprovalPanel.tsx` to render `<EmotionBadge>` when ticket has emotion data; also display `confidence_explanation` from Resolver
    - _Requirements: 12.8, 17.4_

- [ ] 24. Proactive Prediction Mode (Requirement 16)
  - [ ] 24.1 Create SQLite incidents table and repository
    - Update `src/db/schema.ts` — add `incidents` table per design schema; add indexes on `status` and `error_signature`
    - Write `src/db/incidentRepository.ts` — `insertIncident`, `getIncidentById`, `listIncidents(filters)`, `updateIncident`; all using parameterized statements
    - _Requirements: 16.2, 16.7_

  - [ ] 24.2 Implement MockEventStream
    - Write `src/agents/mockEventStream.ts` — class `MockEventStream` that emits `{ errorSignature, userId, timestamp }` events at configurable interval; includes realistic signatures like `VPN_AUTH_FAIL`, `LDAP_TIMEOUT`, `PRINTER_OFFLINE`; emits at random rate simulating 1–3 events per interval per signature; exports `startStream(bus, intervalMs)`
    - _Requirements: 16.1_

  - [ ] 24.3 Implement PredictionEngine
    - Write `src/agents/predictionEngine.ts` — class `PredictionEngine` with `start()` / `stop()` methods; maintains `Map<errorSignature, Map<userId, Date>>` rolling window; sweeps every `PREDICTION_INTERVAL_MS` (default 30 000 ms) for stale entries beyond `INCIDENT_WINDOW_MS` (default 300 000 ms); on 5+ distinct users: calls `chromaClient` for KB match (adjusted score > 0.5); creates incident record via `incidentRepository`; emits `incident.detected` on bus; respects cooldown map `Map<errorSignature, cooldownUntil>`
    - Wire `start()` call into `server.ts`
    - _Requirements: 16.1, 16.2, 16.7, 16.8_

  - [ ] 24.4 Wire incident approval and notification dispatch
    - Write `src/services/incidentNotifier.ts` — subscribes to `incident.approved` event; iterates `affected_users` in incident record; for each user queries `tickets` table for last-used channel; sends email (Nodemailer) or webhook notification with error description + suggested fix; retries each 3× with backoff; updates `notification_log` JSON in incident record; sets `status = 'sending'` then `'closed'` (or keeps `approved` on partial failure)
    - _Requirements: 16.3, 16.4, 16.5_

  - [ ] 24.5 Implement incidents API routes
    - Write `src/routes/incidents.ts` — `GET /api/incidents` (list with `status` filter); `GET /api/incidents/:id` (full detail); `POST /api/incidents/:id/approve` (validates admin, sets `status = 'approved'`, emits `incident.approved`; returns 409 if already approved/closed); `POST /api/incidents/:id/close` (sets `status = 'closed'`, records `cooldown_until = now + 30 min`)
    - Register in `app.ts` under auth middleware
    - _Requirements: 16.4, 16.5, 16.8_

  - [ ] 24.6 Implement Incidents frontend pages
    - Write `src/frontend/hooks/useIncidents.ts` — polls `GET /api/incidents` every 5 s
    - Write `src/frontend/pages/IncidentListPage.tsx` — table of incidents with error signature, affected count, status, detected time; Approve and Close action buttons
    - Write `src/frontend/pages/IncidentDetailPage.tsx` — full incident detail including `notification_log` per-user delivery status
    - Add routes to `App.tsx`; add "Incidents" nav link
    - _Requirements: 16.4, 16.6_

  - [ ] 24.7 Write property test for incident detection threshold (Property 18)
    - Write `tests/property/incidentDetectionThreshold.test.ts`
    - **Property 18: Incident Detection Threshold Is Exactly 5 Users**
    - **Validates: Requirements 16.2**
    - Use fast-check to generate arbitrary sets of user IDs (size 1–10) with the same error signature within the time window; assert incident is created if and only if `Set.size ≥ 5`; assert 4 users never trigger detection
    - Tag: `// Feature: helppilot, Property 18`

- [ ] 25. Demo Metrics Panel (Requirement 18)
  - [ ] 25.1 Create sessions SQLite table and service
    - Update `src/db/schema.ts` — add `sessions` table with all counters from design; add `avg_handling_time_minutes REAL DEFAULT 5.0` and `cost_per_hour_usd REAL DEFAULT 50.0` (both configurable via env)
    - Write `src/services/sessionMetricsService.ts` — initialises a session record on server start; exports `increment(counter)` for each of the 6 counters; accumulates `total_resolution_time_ms`; persists to SQLite after each increment so metrics survive crash/restart
    - _Requirements: 18.1, 18.4_

  - [ ] 25.2 Wire session metric increments across the pipeline
    - In `PipelineOrchestrator`: on `ticket.terminal` with `resolution_action = 'auto_resolve'` → `increment('tickets_auto_resolved')`, `increment('solutions_learned')` (if KB entry written); on escalation → `increment('tickets_escalated')`; on any terminal → `increment('tickets_total')`, add `(terminal_at - received_at)` to `total_resolution_time_ms`
    - In `EmotionAnalyzerAgent` override rules: on `ticket.critical_churn` → `increment('emotion_escalations')`
    - In `incidentNotifier`: on each successfully delivered proactive notification → `increment('tickets_prevented')`
    - _Requirements: 18.1_

  - [ ] 25.3 Implement session metrics API endpoint
    - Write `src/routes/metrics.ts` — `GET /api/metrics/session` reads current session from SQLite; computes `autoResolutionRate`, `avgResolutionTimeSeconds`, `estimatedTimeSavedMinutes`, `estimatedCostSavedUsd`; guards against division-by-zero (return 0 when denominator is 0); formats `estimatedCostSavedUsd` as currency string with 2 decimal places
    - Register in `app.ts` under auth middleware
    - _Requirements: 18.1, 18.2, 18.3_

  - [ ] 25.4 Implement MetricsPanel React component
    - Write `src/frontend/hooks/useSessionMetrics.ts` — polls `GET /api/metrics/session` every 5 s
    - Write `src/frontend/components/MetricsPanel/MetricsPanel.tsx` — displays 6 metric cards: auto-resolve % vs escalated, avg resolution time, solutions learned, tickets prevented, emotion escalations, time saved + cost saved (currency formatted); zero-state shows "0" not "NaN"
    - Ensure panel is visible without scrolling at 1280×800 viewport; use CSS grid/flex layout to fit all cards
    - Integrate into dashboard layout alongside `<TicketListPage>`
    - _Requirements: 18.1, 18.2, 18.3, 18.5_

  - [ ] 25.5 Write property test for session metrics zero-state safety (Property 16)
    - Write `tests/property/sessionMetricsZeroState.test.ts`
    - **Property 16: Session Metrics Never Produce NaN or Division-by-Zero**
    - **Validates: Requirements 18.1, 18.2**
    - Use fast-check to generate arbitrary session state including zero values for all counters; assert computed `autoResolutionRate`, `avgResolutionTimeSeconds`, `estimatedTimeSavedMinutes`, `estimatedCostSavedUsd` are all finite numbers with no `NaN` or `Infinity` values
    - Tag: `// Feature: helppilot, Property 16`

- [ ] 26. Extend demo scenarios for new features
  - [ ] 26.1 Extend demo seed with 5 new feature-showcasing tickets
    - Update `src/demo/demoTickets.ts` — add: (6) angry ALL-CAPS ticket (triggers EmotionAnalyzer → escalation); (7) Spanish-language ticket with VPN screenshot attachment (MultiModal + multilingual); (8) forwarded email thread ticket (email thread parser demo); (9) ticket from a VIP problem account (3+ in 7 days); (10) trigger word ticket containing "cancel" (lead notification)
    - Update `src/demo/runDemo.ts` — submit all 10 tickets; add a separate `runPredictionDemo()` function that injects 6 matching error events to trigger a PredictionEngine incident
    - _Requirements: 12.1, 12.4, 12.5, 14.1, 14.3, 16.2_

  - [ ] 26.2 Update README for new features
    - Update `README.md` — add sections for EmotionAnalyzer, MultiModal, PredictionEngine, ReasoningTrace, MetricsPanel; include the 90-second demo script (OCR screenshot → emotion escalation → Spanish ticket → reasoning tree → prediction mode → metrics panel); update architecture diagram
    - _Requirements: all_

- [ ] 27. Final integration tests for new features
  - [ ] 27.1 Write emotion override integration test
    - Write `tests/integration/emotionOverride.test.ts` — submit ticket with mocked EmotionAnalyzer returning `churn_risk='critical'`; assert ticket goes to `pending-approval` even with confidence score > 85; assert admin alert sent within 60 s
    - _Requirements: 12.2, 17.3_

  - [ ] 27.2 Write proactive prediction integration test
    - Write `tests/integration/predictionEngine.test.ts` — inject 5 matching error events into PredictionEngine; assert incident created with `status='draft'`; approve via API; assert notifications dispatched; close incident; inject same signature within 30 min; assert no new incident (cooldown active)
    - _Requirements: 16.2, 16.4, 16.8_

  - [ ] 27.3 Write reasoning trace integration test
    - Write `tests/integration/reasoningTrace.test.ts` — submit ticket; connect SSE to `/api/tickets/:id/reasoning`; assert all 5 agent steps arrive in order; assert trace persisted to `reasoning_traces` table after terminal state
    - _Requirements: 15.1, 15.8_

  - [ ] 27.4 Write KB self-learning integration test
    - Write `tests/integration/kbSelfLearning.test.ts` — resolve ticket using KB entry; assert `success_count` incremented on that entry in ChromaDB; reject a second ticket using same entry; assert `failure_count` incremented; query KBSearcher; assert entry with low multiplier is ranked last
    - _Requirements: 13.3, 13.4, 13.5, 13.6_

- [ ] 28. Final checkpoint — All tests pass (extended suite)
  - Run `npm test -- --run`; confirm all unit, property, and integration tests (including new tests from tasks 20–27) pass with ≥ 80% line coverage. Ensure all tests pass; ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP delivery
- Each task references specific requirements for full traceability to `requirements.md`
- The design document (`design.md`) is the authoritative source for all interface signatures, SQL schemas, and routing rules — implementers should keep it open alongside these tasks
- Property tests 2–8 are introduced early (alongside the component they test) to catch regressions fast; tasks 16.2–16.8 consolidate them into the canonical `tests/property/` directory
- ChromaDB must be running locally (Docker: `docker run -p 8000:8000 chromadb/chroma`) before tasks 2.4, 6.x, 8.x, 16.9, 22.x, 27.4 can execute
- All secrets must come from environment variables — never hard-coded; see `.env.example`
- New agent tasks (20–26) build on the foundation from tasks 1–19; complete task 19 checkpoint before starting task 20
- The `WHISPER_ENDPOINT` env var is optional; if not set, AWS Transcribe is used for audio transcription (requires valid AWS credentials)
- `BUSINESS_HOURS_START` and `BUSINESS_HOURS_END` env vars control the urgency Slack ping window (default: `09:00` and `17:00` in server local time)
- `LEAD_NOTIFICATION_CHANNEL` env var configures where trigger-word alerts are sent (Slack webhook or email)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["2.1", "3.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.2"] },
    { "id": 4, "tasks": ["2.4", "3.3", "3.4", "3.5"] },
    { "id": 5, "tasks": ["5.1", "9.1"] },
    { "id": 6, "tasks": ["5.2", "6.1", "6.2"] },
    { "id": 7, "tasks": ["5.3", "5.4", "6.3", "7.1", "7.2"] },
    { "id": 8, "tasks": ["6.4", "7.3", "8.1"] },
    { "id": 9, "tasks": ["7.4", "7.5", "8.2", "9.2"] },
    { "id": 10, "tasks": ["9.3"] },
    { "id": 11, "tasks": ["11.1", "11.2", "12.1", "12.2", "13.1"] },
    { "id": 12, "tasks": ["11.3", "11.4"] },
    { "id": 13, "tasks": ["15.1"] },
    { "id": 14, "tasks": ["15.2", "15.3"] },
    { "id": 15, "tasks": ["15.4", "15.5"] },
    { "id": 16, "tasks": ["15.6", "15.7"] },
    { "id": 17, "tasks": ["16.1", "16.2", "16.3", "16.4", "16.5", "16.6", "16.7", "16.8"] },
    { "id": 18, "tasks": ["16.9", "16.10", "16.11", "16.12"] },
    { "id": 19, "tasks": ["17.1", "17.2", "17.3", "17.4"] },
    { "id": 20, "tasks": ["18.1", "18.2"] },
    { "id": 21, "tasks": ["20.1", "21.1", "22.1", "23.1", "24.1", "25.1"] },
    { "id": 22, "tasks": ["20.2", "20.3", "20.4", "21.2", "22.2", "23.2", "24.2"] },
    { "id": 23, "tasks": ["20.5", "21.3", "21.4", "22.3", "23.3", "24.3", "25.2"] },
    { "id": 24, "tasks": ["20.6", "21.5", "21.6", "21.7", "22.4", "23.4", "24.4", "24.5", "25.3"] },
    { "id": 25, "tasks": ["23.5", "23.6", "23.7", "24.6", "24.7", "25.4", "25.5"] },
    { "id": 26, "tasks": ["26.1", "26.2"] },
    { "id": 27, "tasks": ["27.1", "27.2", "27.3", "27.4"] }
  ]
}
```
 ij*