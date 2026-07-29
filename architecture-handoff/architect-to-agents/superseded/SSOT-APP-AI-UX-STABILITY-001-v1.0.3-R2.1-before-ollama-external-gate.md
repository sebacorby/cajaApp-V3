# SSOT — APP-AI-UX-STABILITY-001

Estado vigente: `v1.0.3-R2.1` ACTIVA. Único vertical activo. `APP-FINAL-CLOSURE` permanece bloqueado hasta promoción comprobada.

## Avance validado

- contrato backend congelado: máximo 3 llamadas y retry sólo para `AI_ADVISOR_UNGROUNDED_NUMBER`;
- backend focal 32/32 PASS;
- backend completo 175/175 PASS;
- backend build PASS;
- frontend typecheck, lint y build PASS;
- SQLite descartada como causa raíz: DBs aisladas e íntegras, sin WAL/SHM/JOURNAL y 5/5 updates en 14–16 ms;
- canonical sin promoción.

## Decisión de gobierno vigente

La estrategia de coordinadores y scripts queda cancelada. Los runners previos iniciaron Playwright sin frontend operativo y consumieron dos días sin producir una comparación válida.

A partir de este SSOT:

- cada test E2E se ejecuta manualmente y de forma individual;
- un comando Playwright puede seleccionar exactamente un caso;
- se cierra la evidencia del caso antes de avanzar;
- se prohíben scripts, loops, Task Scheduler y ejecuciones en lote;
- la cobertura completa se demuestra mediante inventario más evidencia serial sin omisiones;
- candidate y baseline se ejecutan con el mismo inventario y orden;
- la evidencia se sincroniza progresivamente a Dropbox.

## Única instrucción activa

`architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-R2.1-E2E-MANUAL-SERIAL-ONE-BY-ONE.md`

Toda instrucción anterior de R2.1 queda archivada en `superseded` y no puede usarse para ejecutar la campaña.

## Evidencia esperada

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2.1/`

Debe contener inventarios, índices seriales, evidencia individual candidate/baseline, resúmenes, focales, orden, comparación, hashes, SQLite preflights, procesos, health y cleanup.

## Gates obligatorios

- backend focal 32/32 PASS;
- backend completo 175/175 PASS;
- backend build PASS;
- API real nueva 5/5;
- AI focal Run 1: 2/2 mediante dos comandos individuales;
- AI focal Run 2: 2/2 mediante dos comandos individuales con los mismos servidores;
- month-close seguido de AI: 4/4 mediante cuatro comandos individuales;
- 422 visible, retry manual y una request HTTP por submit;
- frontend gates PASS;
- candidate serial completo: todos los casos inventariados, sin omisiones ni duplicados;
- baseline serial completo con inventario equivalente;
- Chromium, workers=1 y retries=0 en cada caso;
- `candidateNewFailures=0`;
- `baselinePassedCandidateFailed=0`;
- fallos comunes sólo como deuda si coinciden con servicios operativos;
- promoción atómica comprobada;
- packages intactos, SQLite canónica intacta/restaurada y puertos libres.

## Reglas de fallo

- `ERR_CONNECTION_REFUSED` con frontend apagado invalida el caso y debe repetirse después de restaurar el servicio;
- un resultado en lote es inválido;
- un caso sin evidencia individual es `NOT RUN`;
- un test omitido o filtrado invalida el agregado;
- no se aceptan resultados proyectados;
- BLOCKED sólo procede con evidencia directa de un caso individual y luego de descartar servicio, DB y tooling.

## Promoción

Canonical permanece congelado. Sólo se promueve después de completar todos los casos candidate y baseline, aprobar la comparación y sincronizar evidencia completa.

No abrir otro vertical.
