# APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.11

**Estado:** ISSUED / AUTORIZADA  
**Proyecto:** CajaApp V3  
**Fecha:** 2026-07-15  
**Root canónico, operativo y único:** `I:\cajaApp-V3`  
**Entorno obligatorio:** Windows x64 + Node.js exacto `v24.18.0`

---

## 1. Regla operativa nueva y definitiva

A partir de esta campaña existe **una sola carpeta de trabajo**:

```text
I:\cajaApp-V3
```

Esta ruta es simultáneamente:

- repo canónico;
- workspace operativo;
- carpeta sincronizada con Google Drive;
- fuente única de verdad del código;
- ubicación de instrucciones;
- ubicación de entregas;
- ubicación de evidencias;
- raíz desde la cual se ejecutan builds, tests, Prisma, Playwright y scripts de arranque.

Queda eliminado del flujo:

```text
I:\cajaApp-V3-real
```

Está prohibido:

- leer o escribir código en `I:\cajaApp-V3-real`;
- copiar archivos entre roots;
- reconstruir un workspace paralelo;
- crear clones, worktrees, copias temporales o espejos del proyecto;
- materializar entregas desde otra carpeta;
- ejecutar gates fuera de `I:\cajaApp-V3`.

Si cualquier comando, proceso o archivo apunta a una raíz distinta, detener la tarea y declarar `BLOCKED` con evidencia.

---

## 2. Política obligatoria de `node_modules`

Las carpetas `node_modules` son **artefactos efímeros y regenerables**. No forman parte del código canónico ni de la evidencia.

Rutas involucradas:

```text
I:\cajaApp-V3\workspace\backend\node_modules
I:\cajaApp-V3\workspace\frontend\node_modules
```

### 2.1 Inicio de cada campaña

Antes de ejecutar cualquier build o test:

1. confirmar que los `package-lock.json` existen;
2. registrar el SHA-256 de ambos lockfiles;
3. eliminar cualquier `node_modules` preexistente;
4. ejecutar `npm ci` por separado en backend y frontend;
5. no usar `npm install`;
6. no modificar dependencias ni lockfiles;
7. no copiar `node_modules` desde otra ubicación;
8. no reutilizar cachés locales como sustituto de `npm ci`.

### 2.2 Durante la campaña

- `node_modules` puede existir únicamente mientras se ejecutan los gates.
- Debe excluirse de inventarios, hashes, ZIPs y evidencia.
- No debe considerarse modificación del repo.
- No debe agregarse a ninguna entrega.
- No debe inspeccionarse como fuente de código salvo para diagnosticar un error técnico concreto.
- No crear scripts para moverlo fuera del proyecto.
- No crear enlaces simbólicos, junctions o rutas alternativas.
- La instalación debe ser reproducible exclusivamente desde `package.json` y `package-lock.json`.

### 2.3 Cierre de la campaña

Después de completar todos los gates y detener CajaApp:

1. verificar nuevamente que ambos lockfiles conservan su hash inicial;
2. eliminar:
   - `workspace\backend\node_modules`;
   - `workspace\frontend\node_modules`;
3. confirmar que ambas carpetas ya no existen;
4. registrar esta limpieza en `31-cleanup.json`;
5. no borrar los lockfiles;
6. no borrar evidencia, código fuente ni SQLite.

Cada nueva campaña volverá a generar `node_modules` desde cero mediante `npm ci`.

---

## 3. Antecedentes y estado previo

`APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.9` queda cerrada como **FAIL técnico**.

La instrucción local `v1.0.10` nunca fue publicada como campaña vigente y queda anulada.

Esta `v1.0.11` es la única instrucción activa.

### 3.1 Cambios aceptados provisionalmente de v1.0.9

Deben conservarse sin reinterpretarlos:

- payload específico del Asesor IA;
- `citationCatalog`;
- `allowedSourceIds`;
- exclusión de `summary` como fuente citable;
- guardrails estrictos;
- máximo de dos invocaciones al proveedor;
- trazabilidad de intentos;
- scroll vertical del sidebar en `app-shell.tsx`;
- correcciones Playwright de categorías, gráficos, CSV débito, PDF, deuda futura, búsqueda global y sidebar;
- tests backend y frontend ya implementados.

### 3.2 Motivo principal pendiente

El segundo intento del Asesor IA recibe errores, pero no recibe la respuesta anterior rechazada.

Por lo tanto, actualmente no puede corregir realmente el output previo. Genera otra respuesta completa orientada por errores, aunque el prompt le exige conservar el contenido válido de una salida que no puede ver.

La remediación debe convertir el segundo intento en una **reparación real y trazable**.

---

## 4. Objetivo único

Corregir exclusivamente el flujo de reparación del Asesor IA y ejecutar una validación consolidada completa desde:

```text
I:\cajaApp-V3
```

No abrir nuevos verticales.

No volver a modificar sidebar, categorías, gráficos, CSV, PDF, deuda futura ni búsqueda global. Esos cambios quedan congelados y sólo deben validarse con la suite completa.

---

## 5. Gobierno y restricciones

1. Trabajar únicamente en `I:\cajaApp-V3`.
2. No crear otra raíz de ejecución.
3. No copiar el workspace.
4. No crear scripts auxiliares, wrappers o runners alternativos.
5. Usar los scripts autoritativos existentes.
6. Usar Playwright CLI.
7. No cambiar dependencias.
8. No cambiar lockfiles.
9. No cambiar Prisma ni migraciones.
10. No cambiar fórmulas financieras.
11. No cambiar contratos de movimientos, presupuestos, objetivos ni deuda.
12. No cambiar modelo, provider, endpoint Ollama ni credenciales.
13. No debilitar guardrails.
14. No mapear silenciosamente IDs inválidos.
15. No aceptar respuestas parciales.
16. No inventar citas desde el backend.
17. No ejecutar un tercer intento al proveedor.
18. No usar `force: true`.
19. No usar retries para ocultar inestabilidad.
20. No usar esperas arbitrarias.
21. No modificar archivos fuera del alcance.
22. Todo fallo debe quedar evidenciado.
23. Todo archivo de evidencia obligatorio debe existir y tener tamaño mayor que cero.
24. `node_modules` debe regenerarse al inicio y eliminarse al cierre.

---

## 6. Archivos autorizados

### 6.1 Código y contrato

- `workspace/backend/src/modules/ai-advisor/ai-advisor.service.ts`
- `workspace/backend/tests/ai-advisor/ai-advisor.service.test.ts`
- `contracts/prompts/advisor/01-explain-financial-context.md`

### 6.2 Playwright

- `workspace/frontend/tests/ai-advisor.spec.ts`

Sólo modificar este spec si hace falta ampliar evidencia o corregir sincronización real. No reducir validaciones existentes.

### 6.3 Archivos congelados

No modificar:

- `workspace/frontend/src/components/finance/layout/app-shell.tsx`
- `workspace/frontend/src/components/finance/layout/sidebar.tsx`
- `workspace/frontend/tests/sidebar-data-quality.spec.ts`
- `workspace/frontend/tests/categories.spec.ts`
- `workspace/frontend/tests/chart-parity.spec.ts`
- `workspace/frontend/tests/debit-csv-import.spec.ts`
- `workspace/frontend/tests/e2e/card-statement-import.spec.ts`
- `workspace/frontend/tests/e2e/deuda-futura/future.spec.ts`
- `workspace/frontend/tests/global-search.spec.ts`

Registrar sus hashes iniciales y finales. Deben ser idénticos.

---

## 7. Remediación requerida — reparación real

### 7.1 Contrato de reparación

Extender el contrato actual para incluir la respuesta anterior rechazada y errores estructurados.

Semántica mínima requerida:

```ts
type AiAdvisorRepairIssue = {
  code: string;
  message: string;
  path?: string;
  rejectedValues?: string[];
  sourceIds?: string[];
};

type AiAdvisorRepairInstructions = {
  attempt: 2;
  issues: AiAdvisorRepairIssue[];
  previousRejectedOutput: unknown;
};
```

Los nombres pueden variar únicamente si conservan exactamente esta capacidad.

### 7.2 `previousRejectedOutput`

Reglas:

1. Si la respuesta puede parsearse como JSON, reenviar el objeto parseado completo.
2. Si no puede parsearse:
   - reenviar el texto bruto como dato no confiable;
   - aplicar un límite explícito;
   - indicar si fue truncado;
   - no insertarlo dentro del system prompt.
3. No guardar secretos, headers, API keys, tokens ni paths privados.
4. No normalizar ni corregir previamente la salida.
5. El intento 2 debe recibir:
   - la misma pregunta;
   - el mismo período;
   - el mismo modo;
   - el mismo catálogo;
   - los mismos `allowedSourceIds`;
   - la salida rechazada;
   - los errores concretos.

### 7.3 Errores estructurados

Cuando sea técnicamente posible, incluir:

- código;
- path exacto;
- IDs inválidos;
- número no respaldado;
- fuentes citadas por el bloque afectado;
- issues de Zod con path;
- instrucción de eliminar el bloque si no puede sostenerse.

Ejemplo conceptual:

```json
{
  "code": "AI_ADVISOR_UNKNOWN_SOURCE",
  "path": "claims[0].sourceIds[0]",
  "rejectedValues": ["summary.currencies.ARS"]
}
```

```json
{
  "code": "AI_ADVISOR_UNGROUNDED_NUMBER",
  "path": "claims[1].text",
  "rejectedValues": ["100%"],
  "sourceIds": ["dashboard.ARS.actual"]
}
```

### 7.4 Segundo intento

El intento 2 debe:

1. usar `previousRejectedOutput` como borrador;
2. corregir sólo los issues informados;
3. devolver nuevamente el objeto JSON completo;
4. conservar campos válidos;
5. eliminar bloques insostenibles;
6. no agregar nuevos números;
7. volver a pasar por todos los validadores;
8. devolver 422 si también falla;
9. no ejecutar un tercer intento.

### 7.5 Persistencia

Persistir de forma sanitizada:

- request inicial;
- salida cruda inicial;
- issues del rechazo;
- request de reparación;
- salida cruda de reparación;
- resultado de cada validación;
- request ID;
- duración;
- código final.

La evidencia debe permitir reconstruir el flujo completo sin exponer secretos.

### 7.6 Prompt

Actualizar el prompt y subir versión, por ejemplo:

```text
advisor-prompt-v1.2.0
```

Debe declarar:

1. `previousRejectedOutput` es el borrador obligatorio.
2. No ignorar el borrador para generar una respuesta distinta.
3. Corregir únicamente los issues.
4. Reemplazar o eliminar IDs inválidos.
5. Eliminar números no respaldados o reescribir usando valores literales.
6. Corregir schema completo cuando corresponda.
7. No agregar números nuevos.
8. Eliminar claims o riesgos sin evidencia.
9. Mantener `schemaVersion`.
10. Responder exclusivamente JSON.
11. El resultado será validado nuevamente.

---

## 8. Pruebas backend obligatorias

Agregar o ajustar tests que demuestren:

1. El payload inicial no contiene `previousRejectedOutput`.
2. El payload de reparación contiene exactamente la salida rechazada.
3. JSON no parseable se reenvía como texto no confiable, limitado y marcado.
4. `summary.currencies.ARS` sigue siendo inválido.
5. Fuente inválida seguida de reparación válida termina exitosamente.
6. Número no respaldado seguido de reparación válida termina exitosamente.
7. Schema inválido produce issues con paths.
8. Dos respuestas inválidas terminan en 422.
9. El proveedor se invoca exactamente dos veces.
10. Nunca existe tercer intento.
11. Se persisten salida original y reparación.
12. No se guardan secretos.
13. No se modifican datos financieros.
14. Guardrails numéricos siguen estrictos.
15. Fechas ISO no generan falsos positivos.
16. Versión y hash del prompt corresponden al archivo final.

