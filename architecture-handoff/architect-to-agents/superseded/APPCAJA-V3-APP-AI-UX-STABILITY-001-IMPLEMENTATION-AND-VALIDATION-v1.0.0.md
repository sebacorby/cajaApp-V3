# APP-AI-UX-STABILITY-001 — IMPLEMENTACIÓN Y VALIDACIÓN v1.0.0

Estado: ACTIVA.
Vertical único activo: `APP-AI-UX-STABILITY-001`.
Root canónico Dropbox: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`.
Entorno obligatorio: Windows x64, Node `I:\Tools\node-v24.18.0-win-x64\node.exe` (`v24.18.0`).

## 1. Objetivo

Cerrar la estabilidad end-to-end del Asesor IA usando el proveedor remoto real de Ollama Cloud.

La UI ya tiene estados loading, error y retry aceptados mediante fixture controlada. Este vertical debe demostrar que el flujo real:

- no queda colgado ni mantiene spinner indefinido;
- no se contamina entre ejecuciones ni por el orden de la suite;
- entrega respuesta visible y utilizable tanto en desktop como mobile;
- conserva fingerprint, fuentes y guardrails del contexto financiero;
- falla de forma recuperable cuando el proveedor no responde dentro del contrato;
- no introduce regresiones fuera del Asesor IA.

## 2. Baseline autoritativo

`APP-SEC-DEPS-001 v1.0.3-R1` está aceptado.

Hashes canónicos vigentes:

- `workspace/frontend/package.json`: `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`.
- `workspace/frontend/package-lock.json`: `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`.

Suite Playwright de referencia tras Seguridad:

- 40 tests PASS;
- 2 fallos preexistentes y separados de Recibos de sueldo:
  - `tests/salary-receipts.real.spec.ts:22:5`;
  - `tests/salary-receipts.spec.ts:62:5`.

Estos dos fallos no deben empeorar ni multiplicarse.

## 3. Historial técnico que debe tomarse en cuenta

La campaña histórica de IA confirmó:

- API directa real: 3/3 HTTP 201, fingerprint coincidente, aproximadamente 9–21 segundos;
- test API/fingerprint: PASS;
- test UI: podía pasar aislado, pero fallaba dentro de la suite esperando `ai-advisor-response` durante más de 180–240 segundos;
- el defecto era específico del flujo UI, timing o contaminación, no del proveedor directo;
- la UI de error/retry ya fue aceptada posteriormente mediante fixture, pero el proveedor remoto no fue revalidado.

No reutilizar evidencias anteriores como PASS.

## 4. Alcance autorizado

Se permite inspeccionar todo el código necesario, pero únicamente pueden modificarse estos archivos:

- `workspace/frontend/src/components/finance/sections/asesor-ia-section.tsx`;
- `workspace/frontend/src/components/finance/sections/asesor-ia-section.legacy.tsx`;
- `workspace/frontend/tests/ai-advisor.spec.ts`;
- `workspace/backend/src/modules/ai-advisor/ai-advisor.service.ts`;
- `workspace/backend/src/modules/ai-advisor/ai-advisor.controller.ts`;
- `workspace/backend/src/modules/ai/ollama.client.ts`;
- `workspace/backend/src/modules/ai/ollama-native.client.ts`.

Sólo modificar los archivos estrictamente necesarios. No crear wrappers de ejecución.

Prohibido modificar:

- `package.json`, `package-lock.json` o dependencias;
- prompts, schemas o contratos JSON salvo que el defecto demuestre de forma inequívoca que el contrato vigente es inválido; en ese caso declarar BLOCKED y entregar diagnóstico, sin cambiarlo;
- Prisma, migraciones, SQLite, `.env` o secretos;
- otros componentes, rutas o tests;
- los dos tests preexistentes de Recibos de sueldo;
- archivos `.legacy` distintos del Asesor IA.

## 5. Preflight obligatorio

Antes de modificar:

1. Confirmar root y Node exactos.
2. Confirmar los dos hashes package vigentes.
3. Guardar SHA-256 de cada archivo autorizado existente.
4. Guardar SHA-256 inicial de `workspace/backend/prisma/dev.db` y crear backup.
5. Confirmar puertos 11436 y 11437 libres.
6. Confirmar que el proveedor remoto y las credenciales configuradas responden sin exponer secretos.
7. Ejecutar baseline focal actual antes de implementar:
   - API/fingerprint del Asesor;
   - UI desktop y mobile;
   - registrar tiempo y punto exacto de cualquier espera.

Si faltan credenciales reales o el proveedor no puede ser alcanzado después de una comprobación directa razonable: `BLOCKED`, no simular PASS.

## 6. Diagnóstico y corrección

Instrumentar temporalmente sólo mediante logs de evidencia o capacidades ya existentes. No dejar logs de depuración permanentes.

Determinar por separado:

- duración del armado del contexto financiero;
- duración de la llamada al proveedor;
- duración entre respuesta backend y render UI;
- identidad/fingerprint de la solicitud y respuesta;
- estado de la mutación o request en el frontend;
- cleanup del estado al navegar, reintentar o iniciar una segunda consulta;
- si existe request duplicado, polling sin término, stale state, cache contaminada, race condition o selector equivocado.

La solución debe:

- conservar una única solicitud lógica por envío;
- finalizar siempre loading en success o error;
- impedir que una respuesta tardía de una solicitud anterior pise la consulta vigente;
- permitir una consulta nueva después de navegar o reintentar;
- preservar respuesta, fuentes y fingerprint correspondientes a la misma consulta;
- no ocultar errores reales con timeouts artificialmente enormes;
- no convertir el test en un mock del proveedor.

## 7. Validación del proveedor real

Ejecutar cinco consultas consecutivas mediante API real. Usar preguntas financieras distintas y válidas, respetando pausas razonables por rate limit.

Cada consulta debe registrar:

- timestamp inicial/final;
- HTTP 201;
- duración total;
- intentos;
- fingerprint enviado y devuelto;
- cantidad y nombres de fuentes/citas;
- ausencia de datos inventados o referencias a fuentes inexistentes;
- resultado de validación del schema.

Gate:

- 5/5 HTTP 201;
- 5/5 schema válido;
- 5/5 fingerprint coincidente;
- 5/5 con fuentes/citas válidas cuando la respuesta formule afirmaciones financieras;
- ninguna consulta supera 180 segundos;
- cero solicitudes huérfanas o duplicadas.

## 8. Playwright focal real

Actualizar o corregir `tests/ai-advisor.spec.ts` sin reducir cobertura.

Debe contener y ejecutar como mínimo:

### A. API y fingerprint

- crear o usar contexto financiero controlado;
- enviar consulta real;
- comprobar HTTP 201;
- comprobar fingerprint;
- comprobar respuesta estructurada y fuentes.

### B. UI desktop

- ingresar al Asesor IA;
- enviar consulta real desde la UI;
- comprobar loading visible y luego finalizado;
- comprobar respuesta, fuentes y ausencia de spinner;
- enviar una segunda consulta en la misma sesión;
- comprobar que la segunda respuesta corresponde a la segunda pregunta.

### C. UI mobile

- viewport mobile;
- enviar consulta real;
- comprobar respuesta y legibilidad;
- comprobar que navegación y estado no bloquean la siguiente consulta.

### D. Aislamiento y contaminación

- ejecutar el focal dos veces consecutivas, mismo proceso de suite, `--workers=1 --retries=0`;
- ejecutar además el test después de otro spec que use backend y SQLite;
- cero dependencias del orden de ejecución;
- cero datos residuales visibles entre casos.

Comando nativo obligatorio, sin scripts auxiliares:

`npx playwright test tests/ai-advisor.spec.ts --project=chromium --workers=1 --retries=0`

Debe ejecutarse dos veces y ambas deben ser PASS completo.

## 9. Gates estáticos y runtime

Backend:

- `npm ci`;
- Prisma generate y migrate status sin mutar schema;
- build;
- tests focales y suite backend vigente.

Frontend:

- `npm ci`;
- `npm run typecheck`;
- `npm run lint`;
- `npm run build`.

Runtime:

- backend real en 11436;
- frontend real en 11437;
- Ollama Cloud real;
- no mocks para el gate de éxito remoto.

## 10. Suite completa y comparación

Después del focal PASS, ejecutar Playwright completo en Chromium, `--workers=1 --retries=0`, sin filtros ni skips añadidos.

Crear:

- `BASELINE-AI-RESULT.json`;
- `CANDIDATE-AI-RESULT.json`;
- `FULL-SUITE-RESULT.json`;
- `AI-TIMING-SUMMARY.json`;
- `AI-STABILITY-GATES.json`.

PASS requiere:

- focal Asesor IA completo PASS en dos ejecuciones consecutivas;
- proveedor real 5/5 PASS;
- cero skips y retries;
- cero timeout o spinner indefinido;
- cero fallos nuevos respecto del baseline canónico;
- suite completa con al menos 40/42 y únicamente los dos fallos conocidos de Recibos, salvo que alguno mejore;
- ningún test que pasaba antes puede fallar después;
- typecheck, lint, build y backend gates PASS;
- package files sin cambios y hashes idénticos al baseline de Seguridad.

## 11. Política ante PASS o FAIL

### PASS

- conservar únicamente los cambios estrictamente necesarios en los archivos autorizados;
- registrar hashes before/after;
- no promover ni tocar package files;
- entregar evidencia completa.

### FAIL

- restaurar los archivos autorizados a sus hashes iniciales, salvo que la instrucción haya producido una corrección técnicamente demostrada pero exista un bloqueo externo; en ese caso declarar BLOCKED y explicar qué cambio queda sin promover;
- no dejar cambios parciales;
- no abrir otro vertical.

## 12. Cleanup

- detener sólo procesos iniciados por la campaña;
- dejar 11436/11437 libres;
- restaurar SQLite al SHA-256 inicial exacto;
- eliminar datos UAT creados;
- retirar logs de depuración temporales;
- confirmar package hashes intactos.

## 13. Evidencia

Entregar en:

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.0/`

Incluir como mínimo:

- `00-verdict.md`;
- environment y preflight;
- hashes iniciales/finales;
- diagnóstico por etapa;
- cinco respuestas reales sanitizadas con timing/fingerprint/fuentes;
- backend gates;
- frontend gates;
- dos ejecuciones focales completas;
- suite completa;
- manifests JSON requeridos;
- cleanup, puertos, SQLite y package hashes finales;
- inventario de evidencia.

No incluir secretos, tokens ni contenido sensible completo.

Veredicto permitido: PASS, FAIL o BLOCKED.

No abrir `APP-FINAL-CLOSURE` ni otro vertical hasta aceptación arquitectónica.

## 14. Checklist final

Reportar:

- `TOTAL_TASKS=18`
- `DONE=<n>`
- `PENDING=<n>`
- `BLOCKED=<n>`

Las 18 tareas son: preflight, hashes, SQLite backup, baseline API, baseline UI, diagnóstico, corrección mínima, backend gates, frontend gates, API real 5/5, focal API, focal desktop, focal mobile, aislamiento x2, full suite, comparación, cleanup, evidencia/veredicto.
