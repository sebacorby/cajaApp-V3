# APP-AI-UX-STABILITY-001 — BACKEND CONTRACT v1.0.3

Estado: ACTIVA. Es el único vertical activo. No abrir `APP-FINAL-CLOSURE`.

## Entorno obligatorio

- Root canónico: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`
- Node: `I:\Tools\node-v24.18.0-win-x64\node.exe`
- Evidencia: `architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3/`

## Canonical limpio confirmado por el arquitecto

- `workspace/frontend/src/lib/finance/ai-advisor-api.ts` restaurado al contenido previo: Dropbox content hash `fa5efc9ee54eb6dbcad82d88517b8c06142ca44744acc3d51264ee26a1c4cfff`.
- `workspace/frontend/tests/diagnostic.spec.ts` no debe existir en el workspace.
- `package.json`: `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`.
- `package-lock.json`: `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`.

## Motivo

v1.0.2 demostró que el backend puede responder `422 AI_ADVISOR_UNGROUNDED_NUMBER` cuando el modelo incluye cifras no respaldadas. El retry oculto en frontend fue rechazado: no estabiliza la API directa, genera varias requests lógicas desde el cliente y quedó fuera del alcance autorizado.

El contrato correcto es:
1. la UI envía una sola request lógica por submit;
2. el backend controla intentos internos acotados del proveedor;
3. la validación de grounding nunca se relaja;
4. si se agotan los intentos, el backend devuelve error estructurado y la UI lo muestra con retry manual.

## Archivos autorizados

Sólo estos archivos pueden cambiar, y únicamente si son necesarios:

- `workspace/backend/src/modules/ai-advisor/ai-advisor.service.ts`
- `workspace/backend/src/modules/ai-advisor/ai-advisor.controller.ts`
- `workspace/backend/src/modules/ai/ollama.client.ts`
- `workspace/backend/src/modules/ai/ollama-native.client.ts`
- `workspace/backend/tests/ai-advisor/ai-advisor.service.test.ts`
- `workspace/frontend/src/lib/finance/ai-advisor-api.ts`
- `workspace/frontend/src/components/finance/sections/asesor-ia-section.tsx`
- `workspace/frontend/src/components/finance/sections/asesor-ia-section.legacy.tsx`
- `workspace/frontend/tests/ai-advisor.spec.ts`

Prohibido modificar package files, dependencias, `.env`, Prisma schema, migraciones, SQLite, prompts Markdown, schemas JSON, timeouts globales, otros tests o archivos fuera de esta lista.

## Regla de staging

No implementar directamente sobre canonical.

Crear:
- `%LOCALAPPDATA%\CajaApp\validation\APP-AI-UX-STABILITY-001-v1.0.3\baseline`
- `%LOCALAPPDATA%\CajaApp\validation\APP-AI-UX-STABILITY-001-v1.0.3\candidate`

Copiar desde canonical excluyendo `node_modules`, `.next`, `dist`, `coverage`, `test-results`, `playwright-report` y `architecture-handoff`. Verificar que baseline y candidate comienzan con hashes idénticos y que no contienen `diagnostic.spec.ts`.

Canonical no se modifica hasta que todos los gates den PASS.

## Implementación backend obligatoria

Implementar un único request lógico con máximo **3 intentos totales** al proveedor.

Sólo reintentar automáticamente cuando la respuesta del proveedor fue recibida pero rechazada por validación recuperable, concretamente `AI_ADVISOR_UNGROUNDED_NUMBER`. No reintentar errores de autenticación, configuración, red no recuperable, request inválida ni errores internos desconocidos.

Cada reintento debe:
- conservar exactamente rango, moneda, modo, pregunta, fuentes y fingerprint;
- incluir feedback mínimo derivado del error anterior para indicar que elimine o corrija valores no presentes en las fuentes;
- mantener la validación estricta existente;
- generar su propio `providerRequestId`/attempt ID;
- respetar un presupuesto total de la request lógica de máximo 120 segundos;
- no usar sleeps arbitrarios.

Persistencia:
- no persistir respuestas rechazadas como interacciones válidas;
- no duplicar la interacción lógica;
- persistir una sola interacción cuando un intento termina válido;
- si los 3 intentos fallan, devolver `422` con cuerpo sanitizado que incluya `code`, `message`, `recoverable: true`, `attemptCount` y `correlationId`;
- nunca exponer prompt completo, respuesta cruda ni secretos.

No se permite borrar silenciosamente claims, inventar cifras, redondear para hacer coincidir fuentes ni desactivar el validador.

## Contrato frontend obligatorio

- Una sola llamada HTTP por acción del usuario. El frontend no hace reintentos ocultos.
- Loading termina siempre en success, error o timeout.
- Timeout cliente máximo 120 segundos con abort de la request.
- El `422` estructurado debe mostrarse como error visible y recuperable.
- El botón retry crea una nueva request sólo por acción explícita del usuario.
- Una respuesta tardía/abortada no puede reemplazar una interacción posterior.
- Deben mantenerse fingerprint, claims, citas, desktop y mobile.

## Pruebas backend determinísticas

Extender `ai-advisor.service.test.ts` para probar como mínimo:
1. intento 1 inválido por número no fundamentado, intento 2 válido: una interacción persistida y resultado success;
2. tres intentos inválidos: 422 estructurado, cero interacción válida persistida;
3. error no recuperable: un solo intento;
4. mismo fingerprint y mismas fuentes en todos los intentos;
5. attempt IDs distintos y una sola correlation ID lógica;
6. no más de 3 intentos;
7. no se relaja el validador.

## Validación real focal

Con Ollama Cloud real:

### API
Ejecutar 5 requests consecutivas por `/api/ai-advisor/ask`, incluyendo la pregunta que falló en v1.0.2.

PASS:
- 5/5 HTTP 201;
- schema, fingerprint, claims y citas válidos;
- cada request lógica <= 120 s;
- attemptCount entre 1 y 3;
- cero interacciones duplicadas;
- cero 422 en este bloque de estabilidad.

### UI
Ejecutar `tests/ai-advisor.spec.ts` con Chromium, `workers=1`, `retries=0`:
- Run 1 PASS;
- Run 2 consecutivo PASS sin reiniciar;
- `month-close.spec.ts` seguido del focal PASS;
- error 422 controlado visible y retry manual funcional; se puede interceptar únicamente el camino de error, nunca el éxito real.

## Gates baseline y candidate

Ejecutar los mismos gates, de forma independiente y con SQLite restaurada al mismo hash inicial.

Backend:
- `npm ci`
- Prisma generate
- migrate status
- build
- test focal de AI Advisor
- suite backend completa

Frontend:
- `npm ci`
- typecheck
- lint
- build

Playwright completo:
- Chromium
- `workers=1`
- `retries=0`
- excluir únicamente artefactos diagnósticos externos; no debe existir ningún test temporal dentro de `tests/`.

Crear `BASELINE-FULL-SUITE.json`, `CANDIDATE-FULL-SUITE.json` y `COMPARISON.json`.

La cantidad histórica `40/42` ya no es gate porque la suite cambió. PASS exige:
- `candidateNewFailures = 0`;
- `baselinePassedCandidateFailed = 0`;
- el test API directo de AI Advisor pasa en candidate;
- los focales AI pasan;
- resultados completos y parseables;
- cero skips y retries;
- fallos comunes baseline/candidate pueden registrarse como deuda preexistente y no bloquean este vertical si son idénticos y no impiden calcular la comparación.

## Promoción

Sólo después de PASS:
- copiar atómicamente desde candidate a canonical únicamente los archivos autorizados realmente modificados;
- verificar SHA-256 before/after reales;
- ejecutar build backend, typecheck frontend y un smoke API/UI ya sobre canonical;
- package hashes deben permanecer intactos.

En FAIL/BLOCKED:
- no promover ningún archivo;
- canonical debe seguir con hashes iniciales;
- restaurar SQLite;
- detener procesos y dejar 11434, 11436 y 11437 libres.

## Evidencia mínima

Incluir:
- `00-verdict.md`
- `00-preflight.txt`
- `AUTHORIZED-FILES-HASHES.json`
- `BACKEND-RETRY-MATRIX.json`
- `API-REAL-5.json`
- `FOCAL-RUN-1.json`
- `FOCAL-RUN-2.json`
- `ORDER-CONTAMINATION-RUN.json`
- `BASELINE-FULL-SUITE.json`
- `CANDIDATE-FULL-SUITE.json`
- `COMPARISON.json`
- `AI-STABILITY-GATES.json`
- logs backend/frontend sanitizados
- hashes SQLite inicial/final
- `PROMOTION.json` sólo en PASS.

Checklist final: `TOTAL_TASKS=22`, `DONE=<n>`, `PENDING=<n>`, `BLOCKED=<n>`.

No abrir otro vertical.