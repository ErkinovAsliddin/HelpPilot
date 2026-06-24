# Requirements Document

## Introduction

HelpPilot is a production-ready Smart IT Helpdesk Autopilot Agent designed for hackathon Track 4: Autopilot Agent. It accepts support tickets via email, web form, or REST API, then autonomously classifies, prioritizes, searches a knowledge base, and either auto-resolves or drafts responses for human approval. The system is composed of four specialized agents (Classifier, KnowledgeBase Searcher, Resolver, Logger) orchestrated through a central pipeline. All critical decisions pass through a human-in-the-loop approval workflow before any response is sent. A React dashboard provides administrators with ticket visibility, approval controls, and outcome metrics.

---

## Glossary

- **HelpPilot**: The overall IT helpdesk autopilot system.
- **Ticket**: A support request submitted by a user via email, web form, or API.
- **Classifier**: The agent responsible for analyzing raw ticket text and producing category, priority, sentiment, and suggested next agent.
- **KBSearcher**: The agent responsible for retrieving the top 3 relevant solutions from the ChromaDB knowledge base.
- **Resolver**: The agent responsible for generating a draft response or escalation decision based on ticket context and KB results.
- **Logger**: The agent responsible for persisting ticket records, responses, outcomes, and updating the knowledge base with successful resolutions.
- **Admin**: An authorized human operator who reviews, approves, edits, or rejects proposed responses via the dashboard.
- **Dashboard**: The React-based frontend that displays tickets, proposed responses, confidence scores, and approval controls.
- **Knowledge Base (KB)**: The ChromaDB vector database containing IT solution articles used for similarity search.
- **Confidence Score**: A numeric value (0–100) produced by the Resolver indicating how certain it is that the drafted response will resolve the ticket.
- **Escalation**: The act of routing a ticket directly to a human without sending an automated response.
- **Auto-Resolution**: The act of sending a response without requiring human approval when confidence exceeds the auto-resolve threshold.
- **HITL (Human-in-the-Loop)**: The approval workflow requiring admin action before a response is dispatched.
- **Category**: One of `password-reset`, `network-issue`, `software-install`, `hardware-failure`, `billing`, `other`.
- **Priority**: One of `low`, `medium`, `high`, `critical`.
- **Sentiment**: One of `neutral`, `frustrated`, `urgent`, `positive`.
- **EmotionAnalyzer**: The agent responsible for analyzing ticket text and submitter history to produce emotional state metrics, churn risk, and tone recommendations.
- **MultiModalHandler**: The agent responsible for processing non-text inputs (images, audio, forwarded email threads) and normalizing them into the standard internal ticket format.
- **PredictionEngine**: The agent responsible for monitoring system event streams, detecting emerging error patterns, generating incident reports, and dispatching proactive outbound notifications.
- **Frustration Score**: An integer value from 0 to 10 produced by the EmotionAnalyzer indicating the level of user frustration detected in the ticket.
- **Urgency Score**: An integer value from 0 to 10 produced by the EmotionAnalyzer indicating the urgency level detected in the ticket.
- **Churn Risk**: A categorical value (`low`, `medium`, `high`, `critical`) produced by the EmotionAnalyzer indicating the risk that the submitter will disengage or cancel their service.
- **Emotional State**: A categorical value (`calm`, `stressed`, `angry`, `desperate`) produced by the EmotionAnalyzer describing the submitter's detected emotional condition.
- **Recommended Tone**: A categorical value (`professional`, `empathetic`, `urgent`, `crisis`) produced by the EmotionAnalyzer prescribing the tone the Resolver should use in the response.
- **KB Entry**: A single solution record stored in the ChromaDB knowledge base, containing ticket body, response text, and outcome tracking fields (`success_count`, `failure_count`).
- **KB Confidence Multiplier**: A derived score per KB entry calculated as `success_count / (success_count + failure_count)` used to adjust raw similarity scores during KB search ranking.
- **Incident Report**: A structured record created by the PredictionEngine when an emerging error pattern is detected, containing affected users, error signature, suggested fix, and per-user notification status.
- **Metrics Panel**: The section of the Dashboard displaying live aggregate performance counters for the current admin session.
- **Source Modality**: The input type through which ticket content was received, one of `text`, `image`, `voice`, or `email_thread`.

---

## Requirements

### Requirement 1: Ticket Ingestion

**User Story:** As an IT helpdesk operator, I want HelpPilot to accept tickets from multiple input channels, so that users can submit support requests through their preferred medium.

