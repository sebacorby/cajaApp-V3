# APP-AI-UX-STABILITY-001 — E2E ISOLATION AND PROMOTION v1.0.3-R2

Estado: ACTIVA. Único vertical activo. `APP-FINAL-CLOSURE` continúa bloqueado.

## Entorno

- Root canónico: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`
- Node: `I:\Tools\node-v24.18.0-win-x64\node.exe`
- Staging: `%LOCALAPPDATA%\CajaApp\validation\APP-AI-UX-STABILITY-001-v1.0.3-R2\`
- Evidencia: `architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R2/`

## Objetivo único

Cerrar los gates E2E y promover de forma atómica el contrato backend ya validado en R1. No rediseñar el retry backend.

R1 demostró:
- focal backend AI Advisor 32/32 PASS;
- suite backend 175/175 PASS;
- builds y checks frontend PASS;
- API real 5/5 reportada PASS;
- canonical sin promoción.

R1 no cerró porque:
- Focal UI Run 2 terminó 1/2;
- `month-close.spec.ts` seguido de `ai-advisor.spec.ts` terminó 2/4;
- la evidencia final no quedó sincronizada en Dropbox;
- no hubo promoción real.

Los fallos comunes con baseline prueban que R1 no creó una regresión, pero no satisfacen el objetivo de independencia y estabilidad de los tests.

## Canonical congelado

No modificar canonical hasta PASS total.

Recrear `baseline` desde canonical y `candidate` desde el último candidate R1 únicamente después de verificar:
- backend AI service contiene `MAX_PROVIDER_ATTEMPTS = 3`;
- retry sólo para `AI_ADVISOR_UNGROUNDED_NUMBER`;
- test de agotamiento usa 3 llamadas y ningún cuarto intento;
- suite backend 175/175;
- no existen archivos temporales dentro de `tests/`.

Antes de trabajar, crear una copia inmutable del candidate R1 fuera de cualquier script de regeneración. Registrar SHA-256 de todos los archivos modificados.

## Backend congelado

No cambiar lógica backend en R2. Sólo se permite portar y luego promover los cambios R1 ya validados en:
- `workspace/backend/src/modules/ai-advisor/ai-advisor.service.ts`
- `workspace/backend/src/shared/errors.ts`
- `workspace/backend/tests/ai-advisor/ai-advisor.service.test.ts`

Si cualquiera de esos archivos necesita un cambio adicional, detener la promoción y declarar FAIL con evidencia; no ampliar silenciosamente el alcance.

## Archivos frontend autorizados

Sólo pueden cambiar si el diagnóstico lo justifica:
- `workspace/frontend/tests/ai-advisor.spec.ts`
- `workspace/frontend/tests/month-close.spec.ts`
- `workspace/frontend/tests/e2e/ai-stability-fixture.ts` — nuevo helper opcional
- `workspace/frontend/src/components/finance/sections/section-router.tsx`
- `workspace/frontend/src/components/finance/sections/asesor-ia-section.tsx`
- `workspace/frontend/src/components/finance/sections/asesor-ia-section.legacy.tsx`
- `workspace/frontend/src/components/finance/sections/cierres-section.tsx`
- `workspace/frontend/src/components/finance/sections/cierres-section.legacy.tsx`
- `workspace/frontend/src/lib/finance/ai-advisor-api.ts`
- `workspace/frontend/src/lib/finance/month-close-api.ts`

Prohibido modificar configuración Playwright, package files, dependencias, `.env`, timeouts globales, otros tests, Prisma, migraciones, SQLite canónica, prompts o schemas.

## Runner desacoplado obligatorio

Crear fuera del repo:
`%LOCALAPPDATA%\CajaApp\validation\APP-AI-UX-STABILITY-001-v1.0.3-R2\run-e2e.ps1`

Debe:
1. arrancar backend y frontend con `Start-Process -PassThru`;
2. redirigir stdout/stderr a logs separados;
3. guardar PID y comando efectivo;
4. establecer la misma configuración real de Ollama usada por API 5/5, usando `127.0.0.1` y no `localhost`;
5. esperar health checks antes de Playwright;
6. ejecutar Playwright en proceso desacoplado;
7. escribir `started`, `completed`, `exitCode` y duración;
8. finalizar procesos en `finally` con `taskkill /PID ... /T /F`;
9. dejar puertos 11434, 11436 y 11437 libres.

No se acepta nuevamente “la shell expiró” sin demostrar que el proceso desacoplado fue terminado externamente.

## Diagnóstico E2E

Antes de modificar código, ejecutar y documentar:

### A. Focal standalone
- `ai-advisor.spec.ts` Run 1;
- Run 2 consecutivo con los mismos servidores;
- `workers=1`, `retries=0`.

La configuración efectiva del proveedor debe ser idéntica en ambos runs. Si aparece “Ollama not configured”, corregir el runner, no el producto.

### B. Contaminación de orden
Ejecutar en una misma campaña:
1. `month-close.spec.ts`;
2. `ai-advisor.spec.ts`.

Capturar por test:
- URL y sección activa antes/después;
- localStorage/sessionStorage relevantes;
- requests y responses;
- consola y `requestfailed`;
- cantidad de elementos que coinciden con el selector fallido;
- diálogos, overlays y modales abiertos;
- IDs de datos creados y cleanup ejecutado;
- conteos DB mínimos asociados al test.

Crear `R2-ROOT-CAUSE.json` clasificando cada fallo como:
- configuración del runner;
- precondición/cleanup ausente;
- selector no aislado;
- estado global del frontend;
- duplicación real de DOM/producto;
- defecto funcional real.

## Reglas de corrección

- Cada test debe crear datos únicos y limpiar únicamente sus propios datos.
- Cada test debe navegar explícitamente a su sección; no depender del estado dejado por el test anterior.
- Cerrar modales/overlays y restaurar almacenamiento sólo mediante helpers explícitos.
- No usar `.first()`, `.last()` o `nth()` para esconder duplicados, salvo que el DOM permita legítimamente una colección y el selector esté anclado a un contenedor único.
- Si dos elementos equivalentes existen por un defecto real del producto, corregir el componente.
- Si `ai-advisor-section` no es visible porque la prueba quedó en otra sección, corregir navegación/precondición del test o el router según evidencia.
- No reiniciar servidores entre Focal Run 1 y Run 2.
- No relajar asserts, no aumentar timeouts y no usar retries de Playwright.

## Gates obligatorios

### Backend candidate
- focal AI Advisor 32/32 PASS;
- suite completa 175/175 PASS;
- build PASS.

### API real
Entregar `API-REAL-5.json` sincronizado y verificable. Puede reutilizarse la ejecución R1 sólo si el archivo original, timings, fingerprints y respuestas sanitizadas están disponibles y sus hashes son verificables. En caso contrario, repetir 5/5.

PASS: 5/5 HTTP 201, <=120 s por request lógica, fingerprint/citas válidos y cero duplicados.

### UI focal
- Run 1: 2/2 PASS;
- Run 2 consecutivo: 2/2 PASS;
- camino 422 visible y retry manual PASS;
- una sola request HTTP por submit.

### Orden
- `month-close.spec.ts` + `ai-advisor.spec.ts`: 4/4 PASS;
- sin reinicio de servidores;
- cleanup y navegación demostrados.

### Frontend
- typecheck PASS;
- lint PASS; sólo warnings baseline idénticos;
- build PASS.

### Playwright completo
- Chromium;
- `workers=1`;
- `retries=0`;
- ejecución completa, no parcial ni proyectada;
- cero skips agregados;
- `candidateNewFailures = 0`;
- `baselinePassedCandidateFailed = 0`.

Los fallos comunes baseline/candidate ajenos a este vertical pueden registrarse como deuda sólo si son exactamente idénticos y la secuencia focal/orden de este vertical está 100% PASS.

## Promoción

Sólo después de todos los gates PASS:
1. generar `PROMOTION-PLAN.json` con archivos y hashes before/after;
2. promover atómicamente únicamente los archivos backend R1 y frontend R2 realmente modificados;
3. no promover artifacts, logs ni helpers externos al repo;
4. sobre canonical ejecutar:
   - backend build;
   - focal backend AI Advisor;
   - frontend typecheck y build;
   - API real 2/2;
   - focal UI 2/2;
5. comprobar package.json/package-lock sin cambios;
6. restaurar SQLite al hash inicial;
7. detener procesos y liberar puertos.

`PROMOTION.json` sólo puede decir PASS después de comprobar que los archivos canónicos tienen los hashes candidate esperados.

## Evidencia obligatoria

La carpeta R2 debe contener al menos:
- `00-verdict.md`
- `00-preflight.txt`
- `CARRY-FORWARD-MANIFEST.json`
- `AUTHORIZED-FILES-HASHES.json`
- `R2-ROOT-CAUSE.json`
- `E2E-RUN-STATUS.json`
- `API-REAL-5.json`
- `FOCAL-RUN-1.json`
- `FOCAL-RUN-2.json`
- `ORDER-CONTAMINATION-RUN.json`
- `BASELINE-FULL-SUITE.json`
- `CANDIDATE-FULL-SUITE.json`
- `COMPARISON.json`
- `AI-STABILITY-GATES.json`
- logs backend/frontend/Playwright sanitizados
- hashes SQLite inicial/final
- `PROMOTION-PLAN.json`
- `PROMOTION.json` sólo en PASS.

No considerar evidencia entregada hasta verificar que todos los archivos están sincronizados en Dropbox.

Checklist final: `TOTAL_TASKS=20`, con DONE/PENDING/BLOCKED explícitos.

No abrir otro vertical.
