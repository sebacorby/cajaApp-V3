# APPCAJA-V3-SALARY-RECEIPT-FINAL-E2E-CLOSURE-v1.0.5

**Estado:** ISSUED / AUTORIZADA  
**Proyecto:** CajaApp V3  
**Vertical:** `APP-SALARY-RECEIPT-001`  
**Tipo:** cierre focal mínimo posterior a corrección de expectativa Playwright  
**Root único:** `I:\cajaApp-V3`  
**Entorno obligatorio:** Windows x64 + Node.js exacto `v24.18.0`

---

## 1. Objetivo único

Cerrar exclusivamente el último gate pendiente del vertical:

```text
workspace/frontend/tests/salary-receipts.real.spec.ts
```

La campaña debe demostrar que el E2E real completo termina PASS después de corregir la expectativa del concepto salarial.

No ejecutar suite completa.

No repetir los escenarios API ya aprobados.

No modificar código.

---

## 2. Estado aceptado de v1.0.4

La campaña v1.0.4 queda cerrada como `FAIL` por una expectativa incorrecta del test.

Se aceptan como PASS y no deben repetirse como campañas independientes:

- arranque autoritativo mediante `cajaapp-headless-up.ps1`;
- script exit code 0;
- Python de virtualenv administrada, no `WindowsApps`;
- `pdfplumber 0.11.10`;
- backend HTTP 200 en `11436`;
- frontend HTTP 200 en `11437`;
- importación PDF real HTTP 201;
- preview visible;
- empleador, empleado y período correctos;
- recálculo backend con neto `$1.162.000,00`;
- SQLite restaurada exactamente;
- lockfiles sin cambios.

Los escenarios API completos aprobados en v1.0.3 también continúan aceptados:

- importación;
- edición;
- aceptación;
- base futura por defecto;
- base futura explícitamente desactivada;
- reemplazo;
- historial;
- anulación.

---

## 3. Defecto corregido

El frontend presenta cada concepto salarial dentro de un `<input>` editable:

```tsx
<Field label="Descripción">
  <Input value={item.label} ... />
</Field>
```

Por lo tanto, esta expectativa era incorrecta:

```ts
await expect(preview).toContainText(/Sueldo b[aá]sico/i);
```

`toContainText` no inspecciona el valor actual de un campo `<input>`.

La expectativa publicada ahora es:

```ts
await expect(
  preview.getByDisplayValue(/Sueldo b[aá]sico/i),
).toBeVisible();
```

Archivo corregido:

```text
I:\cajaApp-V3\workspace\frontend\tests\salary-receipts.real.spec.ts
```

No se modificó producción, backend, Prisma, contratos, scripts ni dependencias.

---

## 4. Alcance permitido

Validar únicamente:

```text
cajaapp-headless-up.ps1
workspace/frontend/tests/salary-receipts.real.spec.ts
contracts/examples/salary-receipts/salary-receipt.sanitized.base.pdf
workspace/backend/prisma/dev.db
workspace/backend/package-lock.json
workspace/frontend/package-lock.json
```

No ejecutar:

```text
npm test
npx vitest run
npx playwright test
```

sin indicar el spec focal exacto.

No ejecutar:

- backend build independiente;
- suite backend;
- suite frontend;
- suite Playwright;
- smoke API manual;
- escenarios de reemplazo;
- escenarios de base futura;
- otros verticales;
- `npm audit fix`.

---

## 5. Preflight

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
cajaapp-headless-up.ps1
workspace/frontend/tests/salary-receipts.real.spec.ts
workspace/backend/package-lock.json
workspace/frontend/package-lock.json
workspace/backend/prisma/dev.db
```

Comprobar en el spec:

1. existe `getByDisplayValue(/Sueldo b[aá]sico/i)`;
2. no existe `preview).toContainText(/Sueldo b[aá]sico/i)`;
3. no existe `page.route`;
4. no existe `route.fulfill`;
5. no existe `test.skip`;
6. no existe `test.fixme`;
7. continúa usando el PDF sanitizado base;
8. continúa generando una copia byte-distinta por ejecución;
9. continúa limpiando mediante `/reverse` en `finally`.

---

## 6. Protección de SQLite

Antes del arranque:

1. detener CajaApp si estuviera activo;
2. calcular SHA-256 de:
   ```text
   I:\cajaApp-V3\workspace\backend\prisma\dev.db
   ```
3. copiar la base fuera del repo;
4. registrar hash, tamaño y fecha;
5. no ejecutar `prisma migrate reset`;
6. restaurar exactamente la copia al finalizar.

El hash observado al inicio de esta ejecución es la autoridad final.

---

## 7. Preparación mínima

La campaña anterior realizó cleanup. Instalar únicamente lo necesario:

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

No ejecutar tests todavía.

---

## 8. Gate estático del spec

Desde:

```text
I:\cajaApp-V3\workspace\frontend
```

ejecutar:

```powershell
npx eslint tests/salary-receipts.real.spec.ts --max-warnings=0

npx playwright test tests/salary-receipts.real.spec.ts `
  --project=chromium `
  --list
