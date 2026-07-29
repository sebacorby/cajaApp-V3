# SSOT — APP-AI-UX-STABILITY-001

Estado vigente: `v1.0.3-R2.1` ACTIVA. Único vertical activo. `APP-FINAL-CLOSURE` bloqueado hasta promoción comprobada.

## Avance validado

- contrato backend congelado: máximo 3 llamadas, retry sólo `AI_ADVISOR_UNGROUNDED_NUMBER`;
- backend focal 32/32 PASS;
- backend completo 175/175 PASS;
- backend build PASS;
- frontend typecheck/lint/build PASS;
- SQLite descartada como causa: DBs candidate/baseline aisladas, integridad OK y 5/5 updates en 14–16 ms;
- canonical sin promoción.

## Resultado inválido del coordinator v1

Candidate y baseline terminaron 1/45 porque sus frontends nunca iniciaron. Los 44 fallos `ERR_CONNECTION_REFUSED` de cada lado no prueban deuda común, ausencia de regresiones ni comparación funcional.

Los archivos `COMPARISON.json`, `suite-candidate-results.json` y `suite-baseline-results.json` de esa ejecución son históricos e inválidos para gates.

## Causa vigente

El runner bajo Task Scheduler inició Playwright sin completar un gate real de startup de Next.js. El problema probable es working directory, rutas, build o environment no heredado en la tarea programada.

## Instrucciones activas

1. `architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-CODE-UNBLOCK-v1.0.3-R2.1.md`
2. `architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-R2.1-TECHNICAL-PATCH.md`
3. `architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-R2.1-WINDOWS-TASK-RUNNER-v2-FRONTEND-STARTUP.md`

Evidencia esperada:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2.1/`

## Decisión de gobierno

- no instalar PM2, Docker ni dependencias;
- no tocar package files, Playwright config, timeouts globales, SQLite canónica ni canonical;
- usar Node y Next por rutas absolutas;
- establecer `WorkingDirectory` explícito;
- exigir `.next/BUILD_ID` y build válido por target;
- prohibir Playwright hasta tres health checks HTTP 200 consecutivos con proceso y listener vivos;
- abortar sin suite ni comparación cuando el frontend no inicia;
- sincronizar toda evidencia local a Dropbox antes de reportar.

## PASS

- backend focal 32/32, suite 175/175 y build PASS;
- API real nueva 5/5;
- AI Run 1 2/2 y Run 2 2/2 con mismos servidores;
- month-close seguido de AI 4/4;
- 422 visible, retry manual y una request HTTP por submit;
- frontend gates y Python preflight PASS;
- startup candidate y baseline comprobado;
- suites candidate/baseline completas, Chromium, workers=1, retries=0;
- `candidateNewFailures=0`;
- `baselinePassedCandidateFailed=0`;
- promoción atómica comprobada;
- packages intactos, SQLite restaurada y puertos libres.

## BLOCKED

No procede por shell, frontend caído sin diagnóstico o run 1/45. Sólo procede si el runner v2 pasa preflight, intenta un comando correcto y el proceso Next es terminado externamente, con exit code, stdout/stderr, Task Scheduler events, heartbeat y listeners como evidencia.

No abrir otro vertical.