No eliminar tests existentes.

---

## 9. Preflight obligatorio

Ejecutar desde:

```text
I:\cajaApp-V3
```

Registrar:

1. `Resolve-Path I:\cajaApp-V3`;
2. Node `v24.18.0`;
3. npm y npx efectivos;
4. hashes, tamaños y MTime de archivos autorizados;
5. hashes de archivos congelados;
6. hashes de lockfiles;
7. estado de puertos;
8. procesos Node relacionados;
9. hash, tamaño y MTime de SQLite;
10. backup externo de SQLite.

Eliminar antes de instalar:

- backend `node_modules`;
- frontend `node_modules`;
- `dist`;
- `.next`;
- `coverage`;
- `playwright-report`;
- `test-results`.

No eliminar evidencia histórica.

---

## 10. Instalación reproducible

### Backend

Desde:

```text
I:\cajaApp-V3\workspace\backend
```

Ejecutar con Node `v24.18.0`:

```powershell
npm ci
npm run prisma:generate
npm run prisma:migrate:status
npm run build
npm test
```

Usar los scripts reales existentes si sus nombres difieren, dejando evidencia del comando efectivo.

### Frontend

Desde:

```text
I:\cajaApp-V3\workspace\frontend
```

Ejecutar:

```powershell
npm ci
npm run typecheck
npm run lint
npm run build
```

No usar instalación compartida entre backend y frontend.

---

## 11. Validación real del Asesor IA

Levantar CajaApp desde `I:\cajaApp-V3` mediante los scripts autoritativos existentes.

Crear contexto UAT controlado mediante APIs existentes.

Ejecutar las primeras **cinco consultas consecutivas** con la misma pregunta:

> Explicá el balance realizado y esperado usando sólo fuentes de CajaApp.

Para cada ejecución registrar:

- timestamp;
- HTTP status;
- body sanitizado;
- interaction ID;
- fingerprint;
- provider request ID;
- cantidad de intentos;
- outcome de cada intento;
- errores y paths;
- IDs citados;
- validación de que todos los `sourceIds` existen en citations.

### Gate

```text
5 de 5 consultas consecutivas deben devolver HTTP 201
```

No descartar fallos ni repetir selectivamente hasta reunir cinco éxitos.

---

## 12. Playwright focal

Ejecutar dos veces consecutivas:

```powershell
& "I:\Tools\node-v24.18.0-win-x64\npx.cmd" playwright test tests/ai-advisor.spec.ts `
  --project=chromium `
  --workers=1 `
  --retries=0 `
  --trace=on
```

Root:

```text
I:\cajaApp-V3\workspace\frontend
```

### Gate

```text
2 de 2 ejecuciones PASS
```

Conservar:

- contexto;
- fingerprint;
- HTTP 201;
- claims;
- citas;
- UI desktop;
- UI mobile;
- cleanup.

---

## 13. Playwright completo

Sólo después de validar el endpoint y el spec focal:

```powershell
& "I:\Tools\node-v24.18.0-win-x64\npx.cmd" playwright test `
  --project=chromium `
  --workers=1 `
  --retries=0 `
  --trace=on
```

### Gate

Todos los tests deben terminar PASS.

No modificar código durante esta fase.

Preservar logs, reportes, traces, screenshots y videos.

---

## 14. Protección SQLite

Base activa:

```text
I:\cajaApp-V3\workspace\backend\prisma\dev.db
```

Antes de pruebas:

- SHA-256;
- tamaño;
- MTime;
- backup fuera de `I:\cajaApp-V3`;
- hash del backup.