```

Gates:

- ESLint cero errores y cero warnings;
- Playwright descubre exactamente un test;
- no hay error de carga;
- no hay error ESM/CommonJS;
- no hay error de fixture.

---

## 9. Arranque autoritativo

Ejecutar exclusivamente:

```powershell
powershell.exe -ExecutionPolicy Bypass `
  -File I:\cajaApp-V3\cajaapp-headless-up.ps1 `
  -Restart `
  -Rebuild `
  -JsonOnly `
  -BackendPort 11436 `
  -FrontendPort 11437
```

No iniciar servicios manualmente.

Verificar:

- exit code 0;
- JSON válido;
- backend HTTP 200;
- frontend HTTP 200;
- Node `v24.18.0`;
- Python absoluto en la virtualenv administrada;
- ruta Python sin `WindowsApps`;
- `pdfplumber 0.11.10`.

---

## 10. Único E2E autorizado

Ejecutar exclusivamente:

```powershell
cd I:\cajaApp-V3\workspace\frontend

npx playwright test tests/salary-receipts.real.spec.ts `
  --project=chromium `
  --workers=1 `
  --retries=0 `
  --trace=on
```

Resultado obligatorio:

```text
1 passed
0 failed
```

El test debe completar:

1. navegación a CajaApp;
2. apertura de Ingresos;
3. selección del PDF real;
4. `POST /api/salary-receipts/import` HTTP 201;
5. preview visible;
6. empleador correcto;
7. empleado correcto;
8. período `2026-06`;
9. campo editable con valor `Sueldo básico` o variante sin tilde;
10. texto `Neto a cobrar`;
11. base futura activada;
12. aceptación HTTP 201;
13. evento real creado;
14. evento proyectado creado;
15. historial visible;
16. anulación HTTP 200;
17. mensaje de anulación visible;
18. cleanup del recibo generado.

No modificar el test durante la ejecución.

---

## 11. Evidencia antes del cleanup

Preservar:

- stdout y stderr de `npm ci`;
- lint focal;
- `playwright --list`;
- stdout y stderr del arranque;
- state JSON;
- log Playwright;
- `test-results`;
- trace;
- screenshot;
- video, si se genera;
- `error-context.md`, si se genera;
- resultados JSON.

Crear:

```text
playwright-salary-receipt-final-v1.0.5.zip
```

El ZIP debe ser real, abrir correctamente y contener los artefactos del test ejecutado.

---

## 12. Cleanup final

1. confirmar que el test anuló su recibo;
2. detener CajaApp mediante el script;
3. verificar puertos `11436` y `11437` libres;
4. restaurar SQLite;
5. comprobar SHA-256 exacto;
6. comprobar lockfiles sin cambios;
7. comprobar `cajaapp-headless-up.ps1` sin cambios;
8. comprobar el spec sin cambios;
9. eliminar:
   - backend `node_modules`;
   - backend `dist`;
   - frontend `node_modules`;
   - frontend `.next`;
   - frontend `test-results`;
   - frontend `playwright-report`;
10. conservar la virtualenv externa.

---

## 13. Evidencia obligatoria

Crear:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-SALARY-RECEIPT-FINAL-E2E-CLOSURE-evidence-v1.0.5
```

Archivos mínimos:

```text
00-verdict.md
01-environment.md
02-v104-audit.md
03-remediation-integrity.md
04-sqlite-initial.md
05-backend-npm-ci.log
06-frontend-npm-ci.log
07-spec-lint.log
08-playwright-list.log
09-startup-stdout.log
10-startup-stderr.log
11-startup-state.json
12-runtime-verification.md
13-playwright-real-e2e.log
14-playwright-salary-receipt-final-v1.0.5.zip
15-playwright-zip-inventory.txt
16-cleanup.md
17-sqlite-final.md
18-integrity-final.md
19-known-issues.md
20-evidence-inventory.txt
30-deliverable-to-architect.md
```

Reglas:

- ningún archivo vacío;
- ningún placeholder;
- logs originales;
- ZIP válido y no vacío;
- inventario con ruta, tamaño y SHA-256;
- sin secretos;
- sin datos personales;
- sin `node_modules`;
- todo visible en Drive antes de entregar.

---

## 14. Veredicto

### PASS

Sólo si:

- spec corregido e íntegro;
- lint focal PASS;
- `playwright --list` PASS;
- arranque autoritativo PASS;
- E2E real `1 passed`;
- aceptación y anulación completadas;
- SQLite restaurada;
- lockfiles sin cambios;
- evidencia completa.

### FAIL

Cualquier fallo reproducible, modificación no autorizada o evidencia incompleta.

### BLOCKED

Sólo por dependencia externa totalmente inaccesible antes de reproducir un defecto local.

---

## 15. Cierre

No ejecutar otra prueba.

No iniciar otro vertical.

Entregar `30-deliverable-to-architect.md` y esperar auditoría.

---

**Fin de `APPCAJA-V3-SALARY-RECEIPT-FINAL-E2E-CLOSURE-v1.0.5`.**
