# APPCAJA-V3-SALARY-RECEIPT-FOCAL-REVALIDATION-v1.0.3

**Estado:** ISSUED / AUTORIZADA  
**Proyecto:** CajaApp V3  
**Vertical:** `APP-SALARY-RECEIPT-001`  
**Tipo:** revalidación focal posterior a remediación de infraestructura y materialización de fixtures  
**Root único:** `I:\cajaApp-V3`  
**Entorno obligatorio:** Windows x64 + Node.js exacto `v24.18.0`

---

## 1. Objetivo único

Cerrar la validación focal del vertical de recibos de sueldo después de:

1. corregir `Invoke-CapturedProcess` en `cajaapp-headless-up.ps1`;
2. incorporar tres PDF sanitizados y reproducibles;
3. incorporar un Playwright E2E real, separado del test UI con mocks.

La campaña debe demostrar el flujo real:

```text
PDF real
→ pdfplumber
→ proveedor IA real configurado
→ JSON normalizado
→ borrador editable
→ recálculo backend
→ aceptación
→ ingreso real
→ base futura opcional
→ reemplazo sin duplicados
→ anulación
```

No ejecutar la suite completa de CajaApp.

No abrir otro vertical.

---

## 2. Veredicto anterior

La campaña:

```text
APPCAJA-V3-SALARY-RECEIPT-FOCAL-REVALIDATION-evidence-v1.0.2
```

queda cerrada como:

```text
FAIL
```

### Gates aceptados de v1.0.2

Se aceptan como evidencia técnica previa:

- Node.js `v24.18.0`;
- Prisma generate, status y deploy;
- backend build PASS;
- test backend focal 5/5 PASS;
- query sin parámetros HTTP 200;
- query con parámetros válidos HTTP 200;
- casos negativos HTTP 400;
- lint focal cero errores y cero warnings;
- SQLite restaurada con hash:
  `E24E819EF022028C034214104B62CC409D9161211D43D8EA0A1683A932351208`;
- corrección de `listSalaryReceiptsQuerySchema`.

### Motivos del FAIL

1. `Invoke-CapturedProcess` usaba `Start-Process`, que volvía a serializar `ArgumentList` y dañaba `python -c`.
2. No existía un PDF sanitizado de recibo de sueldo.
3. El Playwright existente sólo validaba UI con APIs interceptadas.
4. La evidencia contenía un log focal de lint de cero bytes.
5. El ZIP de Playwright era un placeholder sin resultados reales.

No reutilizar ni completar retrospectivamente esa evidencia.

---

## 3. Remediaciones publicadas por el arquitecto

### 3.1 Script de arranque

Archivo:

```text
I:\cajaApp-V3\cajaapp-headless-up.ps1
```

`Invoke-CapturedProcess` ahora:

- usa el operador PowerShell `&`;
- conserva cada elemento de `ArgumentList`;
- captura stdout y stderr en archivos temporales;
- conserva el directorio de trabajo;
- retorna el exit code real;
- restaura la ubicación original;
- elimina los temporales.

No modificar esta función durante la validación.

### 3.2 Fixtures PDF reales y sanitizados

Directorio:

```text
I:\cajaApp-V3\contracts\examples\salary-receipts
```

Archivos obligatorios:

```text
salary-receipt.sanitized.base.pdf
salary-receipt.sanitized.replacement.pdf
salary-receipt.sanitized.no-future-base.pdf
README.md
```

Hashes esperados:

```text
salary-receipt.sanitized.base.pdf
289391BBE7E358840926EDF459DF204D78415693E7A1528CC892878994EB6CE8

salary-receipt.sanitized.replacement.pdf
F13F46A1B4793A5737F06E3F93FEB438E0B29B6984C470D7D3897B9568CFAFFB

salary-receipt.sanitized.no-future-base.pdf
950C768A7F2E48FC94031BABD8ECE348CAB2B12F0284DB97ACAAE21F42D3B8DD
```

