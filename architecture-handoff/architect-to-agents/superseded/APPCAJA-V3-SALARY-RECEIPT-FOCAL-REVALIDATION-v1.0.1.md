# APPCAJA-V3-SALARY-RECEIPT-FOCAL-REVALIDATION-v1.0.1

**Estado:** ISSUED / AUTORIZADA  
**Proyecto:** CajaApp V3  
**Vertical:** `APP-SALARY-RECEIPT-001`  
**Tipo:** revalidación focal posterior a remediación  
**Root único:** `I:\cajaApp-V3`  
**Entorno:** Windows x64 + Node.js exacto `v24.18.0`

---

## 1. Objetivo

Revalidar exclusivamente el vertical de recibos de sueldo después de las tres correcciones publicadas por el arquitecto:

1. compatibilidad de tipos del schema de preview;
2. construcción explícita del payload de aceptación;
3. argumento seguro de `python -c` en `cajaapp-headless-up.ps1`.

No ejecutar la suite completa de CajaApp.

---

## 2. Veredicto anterior

La campaña:

```text
APPCAJA-V3-SALARY-RECEIPT-FOCAL-VALIDATION-evidence-v1.0.0
```

queda cerrada como:

```text
FAIL
```

### Gates aceptados de v1.0.0

No repetir salvo que una dependencia técnica lo exija:

- preflight;
- contratos;
- Prisma schema y migración;
- `PRAGMA foreign_key_check`;
- backend `npm ci`;
- test backend focal 5/5;
- frontend typecheck;
- frontend build;
- lint focal;
- Python disponible;
- `pdfplumber 0.11.10` importable directamente;
- restauración exacta de SQLite.

### Defectos remediados

Archivos modificados:

```text
workspace/backend/src/modules/salary-receipts/salary-receipts.schemas.ts
workspace/backend/src/modules/salary-receipts/salary-receipts.controller.ts
cajaapp-headless-up.ps1
```

No se modificó ningún otro archivo del vertical.

---

## 3. Alcance

Validar únicamente:

```text
workspace/backend/src/modules/salary-receipts/**
workspace/backend/tests/salary-receipts/salary-receipts.test.ts
workspace/backend/prisma/schema.prisma
workspace/backend/prisma/migrations/20260716033000_add_salary_receipts/**
workspace/frontend/src/lib/finance/salary-receipts-api.ts
workspace/frontend/src/components/finance/imports/salary-receipts-panel.tsx
workspace/frontend/src/components/finance/ingresos-section.tsx
workspace/frontend/tests/salary-receipts.spec.ts
cajaapp-headless-up.ps1
```

No validar otros verticales.

No ejecutar:

```text
npm test
npx vitest run
npx playwright test
```

sin especificar el test focal correspondiente.

No ejecutar `npm audit fix`.

No modificar código.

---

## 4. Preflight e integridad

Confirmar:

```powershell
Set-Location I:\cajaApp-V3
node --version
```

Resultado obligatorio:

```text
v24.18.0
```

Registrar SHA-256 inicial de:

```text
workspace/backend/src/modules/salary-receipts/salary-receipts.schemas.ts
workspace/backend/src/modules/salary-receipts/salary-receipts.controller.ts
cajaapp-headless-up.ps1
workspace/backend/package-lock.json
workspace/frontend/package-lock.json
workspace/backend/prisma/dev.db
```

Comprobar en los archivos corregidos:

### Schema

```text
warnings
```

es obligatorio y no usa `.default([])`.

```text
useAsFutureBase
```

es opcional en la entrada del schema.

### Controller

El controller debe construir explícitamente:

```ts
const input: AcceptSalaryReceiptInput = {
  sourceId: payload.sourceId ?? null,
  useAsFutureBase: payload.useAsFutureBase ?? true,
};
```

### Script

Las dos comprobaciones de pdfplumber deben usar:

```text
import pdfplumber;print(pdfplumber.__version__)
```

