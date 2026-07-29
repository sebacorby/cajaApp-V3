# SSOT — APP-AI-UX-STABILITY-001

Estado vigente: `v1.0.3-R2.1` ACTIVA — E2E candidate no resueltos en ejecución manual serial.

## Única instrucción activa

`architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-R2.1-E2E-CANDIDATE-UNRESOLVED-MANUAL-SERIAL.md`

No existe otra instrucción válida en `issued`.

## Estado técnico aceptado

### Ollama

PASS aceptado:

- listener `127.0.0.1:11434`;
- modelo exacto `gemma4:31b-cloud` disponible;
- `/api/tags` y `/api/show` HTTP 200;
- tres respuestas directas exactas `OLLAMA_OK`;
- JSON directo válido.

### Build backend

PASS aceptado:

- CommonJS vigente;
- `src/config/env.ts` usa `__dirname`;
- no existe `import.meta` ni `fileURLToPath`;
- `tsc` exit code 0;
- `dist/config/env.js` y `dist/main.js` CommonJS válidos;
- `package.json`, `package-lock.json` y `tsconfig.json` intactos.

### Estabilidad backend con Gemma

ACEPTADA PARA E2E:

- una sola instancia estable;
- provider `ollama`;
- endpoint `http://127.0.0.1:11434`;
- modelo `gemma4:31b-cloud`;
- preflight antes del listen;
- 10/10 health checks pre-IA;
- smoke real de IA HTTP 201;
- 10/10 health checks post-IA;
- mismo PID durante la ejecución;
- worker estable;
- Prisma estable;
- sin errores fatales.

El FAIL del cierre R2 no se considera defecto de producto ni bloqueo E2E. `Stop-Process` en Windows termina el proceso sin entregar un `SIGINT` de consola capturable por Node; por eso no produjo logs de shutdown ni exit code auditable. Este requisito se retira del gate operativo E2E.

No repetir gates de Ollama, build o estabilidad backend salvo nueva evidencia de regresión.

## Objetivo actual

Ejecutar únicamente los casos E2E candidate que no poseen PASS individual confiable.

Metodología obligatoria:

- servicios iniciados manualmente una sola vez;
- un único test Playwright por comando;
- Chromium;
- workers=1;
- retries=0;
- health antes y después de cada caso;
- evidencia individual sincronizada antes de continuar;
- sin scripts, loops, coordinadores o ejecución en lote.

## Casos conocidos no resueltos

El inventario debe reconciliar como mínimo:

`002, 010, 011, 012, 013, 018, 020, 022, 023, 024, 034, 035, 036, 037, 038, 039, 041, 042, 043`

La lista de IDs, specs y líneas es fuente de verdad; no confiar en el conteo textual previo de 18 o 19.

## Gobierno de resultados

- PASS: cerrar caso.
- FAIL_APP: capturar causa exacta y continuar.
- FAIL_INFRA: sólo con evidencia objetiva.
- BLOCKED_PROVEN: recurso obligatorio realmente ausente.
- TIMEOUT sin causa concreta no es clasificación final.

Un FAIL_APP individual no detiene la tanda.

Si backend o frontend muere:

- no reiniciar;
- capturar PID, logs y estado de puertos;
- clasificar el caso como FAIL_INFRA;
- detener la tanda, porque los casos posteriores serían inválidos.

No modificar código durante esta ejecución.

## Alcance excluido

Todavía no ejecutar:

- baseline;
- suite completa;
- promoción;
- fixes de producto;
- tests ya cerrados como PASS.

## Evidencia requerida

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2.1/candidate-unresolved/`

Cada caso debe tener comando, health previo, resultado, stdout, stderr, health posterior, clasificación y evidencia visual cuando falle.

## Regla de cierre del bloque

El bloque termina cuando cada ID del inventario reconciliado tiene exactamente un resultado final, sin omisiones ni duplicados.

Después, el agente se detiene y entrega el resumen al arquitecto.

Canonical de producto continúa sin promoción final. No abrir otro vertical.
