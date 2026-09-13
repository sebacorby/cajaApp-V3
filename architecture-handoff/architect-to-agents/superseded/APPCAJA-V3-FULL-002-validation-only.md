# APPCAJA-V3-FULL-002 — VALIDACIÓN SOLAMENTE

## 0. Regla absoluta de esta tarea

El código de esta iteración ya fue implementado por el arquitecto.

**El agente no está autorizado a crear, modificar, formatear, remediar ni eliminar código, configuración, migraciones, dependencias, schemas, tests o scripts.**

Su única función es:

1. verificar solamente los archivos y rutas enumerados en este documento, sin exploración amplia del repositorio;
2. ejecutar instalación reproducible, migración, build y pruebas;
3. realizar la UAT real;
4. guardar evidencias;
5. informar PASS o FAIL con datos concretos.

Si algo falla, registrar el fallo y devolverlo. **No corregirlo.**

---

## 1. Ubicación obligatoria

- Proyecto: `CajaApp V3`
- Root: `I:\cajaApp-V3`
- Backend: `I:\cajaApp-V3\workspace\backend`
- Frontend: `I:\cajaApp-V3\workspace\frontend`
- Launcher: `I:\cajaApp-V3\start-cajaapp.ps1`
- Entrega: `I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation`

Entorno obligatorio:

- Windows x64
- Node.js exacto `v24.18.0` (`node-v24.18.0-win-x64`)
- npm
- PowerShell

Si `node --version` no es exactamente `v24.18.0`, finalizar con FAIL de entorno. No cambiar Node, no usar otra versión de Node, Bun, WSL ni Linux.

---

## 2. Estado implementado que se debe validar

La iteración incluye:

- CRUD real de fuentes recurrentes;
- proyección mensual en backend;
- aumento periódico compuesto;
- cambio permanente desde un mes;
- valor real de un único mes;
- bonos, aguinaldos y extras en ARS o USD;
- agregados ARS/USD calculados exclusivamente por backend;
- contratos API normalizados;
- validaciones HTTP 400;
- migración incremental de `IncomeEvent.currency`;
- UI completa de Ingresos;
- test unitario de cálculos;
- E2E Playwright real;
- launcher compatible con Node v24.18.0 y puertos parametrizables.

---

## 3. Prohibiciones

No ejecutar:

- `prisma migrate reset`;
- `prisma db push`;
- borrado de la base;
- scripts auxiliares nuevos;
- cambios manuales en `package.json` o lockfiles;
- edición de tests para hacerlos pasar;
- cambios en Tarjetas, IA, Ollama o importaciones.

No crear wrappers para Playwright.

Si por un fallo del launcher fuera necesario iniciar un servidor sólo para diagnosticar, aplicar la norma Windows permanente: usar `Start-Process` sin `-RedirectStandardOutput` ni `-RedirectStandardError`, iniciar primero el servidor y recién después seguir su archivo de log. Nunca iniciar el servidor y esperarlo en el mismo comando. No reemplazar ni editar el launcher.

---

## 4. Preparación y evidencia de entorno

Crear una carpeta de evidencia liviana fuera de `workspace`, por ejemplo:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-FULL-002-evidence-v1.0.0
```

Registrar en `environment.txt`:

```powershell
Get-Date -Format o
node --version
npm --version
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsArchitecture
```

No incluir variables secretas ni contenido de `.env`.

---

## 5. Validación backend

Desde `I:\cajaApp-V3\workspace\backend` ejecutar, sin alterar los comandos:

```powershell
npm ci
npm run prisma:generate
```

Antes de aplicar la migración:

1. resolver la ruta real del SQLite desde `DATABASE_URL`;
2. copiar el archivo de base a una carpeta temporal de respaldo con timestamp;
3. no adjuntar ese respaldo a la entrega porque puede contener datos personales.

Luego ejecutar:

```powershell
npm run prisma:migrate:deploy
npm run build
npm run test
```

Guardar las salidas completas en:

- `backend-npm-ci.log`
- `backend-prisma-generate.log`
- `backend-migrate-deploy.log`
- `backend-build.log`
- `backend-tests.log`

Confirmar explícitamente que Vitest ejecutó:

```text
tests/incomes/incomes.calculation.test.ts
```

No declarar PASS si el test nuevo no fue descubierto.

---

## 6. Validación frontend

Desde `I:\cajaApp-V3\workspace\frontend` ejecutar:

```powershell
npm ci
npm run lint
npm run build
```

Guardar:

- `frontend-npm-ci.log`
- `frontend-lint.log`
- `frontend-build.log`

El build debe ejecutarse con Node v24.18.0 y sin Bun.

---

## 7. Inicio real

Ejecutar exactamente:

```powershell
I:\cajaApp-V3\start-cajaapp.ps1
```

Validar:

- backend responde en `http://127.0.0.1:11436/health`;
- frontend responde en `http://127.0.0.1:3000`;
- la pestaña Ingresos abre;
- la pestaña Tarjetas sigue abriendo;
- no se ejecuta un `dist` viejo;
- no aparece una exigencia de una versión distinta de `v24.18.0`.

Guardar `launcher-smoke.log`.

---

## 8. Playwright real

Con backend y frontend reales iniciados, desde frontend ejecutar:

```powershell
npx playwright test tests/e2e/incomes.spec.ts
```

El spec debe completar sin mocks financieros:

- creación de sueldo;
- aumento automático;
- cambio permanente;
- override mensual;
- extra USD;
- persistencia tras recarga;
- limpieza de sus propios datos E2E.

Guardar:

- `playwright-incomes.log`;
- screenshot generado por el spec;
- trace sólo si se genera automáticamente.

No modificar el spec si falla.

---

## 9. Smoke manual final

Desde la UI real comprobar:

1. abrir Ingresos;
2. crear una fuente ARS temporal;
3. crear un extra USD temporal;
4. comprobar que ARS y USD se muestran separados;
5. refrescar la página y comprobar persistencia;
6. eliminar los datos temporales;
7. abrir Tarjetas y comprobar que la pantalla sigue operativa.

No subir datos personales como evidencia.

---

## 10. Criterio de PASS

Sólo declarar PASS si todo esto es verdadero:

- Node `v24.18.0`;
- `npm ci` backend PASS;
- `prisma generate` PASS;
- `prisma migrate deploy` PASS sin reset;
- backend build PASS;
- backend tests PASS e incluyen el test de Ingresos;
- `npm ci` frontend PASS;
- frontend lint PASS;
- frontend build PASS;
- launcher PASS;
- Playwright Ingresos PASS;
- persistencia real PASS;
- ARS/USD separados PASS;
- smoke de Tarjetas PASS;
- ningún archivo de código fue modificado por el agente.

Si un punto falla, el estado final es `FAIL / pending-remediation`.

---

## 11. Entrega obligatoria

Crear solamente:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-FULL-002-validation-report-v1.0.0.md
```

El reporte debe incluir:

- estado PASS o FAIL;
- versión exacta de Node y npm;
- tabla de comandos y exit codes;
- resultado de la migración;
- resultado de tests backend;
- resultado lint/build frontend;
- resultado Playwright;
- resultado smoke manual;
- ubicación de evidencias;
- lista de archivos modificados antes/después para demostrar que el agente no tocó código;
- errores completos y honestos si existieran.

No empaquetar el proyecto, `node_modules`, `.next`, `dist`, bases SQLite, uploads ni PDFs.
