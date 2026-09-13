# APPCAJA-V3 — Handoff de ejecución US4 / T050–T059

## 0. Mandato

Continuar `APP-AGENT-CHAT-001` exclusivamente con **User Story 4 — approvals R3/R4**, tareas **T050–T059**. No iniciar T060 ni ningún bloque posterior. No rediseñar el feature, no crear una implementación alternativa y no ampliar alcance por iniciativa propia.

Este archivo es la instrucción operativa emitida por el arquitecto. Las fuentes funcionales autoritativas siguen siendo `specs/001-chat-con-ia/PRD.md`, `spec.md`, `plan.md`, `tasks.md`, `data-model.md` y `contracts/tool-registry.md`.

## 1. Estado exacto de partida

- Repo: `I:\cajaApp-V3`.
- Rama de trabajo: `feat/agent-chat`.
- Baseline funcional cerrado: `35b7c3620a9a5f48c5588a44ad70bc50033e84aa`.
- `main` remoto estaba verificado en ese mismo hash antes de emitir este handoff.
- T001–T049 están `[X]`.
- T050–T085 siguen pendientes.
- Working tree debe estar limpio salvo este handoff/entrada documental emitidos por el arquitecto.
- Runtime Node único válido: `I:\Tools\node-v24.18.0-win-x64` — `v24.18.0`.
- No usar otro Node instalado en Windows.
- `dev.db` real SHA-256 de referencia: `BF729E138B2AEBC5D5E8DEC65972A563CA72431DC192F14DFD838AFFC6660EEC`.
- Baseline backend: 37/37 archivos, 207/207 tests PASS.
- Baseline frontend: typecheck/build PASS; lint 0 errores y 3 warnings históricos fuera del Agente.
- Baseline Playwright Agente: 3/3 PASS, `workers=1`, `retries=0`.
- Registry actual: 60 tools públicas cerradas = 41 R0/R1 + 19 R2.

## 2. Reglas no negociables

- Trabajar sólo en `I:\cajaApp-V3` y sólo sobre `feat/agent-chat`.
- No hacer `reset --hard`, no descartar cambios locales, no borrar backups ni reemplazar el repo.
- No modificar `.env`, secretos, tokens, credenciales ni configuración global de Windows.
- No tocar `docs/00-context/APPCAJA V3 — SSOT de ejecución vigente.md`; sólo el arquitecto lo modifica.
- No iniciar T060+ ni attachments/imports de US5.
- No habilitar acceso del modelo a Prisma/SQL, filesystem arbitrario, shell, reflexión dinámica ni loopback HTTP para ejecutar dominio.
- Toda tool debe seguir delegando a services canónicos ya existentes.
- Risk class vive en registry backend; nunca confiar en una risk class enviada por provider/modelo.
- Revalidar siempre argumentos con Zod antes de ejecutar o aprobar.
- No inventar montos, IDs, fechas, candidatos ni consecuencias de una acción.
- R0/R1 existentes y R2 explícitas no deben retroceder funcionalmente.
- R3 y R4 nunca ejecutan sin approval válida.
- R2 inferida debe poder usar el mismo mecanismo de approval; R2 explícita sigue ejecutando sin confirmación redundante.
- Las writes siguen serializadas y la idempotencia de US3 debe preservarse.
- `ai-advisor.ask` sigue fuera del registry y Asesor IA no se modifica salvo test de no regresión posterior.

## 3. Alcance exacto T050–T059

T050: tests de approval requerida, hash de argumentos, rechazo y continuación de run en `workspace/backend/tests/agent-chat/approvals.test.ts`.
T051: tests de que R3/R4 nunca ejecutan sin approval y no pueden bypassarse en `workspace/backend/tests/agent-chat/tool-executor.test.ts`.
T052: Playwright con Approval Card, confirmar/cancelar y restore validation AC-05/06 en `workspace/frontend/tests/agent-chat.spec.ts`.
T053: `agent-approval.service.ts` con creación, resolución, expiración y `argumentsHash`.
T054: endpoints approve/reject + schemas en controller/routes/schemas.
T055: pausa `awaiting_approval`, resolución y reanudación del mismo run.
T056: registrar exactamente las R3 contractuales.
T057: registrar `backup.restore` como R4 con validación previa e impacto.
T058: `approval-card.tsx` accesible.
T059: conectar approve/reject al frontend, invalidar approval si cambian args y cerrar US4.

