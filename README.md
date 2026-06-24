# HelpPilot — IT Helpdesk Autopilot

HelpPilot is a production-ready Smart IT Helpdesk Autopilot that automatically classifies, prioritizes, searches a knowledge base, and either auto-resolves or drafts responses for human approval.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Ingestion Layer                           │
│   REST API (POST /api/tickets)  │  Email (IMAP)  │  Web Form   │
│                  MultiModalHandler (OCR / Whisper / Thread)     │
└──────────────────────────────┬──────────────────────────────────┘
                               │ EventBus: ticket.received
┌──────────────────────────────▼──────────────────────────────────┐
│                    Orchestration Pipeline                       │
│  ClassifierAgent → EmotionAnalyzerAgent → KBSearcherAgent →    │
│  ResolverAgent → [auto_resolve | pending_approval | escalate]  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│              HITL Approval Layer (Admin Dashboard)              │
│  Approve / Edit-Approve / Reject → DeliveryService             │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│  LoggerAgent → SQLite terminal state + ChromaDB KB feedback     │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  PredictionEngine (background) → Incident detection + dispatch  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (for ChromaDB)
- AWS credentials with Bedrock access

### 1. Start ChromaDB

```bash
docker run -p 8000:8000 chromadb/chroma
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

Required variables:
| Variable | Description |
|---|---|
| `HELPPILOT_API_KEYS` | Comma-separated API keys |
| `AWS_REGION` | AWS region (e.g. `us-east-1`) |
| `BEDROCK_MODEL_ID` | Claude model ID |
| `CHROMA_URL` | ChromaDB URL (default: `http://localhost:8000`) |
| `BRAVE_API_KEY` | Brave Search API key (optional) |
| `SMTP_HOST` | SMTP server host |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | From address |
| `ADMIN_EMAIL` | Admin notification email |
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications |

### 3. Install dependencies

```bash
npm install
```

### 4. Run in development

```bash
npm run dev
```

### 5. Run tests

```bash
npm test
```

---

## API Reference

### Authentication

All `/api/*` endpoints (except `GET /api/health`) require an `X-API-Key` header.

### Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/tickets` | Create a ticket (JSON, form, or multipart) |
| `GET` | `/api/tickets` | List tickets (filter by status, category, priority) |
| `GET` | `/api/tickets/:id` | Get ticket details |
| `POST` | `/api/approvals` | Submit approval action |
| `GET` | `/api/tickets/:id/reasoning` | Get reasoning trace (SSE for in-progress) |
| `GET` | `/api/incidents` | List incidents |
| `POST` | `/api/incidents/:id/approve` | Approve incident notification |
| `POST` | `/api/incidents/:id/close` | Close incident |
| `GET` | `/api/metrics/session` | Get session metrics |
| `GET` | `/api/health` | System health check |

### Create Ticket

```bash
curl -X POST http://localhost:3000/api/tickets \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"subject": "Cannot login", "body": "I forgot my password."}'
```

Response:
```json
{ "ticketId": "uuid-v4", "status": "received", "receivedAt": "ISO-8601" }
```

---

## HITL Approval Workflow

1. Tickets with `confidence_score` 60–85 or `priority=critical` are flagged `pending-approval`
2. Admin is notified via Slack or email within 30s
3. Admin can **Approve**, **Edit & Approve**, or **Reject** via dashboard or API
4. `POST /api/approvals` with `{ ticketId, action, adminId, editedResponse? }`
5. First action wins — concurrent actions return HTTP 409

---

## Running the Demo

```bash
# Make sure server is running first
npm run dev

# In another terminal
npm run demo
```

The demo submits 10 tickets covering: password reset, critical network issue, French-language ticket, vague escalation, billing, angry user (emotion engine), Spanish + screenshot (multilingual + OCR), forwarded email thread, VIP account, and trigger word detection.

---

## New Features (v2)

### Emotion-Aware Escalation
- `EmotionAnalyzerAgent` detects frustration, urgency, churn risk
- High/critical churn auto-escalates to `pending_approval`
- Trigger words (`cancel`, `quit`, `manager`, `lawsuit`) alert team lead

### MultiModal Input
- Image attachments: OCR via Bedrock vision (JPEG/PNG/GIF, max 10MB)
- Audio attachments: Transcription via Whisper or AWS Transcribe (MP3/WAV/M4A, max 25MB)
- Forwarded email threads: Auto-extracts latest message

### Proactive Prediction Engine
- Monitors error event stream for patterns
- Creates incidents when 5+ users hit same error within 5 minutes
- Admin approves before notifications are dispatched

### Explainable Reasoning Dashboard
- Every ticket has a reasoning trace showing each agent's inputs/outputs
- SSE endpoint for live streaming during processing
- Trace persisted to SQLite for completed tickets

### Self-Learning Memory Loop
- Successful resolutions are added to ChromaDB KB automatically
- `success_count` / `failure_count` tracked per KB entry
- `kb_confidence_multiplier` adjusts similarity ranking over time

---

## Test Coverage

```bash
npm run test:run -- --coverage
```

Property-based tests (18 properties) cover:
- Ticket validation (Property 1)
- Classifier output schema (Property 2)
- Language detection (Property 3)
- Routing determinism (Property 4)
- Draft sanitization (Property 5)
- KB result ordering (Property 6)
- HITL log fields (Property 7)
- Terminal state records (Property 8)
- KB round-trip (Property 9)
- Structured log fields (Property 10)
- Metrics computation (Property 11)
- API authentication (Property 12)
- EmotionAnalyzer output (Property 13)
- KB confidence multiplier (Property 14)
- Emotion routing override (Property 15)
- Session metrics zero-state (Property 16)
- MultiModal normalization (Property 17)
- Incident detection threshold (Property 18)