Los documentos son completamente ficticios y no contienen información personal real.

### 3.3 Playwright E2E real

Archivo nuevo:

```text
I:\cajaApp-V3\workspace\frontend\tests\salary-receipts.real.spec.ts
```

Reglas:

- no usa `page.route`;
- no intercepta APIs;
- no simula respuestas;
- usa el PDF base real;
- genera una copia PDF válida y byte-distinta en cada ejecución para respetar la deduplicación por SHA;
- valida extracción, aceptación, creación de eventos y anulación.

El archivo anterior:

```text
tests/salary-receipts.spec.ts
```

se conserva como prueba aislada del contrato visual con mocks. No reemplaza el E2E real.

---

## 4. Alcance estricto

### Incluido

```text
cajaapp-headless-up.ps1

contracts/examples/salary-receipts/
workspace/backend/src/modules/salary-receipts/
workspace/backend/tests/salary-receipts/salary-receipts.test.ts
workspace/backend/prisma/schema.prisma
workspace/backend/prisma/migrations/20260716033000_add_salary_receipts/

workspace/frontend/src/lib/finance/salary-receipts-api.ts
workspace/frontend/src/components/finance/imports/salary-receipts-panel.tsx
workspace/frontend/src/components/finance/sections/ingresos-section.tsx
workspace/frontend/tests/salary-receipts.spec.ts
workspace/frontend/tests/salary-receipts.real.spec.ts
```


### Excluido

No ejecutar:

- suite backend completa;
- suite Playwright completa;
- specs de otros verticales;
- pruebas del Asesor IA;
- pruebas de Tarjetas;
- auditoría global de CajaApp;
- `npm audit fix`;
- actualizaciones de dependencias;
- migraciones nuevas;
- cambios funcionales.

---

## 5. Regla de trabajo

El agente es exclusivamente validador.

No modificar:

- código;
- tests;
- fixtures;
- scripts;
- Prisma;
- prompts;
- contratos;
- package files;
- lockfiles;
- SSOT.

Ante un defecto, preservar la evidencia, emitir `FAIL` y detener la parte dependiente.

No corregir durante esta campaña.

---

## 6. Preflight

Confirmar:

```powershell
Set-Location I:\cajaApp-V3
node --version
npm --version
```

Node obligatorio:

```text
v24.18.0
```

Registrar SHA-256 inicial de:

```text
cajaapp-headless-up.ps1
workspace/backend/src/modules/salary-receipts/salary-receipts.schemas.ts
workspace/backend/src/modules/salary-receipts/salary-receipts.controller.ts
workspace/backend/src/modules/salary-receipts/salary-receipts.service.ts
workspace/backend/src/modules/salary-receipts/salary-receipt-extraction.service.ts
workspace/frontend/tests/salary-receipts.spec.ts
workspace/frontend/tests/salary-receipts.real.spec.ts
workspace/backend/package-lock.json
workspace/frontend/package-lock.json
```

Verificar los tres hashes PDF exactos.

Comprobar que `salary-receipts.real.spec.ts`:

- no contiene `page.route`;
- no contiene `route.fulfill`;
- no contiene `test.skip`;
- no contiene `test.fixme`;
- referencia `salary-receipt.sanitized.base.pdf`;
- crea un buffer PDF byte-distinto sin reemplazar el contenido documental.

---

## 7. Protección de SQLite

Base:

```text
I:\cajaApp-V3\workspace\backend\prisma\dev.db
```

Antes de ejecutar:

1. detener CajaApp;
2. calcular SHA-256;
3. copiar la base fuera del repo;
4. registrar tamaño, fecha y hash;
5. no usar `prisma migrate reset`;
6. restaurar exactamente la copia al finalizar.

El hash inicial observado en esta campaña es la autoridad final.

---

## 8. Preparación

Eliminar únicamente artefactos generados:

```text
workspace/backend/node_modules
workspace/backend/dist
workspace/backend/coverage
workspace/frontend/node_modules
workspace/frontend/.next
workspace/frontend/coverage
workspace/frontend/test-results
workspace/frontend/playwright-report
```

Instalar:

```powershell
cd I:\cajaApp-V3\workspace\backend
npm ci

cd I:\cajaApp-V3\workspace\frontend
npm ci
```

Prohibido:

```text
npm install
npm update
npm audit fix
```

---

## 9. Gate de integridad de fixtures

Usar exclusivamente el Python externo de CajaApp:

```text
%LOCALAPPDATA%\CajaAppV3\runtime\python\.venv\Scripts\python.exe
```

Para cada PDF:

1. confirmar MIME y encabezado PDF;
2. confirmar una página;
3. ejecutar extracción mediante `pdfplumber`;
4. guardar el texto RAW;
5. comprobar que contiene al menos:
   - `RECIBO DE SUELDO`;
   - `LIQUIDACION DE HABERES`;
   - `CUIL`;
   - `LEGAJO`;
   - `TOTAL HABERES`;
   - `TOTAL DESCUENTOS`;
   - `NETO A COBRAR`;
6. comprobar que el archivo no contiene nombres, CUIT o CUIL distintos de los datos DEMO;
7. registrar tamaño y SHA-256.

Los tres PDFs deben ser byte-distintos.

---

## 10. Gate backend focal

Desde:

```text
I:\cajaApp-V3\workspace\backend
```

Ejecutar:

```powershell
npm run prisma:generate
npm run prisma:migrate:status
npm run prisma:migrate:deploy
npm run build
npx vitest run tests/salary-receipts/salary-receipts.test.ts
```

Gates:

```text
backend build PASS
test focal 5/5 PASS o superior legítimo dentro del mismo archivo
```

No ejecutar `npm test`.

---

## 11. Gate frontend focal

Ejecutar:

```powershell
cd I:\cajaApp-V3\workspace\frontend

npx eslint `
  src/lib/finance/salary-receipts-api.ts `
  src/components/finance/imports/salary-receipts-panel.tsx `
  src/components/finance/sections/ingresos-section.tsx `
  tests/salary-receipts.spec.ts `
  tests/salary-receipts.real.spec.ts `
  --max-warnings=0
```


Gate:

```text
cero errores
cero warnings
```

La evidencia no puede ser un archivo de cero bytes. Guardar un transcript que incluya:

- comando;
- hora inicial y final;
- exit code;
- stdout;
- stderr;
- resultado explícito.

---

## 12. Arranque autoritativo

Ejecutar:

```powershell
powershell.exe -ExecutionPolicy Bypass `
  -File I:\cajaApp-V3\cajaapp-headless-up.ps1 `
  -Restart `
  -Rebuild `
  -JsonOnly `
  -BackendPort 11436 `
  -FrontendPort 11437
```

Guardar stdout y stderr originales.

### Gates

- script exit code 0;
- JSON válido;
- backend `11436` HTTP 200;
- frontend `11437` HTTP 200;
- identidad CajaApp;
- Node `v24.18.0`;
- Python absoluto fuera de Drive;
- `pdfplumber 0.11.10`;
- ausencia de `SyntaxError`;
- ausencia de truncamiento del argumento `python -c`;
- backend build PASS;
- frontend build PASS.

Está prohibido iniciar manualmente backend o frontend para sustituir este gate.

Si el script falla, el resultado es `FAIL`.

---

## 13. Smoke API real

Usar el backend real en:

```text
http://127.0.0.1:11436
```

Guardar request y response completos, sanitizados.

### 13.1 Escenario base con default futuro

Fixture:

```text
salary-receipt.sanitized.base.pdf
```

Flujo:

1. `POST /api/salary-receipts/import`;
2. exigir HTTP 201;
3. obtener `draftId`;
4. exigir estado `preview_ready`;
5. comprobar:
   - empleador demo;
   - empleado demo;
   - período `2026-06`;
   - conceptos;
   - totales;
6. modificar mediante `PUT /drafts/:draftId` al menos un importe;
7. comprobar que el backend recalcule gross, deductions y net;
8. aceptar mediante:
   ```json
   {}
   ```
9. comprobar que omitir `useAsFutureBase` equivale a `true`;
10. exigir:
    - `actualIncomeEventId` no nulo;
    - `projectionIncomeEventId` no nulo;
11. comprobar el ingreso real en Ingresos.

### 13.2 Reemplazo del mismo período

Fixture:

```text
salary-receipt.sanitized.replacement.pdf
```

Flujo:

1. importar;
2. aceptar para el mismo empleador, empleado y `2026-06`;
3. comprobar:
   - versión incrementada;
   - un solo recibo activo;
   - recibo anterior `superseded`;
   - un solo ingreso real activo;
   - evento anterior retirado;
   - ausencia de duplicados y eventos huérfanos;
   - importe activo igual al nuevo neto.

### 13.3 Base futura explícitamente desactivada

Fixture:

```text
salary-receipt.sanitized.no-future-base.pdf
```

Flujo:

1. importar;
2. comprobar período `2026-07`;
3. aceptar con:
   ```json
   {
     "useAsFutureBase": false
   }
   ```
4. exigir:
   - `actualIncomeEventId` no nulo;
   - `projectionIncomeEventId` nulo;
   - ausencia de ajuste permanente nuevo;
   - proyecciones futuras anteriores sin alteración.

### 13.4 Historial y anulación

Validar:

```text
GET /api/salary-receipts?includeReversed=true
POST /api/salary-receipts/:receiptId/reverse
```

Comprobar que:

- el historial muestre accepted, superseded y reversed correctamente;
- la anulación sea idempotente;
- los eventos relacionados se retiren;
- no queden ingresos activos de los datos UAT.

---

## 14. Playwright focal

### 14.1 Contrato UI aislado

Ejecutar únicamente:

```powershell
npx playwright test tests/salary-receipts.spec.ts `
  --project=chromium `
  --workers=1 `
  --retries=0 `
  --trace=on
```

Este spec puede usar mocks porque su objetivo es validar el contrato visual aislado.

### 14.2 E2E real

Restaurar SQLite al baseline antes de iniciar este escenario o garantizar que el smoke API haya limpiado todos sus datos.

Ejecutar:

```powershell
npx playwright test tests/salary-receipts.real.spec.ts `
  --project=chromium `
  --workers=1 `
  --retries=0 `
  --trace=on
```

El E2E real debe:

- usar una copia válida y byte-distinta del PDF base real;
- llegar al backend real;
- ejecutar pdfplumber;
- usar el proveedor configurado;
- renderizar el preview;
- aceptar;
- verificar evento real;
- verificar evento proyectado;
- anular;
- limpiar incluso ante fallo.

No ejecutar ningún otro spec.

No usar:

- mocks en el spec real;
- retries;
- `test.skip`;
- `test.fixme`;
- `test.fail`;
- `expect.soft`;
- aumento de timeout por encima del ya definido;
- sustitución de la IA real;
- edición del spec durante el gate.

---

## 15. Preservación de evidencia

Antes del cleanup copiar a la carpeta de evidencia:

- stdout y stderr;
- state JSON;
- textos RAW de pdfplumber;
- requests/responses API;
- logs backend/frontend;
- `test-results` de ambos specs;
- `playwright-report`;
- traces;
- screenshots;
- videos si se generaron;
- `error-context.md`;
- resultados JSON.

Crear:

```text
playwright-salary-receipts-v1.0.3.zip
```

El ZIP debe:

- abrir correctamente;
- contener artefactos reales;
- no ser un placeholder;
- no estar vacío;
- listar su contenido en un archivo separado.

