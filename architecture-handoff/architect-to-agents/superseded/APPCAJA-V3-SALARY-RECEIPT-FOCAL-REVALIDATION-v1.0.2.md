# APPCAJA-V3-SALARY-RECEIPT-FOCAL-REVALIDATION-v1.0.2

**Estado:** ISSUED / AUTORIZADA  
**Proyecto:** CajaApp V3  
**Vertical:** `APP-SALARY-RECEIPT-001`  
**Tipo:** revalidación focal posterior a cuarta remediación  
**Root único:** `I:\cajaApp-V3`  
**Entorno obligatorio:** Windows x64 + Node.js exacto `v24.18.0`

---

## 1. Objetivo único

Revalidar exclusivamente el vertical de recibos de sueldo después de corregir el último error TypeScript detectado en `v1.0.1`.

La ejecución debe comenzar por el backend build. Sólo si el build termina PASS se continúa con los gates focales pendientes: test backend del vertical, lint focal, arranque, runtime Python, smoke API, defaults de consultas, base futura, reemplazo, Playwright focal, cleanup y restauración de SQLite.

No ejecutar la suite completa de CajaApp.

---

## 2. Veredicto anterior

La campaña:

```text
APPCAJA-V3-SALARY-RECEIPT-FOCAL-REVALIDATION-evidence-v1.0.1
```

queda cerrada como:

```text
FAIL
```

### Resultado confirmado

Las tres remediaciones anteriores fueron correctas:

1. `warnings` obligatorio en el schema;
2. construcción explícita de `AcceptSalaryReceiptInput`;
3. argumento seguro de `python -c`.

El build encontró después un cuarto defecto:

```text
salary-receipts.controller.ts:57 — TS2345
```

Causa:

- `listSalaryReceiptsQuerySchema` usaba `.default()` y `.transform()`;
- el schema recibía strings/undefined y devolvía numbers/booleans;
- `validateData<T>(schema: ZodType<T>, data)` exige entrada y salida con el mismo tipo.

La evidencia `v1.0.1` fue trasladada a `agents-to-architect/rejected`.

---

## 3. Cuarta remediación publicada

Archivos modificados:

```text
workspace/backend/src/modules/salary-receipts/salary-receipts.schemas.ts
workspace/backend/src/modules/salary-receipts/salary-receipts.controller.ts
```

### Schema HTTP

El query schema ahora debe ser un contrato puro de entrada:

```ts
const listSalaryReceiptsLimitSchema = z.string().regex(
  /^(?:[1-9]|[1-9]\d|100)$/,
  "Expected an integer between 1 and 100",
);

export const listSalaryReceiptsQuerySchema = z.object({
  limit: listSalaryReceiptsLimitSchema.optional(),
  includeReversed: z.enum(["true", "false"]).optional(),
});
```

No debe contener:

```text
.default(
.transform(
z.coerce
```

### Controller

El controller aplica los defaults y normaliza para el service:

```ts
const queryInput = validateData(listSalaryReceiptsQuerySchema, request.query);
const query = {
  limit: queryInput.limit === undefined ? 20 : Number(queryInput.limit),
  includeReversed: queryInput.includeReversed === "true",
};
```

El contrato interno del service continúa siendo:

```ts
{ limit: number; includeReversed: boolean }
```

No modificar `validateData` ni el service para ocultar el defecto.

---

## 4. Alcance estricto

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

No ejecutar:

```text
npm test
npx vitest run
npx playwright test
```

sin especificar el test focal.

No validar Asesor IA, Tarjetas, Dashboard, Objetivos, Presupuestos ni otros verticales.

No modificar código, tests, scripts, dependencias, Prisma, SQLite ni SSOT.

---

## 5. Preflight

Confirmar:

```powershell
Set-Location I:\cajaApp-V3
node --version
```

Resultado:

```text
v24.18.0
```

Registrar SHA-256 inicial de:

