# APP-AGENT-CHAT-001 — Cierre US2 / T030–T040

Fecha: 13/09/2026
Runtime: `I:\Tools\node-v24.18.0-win-x64` / Node.js `v24.18.0`

## Alcance cerrado

- T030–T040 completos; T041+ no iniciados.
- Registry cerrado y estático con 41 tools públicas de la fase read.
- Risk classes y `parallelSafe` definidos por backend, nunca por output del modelo.
- Executor valida argumentos con Zod, rechaza tools desconocidas y proyecta resultados sin secretos/paths internos.
- Reads `parallelSafe` pueden ejecutarse concurrentemente; el resto se serializa.
- Handlers delegan a services canónicos de CajaApp; no se agregó Prisma/SQL/filesystem/shell ni loopback HTTP al modelo.
- Runner persiste `AgentToolCall`, mensajes `tool`, resultados/errores y continúa el mismo run hasta respuesta final.
- `GET /api/agent/tools` expone versión `agent-tools-v1.0.0` y metadata pública.
- Frontend renderiza Tool Cards persistidas, actividad resumida y `ui.navigate` sobre `useFinanceUI` sin desmontar el chat.

## Gates finales

- Backend build: PASS.
- Backend TypeScript `--noEmit`: PASS.
- Backend Vitest completo: PASS — 37/37 archivos, 202/202 tests.
- Prisma validate: PASS.
- Prisma generate: PASS.
- Prisma migrate status: PASS — 19 migraciones, schema up to date.
- SQLite `PRAGMA integrity_check`: `ok`.
- SQLite `PRAGMA foreign_key_check`: sin filas.
- Seis tablas Agent* presentes; filas temporales `agent-e2e-fake`: 0 al finalizar.

- Frontend typecheck: PASS.
- Frontend lint: PASS — 0 errores, 3 warnings preexistentes fuera del Agente IA.
- Frontend production build: PASS.
- Playwright focal `tests/agent-chat.spec.ts`: PASS — 2/2, `workers=1`, `retries=0`.
- El E2E usa backend/API/SQLite reales y sólo sustituye el provider LLM por un servidor OpenAI-compatible determinístico para producir tool calls reproducibles.
- AC cubiertos: consulta real + Tool Card, multi-tool read, navegación con panel abierto y rechazo de tool desconocida.

## Hallazgos de cierre

1. El primer intento E2E quedó esperando una URL exacta `127.0.0.1` mientras el frontend compilado usa `localhost`; el test se corrigió para validar el pathname y el mock US1 pasó a interceptar cualquier host.
2. El mismo intento descubrió un defecto real de SSE: `reply.hijack()` + `writeHead()` descartaba CORS. La ruta ahora refleja `Origin` según la política `origin: true` vigente y agrega `Vary: Origin`; luego Playwright quedó 2/2 PASS.
3. Un lint intermedio recorrió `playwright-report/trace` y reportó errores sobre bundles de Playwright. Tras eliminar los artefactos temporales, el lint real volvió a 0 errores / 3 warnings preexistentes.
4. Dos runs temporales dejados por intentos interrumpidos fueron eliminados mediante la API del Agente; el cierre confirma 0 filas `agent-e2e-fake`.

## Cleanup

- Backend/frontend/provider de prueba detenidos; puertos 11436/11437/11501 libres.
- `playwright-report`, `test-results` y logs temporales del runner focal eliminados.
- No se modificaron datos financieros durante el E2E; sólo se crearon y eliminaron entidades Agent* temporales.

Siguiente bloque: User Story 3 / T041–T049, no iniciado en este cierre.
