# APPCAJA-V3-SALARY-RECEIPT-FINAL-E2E-CLOSURE-v1.0.4


**Estado:** ISSUED / AUTORIZADA  
**Proyecto:** CajaApp V3  
**Vertical:** `APP-SALARY-RECEIPT-001`  
**Root único:** `I:\cajaApp-V3`  
**Entorno:** Windows x64 + Node.js exacto `v24.18.0`


## 1. Objetivo único


Cerrar exclusivamente los dos gates que quedaron pendientes en v1.0.3:


1. arranque autoritativo mediante `cajaapp-headless-up.ps1`;
2. Playwright E2E real `tests/salary-receipts.real.spec.ts`.


No repetir la suite completa ni los gates ya demostrados.


## 2. Estado aceptado de v1.0.3


Se aceptan como PASS técnico y no deben repetirse:


- backend build;
- test backend focal 5/5;
- query defaults y negativos;
- lint focal;
- PDFs sanitizados;
- importación PDF real;
- edición y recálculo backend;
- aceptación con base futura por defecto;
- aceptación con `useAsFutureBase=false`;
- reemplazo del mismo período;
- versionado y superseded;
- historial;
- anulación;
- restauración SQLite.


La API real demostró que el vertical funciona.


v1.0.3 queda FAIL porque:


- el E2E usaba `import.meta.url`, incompatible con el patrón CommonJS usado por los Playwright existentes;
- el arranque fue sustituido por inicio manual al encontrar un alias de Python de Microsoft Store.


## 3. Corrección del test ya publicada


Archivo:


```text
I:\cajaApp-V3\workspace\frontend\tests\salary-receipts.real.spec.ts
```


Debe contener:


```ts
import { readFile } from "node:fs/promises";
import path from "node:path";


const BASE_FIXTURE = path.resolve(
  __dirname,
  "../../../contracts/examples/salary-receipts/salary-receipt.sanitized.base.pdf",
);
```


Debe cumplir:


- no contiene `import.meta.url`;
- no contiene `fileURLToPath`;
- no contiene `page.route`;
- no contiene mocks;
- crea una copia PDF byte-distinta por ejecución;
- usa backend, Python, IA y persistencia reales.


No modificar este archivo durante la validación.


## 4. Remediación autorizada del script


Único archivo modificable:


```text
I:\cajaApp-V3\cajaapp-headless-up.ps1
```


Problema:


- `Invoke-CapturedProcess` ya preserva argumentos con `&`;
- `Resolve-PythonRuntime` todavía sondea aliases globales aunque la venv administrada ya exista;
- un alias de `Microsoft\WindowsApps` puede lanzar una excepción y abortar el script.


Aplicar exactamente estas reglas:


1. Si existe:


```text
%LOCALAPPDATA%\CajaAppV3\runtime\python\.venv\Scripts\python.exe
```


usar esa venv directamente y no sondear `where py` ni `where python`.


2. Sólo si la venv no existe:
   - consultar `py -0p`;
   - consultar `where python`;
   - ignorar cualquier ruta que contenga:
     ```text
     \Microsoft\WindowsApps\
     ```
   - aceptar Python Windows 3.11 a 3.14.


3. `Invoke-CapturedProcess` debe capturar una excepción de ejecución como:
   - `ExitCode = -1`;
   - texto completo en `StdErr`;
   - sin detener la búsqueda de otro candidato.


4. No usar nuevamente `Start-Process` para comandos capturados.


5. No modificar `start-cajaapp.ps1`.


## 5. Integridad inicial


Registrar SHA-256 de:


```text
cajaapp-headless-up.ps1
workspace/frontend/tests/salary-receipts.real.spec.ts
workspace/backend/package-lock.json
workspace/frontend/package-lock.json
workspace/backend/prisma/dev.db
```


Crear backup binario de SQLite fuera del repo.


Confirmar Node:


```powershell
node --version
```


Resultado obligatorio:


```text
v24.18.0
```


## 6. Validación estática focal


Validar sintaxis PowerShell:


```powershell
$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile(
  "I:\cajaApp-V3\cajaapp-headless-up.ps1",
  [ref]$tokens,
  [ref]$errors
) | Out-Null


$errors
```