#### Acceptance Criteria

1. THE HelpPilot API SHALL expose a `POST /api/tickets` endpoint that accepts a JSON body containing at minimum a `subject` string (max 255 characters) or a `body` string (max 10,000 characters), where either field alone is sufficient.
2. WHEN an email is received by the configured inbound email address, THE HelpPilot SHALL parse the email subject and body and create a ticket record.
3. WHEN an email received by the configured inbound address cannot be parsed (malformed MIME, missing sender, or encoding error), THE HelpPilot SHALL discard the message and emit a structured error log entry; no ticket record SHALL be created.
4. WHEN a ticket is submitted via the web form, THE HelpPilot SHALL create a ticket record within 2 seconds of form submission.
5. IF a submitted ticket is missing both `subject` and `body`, THEN THE HelpPilot API SHALL return HTTP 400 with a JSON error body containing an `error` field describing which fields are required.
6. THE HelpPilot SHALL assign each new ticket a unique identifier (UUID v4) and a `received_at` UTC timestamp upon creation.
7. WHEN a ticket is created by any ingestion channel, THE HelpPilot SHALL enqueue the ticket for classification within 5 seconds of record creation; IF the enqueue operation fails, THE HelpPilot SHALL retry up to 3 times and set the ticket status to `enqueue-failed` if all retries are exhausted.

---

### Requirement 2: Ticket Classification

**User Story:** As an IT helpdesk operator, I want each ticket to be automatically classified by category, priority, and sentiment, so that the system can route and handle tickets appropriately without manual triage.

#### Acceptance Criteria

1. WHEN a ticket is enqueued for classification, THE Classifier SHALL analyze the combined `subject` and `body` fields and assign exactly one Category from `[password-reset, network-issue, software-install, hardware-failure, billing, other]`.
2. WHEN a ticket is enqueued for classification, THE Classifier SHALL assign exactly one Priority from `[low, medium, high, critical]`.
3. WHEN a ticket is enqueued for classification, THE Classifier SHALL assign exactly one Sentiment from `[neutral, frustrated, urgent, positive]`.
4. WHEN a ticket is enqueued for classification, THE Classifier SHALL produce a `suggestedAgent` field set to exactly one of `[KBSearcher, Resolver, human-review]`.
5. WHEN the ticket text contains spelling errors, abbreviations, or informal language, THE Classifier SHALL still produce a valid classification result with all four fields (Category, Priority, Sentiment, suggestedAgent) populated with values from their respective allowed enumerations.
6. WHEN the ticket text is written in a language other than English, THE Classifier SHALL detect the language, translate the content to English for processing, and record the original language in the ticket record.
7. IF the Classifier produces no output due to an exception, empty response, or timeout expiry, THEN THE HelpPilot SHALL mark the ticket with Priority `high` and Category `other`, and route it for human review.
8. WHEN a ticket with a combined subject and body of 2,000 characters or fewer is enqueued for classification and all dependent services (Bedrock, ChromaDB) are available, THE Classifier SHALL complete classification and produce a structured output within 10 seconds.

---

### Requirement 3: Knowledge Base Search

**User Story:** As an IT helpdesk operator, I want the system to search a curated knowledge base for relevant solutions, so that responses are grounded in verified IT support content.

#### Acceptance Criteria

1. WHEN a classified ticket is routed to the KBSearcher, THE KBSearcher SHALL perform a vector similarity search against the ChromaDB knowledge base and return the top 3 matching solution articles ranked by descending similarity score, excluding any results with a similarity score of 0 or below.
2. WHEN the KBSearcher returns results, THE KBSearcher SHALL include the article title, a solution summary (max 500 characters), and the similarity score for each returned result.
3. IF no KB article achieves a similarity score above 0.5, THEN THE KBSearcher SHALL perform a fallback web search via the Brave Search API and return up to 3 web results each containing the page title, source URL, and a snippet of up to 300 characters.
4. IF the Brave API web search returns no results, THEN THE KBSearcher SHALL return an empty results list and set `kbStatus` to `no_results`.
5. IF the Brave API is unreachable or returns an error, THEN THE KBSearcher SHALL return an empty results list and set `kbStatus` to `search_error`.
6. IF ChromaDB is unavailable when a search is attempted, THEN THE KBSearcher SHALL set `kbStatus` to `kb_unavailable` and proceed to the Brave Search API fallback.
7. WHEN the KBSearcher receives a classified ticket, THE KBSearcher SHALL complete its search and return results within 5 seconds.
8. WHERE the knowledge base contains previously logged successful resolutions, THE KBSearcher SHALL include those resolutions as candidate results alongside static KB articles, ranked together by descending similarity score with no preferential ordering between the two types.

