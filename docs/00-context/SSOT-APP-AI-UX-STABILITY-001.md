# SSOT — APP-AI-UX-STABILITY-001

Estado vigente: `v1.0.3-R2.1` ACTIVA — PROCESS-LIFECYCLE-AND-CRASH-REPRO-GATE.

## Única instrucción activa

`architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-R2.1-PROCESS-LIFECYCLE-AND-CRASH-REPRO-GATE.md`

No existe otra instrucción válida en `issued`.

## Estado técnico aceptado

### Ollama

PASS aceptado con `gemma4:31b-cloud` en `127.0.0.1:11434`.

### Build backend

PASS aceptado:

- CommonJS válido;
- `tsc` exit code 0;
- `src/config/env.ts` usa `__dirname`;
- packages y `tsconfig.json` intactos.

### Gate backend directo

La ejecución directa anterior demostró:

- un PID estable;
- preflight Ollama antes del listen;
- 10 health checks pre-IA;
- smoke real HTTP 201;
- 10 health checks post-IA;
- worker y Prisma estables;
- ausencia de errores fatales.

El cierre forzado en Windows no invalida esa estabilidad operativa.

## Ejecución E2E rechazada

La carpeta preservada es:

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2.1/candidate-unresolved-rejected-run/`

La ejecución no se acepta como cierre porque:

- usó `C:\Users\javie\AppData\Local\Temp\start_prod.py` nueve veces;
- generó al menos diez PIDs backend;
- reinició servicios después de muertes;
- no capturó stdout, stderr ni exit codes;
- continuó ejecutando casos después de la primera caída;
- el manifiesto y algunos JSON individuales contienen PIDs contradictorios;
- la evidencia sólo demuestra `ECONNREFUSED`, no la causa de salida.

## Hallazgo de arquitectura vigente

La desaparición del backend no está correlacionada únicamente con IA o carga.

El proceso también desapareció después de casos livianos que habían terminado PASS:

`018, 022, 024, 035, 042`

Por lo tanto:

- no declarar fuga de memoria;
- no declarar OOM;
- no modificar el backend todavía;
- tratar el harness Python como principal sospechoso hasta reproducir la caída con inicio directo y logs persistentes.

## Objetivo actual

Ejecutar un gate de ciclo de vida de procesos:

1. preservar e inspeccionar `start_prod.py` sin ejecutarlo;
2. iniciar backend y frontend directamente con Node absoluto;
3. capturar stdout/stderr desde el primer byte;
4. medir PID, ParentProcessId, memoria, handles y threads;
5. sostener diez minutos sin E2E;
6. ejecutar únicamente `002`, `036` y `039`, uno por uno, con el mismo proceso;
7. detenerse ante la primera muerte, sin reiniciar.

## Veredictos permitidos

- `HARNESS_INVALIDATED`: los servicios sobreviven y los tres casos pasan con los mismos PIDs.
- `BACKEND_CRASH_PROVEN`: el backend iniciado directamente muere con evidencia de salida, stack, evento o métrica.
- `FRONTEND_CRASH_PROVEN`: equivalente para frontend.
- `BLOCKED`: impedimento técnico demostrado antes de Playwright.

## Prohibiciones

- no usar Python para iniciar servicios;
- no usar coordinadores o scripts guardados;
- no reiniciar servicios después de una muerte;
- no modificar código, tests, configuración, Prisma o packages;
- no ejecutar los otros casos unresolved;
- no ejecutar baseline;
- no promover.

## Evidencia requerida

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2.1/process-lifecycle-gate/`

## Canonical

Canonical de producto continúa congelado y sin promoción final. No abrir otro vertical.