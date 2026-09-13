# APPCAJA-V3-SALARY-RECEIPT-FINAL-E2E-CLOSURE-v1.0.6

**Estado:** ISSUED / AUTORIZADA  
**Proyecto:** CajaApp V3  
**Vertical:** `APP-SALARY-RECEIPT-001`  
**Tipo:** cierre focal mínimo posterior a corrección de API Playwright  
**Root único:** `I:\cajaApp-V3`  
**Entorno obligatorio:** Windows x64 + Node.js exacto `v24.18.0`

---

## 1. Objetivo único

Validar exclusivamente el E2E real:

```text
workspace/frontend/tests/salary-receipts.real.spec.ts
```

La campaña debe cerrar el último defecto de test detectado en v1.0.5.

No ejecutar suite completa.  
No repetir Prisma, backend build, tests backend, smoke API, reemplazo ni base futura.

---

## 2. Estado aceptado de campañas anteriores

Se consideran técnicamente aceptados y no deben repetirse como campañas independientes:

- backend build PASS;
- backend focal 5/5 PASS;
- query defaults y negativos PASS;
- frontend focal lint PASS;
- arranque autoritativo PASS;
- Python desde virtualenv administrada;
- `pdfplumber 0.11.10`;
- backend HTTP 200 en `11436`;
- frontend HTTP 200 en `11437`;
- importación PDF real HTTP 201;
- preview editable renderizado;
- recálculo backend correcto;
- aceptación y anulación reales;
- base futura por defecto;
- base futura explícitamente desactivada;
- reemplazo del mismo período sin duplicados;
- SQLite restaurada exactamente;
- lockfiles sin cambios.

---

## 3. Defecto corregido

La expectativa inválida de v1.0.5 era:

```ts
await expect(
  preview.getByDisplayValue(/Sueldo b[aá]sico/i),
).toBeVisible();
```

`preview` es un `Locator` y no expone `getByDisplayValue()`.

La corrección publicada es:

```ts
await expect(
  page.getByDisplayValue(/Sueldo b[aá]sico/i),
).toBeVisible();
```

Archivo corregido:

```text
I:\cajaApp-V3\workspace\frontend\tests\salary-receipts.real.spec.ts
```

No se modificó código de producción, backend, Prisma, contratos, scripts, dependencias ni lockfiles.

---

## 4. Regla de trabajo

El agente actúa exclusivamente como validador.

No modificar:

- código;
- test;
- fixture;
- scripts;
- Prisma;
- package files;
- lockfiles;
- SQLite de manera permanente;
- SSOT.

Ante cualquier defecto, preservar evidencia y emitir `FAIL`.

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

1. existe `page.getByDisplayValue(/Sueldo b[aá]sico/i)`;
2. no existe `preview.getByDisplayValue`;
3. no existe la expectativa anterior `preview.toContainText(/Sueldo b[aá]sico/i)`;
4. no existe `page.route`;
5. no existe `route.fulfill`;
6. no existe `test.skip`;
7. no existe `test.fixme`;
8. continúa usando el PDF sanitizado real;
9. continúa generando una copia byte-distinta por ejecución;
10. mantiene cleanup por `/reverse` dentro de `finally`.

---

## 6. Protección de SQLite

Antes de iniciar:

1. detener CajaApp si estuviera activo;
2. calcular SHA-256 de `workspace\backend\prisma\dev.db`;
3. copiar la base fuera del repo;
4. registrar hash, tamaño y fecha;
5. no ejecutar `prisma migrate reset`;
6. restaurar exactamente la copia al finalizar.

El hash observado al inicio es la autoridad final.

---

## 7. Preparación mínima

Instalar únicamente lo necesario:

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

## 8. Gate estático exclusivo

Desde:

```text
I:\cajaApp-V3\workspace\frontend
```

Ejecutar:

```powershell
npx eslint tests/salary-receipts.real.spec.ts --max-warnings=0

npx playwright test tests/salary-receipts.real.spec.ts `
  --project=chromium `
  --list
```

Gates:

- lint: cero errores y cero warnings;
- Playwright descubre exactamente un test;
- no existe error de carga;
- no existe error de API Playwright;
- no existe error de fixture.

---

## 9. Arranque autoritativo

Ejecutar únicamente:

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
- Python absoluto dentro de la virtualenv administrada;
- ruta sin `WindowsApps`;
- `pdfplumber 0.11.10`.

---

## 10. Único test autorizado

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

1. apertura de CajaApp;
2. navegación a Ingresos;
3. selección del PDF real;
4. `POST /api/salary-receipts/import` HTTP 201;
5. preview visible;
6. empleador correcto;
7. empleado correcto;
8. período `2026-06`;
9. campo con display value `Sueldo básico` o variante sin tilde;
10. texto `Neto a cobrar`;
11. checkbox de base futura activado;
12. aceptación HTTP 201;
13. evento real creado;
14. evento proyectado creado;
15. historial visible;
16. anulación HTTP 200;
17. mensaje de anulación visible;
18. cleanup del recibo generado.

No modificar el test durante la ejecución.

---

## 11. Evidencia real antes del cleanup

Preservar:

- `npm ci` backend y frontend;
- lint focal;
- `playwright --list`;
- stdout y stderr del arranque;
- state JSON;
- log Playwright;
- `test-results`;
- trace;
- screenshots;
- video, si existe;
- `error-context.md`, si existe;
- resultados JSON.

Crear el archivo real:

```text
playwright-salary-receipt-final-v1.0.6.zip
```

El ZIP debe:

- contener bytes reales de los artefactos;
- abrir correctamente;
- tener tamaño consistente con su contenido;
- quedar copiado físicamente dentro de la carpeta de evidencia sincronizada en Drive;
- no ser un `.md`, acceso directo, puntero ni placeholder.

La campaña v1.0.5 informó un ZIP local de aproximadamente 3,4 MB, pero en la carpeta visible de Drive quedó un archivo de 231 bytes. En v1.0.6 se debe verificar el ZIP desde Drive después de copiarlo.

---

## 12. Cleanup final

1. confirmar que el test anuló el recibo;
2. detener CajaApp mediante el script;
3. verificar puertos `11436` y `11437` libres;
4. restaurar SQLite;
5. comprobar SHA-256 exacto;
6. comprobar lockfiles sin cambios;
7. comprobar el script sin cambios;
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
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-SALARY-RECEIPT-FINAL-E2E-CLOSURE-evidence-v1.0.6
```

Archivos mínimos:

```text
00-verdict.md
01-environment.md
02-v105-audit.md
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
14-playwright-salary-receipt-final-v1.0.6.zip
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
- ZIP real y válido;
- inventario con ruta, tamaño y SHA-256;
- sin secretos;
- sin datos personales;
- sin `node_modules`;
- todos los archivos visibles en Drive antes de entregar.

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
- ZIP real visible y descargable desde Drive;
- evidencia completa.

### FAIL

Cualquier fallo reproducible, modificación no autorizada o evidencia incompleta.

### BLOCKED

Sólo por una dependencia externa totalmente inaccesible antes de reproducir un defecto local.

---

## 15. Cierre

No ejecutar otra prueba.

No iniciar otro vertical.

Entregar `30-deliverable-to-architect.md` y esperar auditoría.

---

**Fin de `APPCAJA-V3-SALARY-RECEIPT-FINAL-E2E-CLOSURE-v1.0.6`.**