Un ZIP creado para representar una prueba bloqueada es evidencia inválida.

---

## 16. Cleanup

1. anular o eliminar por API todos los datos UAT;
2. detener CajaApp mediante el script;
3. verificar puertos `11436` y `11437` libres;
4. restaurar SQLite;
5. comprobar SHA-256 exacto;
6. comprobar lockfiles sin cambios;
7. comprobar código, tests, script y fixtures sin cambios;
8. eliminar:
   - backend `node_modules`;
   - backend `dist`;
   - backend `coverage`;
   - frontend `node_modules`;
   - frontend `.next`;
   - frontend `coverage`;
   - frontend `test-results`;
   - frontend `playwright-report`;
9. conservar el runtime Python externo.

---

## 17. Evidencia obligatoria

Crear:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-SALARY-RECEIPT-FOCAL-REVALIDATION-evidence-v1.0.3
```

Archivos mínimos:

```text
00-verdict.md
01-environment.md
02-v102-audit.md
03-remediation-integrity.md
04-fixtures-integrity.md
05-sqlite-initial.md
06-backend-npm-ci.log
07-prisma-generate.log
08-prisma-status.log
09-prisma-deploy.log
10-backend-build.log
11-backend-focal-test.log
12-frontend-npm-ci.log
13-frontend-focal-lint.log
14-startup-stdout.log
15-startup-stderr.log
16-startup-state.json
17-python-runtime.md
18-fixture-base-raw.txt
19-fixture-replacement-raw.txt
20-fixture-no-future-raw.txt
21-api-base-import.json
22-api-base-update.json
23-api-base-accept.json
24-api-replacement-import.json
25-api-replacement-accept.json
26-api-no-future-import.json
27-api-no-future-accept.json
28-api-history-and-reverse.json
29-replacement-verification.md
30-future-base-verification.md
31-playwright-ui-contract.log
32-playwright-real-e2e.log
33-playwright-salary-receipts-v1.0.3.zip
34-playwright-zip-inventory.txt
35-cleanup.md
36-sqlite-final.md
37-integrity-final.md
38-known-issues.md
39-evidence-inventory.txt
40-deliverable-to-architect.md
```

### Reglas

- ningún archivo obligatorio puede faltar;
- ningún archivo puede tener cero bytes;
- ningún placeholder;
- logs reales, no resúmenes como sustituto;
- ZIP real y válido;
- inventario con ruta, tamaño y SHA-256;
- sin secretos;
- sin datos personales;
- sin `node_modules`;
- verificar todos los archivos desde Google Drive antes de entregar.

---

## 18. Veredicto

### PASS

Sólo si:

- script autoritativo PASS;
- argumento Python preservado;
- pdfplumber 0.11.10 PASS;
- fixtures válidos y distintos;
- backend build PASS;
- test backend focal PASS;
- lint focal PASS;
- smoke API completo PASS;
- default futuro omitido = true;
- false explícito respetado;
- reemplazo sin duplicados;
- historial y anulación PASS;
- test UI aislado PASS;
- E2E real PASS;
- SQLite restaurada;
- integridad final PASS;
- evidencia completa y no vacía.

### FAIL

Cualquier defecto reproducible o evidencia inválida.

### BLOCKED

Sólo ante una dependencia externa realmente inaccesible antes de reproducir un defecto local.

No usar `BLOCKED` por:

- fallo del script;
- fixture ausente;
- timeout reproducible;
- ZIP placeholder;
- log vacío;
- error de código;
- error de Playwright.

---

## 19. Cierre

No modificar código.

No ejecutar suite completa.

No iniciar otro vertical.

Entregar `40-deliverable-to-architect.md` y esperar auditoría.

---

**Fin de `APPCAJA-V3-SALARY-RECEIPT-FOCAL-REVALIDATION-v1.0.3`.**