---

### Requirement 4: Automated Resolution and Response Drafting

**User Story:** As an IT helpdesk operator, I want the system to automatically resolve simple issues and draft responses for complex ones, so that the team's manual workload is reduced while quality is maintained.

#### Acceptance Criteria

1. WHEN the Resolver receives a ticket with KB results and the Confidence Score exceeds 85, THE Resolver SHALL generate a complete draft response and mark the ticket for auto-resolution.
2. WHEN the Confidence Score is between 60 and 85 inclusive, THE Resolver SHALL generate a draft response and flag the ticket for human review before sending.
3. WHEN the Confidence Score is below 60, THE Resolver SHALL immediately escalate the ticket to a human without generating a draft response.
4. WHEN the ticket Priority is `critical`, THE Resolver SHALL generate a draft response, flag the ticket for human approval, and SHALL NOT auto-resolve the ticket regardless of the Confidence Score.
5. WHEN the KBSearcher returns `kbStatus` of `no_results`, `search_error`, or `kb_unavailable`, THE Resolver SHALL immediately escalate the ticket to a human without generating a draft response.
6. THE Resolver SHALL include the Confidence Score, a natural-language explanation of the factors that determined the Confidence Score, and the source KB articles used in every draft response record.
7. WHEN the Resolver generates a draft response, THE Resolver SHALL complete draft generation within 15 seconds of receiving the ticket and KB results.
8. IF the Resolver encounters an error during response generation, THEN THE Resolver SHALL escalate the ticket to a human and log the error details including a stack trace.
9. THE Resolver SHALL produce responses consisting of complete sentences addressed to the ticket submitter and containing no internal system metadata (such as ticket IDs, confidence scores, or agent names).

---

### Requirement 5: Human-in-the-Loop Approval Workflow

**User Story:** As an IT helpdesk admin, I want to review, approve, edit, or reject proposed responses before they are sent, so that I can maintain quality control over customer-facing communications.

#### Acceptance Criteria

1. WHEN a ticket is flagged for human review or requires approval, THE HelpPilot SHALL send a notification to the configured admin channel (Slack or email) within 30 seconds of the draft being created.
2. THE Dashboard SHALL display each pending approval with the original ticket text, the proposed response, the Confidence Score, and the Resolver's reasoning.
3. WHEN an Admin clicks Approve on the Dashboard, THE HelpPilot SHALL dispatch the proposed response to the ticket submitter within 10 seconds; IF the dispatch fails, THE HelpPilot SHALL retry up to 5 times over a 5-minute window using exponential backoff; IF all retries fail, THE HelpPilot SHALL notify the admin channel and mark the ticket as `delivery-failed`.
4. WHEN an Admin edits and approves a response on the Dashboard, THE HelpPilot SHALL dispatch the edited response to the ticket submitter within 10 seconds; IF the dispatch fails, THE HelpPilot SHALL retry up to 5 times over a 5-minute window using exponential backoff; IF all retries fail, THE HelpPilot SHALL notify the admin channel and mark the ticket as `delivery-failed`.
5. WHEN an Admin clicks Reject on the Dashboard, THE HelpPilot SHALL set the ticket status to `escalated`, record the admin's rejection notes, and send a notification to the configured escalation channel; IF a system error prevents the status update, THE HelpPilot SHALL still persist the rejection notes independently.
6. THE HelpPilot SHALL log every HITL decision with the admin's user ID, the action taken (approve/edit-approve/reject), and a UTC timestamp.
7. IF a pending approval receives no admin action within 4 hours, THEN THE HelpPilot SHALL re-send the admin notification to the same configured admin channel and mark the ticket as `stale`.
8. WHILE a ticket is in pending-approval state, THE HelpPilot SHALL allow only the first admin action to take effect; if concurrent admin actions are received, the first-committed action SHALL win and subsequent actions SHALL be rejected with HTTP 409.

---

### Requirement 6: Response Delivery

**User Story:** As a ticket submitter, I want to receive a response via the same channel I used to submit my ticket, so that communication is seamless.

#### Acceptance Criteria