sin espacio dentro del argumento de `python -c`.

---

## 5. Protección de SQLite

Antes de cualquier migración o prueba:

1. detener CajaApp;
2. copiar:

```text
I:\cajaApp-V3\workspace\backend\prisma\dev.db
```

fuera del repo;

3. registrar SHA-256 inicial;
4. no usar `prisma migrate reset`;
5. restaurar exactamente la copia al finalizar.

Hash esperado informado por la campaña anterior:

```text
E24E819EF022028C034214104B62CC409D9161211D43D8EA0A1683A932351208
```

El hash observado al inicio sigue siendo la fuente de verdad de esta ejecución.

---

## 6. Preparación

Eliminar únicamente:

```text
workspace/backend/node_modules
workspace/backend/dist
workspace/frontend/node_modules
workspace/frontend/.next
workspace/frontend/test-results
workspace/frontend/playwright-report
```

Instalar mediante:

```powershell
cd I:\cajaApp-V3\workspace\backend
npm ci

cd I:\cajaApp-V3\workspace\frontend
npm ci
```

Prohibido usar `npm install`.

---

## 7. Gate backend corregido

Desde:

```text
I:\cajaApp-V3\workspace\backend
```

ejecutar:

```powershell
npm run prisma:generate
npm run prisma:migrate:status
npm run prisma:migrate:deploy
npm run build
```

### Gate obligatorio

`npm run build` debe terminar:

```text
PASS
```

No se aceptan errores en:

```text
salary-receipt-extraction.service.ts
salary-receipts.controller.ts
salary-receipts.schemas.ts
```

Luego ejecutar únicamente:

```powershell
npx vitest run tests/salary-receipts/salary-receipts.test.ts
```

Resultado esperado:

```text
5/5 PASS
```

o una cantidad superior legítima dentro del mismo archivo.

---

## 8. Gate focal frontend

No repetir una auditoría frontend global.

Ejecutar sólo:

```powershell
cd I:\cajaApp-V3\workspace\frontend

npx eslint src/lib/finance/salary-receipts-api.ts src/components/finance/imports/salary-receipts-panel.tsx src/components/finance/ingresos-section.tsx tests/salary-receipts.spec.ts --max-warnings=0
```

Gate:

```text
PASS
```

El build frontend será cubierto por el arranque con `-Rebuild`.

---

## 9. Arranque autoritativo

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

Guardar stdout y stderr completos.

### Verificar

- backend iniciado en `11436`;
- frontend iniciado en `11437`;
- backend build PASS;
- frontend build PASS;
- Python resuelto fuera de Drive;
- ruta absoluta de `PYTHON_EXECUTABLE`;
- `pdfplumber 0.11.10`;
- ausencia de `SyntaxError` en el one-liner Python;
- HTTP 200 en backend y frontend;
- identidad CajaApp en frontend.

Si el script vuelve a fallar en la comprobación Python, el resultado es `FAIL`.

---

## 10. Smoke API focal

Usar un recibo PDF real sanitizado.

Validar:

```text
POST /api/salary-receipts/import
GET  /api/salary-receipts/drafts/:draftId
PUT  /api/salary-receipts/drafts/:draftId
POST /api/salary-receipts/drafts/:draftId/accept
GET  /api/salary-receipts
POST /api/salary-receipts/:receiptId/reverse
```

### Escenario base

1. importar PDF;
2. obtener draft;
3. editar al menos un concepto;
4. guardar;
5. verificar totales recalculados por backend;
6. aceptar;
7. verificar ingreso real;
8. verificar historial;
9. anular;
10. verificar retiro de eventos generados.

---

## 11. Default de base futura

Agregar una comprobación específica de la remediación.

### Caso omitido

Aceptar un borrador enviando un body que no incluya:

```text
useAsFutureBase
```

Verificar que el backend lo interprete como:

```text
true
```

y cree la actualización futura correspondiente.

### Caso explícito false

