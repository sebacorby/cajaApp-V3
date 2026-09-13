# APP-AGENT-CHAT-001 — Cierre US3 R2 T041–T049

Fecha: 13/09/2026
Rama: `feat/agent-chat`
Base: `38d3c47f241a115444c9eead5a271710a82720ab`
Runtime obligatorio: `I:\Tools\node-v24.18.0-win-x64` / Node.js `v24.18.0`

## Alcance cerrado

- T041–T049 completadas; T050+ no iniciadas.
- Catálogo cerrado ampliado de 41 a 60 tools: 41 R0/R1 existentes + 19 R2 exactas del contrato.
- R2 nunca toma risk class ni explicit intent desde salida del provider.
- El runner deriva explicit intent desde el texto actual del usuario y bloquea referencias targeteadas ambiguas.
- Writes R2 son `parallelSafe=false` y se ejecutan serialmente.
- `idempotencyKey` estable: `runId:providerCallId`.
- El executor reutiliza una R2 ya `succeeded` y persiste resultado exitoso antes de devolverlo al runner/modelo.
- Tool Card diferencia R2 exitosa (`Acción ejecutada`) y fallida (`Acción no ejecutada`) conservando el resultado real.

## TDD

- RED inicial focal: 4 fallos / 7 passes, por catálogo R2 e idempotencia aún ausentes.
- GREEN focal final: 3 archivos / 16 tests PASS.
- Caso explícito cubierto: `Registrá un gasto de ARS 18500 en farmacia hoy`.
- Caso ambiguo cubierto: `Cambiá ese movimiento` no habilita `movements.update_manual`.

## E2E aislado de datos financieros

- Backend real + frontend production standalone + provider LLM determinístico.
- Backend apuntado exclusivamente a `prisma/agent-us3-e2e.db`, copia física del `dev.db` real.
- Hash inicial real y temporal: `BF729E138B2AEBC5D5E8DEC65972A563CA72431DC192F14DFD838AFFC6660EEC`.
- Catálogo HTTP: 60 tools públicas, 19 R2, `movements.create_manual` presente.
- Playwright `tests/agent-chat.spec.ts`: 3/3 PASS, `workers=1`, `retries=0`, 14.1 s.
- La copia terminó con `integrity_check=ok`, `foreign_key_check=[]` y exactamente 1 movimiento `Farmacia E2E Agente` creado por la prueba.
- El `dev.db` real conservó exactamente el mismo SHA-256 antes/después; no recibió la mutación R2.
- Copia temporal eliminada al cerrar la campaña.

## Gates finales

- Backend build PASS; TypeScript PASS.
- Vitest completo: 37/37 archivos, 207/207 tests PASS.
- Prisma validate/generate/status PASS; 19 migraciones, schema up to date.
- `dev.db`: `integrity_check=ok`, `foreign_key_check=[]`, hash final exacto `BF729E138B2AEBC5D5E8DEC65972A563CA72431DC192F14DFD838AFFC6660EEC`.
- Frontend typecheck PASS.
- Frontend lint PASS: 0 errores, 3 warnings preexistentes fuera del Agente.
- Frontend production build PASS.
- Puertos de prueba 11436/11437/11501 liberados; logs, reporte Playwright y DB temporal eliminados.

Siguiente bloque autorizado: T050–T059 / User Story 4 — approvals R3/R4. No fue iniciado en esta campaña.