Al cierre:

1. detener frontend y backend;
2. restaurar backup;
3. verificar hash idéntico;
4. verificar tamaño idéntico;
5. confirmar puertos libres;
6. confirmar cero procesos Node de CajaApp;
7. generar comprobantes no vacíos.

---

## 15. Evidencia obligatoria

Crear:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.11
```

Debe contener:

- `00-verdict.md`
- `01-environment.md`
- `02-integrity-preflight.md`
- `03-file-inventory-initial.txt`
- `04-change-summary.md`
- `05-root-and-node-modules-policy.md`
- `06-final-file-inventory.txt`
- `07-final-hashes.txt`
- `08-lockfile-comparison.md`
- `09-frozen-files-comparison.md`
- `10-ai-advisor-unit-tests.log`
- `11-backend-npm-ci.log`
- `12-backend-prisma-generate.log`
- `13-backend-prisma-status.log`
- `14-backend-build.log`
- `15-backend-full-tests.log`
- `16-frontend-npm-ci.log`
- `17-frontend-typecheck.log`
- `18-frontend-lint.log`
- `19-frontend-build.log`
- `20-ai-real-query-01.json`
- `21-ai-real-query-02.json`
- `22-ai-real-query-03.json`
- `23-ai-real-query-04.json`
- `24-ai-real-query-05.json`
- `25-ai-reliability-summary.md`
- `26-ai-playwright-run-01.log`
- `27-ai-playwright-run-02.log`
- `28-playwright-full.log`
- `29-playwright-results.zip`
- `30-startup.json`
- `31-cleanup.json`
- `32-sqlite-initial.txt`
- `33-sqlite-final.txt`
- `34-known-issues.md`
- `35-evidence-inventory.txt`
- `40-deliverable-to-architect.md`

### Reglas

1. Ningún archivo puede faltar.
2. Ningún archivo puede tener tamaño cero.
3. El inventario debe incluir tamaño y SHA-256.
4. El ZIP debe abrir correctamente.
5. Los logs deben pertenecer a `v1.0.11`.
6. No copiar logs de campañas anteriores.
7. `node_modules` no debe estar en la evidencia.
8. `node_modules` no debe existir al cierre.
9. `04-change-summary.md` debe describir el código final real.
10. `00-verdict.md` debe ser honesto.
11. Antes de entregar, listar nuevamente la carpeta.
12. Confirmar sincronización completa de la evidencia.

---

## 16. Criterio final

### PASS

Sólo si:

- la única raíz usada fue `I:\cajaApp-V3`;
- `node_modules` se regeneró con `npm ci`;
- ambos lockfiles conservaron su hash;
- reparación real recibió la salida anterior;
- backend completo PASS;
- frontend completo PASS;
- consultas reales 5/5 HTTP 201;
- Playwright focal 2/2 PASS;
- Playwright completo PASS;
- no hubo tercer intento;
- guardrails siguen estrictos;
- archivos congelados sin cambios;
- SQLite restaurado;
- procesos detenidos;
- puertos libres;
- `node_modules` eliminado;
- evidencia completa y no vacía.

### FAIL

Si cualquier punto falla.

### BLOCKED

Sólo si una dependencia externa impide ejecutar técnicamente. Una respuesta inválida del modelo no es `BLOCKED`: es el escenario que esta campaña debe manejar.

---

## 17. Cierre operativo

1. Mover evidencia `v1.0.9` a `agents-to-architect\rejected`.
2. No modificar evidencia histórica.
3. Restaurar SQLite.
4. Detener procesos.
5. Liberar puertos.
6. eliminar backend y frontend `node_modules`;
7. confirmar hashes de lockfiles;
8. materializar evidencia;
9. esperar sincronización completa;
10. entregar `40-deliverable-to-architect.md`;
11. no iniciar otro vertical.

---

**Fin de la instrucción `APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.11`.**