1. WHEN a ticket was submitted via email and a response is approved, THE HelpPilot SHALL send the response to the submitter's email address using the configured email provider (Nodemailer or SendGrid) within 30 seconds of approval.
2. WHEN a ticket was submitted via API or web form and a response is approved, THE HelpPilot SHALL update the ticket record status to `resolved` and make the response available via `GET /api/tickets/:id` within 5 seconds of approval.
3. IF the email delivery fails on the first attempt, THEN THE HelpPilot SHALL retry the delivery up to 3 times using exponential backoff starting at 5 seconds and doubling up to a maximum of 60 seconds, with the ticket status unchanged during retry attempts.
4. IF all 3 email delivery retries fail, THEN THE HelpPilot SHALL mark the ticket as `delivery-failed` and send a notification to the configured admin channel.
5. IF the API or web-form response update fails, THEN THE HelpPilot SHALL retry the update up to 3 times with exponential backoff; if all retries fail, THE HelpPilot SHALL mark the ticket as `delivery-failed` and notify the admin channel.
6. THE HelpPilot SHALL record the delivery timestamp and delivery channel for every response that is successfully sent.

---

### Requirement 7: Outcome Logging and Knowledge Base Updates

**User Story:** As an IT helpdesk operator, I want all ticket outcomes to be logged and successful resolutions fed back into the knowledge base, so that the system improves over time.

#### Acceptance Criteria

1. WHEN any ticket reaches a terminal state (resolved, escalated, delivery-failed, rejected), THE Logger SHALL write a complete record to the SQLite database including ticket ID, category, priority, confidence score, response text, outcome, admin action if applicable, and timestamps.
2. WHEN a ticket is marked as successfully resolved with `successfully_resolved = true` and outcome `SUCCESS_ADMIN` or `SUCCESS_AUTO`, THE Logger SHALL add the ticket body and its successful response to the ChromaDB knowledge base as a new solution entry, skipping the write if an entry with the same ticket ID already exists to prevent duplicates.
3. WHEN a ticket reaches a terminal state, THE Logger SHALL complete the write to SQLite within 2 seconds of the state transition.
4. IF a Logger write operation to SQLite or ChromaDB fails due to a connection error, constraint violation, or timeout, THEN THE HelpPilot SHALL retry the write up to 3 times using exponential backoff; if all retries fail, THE HelpPilot SHALL emit a structured error log entry containing the ticket ID, target store, error class, and failure timestamp.
5. THE HelpPilot SHALL maintain a SQLite schema that supports querying tickets by status, category, priority, date range, and admin ID.

---

### Requirement 8: Admin Dashboard

**User Story:** As an IT helpdesk admin, I want a web dashboard that shows all tickets, their statuses, proposed responses, and outcome metrics, so that I can monitor system performance and handle approvals efficiently.

#### Acceptance Criteria

1. WHEN an admin sorts the ticket list, THE Dashboard SHALL display all tickets sorted by the selected column (received date, priority, or status), with received date descending as the default sort order and a maximum of 100 tickets per page.
2. WHEN an admin selects a ticket from the list, THE Dashboard SHALL display a detail view showing the full ticket text, classification output, KB search results, draft response, Confidence Score, and HITL decision history.
3. WHILE a ticket is in `pending-approval` state, THE Dashboard SHALL display an approval panel for that ticket providing Approve, Edit, and Reject controls.
4. THE Dashboard SHALL display aggregate metrics including total tickets processed, auto-resolution rate (auto-resolved tickets / total tickets × 100%), average confidence score, and average response time in seconds.
5. WHILE the Dashboard is open, THE Dashboard SHALL poll for ticket state changes at a cadence of no more than 5 seconds and update the displayed state without requiring a full page reload.
6. THE Dashboard SHALL be accessible via the last 2 major versions of Chrome and Firefox without requiring any local software installation beyond the browser itself.

---

### Requirement 9: Multilingual Support

**User Story:** As a global IT helpdesk operator, I want HelpPilot to handle tickets written in languages other than English, so that non-English-speaking users receive equivalent support quality.

#### Acceptance Criteria