```text
workspace/backend/src/modules/salary-receipts/salary-receipts.schemas.ts
workspace/backend/src/modules/salary-receipts/salary-receipts.controller.ts
workspace/backend/src/modules/salary-receipts/salary-receipts.service.ts
workspace/backend/src/modules/salary-receipts/salary-receipt-extraction.service.ts
cajaapp-headless-up.ps1
workspace/backend/package-lock.json
workspace/frontend/package-lock.json
workspace/backend/prisma/dev.db
```

Comprobar textualmente la cuarta remediación antes de instalar dependencias.

---

## 6. Protección de SQLite

Base:

```text
I:\cajaApp-V3\workspace\backend\prisma\dev.db
```

Antes de ejecutar:

1. detener CajaApp;
2. calcular SHA-256;
3. copiar la base fuera del repo;
4. registrar ruta, tamaño y hash;
5. no usar `prisma migrate reset`.

Baseline histórico informado:

```text
E24E819EF022028C034214104B62CC409D9161211D43D8EA0A1683A932351208
```

El hash observado al inicio de esta campaña es la autoridad para la restauración final.

---

## 7. Preparación

Eliminar sólo artefactos generados:

```text
workspace/backend/node_modules
workspace/backend/dist
workspace/frontend/node_modules
workspace/frontend/.next
workspace/frontend/test-results
workspace/frontend/playwright-report
```

Instalar exclusivamente con:

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

## 8. Gate 1 — Backend build

Desde backend:

```powershell
npm run prisma:generate
npm run prisma:migrate:status
npm run prisma:migrate:deploy
npm run build
```

Gate obligatorio:

```text
PASS
```

No continuar si aparece cualquier error TypeScript dentro de `salary-receipts`.

Si el build falla en otro archivo ajeno al vertical, registrar salida completa y demostrar técnicamente que es preexistente. No modificarlo.

---

## 9. Gate 2 — Test backend focal

Sólo después del build PASS:

```powershell
npx vitest run tests/salary-receipts/salary-receipts.test.ts
```

Gate:

```text
5/5 PASS
```

Se admite una cantidad superior legítima dentro del mismo archivo.

No ejecutar la suite backend completa.

---

## 10. Gate 3 — Query HTTP remediado

Con el backend iniciado, validar específicamente:

### Defaults

```http
GET /api/salary-receipts
```

Debe equivaler internamente a:

```json
{
  "limit": 20,
  "includeReversed": false
}
```

### Valores explícitos

```http
GET /api/salary-receipts?limit=1&includeReversed=true
```

Debe:

- responder exitosamente;
- limitar el resultado a un registro;
- incluir registros reversed cuando existan.

### Validaciones negativas

Deben responder HTTP 400:

```text
limit=0
limit=101
limit=abc
limit=1.5
includeReversed=yes
```

Guardar requests y responses sanitizados.

---

## 11. Gate 4 — Lint frontend focal

Ejecutar únicamente:

```powershell
cd I:\cajaApp-V3\workspace\frontend

npx eslint src/lib/finance/salary-receipts-api.ts src/components/finance/imports/salary-receipts-panel.tsx src/components/finance/ingresos-section.tsx tests/salary-receipts.spec.ts --max-warnings=0
```

Gate:

```text
cero errores
cero warnings
```

No ejecutar auditoría global del frontend.

---

## 12. Gate 5 — Arranque y Python

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

Verificar:

- backend en `11436`;
- frontend en `11437`;
- build backend PASS;
- build frontend PASS;
- runtime Python fuera de Drive;
- `PYTHON_EXECUTABLE` absoluto;
- `pdfplumber 0.11.10`;
- sin `SyntaxError` del one-liner;
- backend y frontend HTTP 200;
- identidad CajaApp.

---

## 13. Gate 6 — Smoke API del vertical

Usar un recibo PDF real sanitizado.

Validar exclusivamente:

```text
POST /api/salary-receipts/import
GET  /api/salary-receipts/drafts/:draftId
PUT  /api/salary-receipts/drafts/:draftId
POST /api/salary-receipts/drafts/:draftId/accept
GET  /api/salary-receipts
POST /api/salary-receipts/:receiptId/reverse
```

Escenario:

1. importar PDF;
2. obtener borrador;
3. editar un concepto;
4. guardar;
5. verificar recálculo backend;
6. aceptar;
7. verificar ingreso real;
8. consultar historial;
9. anular;
10. verificar retiro de eventos generados.

---

## 14. Gate 7 — Base futura

### Omisión

Aceptar sin enviar `useAsFutureBase`.

Debe interpretarse como:

```text
true
```

### False explícito

Aceptar con:

```json
{
  "useAsFutureBase": false
}
```

Debe crear ingreso real sin modificar proyección futura.

---

## 15. Gate 8 — Reemplazo

Validar:

1. primer recibo aceptado;
2. segundo PDF byte-distinto;
3. mismo empleador, empleado y período;
4. valores corregidos;
5. segundo recibo aceptado;
6. un solo recibo activo;
7. un solo ingreso real activo;
8. anterior superseded;
9. sin eventos huérfanos ni duplicados.

---

## 16. Gate 9 — Playwright focal

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

Debe cubrir carga, preview, edición, guardado, aceptación, ingreso, historial, anulación y cleanup.

Prohibido usar mocks, skips, retries, `expect.soft`, `force` o waits arbitrarios.

---

## 17. Cleanup

Antes de borrar artefactos, preservar logs, traces, screenshots y resultados focales.

Después:

1. eliminar datos UAT mediante API;
2. detener CajaApp;
3. verificar puertos libres;
4. restaurar SQLite;
5. verificar hash exacto;
6. verificar lockfiles sin cambios;
7. verificar archivos protegidos sin cambios;
8. eliminar `node_modules`, `dist`, `.next`, `test-results` y `playwright-report`;
9. conservar sólo el runtime Python externo.

---

## 18. Evidencia

Crear:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-SALARY-RECEIPT-FOCAL-REVALIDATION-evidence-v1.0.2
```

Archivos obligatorios:

```text
00-verdict.md
01-environment.md
02-fourth-remediation-integrity.md
03-sqlite-initial.md
04-backend-npm-ci.log
05-prisma-generate.log
06-prisma-status.log
07-prisma-migrate-deploy.log
08-backend-build.log
09-backend-focal-test.log
10-query-defaults.json
11-query-explicit-values.json
12-query-negative-cases.json
13-frontend-npm-ci.log
14-frontend-focal-lint.log
15-startup.log
16-startup-state.json
17-python-runtime.md
18-api-smoke.md
19-default-future-base.md
20-explicit-false-future-base.md
21-replacement.md
22-playwright-focal.log
23-playwright-results.zip
24-cleanup.md
25-sqlite-final.md
26-integrity-final.md
27-known-issues.md
28-evidence-inventory.txt
30-deliverable-to-architect.md
```

Reglas:

- logs originales;
- ningún archivo vacío;
- sin placeholders;
- ZIP válido;
- sin secretos;
- sin PDF original no sanitizado;
- inventario con tamaño y SHA-256;
- verificar todos los archivos desde Drive antes de entregar.

---

## 19. Veredicto

### PASS

Sólo si todos los gates focales pasan y la evidencia está completa.

### FAIL

Cualquier defecto reproducible del vertical, build fallido, escenario funcional fallido, SQLite no restaurada o evidencia incompleta.

### BLOCKED

Sólo por dependencia externa demostrable antes de reproducir un defecto del vertical.

---

## 20. Cierre

No modificar código.

No ejecutar suite completa.

No iniciar otro vertical.

Entregar `30-deliverable-to-architect.md` y esperar auditoría.

---

**Fin de `APPCAJA-V3-SALARY-RECEIPT-FOCAL-REVALIDATION-v1.0.2`.**
