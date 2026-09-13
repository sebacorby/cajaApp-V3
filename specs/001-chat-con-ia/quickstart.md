# Quickstart Validation: APP-AGENT-CHAT-001

## Prerequisites

- Windows x64.
- Node.js exacto `I:\Tools\node-v24.18.0-win-x64\node.exe` (`v24.18.0`).
- Repo en `I:\cajaApp-V3`, rama `feat/agent-chat`.
- Backend dependencies ya instaladas en `workspace/backend/node_modules`.
- Frontend dependencies ya instaladas en `workspace/frontend/node_modules`.
- `dev.db` respaldada antes de campañas que muten datos.

## Foundation validation

Desde `workspace/backend`:

```powershell
$env:Path = "I:\Tools\node-v24.18.0-win-x64;$env:Path"
node --version
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:migrate:status
npm run build
npm run test -- --run tests/agent-chat
```

Expected:
- Node prints `v24.18.0`.
- migration status clean.
- agent-chat tests green.
- existing `ai-advisor` no-mutation tests remain green.

## Chat base smoke

Start CajaApp with the existing authorized launcher or current native dev commands; do not create wrappers.

Expected manual flow:
1. Open any section such as Dashboard.
2. Confirm circular `Agente IA` launcher is visible at bottom-right.
3. Open it; current section must remain visible behind the panel.
4. Create a conversation and send `Hola, explicame qué es interés compuesto`.
5. Observe streamed response with no CajaApp tool card.
6. Minimize and reopen; same conversation remains active.
7. Navigate to another section; panel remains mounted.

## Read-tool smoke

Send: `¿Cuánto gasté este mes y cómo voy contra presupuesto?`

Expected:
- Tool activity shows actual CajaApp reads.
- Final answer uses returned data only.
- No mutation is created.
- With `hideAmounts=true`, structured amounts remain masked.

## Write / approval smoke

Normal write: `Registrá un gasto de ARS 18500 en farmacia hoy`.

Expected: if arguments are unambiguous and intent is explicit, R2 executes once without redundant approval.

Critical action: request a month close or accepted draft.

Expected: Approval Card appears; domain remains unchanged until `Confirmar`. `Cancelar` keeps domain unchanged.

## Recovery smoke

During a response, disconnect/reload the frontend and reopen the conversation.

Expected: durable run snapshot is recovered; successful tools are not repeated; terminal status can be reconstructed.

## Final campaign

Run backend full suite + Prisma/integrity, frontend typecheck/lint/build and Playwright complete with `workers:1`, `retries:0`, no filters/skips. Restore `dev.db` to the exact pre-campaign SHA-256 and stop all services before declaring PASS/FAIL/BLOCKED.