1. WHEN a ticket is received in a non-English language, THE Classifier SHALL detect the source language using the LLM and record it in the ticket metadata; IF language detection fails, THE Classifier SHALL treat the ticket as English and proceed normally.
2. WHEN a non-English ticket is detected, THE HelpPilot SHALL translate both the ticket subject and body to English before passing them to the KBSearcher and Resolver.
3. WHEN a response is drafted for a non-English ticket, THE Resolver SHALL translate the draft response back into the ticket's detected source language before delivery.
4. THE HelpPilot SHALL support translation for the following languages: Spanish, French, German, Portuguese, Japanese, and Chinese (Simplified).
5. WHEN the detected source language is not in the supported translation list, THE HelpPilot SHALL process the ticket in English, prepend an advisory note to the drafted response indicating the original language, and flag the ticket for human review.
6. IF any translation operation fails, THEN THE HelpPilot SHALL escalate the ticket to a human without sending an automated response and log a structured error entry containing the ticket ID and the failed translation step.

---

### Requirement 10: Observability and Error Handling

**User Story:** As a system operator, I want HelpPilot to emit structured logs and handle errors gracefully, so that the system is maintainable and debuggable in production.

#### Acceptance Criteria

1. THE HelpPilot SHALL emit structured JSON log entries for every significant event including ticket receipt, classification completion, KB search completion, draft generation, approval action, and response delivery.
2. THE HelpPilot SHALL include at minimum a UTC timestamp, severity level, event type, and ticket ID in every structured JSON log entry.
3. WHEN any agent encounters an unhandled exception, THE HelpPilot SHALL catch the exception, log a structured error entry with a stack trace, and route the affected ticket to human escalation.
4. THE HelpPilot SHALL implement retry logic with exponential backoff (maximum 3 attempts, 1-second initial delay, 30-second cap) for all external service calls including Amazon Bedrock, ChromaDB, email providers, and the Brave Search API.
5. IF the Amazon Bedrock API is unavailable for 60 seconds or more, THEN THE HelpPilot SHALL disable auto-resolution, route all new tickets to human review, and emit exactly one system health alert at the moment the 60-second threshold is crossed.
6. WHEN the Amazon Bedrock API becomes available again after an outage, THE HelpPilot SHALL re-enable auto-resolution and resume normal ticket routing without requiring a restart.
7. THE HelpPilot SHALL expose a `GET /api/health` endpoint that returns the status of all dependent services (Bedrock, ChromaDB, SQLite, email provider), where each service status is one of `healthy`, `degraded`, or `unavailable`.

---

### Requirement 11: Security and Access Control

**User Story:** As a system operator, I want HelpPilot to enforce authentication on admin-facing endpoints and protect sensitive ticket data, so that only authorized personnel can approve responses or access ticket details.

#### Acceptance Criteria

1. THE HelpPilot API SHALL require a valid API key (passed as an `X-API-Key` header) on all `POST`, `PUT`, `PATCH`, and `DELETE` requests to `/api/tickets` and on all requests to `/api/approvals`; requests with a missing or invalid API key SHALL receive HTTP 401 with no ticket data in the response body.
2. THE HelpPilot API SHALL require a valid API key on all `GET` requests to `/api/tickets` and `/api/tickets/:id`; requests with a missing or invalid API key SHALL receive HTTP 401 with no ticket data in the response body.
3. WHEN an unauthenticated user attempts to access the Dashboard, THE Dashboard SHALL redirect the user to the login page and display no ticket content or approval controls until authentication succeeds.
4. THE HelpPilot SHALL store all API keys, secrets, and credentials as environment variables.
5. THE HelpPilot SHALL NOT include any API key, secret, or credential value in log output, API response bodies, or error messages.

---

### Requirement 12: Emotion-Aware Escalation Engine

**User Story:** As an IT helpdesk admin, I want HelpPilot to detect the emotional state of ticket submitters and escalate high-risk interactions automatically, so that frustrated or churning users receive prioritized, appropriately-toned responses before situations deteriorate.

#### Acceptance Criteria

