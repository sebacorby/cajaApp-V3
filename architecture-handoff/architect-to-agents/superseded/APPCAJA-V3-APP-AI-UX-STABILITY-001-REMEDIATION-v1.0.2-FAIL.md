# APP-AI-UX-STABILITY-001 — REMEDIACIÓN v1.0.2

Estado: ACTIVA. Único vertical activo. No ejecutar nuevamente v1.0.1 ni abrir APP-FINAL-CLOSURE.

Root: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`
Node: `I:\Tools\node-v24.18.0-win-x64\node.exe`

## Baseline reutilizable

v1.0.1 ya demostró: proveedor remoto PASS, API 5/5 PASS, focal consecutivo Run 1 y Run 2 PASS, package hashes y SQLite intactos. No repetir esos bloques completos. Ejecutar sólo smoke real posterior a la corrección.

Hashes inmutables:
- package.json `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`
- package-lock.json `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`

## Defecto confirmado

La UI del Asesor IA puede permanecer sin respuesta visible ni error recuperable hasta superar 180 s. Ocurrió después de month-close y también en una ejecución aislada. No atribuirlo a SQLite, Prisma o month-close sin error, stack y timestamps concretos.

## Archivos autorizados

Sólo si el diagnóstico lo exige:
- `workspace/frontend/src/components/finance/sections/asesor-ia-section.tsx`
- `workspace/frontend/src/components/finance/sections/asesor-ia-section.legacy.tsx`
- `workspace/frontend/tests/ai-advisor.spec.ts`
- `workspace/backend/src/modules/ai-advisor/ai-advisor.service.ts`
- `workspace/backend/src/modules/ai-advisor/ai-advisor.controller.ts`
- `workspace/backend/src/modules/ai/ollama.client.ts`
- `workspace/backend/src/modules/ai/ollama-native.client.ts`

Prohibido tocar package files, dependencias, `.env`, Prisma, migraciones, SQLite, prompts, schemas, otros tests o timeouts globales.

## Diagnóstico antes de modificar

Con backend/frontend recién iniciados, ejecutar una consulta UI real y correlacionar:
- submit y cantidad de POST `/api/ai-advisor/ask`;
- request, response, requestfailed, status y body sanitizado;
- controller, contexto, proveedor, providerRequestId y respuesta backend;
- transición frontend idle/loading/success/error;
- render final.

Crear `TERMINAL-STATE-DIAGNOSTIC.json` y clasificar: request no enviada, backend no recibido, contexto detenido, proveedor detenido, error HTTP no renderizado, éxito HTTP no renderizado, estado frontend stale, setup/selector o success.

## Corrección mínima

Debe garantizar:
- una sola solicitud lógica por submit;
- loading siempre termina;
- límite cliente máximo 120 s;
- al vencer, mostrar error recuperable;
- una respuesta tardía no pisa una consulta posterior;
- segunda consulta, navegación y retry funcionan;
- fingerprint, claims y citas pertenecen a la interacción correcta;
- cleanup sólo después del estado terminal.

No aumentar timeout Playwright ni agregar retries generales.

## Validación focal

`npx playwright test tests/ai-advisor.spec.ts --project=chromium --workers=1 --retries=0`

El spec debe validar:
1. éxito real UI, una request y fin de loading antes de 120 s;
2. segunda consulta en la misma sesión sin estado stale;
3. error controlado visible y retry funcional, sin mockear el éxito real;
4. mobile legible y operable.

Ejecutar y exigir PASS:
- focal Run 1;
- focal Run 2 consecutivo sin reiniciar;
- month-close seguido del focal, workers=1;
- pausa real de 60 s y focal aislado nuevamente.

## Smoke y gates

Después del cambio: una consulta API real y una UI real, ambas antes de 120 s y con fingerprint válido.

Backend: npm ci, Prisma generate, migrate status, build y tests vigentes.
Frontend: npm ci, typecheck, lint y build.
Luego Playwright completo Chromium, workers=1, retries=0.

PASS: mínimo 40/42, cero fallos nuevos, sólo pueden permanecer los dos fallos conocidos de salary receipts, package hashes intactos.

## Evidencia

Entregar en:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.2/`

Incluir: verdict, preflight, diagnóstico terminal, cambio aplicado, smoke real, cuatro ejecuciones focales, suite completa, gates, runtime logs correlacionados, hashes y cleanup.

FAIL: restaurar archivos y SQLite. Siempre dejar puertos 11436/11437 libres y no abrir otro vertical.
