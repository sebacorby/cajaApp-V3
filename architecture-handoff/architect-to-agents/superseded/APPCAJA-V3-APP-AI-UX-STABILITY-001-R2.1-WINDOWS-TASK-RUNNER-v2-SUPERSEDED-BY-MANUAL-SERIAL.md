# APP-AI-UX-STABILITY-001 v1.0.3-R2.1 — WINDOWS TASK RUNNER v2

Estado: ACTIVA. Reemplaza el runner v1. No cambia producto, tests, packages ni canonical.

## Veredicto del run anterior

El resultado candidate 1/45 y baseline 1/45 no es una comparación válida. Ambos Playwright se ejecutaron con el frontend caído y 44 fallos `ERR_CONNECTION_REFUSED`. Esto demuestra un defecto del coordinator, no deuda preexistente ni paridad funcional.

No reutilizar `COMPARISON.json` ni los resultados 1/45 para promoción.

## Causa operativa probable

Task Scheduler no hereda de forma confiable el `cwd`, `PATH` ni variables de una consola interactiva. El frontend debe arrancarse con rutas absolutas, working directory explícito y build verificable.

## Preflight obligatorio por target

Antes de iniciar backend o Playwright, para candidate y luego baseline:

1. Resolver rutas absolutas de frontend, Node y `next`.
2. Verificar `package.json`, `node_modules/next/dist/bin/next`, `.next/BUILD_ID` y `.next/server`.
3. Si `.next` no existe o no corresponde a los hashes actuales, ejecutar build del mismo target y exigir exit code 0.
4. Registrar hash de `BUILD_ID`, fecha y directorio de trabajo.
5. Confirmar puerto libre.

Generar `FRONTEND-STARTUP-PREFLIGHT-CANDIDATE.json` y `FRONTEND-STARTUP-PREFLIGHT-BASELINE.json`.

## Arranque exacto

Usar el Node absoluto:

`I:\Tools\node-v24.18.0-win-x64\node.exe`

Ejecutar directamente:

`<node> <frontend>\node_modules\next\dist\bin\next start --hostname 127.0.0.1 --port <puerto>`

Candidate frontend: `127.0.0.1:11437`.
Baseline frontend: `127.0.0.1:11438`.

`Start-Process` debe incluir:

- `-WorkingDirectory <frontend absoluto>`;
- `-PassThru`;
- stdout y stderr separados;
- variables explícitas: `NODE_ENV=production`, `NEXT_TELEMETRY_DISABLED=1` y URLs backend correctas;
- PID, comando efectivo y environment sanitizado.

No ejecutar `npm`, `npx` ni `next` confiando en PATH.

## Gate de startup

Playwright queda prohibido hasta que se cumplan simultáneamente:

- proceso frontend vivo;
- listener TCP en `127.0.0.1:<puerto>`;
- HTTP GET `/` responde 200;
- HTML contiene la raíz esperada de la app;
- tres health checks consecutivos separados por 2 segundos pasan;
- el PID sigue vivo después del tercer check.

Esperar como máximo 90 segundos. Si el proceso termina o el gate falla:

1. capturar exit code;
2. capturar stdout/stderr completos;
3. capturar `Get-NetTCPConnection` y procesos relacionados;
4. escribir `FRONTEND-STARTUP-FAILURE.json`;
5. marcar la etapa FAILED;
6. abortar inmediatamente sin ejecutar Playwright ni comparación.

Nunca producir resultados 1/45 o equivalentes cuando el frontend no pasó health.

## Aislamiento candidate/baseline

Cada target debe tener:

- frontend source físico propio;
- `.next` propio;
- logs propios;
- DB propia;
- backend y frontend propios;
- puertos propios;
- variables de entorno registradas.

No compartir `.next`, caches ni procesos. `node_modules` sólo puede compartirse si es físico/inmutable y su hash o instalación equivalente queda documentada.

## Secuencia tras startup PASS

Candidate:

1. API real 5/5;
2. AI Run 1 2/2;
3. AI Run 2 2/2 con mismos servidores;
4. month-close + AI 4/4;
5. suite completa Chromium, workers=1, retries=0.

Luego detener candidate, liberar puertos y repetir startup/preflight y suite completa baseline.

Sólo después generar comparación real:

- `candidateNewFailures=0`;
- `baselinePassedCandidateFailed=0`.

## Evidencia y sincronización

Sincronizar en Dropbox antes de reportar:

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2.1/`

Agregar:

- preflights candidate/baseline;
- `FRONTEND-STARTUP-CANDIDATE.json`;
- `FRONTEND-STARTUP-BASELINE.json`;
- stdout/stderr de ambos frontends;
- PIDs y comandos;
- health checks;
- `TASK-RUN-STATUS.json`;
- suites completas;
- comparación final.

Los archivos del run 1/45 pueden conservarse como evidencia histórica bajo `invalid-runs/frontend-not-started/`, pero no cuentan como gates.

## Prohibiciones

- no excluir tests;
- no aumentar timeouts;
- no modificar Playwright config;
- no instalar PM2/Docker/dependencias;
- no tocar canonical;
- no declarar PASS ni deuda por fallos causados por frontend caído.

Continuar sin pedir confirmación intermedia.