1. WHEN a ticket is received, THE EmotionAnalyzer SHALL analyze the ticket text and the submitter's ticket history and produce the following fields: `frustration_score` (integer 0–10), `urgency_score` (integer 0–10), `churn_risk` (one of `low`, `medium`, `high`, `critical`), `emotional_state` (one of `calm`, `stressed`, `angry`, `desperate`), `recommended_tone` (one of `professional`, `empathetic`, `urgent`, `crisis`), `trigger_words` (list of matched terms), and `reasoning` (natural-language explanation).
2. WHEN the EmotionAnalyzer produces a `churn_risk` value of `critical`, THE HelpPilot SHALL bypass the normal ticket queue and alert a human operator via the configured admin channel within 60 seconds of ticket receipt.
3. WHEN the EmotionAnalyzer produces an `urgency_score` greater than 8 and the current server time falls within the configured business hours window, THE HelpPilot SHALL send an instant Slack ping to the configured admin Slack channel.
4. WHEN the `trigger_words` list produced by the EmotionAnalyzer contains any of the terms `cancel`, `quit`, `manager`, or `lawsuit`, THE HelpPilot SHALL notify the designated team lead via the configured notification channel.
5. WHEN a ticket is received from a submitter who has had 3 or more tickets in the preceding 7-day rolling window, THE EmotionAnalyzer SHALL flag the submitter's account as a VIP problem account and include a `vip_flag: true` field in the analysis output.
6. WHEN the EmotionAnalyzer assigns any `emotional_state` other than `calm`, THE Resolver SHALL rewrite the opening sentence of the draft response to match the `recommended_tone` value before the draft is presented for approval or auto-sent.
7. IF the EmotionAnalyzer fails to produce output due to an exception or timeout, THEN THE HelpPilot SHALL proceed with ticket processing using default values (`frustration_score: 0`, `urgency_score: 0`, `churn_risk: low`, `emotional_state: calm`, `recommended_tone: professional`) and log a structured error entry containing the ticket ID and the failure reason.
8. WHEN a ticket is flagged for human review due to `churn_risk = critical`, THE Dashboard SHALL display the `emotional_state`, `frustration_score`, `urgency_score`, and `recommended_tone` values alongside the standard approval controls.

---

### Requirement 13: Self-Learning Memory Loop

**User Story:** As an IT helpdesk operator, I want every resolved ticket to be saved as a knowledge base entry with tracked success metrics, so that the system's resolution accuracy improves over time based on real outcomes.

#### Acceptance Criteria

1. WHEN a ticket reaches the `resolved` terminal state, THE Logger SHALL save the ticket body and approved response as a new KB entry in ChromaDB, skipping the write if a KB entry with the same ticket ID already exists.
2. THE Logger SHALL attach a `success_count` (integer, initial value 1) and `failure_count` (integer, initial value 0) field to every KB entry created from a resolved ticket.
3. WHEN a KB entry is used as a source in a Resolver draft and the resulting ticket reaches the `resolved` terminal state with outcome `SUCCESS_ADMIN` or `SUCCESS_AUTO`, THE Logger SHALL increment the `success_count` field of that KB entry by 1.
4. WHEN a KB entry is used as a source in a Resolver draft and the resulting ticket is rejected by an admin or reaches the `delivery-failed` terminal state, THE Logger SHALL increment the `failure_count` field of that KB entry by 1.
5. THE KBSearcher SHALL compute a `kb_confidence_multiplier` for each KB entry as `success_count / (success_count + failure_count)` and apply it by multiplying the raw similarity score by the `kb_confidence_multiplier` before ranking results; KB entries with zero total uses SHALL use a `kb_confidence_multiplier` of 1.0.
6. WHEN a KB entry's `kb_confidence_multiplier` falls below 0.4, THE KBSearcher SHALL deprioritize that entry by placing it after all entries with a `kb_confidence_multiplier` of 0.4 or above in the ranked results list.
7. THE Dashboard SHALL display a session metric labeled "Solutions Learned This Session" showing the count of new KB entries created since the current admin session started.
8. IF any Logger write to update `success_count` or `failure_count` fails, THEN THE HelpPilot SHALL retry the write up to 3 times using exponential backoff and emit a structured error log entry containing the KB entry ID and the failure reason if all retries fail.

---

### Requirement 14: Multi-Modal Input Handler

**User Story:** As a ticket submitter, I want to attach screenshots, voice notes, or forward email threads when submitting a ticket, so that I can provide richer context for my issue without being limited to typed text.

#### Acceptance Criteria