Gate: cero errores.


Validar el spec:


```powershell
cd I:\cajaApp-V3\workspace\frontend


npx eslint tests/salary-receipts.real.spec.ts --max-warnings=0
npx playwright test tests/salary-receipts.real.spec.ts --list
```


Gates:


- lint 0 errores y 0 warnings;
- Playwright descubre exactamente un test;
- no aparece `require is not defined`;
- no aparece error de carga del archivo.


## 7. Arranque autoritativo


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


Prohibido sustituirlo por inicio manual.


Gate obligatorio:


- exit code 0;
- stdout contiene un único JSON válido;
- backend HTTP 200 en 11436;
- frontend HTTP 200 en 11437;
- identidad CajaApp;
- Node `v24.18.0`;
- `pythonExecutable` apunta a la venv externa;
- Python compatible;
- `pdfplumberVersion = 0.11.10`;
- no aparece ruta de `Microsoft\WindowsApps`;
- no aparece `SyntaxError`;
- no aparece `Start-Process`;
- backend y frontend quedan vivos con PIDs reales.


## 8. Playwright E2E real


Ejecutar únicamente:


```powershell
cd I:\cajaApp-V3\workspace\frontend


npx playwright test tests/salary-receipts.real.spec.ts `
  --project=chromium `
  --workers=1 `
  --retries=0 `
  --trace=on
```


No ejecutar ningún otro spec.


Debe comprobar realmente:


- CajaApp en 11437;
- Ingresos;
- selección del PDF sanitizado;
- `POST /api/salary-receipts/import` real HTTP 201;
- preview real;
- período 2026-06;
- empleador y empleado demo;
- aceptación real HTTP 201;
- `actualIncomeEventId` no nulo;
- `projectionIncomeEventId` no nulo;
- historial visible;
- anulación real HTTP 200;
- cleanup incluso ante fallo.


No usar mocks, interceptaciones, retries ni skips.


## 9. Cleanup


Antes de limpiar, preservar:


- stdout y stderr del script;
- state JSON;
- backend/frontend logs;
- Playwright log;
- trace;
- screenshot/video/error-context si existen;
- results JSON;
- ZIP real de resultados.


Luego:


1. detener CajaApp con el script;
2. verificar puertos libres;
3. restaurar SQLite;
4. comprobar hash exacto;
5. comprobar lockfiles sin cambios;
6. comprobar el spec sin cambios;
7. eliminar `node_modules`, `dist`, `.next`, `test-results` y `playwright-report`;
8. conservar la venv externa.


## 10. Evidencia


Crear:


```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-SALARY-RECEIPT-FINAL-E2E-CLOSURE-evidence-v1.0.4
```


Archivos obligatorios:


```text
00-verdict.md
01-environment.md
02-v103-audit.md
03-integrity-initial.md
04-script-change.md
05-powershell-parse.log
06-test-load-and-lint.log
07-startup-stdout.log
08-startup-stderr.log
09-startup-state.json
10-runtime-verification.md
11-playwright-real-e2e.log
12-playwright-results-v1.0.4.zip
13-playwright-zip-inventory.txt
14-cleanup.md
15-sqlite-final.md
16-integrity-final.md
17-known-issues.md
18-evidence-inventory.txt
20-deliverable-to-architect.md
```


Nada vacío. Sin placeholders. ZIP válido. Inventario con tamaño y SHA-256.


## 11. Veredicto


### PASS


Sólo si:


- script corregido y parseable;
- arranque autoritativo PASS sin workaround manual;
- spec carga;
- E2E real PASS;
- SQLite restaurada;
- integridad final PASS;
- evidencia completa.


### FAIL


Cualquier defecto local, workaround manual, log vacío o evidencia inválida.


### BLOCKED


Sólo por indisponibilidad externa demostrable del proveedor después de que el script y el test hayan cargado correctamente.


## 12. Cierre


No modificar código de producción.


No ejecutar suite completa.


No repetir los escenarios API ya aprobados.


No iniciar otro vertical.


Entregar `20-deliverable-to-architect.md` y esperar auditoría.