Aceptar otro borrador con:

```json
{
  "useAsFutureBase": false
}
```

Verificar que:

- se cree el ingreso real;
- no se cree ajuste permanente;
- no se modifique la proyección futura.

---

## 12. Reemplazo del mismo período

Validar:

1. primer recibo aceptado;
2. segundo PDF byte-distinto;
3. mismo empleador, empleado y período;
4. valores corregidos;
5. segundo recibo aceptado;
6. un solo recibo activo;
7. un solo ingreso real activo;
8. recibo anterior superseded;
9. ausencia de eventos huérfanos o duplicados.

---

## 13. Playwright focal

Ejecutar exclusivamente:

```powershell
cd I:\cajaApp-V3\workspace\frontend

npx playwright test tests/salary-receipts.spec.ts `
  --project=chromium `
  --workers=1 `
  --retries=0 `
  --trace=on
```

No ejecutar otros specs.

El test debe cubrir:

- acceso a Ingresos;
- panel de recibos visible;
- carga del PDF;
- preview;
- edición;
- guardado;
- aceptación;
- reflejo en Ingresos;
- persistencia;
- historial;
- anulación;
- cleanup.

No usar mocks, skips, retries ni waits arbitrarios.

---

## 14. Cleanup

Antes de limpiar, preservar logs y artefactos focales.

Después:

1. eliminar datos UAT mediante API;
2. detener CajaApp;
3. verificar puertos `11436` y `11437` libres;
4. restaurar SQLite;
5. comprobar hash exacto;
6. comprobar lockfiles sin cambios;
7. comprobar los tres archivos corregidos sin cambios;
8. eliminar:
   - backend `node_modules`;
   - backend `dist`;
   - frontend `node_modules`;
   - frontend `.next`;
   - `test-results`;
   - `playwright-report`;
9. conservar únicamente el runtime Python externo.

---

## 15. Evidencia

Crear:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-SALARY-RECEIPT-FOCAL-REVALIDATION-evidence-v1.0.1
```

Archivos obligatorios:

```text
00-verdict.md
01-environment.md
02-remediation-integrity.md
03-sqlite-initial.md
04-backend-npm-ci.log
05-prisma-generate.log
06-prisma-status.log
07-prisma-migrate-deploy.log
08-backend-build.log
09-backend-focal-test.log
10-frontend-npm-ci.log
11-frontend-focal-lint.log
12-startup.log
13-startup-state.json
14-python-runtime.md
15-api-smoke.md
16-default-future-base.md
17-explicit-false-future-base.md
18-replacement.md
19-playwright-focal.log
20-playwright-results.zip
21-cleanup.md
22-sqlite-final.md
23-integrity-final.md
24-known-issues.md
25-evidence-inventory.txt
30-deliverable-to-architect.md
```

Reglas:

- logs originales;
- nada vacío;
- sin secretos;
- sin PDF original no sanitizado;
- ZIP válido;
- inventario con tamaño y SHA-256;
- todos los archivos visibles en Drive antes de entregar.

---

## 16. Veredicto

### PASS

Sólo si:

- backend build PASS;
- test focal PASS;
- lint focal PASS;
- arranque PASS;
- Python y pdfplumber PASS;
- smoke API PASS;
- default omitido equivale a `true`;
- `false` explícito se respeta;
- reemplazo no duplica;
- Playwright focal PASS;
- SQLite restaurada;
- integridad final PASS;
- evidencia completa.

### FAIL

Cualquier defecto reproducible del vertical o evidencia incompleta.

### BLOCKED

Sólo por dependencia externa demostrable antes de reproducir un defecto del vertical.

---

## 17. Cierre

No modificar código.

No ejecutar suite completa.

No iniciar otro vertical.

Entregar `30-deliverable-to-architect.md` y esperar auditoría.

---

**Fin de `APPCAJA-V3-SALARY-RECEIPT-FOCAL-REVALIDATION-v1.0.1`.**