1. WHEN a ticket submission includes an attached image file (JPEG, PNG, or GIF, maximum 10 MB), THE MultiModalHandler SHALL extract visible text from the image using an OCR vision model and append the extracted text to the ticket body before classification.
2. WHEN a ticket submission includes an attached audio file (MP3, WAV, or M4A, maximum 25 MB), THE MultiModalHandler SHALL transcribe the audio to text using a Whisper-compatible transcription model and append the transcript to the ticket body before classification.
3. WHEN a ticket body contains a forwarded email thread (identified by the presence of `>` quote markers or `From:` / `Sent:` / `To:` / `Subject:` header patterns), THE MultiModalHandler SHALL extract the most recent non-quoted message segment and use that segment as the effective ticket body, discarding prior thread history.
4. WHEN the ticket language is detected as non-English by the Classifier, THE MultiModalHandler SHALL pass the normalized ticket body through the translation pipeline defined in Requirement 9 before classification proceeds.
5. WHEN any modality input (image, audio, or forwarded email) has been processed, THE MultiModalHandler SHALL normalize the result into the standard internal ticket format containing `subject`, `body`, `source_modality` (one of `text`, `image`, `voice`, `email_thread`), and `original_language` fields before the ticket is enqueued for classification.
6. IF the OCR vision model fails to extract text from an attached image, THEN THE MultiModalHandler SHALL append a note to the ticket body reading "Image attachment could not be processed" and proceed with classification using the remaining ticket content.
7. IF the transcription model fails to transcribe an attached audio file, THEN THE MultiModalHandler SHALL append a note to the ticket body reading "Audio attachment could not be transcribed" and proceed with classification using the remaining ticket content.
8. IF an attached file exceeds the maximum allowed size for its type, THEN THE HelpPilot API SHALL return HTTP 413 with a JSON error body specifying the `max_size_mb` allowed for that file type.

---

### Requirement 15: Explainable Reasoning Dashboard

**User Story:** As an IT helpdesk admin, I want to see a live visual trace of every agent's reasoning for each ticket, so that I can understand why the system made a particular routing or resolution decision and intervene when necessary.

#### Acceptance Criteria

1. WHEN a ticket is being processed, THE Dashboard SHALL display a live reasoning trace panel for that ticket showing each agent's step in the pipeline (MultiModalHandler → Classifier → EmotionAnalyzer → KBSearcher → Resolver) as it completes, updating in real time without requiring a page reload.
2. THE Dashboard reasoning trace SHALL display the following fields for the Classifier step: detected category, detected priority, detected sentiment, and classification confidence score.
3. THE Dashboard reasoning trace SHALL display the following fields for the KBSearcher step: number of KB articles matched, top similarity score, and `kbStatus`.
4. THE Dashboard reasoning trace SHALL display the following fields for the Resolver step: final confidence score, routing decision (auto-resolve, human-review, or escalate), and a list of up to 3 alternative routing decisions considered with their associated confidence scores.
5. THE Dashboard reasoning trace SHALL display the following fields for the EmotionAnalyzer step: `emotional_state`, `frustration_score`, `urgency_score`, `churn_risk`, and `recommended_tone`.
6. WHEN a ticket is escalated rather than auto-resolved, THE Dashboard SHALL display a human-readable explanation in the reasoning trace stating the primary reason for escalation (low confidence, critical priority, churn_risk critical, trigger word matched, or agent error).
7. THE Dashboard SHALL display a real-time agent activity log stream showing each agent event with a UTC timestamp, event type, ticket ID, and outcome, updating at a cadence of no more than 2 seconds.
8. WHEN an admin selects a completed ticket from the ticket list, THE Dashboard SHALL display the full historical reasoning trace for that ticket as it was recorded at processing time, including all agent steps and their outputs.

---

### Requirement 16: Proactive Prediction Mode

**User Story:** As an IT helpdesk operator, I want HelpPilot to monitor system event streams and detect emerging error patterns before a wave of tickets arrives, so that affected users can be notified proactively and ticket volume is reduced.

#### Acceptance Criteria

1. THE PredictionEngine SHALL continuously monitor a configurable input stream of system log events (a mock event stream is acceptable for demo environments) and maintain a rolling count of unique error signatures observed within a configurable time window (default: 5 minutes).
2. WHEN 5 or more distinct users encounter the same error signature within the configured time window, THE PredictionEngine SHALL classify that signature as an emerging incident and create a draft incident report containing the error signature, affected user count, first-occurrence timestamp, and a suggested resolution drawn from the KB (if a KB match with similarity score above 0.5 exists).
3. WHEN an emerging incident is detected, THE PredictionEngine SHALL send an outbound notification to all identified affected users via the channel they last used to contact the helpdesk (email or API webhook), containing the error description and the suggested fix; IF a user has no prior contact channel on record, THE PredictionEngine SHALL skip that user and record the skip in the incident report.
4. WHEN an emerging incident is created, THE HelpPilot SHALL make the draft incident report available for admin review via the Dashboard and via `GET /api/incidents/:id`; THE PredictionEngine SHALL NOT send the outbound notification until an admin approves the incident report.
5. IF the outbound notification dispatch fails for any individual user, THEN THE PredictionEngine SHALL retry delivery up to 3 times using exponential backoff and record the final delivery status per user in the incident report.
6. THE Dashboard SHALL display a counter labeled "Tickets Prevented Proactively" showing the cumulative count of outbound notifications successfully delivered for active incidents since the system started.
7. THE PredictionEngine SHALL log each incident detection event with the error signature, affected user count, detection timestamp, and notification dispatch status for every user notified.
8. WHEN an incident report has been reviewed and closed by an admin, THE PredictionEngine SHALL cease monitoring for that specific error signature for a cooldown period of 30 minutes before re-evaluating it as a new potential incident.

