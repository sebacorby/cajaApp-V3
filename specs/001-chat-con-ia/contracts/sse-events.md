# SSE Contract: Agent Runs

Endpoint: `GET /api/agent/runs/:runId/events`

Every event contains:
- `id`: event sequence as decimal string.
- `event`: event type.
- `data`: JSON object containing `runId`, `sequence`, `timestamp`, `payload`.

Sequences are strictly increasing per run. Clients deduplicate by `(runId, sequence)` and may reconnect with `Last-Event-ID`.

## Event Types

### `run.started`
Payload: `{ conversationId, userMessageId, provider, model }`.

### `assistant.delta`
Payload: `{ text }`. Text is append-only for the current assistant response.

### `tool.proposed`
Payload: `{ toolCallId, toolName, riskClass, displayLabel, inputSummary }`.

### `tool.started`
Payload: `{ toolCallId, toolName }`.

### `tool.completed`
Payload: `{ toolCallId, toolName, resultSummary, entityRefs? }`.

### `tool.failed`
Payload: `{ toolCallId, toolName, code, message }` sanitized.

### `approval.required`
Payload: `{ toolCallId, approvalId, riskClass, impactSummary }`.

### `approval.resolved`
Payload: `{ toolCallId, approvalId, status: "approved"|"rejected"|"expired" }`.

### `ui.navigate`
Payload: `{ section, target? }`. Frontend validates section/target before navigation.

### `assistant.completed`
Payload: `{ messageId, content }`.

### `run.completed`
Payload: `{ status: "completed", inputTokens?, outputTokens?, toolCallCount }`.

### `run.cancelled`
Payload: `{ status: "cancelled"|"cancelled_after_tool" }`.

### `run.failed`
Payload: `{ code, message }` sanitized.

### `heartbeat`
Payload: `{}`. Emitted every 5 seconds while the run is non-terminal and no other event was emitted recently.

## Reconnection

1. Client first calls `GET /runs/:runId` when recovering uncertain state.
2. Client reconnects to `/events` with `Last-Event-ID` equal to the highest applied sequence.
3. Active-process buffer replays newer retained events.
4. If older deltas are no longer buffered or backend restarted, durable snapshot remains authoritative and the client resumes from `lastEventSequence` without re-executing tools.
