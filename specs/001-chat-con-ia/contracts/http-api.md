# HTTP Contract: Agente IA

Base path: `/api/agent`

## Conversations

### GET `/conversations`

Query: `status?=active|archived`, `cursor?`, `limit?` (default 30, max 100).

Response `200`:
- `items[]`: `id`, `title`, `status`, `lastProvider`, `lastModel`, `createdAt`, `updatedAt`, `archivedAt`.
- `nextCursor: string|null`.

### POST `/conversations`

Body: `{ title?: string }`.

Response `201`: conversation summary. Default title: `Nuevo chat`.

### GET `/conversations/:id`

Query: `beforeSequence?`, `limit?` (default 50, max 200).

Response `200`:
- `conversation` summary.
- `messages[]` ordered ascending.
- `hasMoreBefore: boolean`.
- `activeRun: run snapshot|null`.

### PUT `/conversations/:id`

Body: one or more of `{ title?, status? }`.

Rules: title 1..120 chars; status `active|archived`.

Response `200`: updated conversation summary.

### DELETE `/conversations/:id`

Response `204`. Deletes only Agent* history/staged attachments; domain entities remain intact.

## Messages and runs

### POST `/conversations/:id/messages`

Body: `{ content: string, attachmentIds?: string[] }`.

Rules: non-empty content or at least one attachment; no second non-terminal run for same conversation.

Response `202`: `{ runId, userMessageId, status: "running" }`.

### GET `/runs/:runId`

Response `200`: durable snapshot containing run status, assistant message-so-far when available, tool calls, approvals, provider/model and last event sequence.

### POST `/runs/:runId/cancel`

Response `202`: updated run snapshot. Cancellation never interrupts a domain transaction already started.

### GET `/runs/:runId/events`

Content-Type `text/event-stream`. Uses optional `Last-Event-ID`; event contract in `sse-events.md`.

## Attachments

### POST `/conversations/:id/attachments`

Multipart field `file`.

Accepted: PDF or CSV, size `1..10485760` bytes.

Response `201`: `{ id, fileName, mimeType, sizeBytes, sha256, status: "staged" }`.

The response never exposes `storagePath`.

## Approvals

### POST `/tool-calls/:toolCallId/approve`

Body: `{}`.

Rules: tool call must be `awaiting_approval`, approval must be pending and arguments hash must still match.

Response `202`: `{ runId, toolCallId, status: "approved" }`; same run resumes.

### POST `/tool-calls/:toolCallId/reject`

Body: optional `{ reason?: string }`.

Response `202`: `{ runId, toolCallId, status: "rejected" }`; domain remains unchanged and same run resumes with `user_rejected` result.

## Tool catalog

### GET `/tools`

Response `200`:
- `version`.
- `tools[]`: public diagnostic fields `name`, `description`, `riskClass`, `parallelSafe`, `requiresExplicitIntent`.

Handler identities, internal service methods, secrets and schemas containing internal-only fields are not exposed.

## Error contract

All non-stream endpoints use the existing CajaApp error envelope:

```json
{ "code": "ERROR_CODE", "message": "Human-readable message" }
```

Expected feature codes include:
- `AGENT_CONVERSATION_NOT_FOUND`
- `AGENT_RUN_NOT_FOUND`
- `AGENT_RUN_ALREADY_ACTIVE`
- `AGENT_TOOL_NOT_FOUND`
- `AGENT_TOOL_ARGUMENTS_INVALID`
- `AGENT_APPROVAL_REQUIRED`
- `AGENT_APPROVAL_INVALID`
- `AGENT_ATTACHMENT_INVALID`
- `AGENT_PROVIDER_ERROR`
- `AGENT_RUN_CANCELLED`