## 4. Catálogo R3/R4 autorizado

Registrar exactamente estas R3, sin agregar otras:

- `card_import.accept_draft`
- `cards.archive_statement`
- `cards.activate_statement`
- `debit_import.accept`
- `debit_import.delete`
- `debit_import.reverse`
- `salary_receipt.accept_draft`
- `salary_receipt.reverse`
- `movements.void_manual`
- `cards.delete_manual_purchase`
- `categories.archive`
- `categories.restore`
- `incomes.delete_source`
- `incomes.delete_event`
- `budgets.delete`
- `goals.delete`
- `goals.delete_contribution`
- `reconciliation.resolve`
- `reconciliation.reopen`
- `month_close.create`
- `month_close.reopen`
- `financial_health.delete_snapshot`

R4 única en este bloque: `backup.restore`.

No registrar todavía las tools Phase F de T060+ aunque existan services compatibles.

## 5. Semántica obligatoria de approval

- `AgentToolCall.riskClass` se copia del registry; no llega confiada desde el modelo.
- Estados críticos: `proposed -> awaiting_approval -> running -> succeeded|failed`.
- Rechazo: `awaiting_approval -> rejected` y la mutación no ocurre.
- `AgentApproval.status`: `pending -> approved|rejected|expired`; un estado terminal no vuelve a `pending`.
- Cada approval pertenece a un único `toolCallId`.
- `argumentsHash` debe derivarse de `toolName + argumentos canónicos validados` con hash determinístico.
- Canonicalizar JSON de forma estable; ordenar claves antes de hashear. No hashear JSON arbitrario del provider sin validar.
- Antes de ejecutar una approval aprobada, recalcular el hash desde la tool call vigente y exigir igualdad exacta.
- Si cambian argumentos/tool, invalidar/expirar la approval anterior; jamás reutilizarla.
- Una approval aprobada no elimina la protección de idempotencia; una tool ya `succeeded` no vuelve a ejecutar.
- El resultado exitoso debe quedar persistido antes de reenviarlo al provider.
- Al aprobar, continuar **el mismo `AgentRun`** desde la tool pendiente; no crear un mensaje de usuario sintético ni un run nuevo.
- Al rechazar, persistir `rejected`, emitir `approval.resolved` y devolver al contexto de tool un resultado seguro equivalente a `user_rejected`; el mismo run continúa conversando.
- Si una approval caduca, no ejecutar; debe requerirse una approval nueva.

## 6. Approval Card exacta

Debe mostrar, usando datos backend/servicios y no texto inventado por el modelo:

- acción propuesta en lenguaje humano;
- entidad afectada + ID;
- valores actuales relevantes cuando se puedan resolver;
- cambio exacto que se realizará;
- consecuencias conocidas;
- reversibilidad (`Reversible`, `Reapertura disponible`, `Sin undo automático`, etc.);
- botones accesibles `Confirmar` y `Cancelar`;
- estado de resolución sin perder la conversación.

La UI debe usar componentes/tokens actuales de CajaApp, mantener el chat montado y ser usable en desktop/mobile.

## 7. Reglas especiales de `backup.restore` R4

`backup.restore` exige **validación previa + approval siempre**. La Approval Card debe incluir como mínimo:

- backup/archivo seleccionado;
- identificador y nombre seguro;
- hash/checksum disponible;
- fecha del manifiesto;
- resultado de validación;
- incompatibilidades o warnings;
- impacto esperado;
- confirmación de que el service existente crea el backup pre-restore antes de restaurar.

