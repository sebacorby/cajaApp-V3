# SSOT — APP-AI-UX-STABILITY-001

Estado vigente: `v1.0.3-R2.1` ACTIVA. Único vertical activo. `APP-FINAL-CLOSURE` bloqueado hasta promoción comprobada.

## Avance validado

- contrato backend congelado: máximo 3 llamadas, retry sólo `AI_ADVISOR_UNGROUNDED_NUMBER`;
- backend focal 32/32 PASS;
- backend completo 175/175 PASS;
- backend build PASS;
- frontend typecheck/lint/build PASS;
- SQLite descartada como causa raíz: candidate/baseline DB aisladas, integridad OK, sin WAL/SHM/JOURNAL y 5/5 updates en 14–16 ms;
- canonical sin promoción.

## Bloqueo real vigente

El entorno efímero del agente no sostiene campañas Playwright largas. No es defecto SQLite ni evidencia suficiente para BLOCKED. La ejecución debe migrar a Windows Task Scheduler, fuera del repo y sin dependencias nuevas.

## Instrucciones activas

1. `architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-CODE-UNBLOCK-v1.0.3-R2.1.md`
2. `architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-R2.1-TECHNICAL-PATCH.md`
3. `architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-R2.1-WINDOWS-TASK-RUNNER.md`

Evidencia esperada:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2.1/`

## Decisión de gobierno

- no instalar PM2, Docker ni nuevas dependencias;
- no cambiar timeouts globales ni configuración Playwright;
- no tocar package files ni SQLite canónica;
- usar Task Scheduler como dueño del coordinador de larga duración;
- escribir heartbeat, PIDs, exit codes y estado persistente;
- continuar candidate y baseline desde sesiones posteriores sin reiniciar una etapa viva;
- sincronizar la evidencia local a Dropbox antes de declarar entrega.

## PASS

- backend focal 32/32, suite 175/175 y build PASS;
- API real nueva 5/5;
- AI focal Run 1 = 2/2 y Run 2 = 2/2 con los mismos servidores;
- month-close seguido de AI = 4/4;
- 422 visible, retry manual y una request HTTP por submit;
- frontend gates PASS;
- Python runtime preflight PASS;
- candidate y baseline Playwright completos, Chromium, workers=1, retries=0;
- `candidateNewFailures=0`;
- `baselinePassedCandidateFailed=0`;
- fallos comunes sólo como deuda si son idénticos y ajenos;
- promoción atómica comprobada;
- packages intactos, SQLite restaurada y puertos libres.

## BLOCKED

No se acepta por expiración de shell. Sólo procede si la tarea programada también es terminada externamente y quedan Task Scheduler XML/info/eventos, heartbeat interrumpido, PIDs, logs y prueba de ausencia de error funcional previo.

No abrir otro vertical.