---

### Requirement 17: Enhanced Human-in-the-Loop Controls

**User Story:** As an IT helpdesk admin, I want comprehensive oversight controls that surface emotional context and enforce mandatory review for all high-stakes tickets, so that no critical or sensitive communication is dispatched without informed human judgment.

#### Acceptance Criteria

1. WHEN the Resolver generates a draft response with a Confidence Score below 85, THE HelpPilot SHALL route the ticket to HITL review regardless of ticket category, priority, or any auto-resolve configuration.
2. WHEN a ticket has Category `billing` or is classified as a security-related issue (identified by the Classifier assigning Category `other` with a `security` tag), THE HelpPilot SHALL route the ticket to HITL review and SHALL NOT auto-resolve it regardless of Confidence Score.
3. WHEN the EmotionAnalyzer assigns `churn_risk = critical` to a ticket, THE HelpPilot SHALL route the ticket to HITL review, bypass the normal ticket queue, and alert the admin channel within 60 seconds as specified in Requirement 12 Acceptance Criterion 2.
4. WHILE a ticket is in `pending-approval` state, THE Dashboard approval panel SHALL display the following information alongside the standard Approve / Edit / Reject controls: the full ticket text, the draft response, the Confidence Score, the Resolver's reasoning explanation, the EmotionAnalyzer `emotional_state`, and the EmotionAnalyzer `frustration_score`.
5. THE Logger SHALL record every HITL decision with the following fields: ticket ID, admin user ID, UTC timestamp of the action, action taken (one of `approve`, `edit-approve`, `reject`), pre-action Confidence Score, and the final outcome after action.
6. IF a pending-approval ticket has not received an admin action within 4 hours, THEN THE HelpPilot SHALL re-notify the admin channel and mark the ticket as `stale`, consistent with Requirement 5 Acceptance Criterion 7.
7. WHEN the EmotionAnalyzer detects `churn_risk` of `high` or `critical` on a ticket that is auto-resolved (Confidence Score above 85), THE HelpPilot SHALL override auto-resolution and route the ticket to HITL review.

---

### Requirement 18: Demo Metrics Panel

**User Story:** As a hackathon evaluator or IT helpdesk admin, I want a live metrics panel on the dashboard that highlights the system's real-time performance and impact, so that the value of automation can be assessed at a glance.

#### Acceptance Criteria

1. THE Dashboard SHALL display a dedicated Metrics Panel containing the following counters, all updated in real time at a cadence of no more than 5 seconds: (a) tickets auto-resolved vs. escalated as a percentage of total tickets processed this session, (b) average resolution time in seconds across all tickets resolved this session, (c) count of new KB solutions learned this session, (d) count of tickets prevented proactively this session, (e) count of emotion-based escalations triggered this session, and (f) estimated time saved this session in minutes (calculated as total tickets auto-resolved × configurable average-handling-time parameter, default 5 minutes per ticket).
2. WHEN no tickets have been processed in the current session, THE Dashboard Metrics Panel SHALL display zero values for all counters and SHALL NOT display division-by-zero errors or `NaN` values.
3. THE Dashboard SHALL display an estimated cost saved value alongside the time saved metric, calculated as estimated time saved in hours × configurable cost-per-hour parameter (default USD 50/hour), formatted as a currency string with 2 decimal places.
4. WHEN an admin reloads the Dashboard page, THE Dashboard Metrics Panel SHALL restore all session counters from the server-side session state so that metrics are not lost on browser refresh.
5. THE Dashboard Metrics Panel SHALL be visible without scrolling on a viewport of 1280 × 800 pixels at 100% browser zoom, and all metric labels SHALL be readable without truncation at that viewport size.