No aceptar path arbitrario desde el provider. Resolver por identificador controlado y usar únicamente APIs/services existentes de `backup-restore`. No implementar restore alternativo, no invocar Python/shell directamente desde la tool y no saltar las validaciones existentes del service.

Para Playwright/R4 usar exclusivamente una copia aislada/controlada de SQLite y artifacts temporales; **jamás ejecutar restore sobre `workspace/backend/prisma/dev.db` real**.

## 8. Diseño backend esperado

Crear `workspace/backend/src/modules/agent-chat/agent-approval.service.ts`; no convertir runner/controller en god objects.

El approval service debe concentrar:
- canonicalización + SHA-256 de argumentos;
- creación idempotente de approval pending;
- lectura/validación del estado actual;
- approve/reject/expire con transición terminal atómica;
- comparación de `argumentsHash` antes de habilitar ejecución;
- generación/persistencia de `impactSummaryJson` sanitizado.

Extender registry sólo con metadata/handlers necesarios para R3/R4. Preferir helpers estáticos explícitos; prohibida reflexión para encontrar services/métodos.

El executor debe ser el último gate antes de una mutación: R3/R4 sin evidencia de approval válida deben fallar antes del handler. No alcanza con proteger sólo controller o frontend.

## 9. Orden TDD obligatorio

1. Escribir T050/T051/T052 primero y demostrar RED por ausencia de approval engine/R3-R4.
2. Implementar T053 service de approvals y volver verdes sus unit tests.
3. Implementar T054 endpoints/schemas y tests HTTP focales.
4. Implementar T055 pausa/reanudación del mismo run; probar approve, reject y expiración.
5. Registrar T056 R3 exactas, delegando a services existentes y validando argumentos con schemas canónicos.
6. Implementar T057 R4 `backup.restore` con pre-validación e impacto seguro.
7. Implementar T058 Approval Card y T059 integración frontend/API.
8. Ejecutar tests focales backend + frontend typecheck.
9. Ejecutar Playwright focal real con backend/API/SQLite sobre copia controlada.
10. Sólo si todo queda verde, marcar T050–T059 `[X]` y crear evidencia de cierre.

No marcar una tarea `[X]` antes de que su implementación y test correspondiente estén realmente verdes.

## 10. Casos mínimos que deben quedar probados

- R3 propuesta: handler NO ejecutado antes de approval.
- R4 propuesta: handler NO ejecutado antes de validation + approval.
- Aprobar con hash correcto ejecuta exactamente una vez.
- Repetir approve/retry no duplica mutación.
- Approval con argumentos alterados/hash distinto no ejecuta.
- Cancelar/rechazar deja dominio intacto y tool call `rejected`.
- Approval expirada no ejecuta.
- El mismo run continúa después de approve y reject.
- Una R2 explícita sigue ejecutando sin Approval Card.
- Una R2 inferida no muta automáticamente.
- Tool R3/R4 inexistente o argumentos inválidos nunca llega al handler.
- Eventos SSE incluyen `approval.required` y `approval.resolved` con payload sanitizado.
- Approval Card muestra impacto y botones accesibles.
- Cerrar/minimizar/navegar no confirma una approval accidentalmente.

## 11. Seguridad de SQLite y E2E

Antes de cualquier E2E con mutaciones:

- calcular SHA-256 de `workspace/backend/prisma/dev.db` real;
- crear una copia temporal explícita para la campaña US4;
- arrancar backend con `DATABASE_URL` apuntando sólo a esa copia;
- verificar que el hash inicial de la copia coincide con el real;
- ejecutar approvals/mutaciones/restore únicamente sobre la copia;
- finalizar con `PRAGMA integrity_check` y `PRAGMA foreign_key_check` sobre la copia;
- comprobar que SHA-256 del `dev.db` real sigue idéntico al inicial;
- eliminar DB temporal, logs, `playwright-report` y `test-results` al terminar.

No migrar, restaurar, truncar ni escribir datos de prueba en `dev.db` real.

