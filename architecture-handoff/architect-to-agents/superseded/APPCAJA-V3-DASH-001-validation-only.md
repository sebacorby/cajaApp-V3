# APPCAJA-V3-DASH-001 — Validación exclusiva del Dashboard real

**Estado:** vigente  
**Proyecto:** CajaApp V3  
**Root:** `I:\cajaApp-V3`  
**Entorno obligatorio:** Windows x64 + `node-v24.18.0-win-x64`  
**Versión exacta:** `v24.18.0`

---

## 1. Objetivo único

Validar la implementación existente de `APP-DASH-VERTICAL-001 — Dashboard real conectado al ledger`.

El agente ejecuta instalación reproducible, generación Prisma, migraciones, build, tests, smoke, Playwright y UAT. **No modifica código, configuración, documentación, schemas, migraciones ni dependencias.**

Si algo falla, debe conservar la evidencia y entregar `FAIL` o `BLOCKED` sin remediar.

---

## 2. Alcance permitido

El agente puede:

- verificar versiones y rutas;
- respaldar la base SQLite antes de migrar;
- ejecutar `npm ci`;
- ejecutar Prisma generate y migrate deploy;
- ejecutar typecheck, lint, builds y tests existentes;
- iniciar backend y frontend para smoke/UAT;
- ejecutar Playwright mediante CLI nativa;
- crear logs y el reporte final bajo `pending-validation`.

El agente no puede:

- editar archivos del proyecto;
- ejecutar `npm install`;
- ejecutar `npm audit fix` ni `npm audit fix --force`;
- cambiar versiones de paquetes;
- crear wrappers o scripts auxiliares;
- usar Node distinto de `v24.18.0`;
- usar Linux, WSL, Docker o Bun;
- modificar el SSOT `APPCAJA-V3-IMPLEMENTATION-TRACEABILITY.md`;
- borrar o resetear la base de datos;
- declarar PASS si un paso obligatorio no fue ejecutado.

---

## 3. Gate inicial de entorno

La primera entrada efectiva de `where.exe node` debe ser:

```text
I:\Tools\node-v24.18.0-win-x64\node.exe
```

`node --version` debe devolver exactamente:

```text
v24.18.0
```

Si no coincide exactamente, finalizar como `BLOCKED`.

---

## 4. Backend

Directorio:

```text
I:\cajaApp-V3\workspace\backend
```

### 4.1 Respaldo previo

Crear una copia fechada de la SQLite vigente antes de aplicar migraciones. No modificar ni reemplazar la base original fuera del proceso normal de `prisma migrate deploy`.

### 4.2 Comandos obligatorios

```powershell
npm ci
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build
npm run test
```

Confirmar expresamente que la suite descubre y ejecuta:

```text
tests/dashboard/dashboard.service.test.ts
```

El test de Dashboard debe quedar `3/3 PASS` como mínimo, además del resto de la suite.

### 4.3 Smoke API

Iniciar el backend con las herramientas y scripts existentes. No crear scripts nuevos.

Validar:

```text
GET /health
GET /api/dashboard?from=2026-07-01&to=2026-07-31
```

El contrato debe incluir como mínimo:

- `range` y `previousRange`;
- `summary.actual`;
- `summary.pending`;
- `summary.projected`;
- `summary.expected`;
- `comparison`;
- `categories`;
- `monthlyEvolution`;
- `recentMovements`;
- `commitments`;
- `dataQuality`.

Verificar que todos los totales mantengan ARS y USD separados y que no exista conversión implícita.

### 4.4 Períodos

Ejecutar smoke para:

- un mes calendario;
- un trimestre calendario;
- un año calendario.

Confirmar que `previousRange` sea el período calendario inmediatamente anterior. Ejemplo obligatorio:

```text
from=2026-07-01&to=2026-07-31
previousRange.from=2026-06-01
previousRange.to=2026-06-30
```

---

## 5. Frontend

Directorio:

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

El build no puede mostrar que se omiten errores TypeScript. Si aparece `Skipping validation of types` pero `npm run typecheck` fue ejecutado previamente y terminó PASS, registrarlo como observación; si el typecheck no fue ejecutado o falla, el gate es FAIL.

No ejecutar remediaciones automáticas sobre las vulnerabilidades moderadas conocidas.

---

## 6. Playwright

Usar exclusivamente Playwright CLI y la configuración existente:

```powershell
npx playwright test tests/dashboard.spec.ts --project=chromium --workers=1 --retries=0 --trace=on
```

No crear wrappers, `.bat`, `.cmd`, JavaScript auxiliar ni scripts temporales.

El test debe demostrar:

- apertura del Dashboard real;
- lectura de movimientos desde el backend;
- presencia de balance realizado y esperado;
- movimiento real visible;
- compromiso pendiente visible;
- limpieza de los datos E2E creados.

---

## 7. UAT funcional

Usar datos de prueba controlados y dejar evidencia de:

1. Dashboard sin datos: estado vacío honesto y sin importes ficticios.
2. Cargar ingreso ARS real.
3. Cargar egreso ARS real.
4. Cargar movimiento USD real.
5. Cargar compromiso pendiente o proyectado.
6. Confirmar que el balance realizado excluya pendientes/proyectados.
7. Confirmar que el balance esperado los incluya.
8. Confirmar separación estricta de ARS y USD.
9. Confirmar gasto por categoría.
10. Confirmar indicador de movimientos `Sin clasificar`.
11. Cambiar entre mes, trimestre, semestre y año.
12. Confirmar comparación contra el período calendario anterior.
13. Recargar la página y confirmar persistencia.
14. Confirmar estados de carga y error sin valores simulados.
15. Revisar vista desktop y viewport móvil.

No utilizar PDFs, CSVs o datos personales reales como evidencia compartida.

---

## 8. Integridad

Al finalizar, comprobar que ningún archivo gobernado fue modificado durante la tarea.

Son artifacts esperados:

```text
node_modules/
dist/
.next/
test-results/
playwright-report/
logs bajo pending-validation/
```

No limpiar estos artifacts antes del reporte.

---

## 9. Entregable

Crear un único Markdown:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-DASH-001-result-v1.0.0.md
```

No entregar ZIP.

El reporte debe incluir:

- resultado global `PASS`, `FAIL` o `BLOCKED`;
- versión y ruta efectiva de Node;
- resultados de Prisma generate y migrate deploy;
- backend build y suite completa;
- resultado específico `tests/dashboard/dashboard.service.test.ts`;
- frontend typecheck, lint y build;
- Playwright Dashboard;
- smoke API por período;
- UAT funcional;
- integridad del proyecto;
- warnings y deudas no bloqueantes;
- rutas de todos los logs y evidencias.

---

## 10. Movimiento físico del entregable

El agente deja inicialmente el reporte en `pending-validation`.

Después de la auditoría del arquitecto:

- si es aceptado, el agente deberá mover físicamente el reporte y sus evidencias a `agents-to-architect/accepted`;
- si es rechazado, deberá mover físicamente el reporte y sus evidencias a `agents-to-architect/rejected`.

No alcanza con cambiar el estado escrito: el artifact debe quedar en la carpeta correspondiente.