Puertos de campaña preferidos: backend 11436, frontend 11437, fake provider 11501. Verificarlos libres antes y después. No matar procesos ajenos ni el Playwright MCP global.

## 12. Gates requeridos para declarar T050–T059 técnicamente cerradas

Backend:
- Node exacto `v24.18.0`.
- `npm run build` PASS.
- `tsc --noEmit` PASS.
- focales US4 PASS.
- Vitest completo PASS, sin skips añadidos.
- `prisma validate`, `prisma generate`, `prisma migrate status` PASS.
- 19 migraciones existentes siguen up to date salvo que una necesidad real de schema contradiga esto; no crear migración innecesaria.

Frontend:
- typecheck PASS;
- lint 0 errores; se toleran sólo los 3 warnings históricos conocidos si permanecen iguales;
- production build standalone PASS;
- Playwright `agent-chat.spec.ts` con `workers=1`, `retries=0` PASS.

## 13. Evidencia y cierre local del agente

Crear al finalizar:
`specs/001-chat-con-ia/evidence/us4-approvals-closure-20260913/closure.md`

La evidencia debe registrar:
- estado inicial branch/HEAD/Node;
- RED inicial de T050/T051/T052;
- diseño final de approval/hash;
- catálogo R3/R4 exacto registrado;
- resultados focales backend;
- resultados Playwright con approve y reject;
- prueba de que R3/R4 no mutaron antes de confirmar;
- prueba de idempotencia/retry;
- evidencia específica de `backup.restore` validado sobre copia aislada;
- gates completos;
- SHA-256 de `dev.db` real antes/después;
- cleanup de puertos/artifacts;
- lista honesta de cualquier known issue.

Sólo con todo verde marcar T050–T059 `[X]` en `specs/001-chat-con-ia/tasks.md`.

## 14. Git y límite de autoridad

- No cambiar de rama.
- No tocar `main` directamente.
- No cambiar `origin`; debe seguir SSH.
- No hacer force push, rebase destructivo ni reset.
- **No hacer commit ni push al finalizar este handoff.** Dejar working tree con únicamente los cambios intencionales US4 + evidencia + `tasks.md` para auditoría del arquitecto.
- No editar el SSOT; el arquitecto registrará CIERRE, commit y publicación después de revisar.
- Ejecutar `git diff --check` antes de detenerse.
- Reportar `git status --short --branch` y lista exacta de archivos modificados/nuevos.

## 15. Preflight exacto al arrancar

Antes de editar código, ejecutar y reportar:

```powershell
cd I:\cajaApp-V3
& 'I:\Tools\node-v24.18.0-win-x64\node.exe' -v
git branch --show-current
git rev-parse HEAD
git status --short --branch
git remote -v
```

Condiciones esperadas:
- Node `v24.18.0`;
- branch `feat/agent-chat`;
- baseline `35b7c3620a9a5f48c5588a44ad70bc50033e84aa` presente en la historia;
- este handoff presente bajo `architecture-handoff/architect-to-agents/issued/`;
- ninguna modificación ajena a la documentación de handoff emitida por el arquitecto.

Si aparece código local inesperado, branch distinta, Node distinto o una DB temporal/runtimes viejos, **detenerse y reportar**, no limpiar a ciegas.

## 16. Punto de detención

El trabajo termina al cerrar T059. No continuar con T060 aunque todo esté verde.

Entrega al arquitecto un resumen corto con: T050–T059 estado, tests/gates, hashes DB, archivos cambiados, known issues, `git diff --check`, `git status`, puertos y ruta de evidencia. No pedir permiso paso a paso salvo bloqueo real; aplicar TDD y resolver fallos dentro de este alcance.

**Criterio de éxito de US4:** ninguna R3/R4 puede mutar sin approval válida ligada al hash exacto de argumentos; confirmar o rechazar continúa el mismo run; `backup.restore` exige validation + approval; no hay regresiones de R0/R1/R2.
