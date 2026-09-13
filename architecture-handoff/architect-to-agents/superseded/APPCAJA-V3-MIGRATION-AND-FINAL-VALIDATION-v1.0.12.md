# APPCAJA-V3-MIGRATION-AND-FINAL-VALIDATION-v1.0.12

**Estado:** ISSUED / AUTORIZADA  
**Proyecto:** CajaApp V3  
**Fecha:** 2026-07-15  
**Root canónico, operativo y único:** `I:\cajaApp-V3`  
**Entorno obligatorio:** Windows x64 + Node.js exacto `v24.18.0`

---

## 1. Objetivo único

Completar la campaña `v1.0.11` sin modificar nuevamente el código:

1. aplicar de forma controlada las migraciones Prisma pendientes sobre la SQLite activa;
2. dejar la base canónica correctamente migrada;
3. validar el Asesor IA con cinco consultas reales consecutivas;
4. ejecutar Playwright focal dos veces;
5. ejecutar Playwright completo;
6. restaurar al cierre una copia limpia **post-migración**, no la base antigua sin migraciones;
7. eliminar `node_modules`;
8. entregar evidencia completa.

Esta campaña es de **migración y validación solamente**.

---

## 2. Veredicto sobre v1.0.11

`APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.11` queda cerrada como `FAIL`.

Se acepta provisionalmente:

- implementación de `previousRejectedOutput`;
- issues estructurados;
- prompt `advisor-prompt-v1.2.0`;
- 148/148 tests backend PASS;
- build backend PASS;
- typecheck, lint y build frontend PASS;
- lockfiles sin cambios;
- política de `node_modules`;
- código del Asesor IA remediado.

No se acepta todavía el vertical completo porque:

- AI Advisor real: 0/5;
- Playwright focal: no ejecutado;
- Playwright completo: no ejecutado;
- la SQLite activa no tenía las tres migraciones requeridas.

---

## 3. Regla de raíz única

Toda operación debe ejecutarse desde:

```text
I:\cajaApp-V3
```

Queda prohibido:

- usar `I:\cajaApp-V3-real`;
- copiar el workspace;
- crear clones, worktrees o espejos;
- ejecutar desde otra raíz;
- materializar evidencia desde otra carpeta.

---

## 4. Política de código congelado

No modificar código, tests, prompts, Prisma, migraciones, configuración, dependencias ni lockfiles.

Registrar hash inicial y final de:

### Backend

- `workspace/backend/src/modules/ai-advisor/ai-advisor.service.ts`
- `workspace/backend/tests/ai-advisor/ai-advisor.service.test.ts`
- `workspace/backend/prisma/schema.prisma`
- las tres migraciones pendientes;
- `workspace/backend/package.json`
- `workspace/backend/package-lock.json`

### Prompt

- `contracts/prompts/advisor/01-explain-financial-context.md`

### Frontend

- `workspace/frontend/tests/ai-advisor.spec.ts`
- `workspace/frontend/src/components/finance/layout/app-shell.tsx`
- `workspace/frontend/src/components/finance/layout/sidebar.tsx`
- todos los specs corregidos en `v1.0.9`;
- `workspace/frontend/package.json`
- `workspace/frontend/package-lock.json`

Todos los hashes deben ser idénticos al cierre.

Si cualquier archivo cambia, cerrar `FAIL`.

---

## 5. Política de `node_modules`

Al inicio:

1. borrar:
   - `workspace/backend/node_modules`;
   - `workspace/frontend/node_modules`;
2. ejecutar `npm ci` por separado;
3. no usar `npm install`;
4. no cambiar lockfiles;
5. no copiar dependencias;
6. excluir `node_modules` de inventarios y evidencia.

Al cierre:

1. volver a verificar hashes de lockfiles;
2. borrar ambos `node_modules`;
3. confirmar que no existen;
4. registrar la limpieza.

---

## 6. Migraciones pendientes autorizadas

Aplicar exclusivamente:

```text
20260713004500_add_amount_privacy_setting
20260714023000_add_financial_health_snapshots
20260714040000_add_ai_advisor_interactions
```

No editar sus archivos.

No crear migraciones nuevas.

No usar `prisma migrate dev`.

Usar únicamente:

```powershell
npx prisma migrate deploy
```

---

## 7. Protección correcta de SQLite

Base activa:

```text
I:\cajaApp-V3\workspace\backend\prisma\dev.db
```

### 7.1 Backup pre-migración

Antes de tocar la base:

1. detener CajaApp;
2. confirmar puertos libres;
3. registrar:
   - SHA-256;
   - tamaño;
   - MTime;
4. crear backup externo fuera de `I:\cajaApp-V3`;
5. verificar hash idéntico.

Este backup es sólo de rollback ante fallo de migración.

### 7.2 Aplicación de migraciones

Desde:

```text
I:\cajaApp-V3\workspace\backend
```

Ejecutar:

```powershell
npx prisma generate
npx prisma migrate status
npx prisma migrate deploy
npx prisma migrate status
```

Gate obligatorio:

- antes: exactamente las tres migraciones declaradas pendientes;
- deploy: exit code 0;
- después: schema up to date;
- ninguna migración adicional;
- ningún error P3000/P3018/P2021.

Si el estado previo difiere, cerrar `FAIL` sin aplicar cambios adicionales.

### 7.3 Baseline post-migración

Después de aplicar migraciones y antes de crear datos UAT:

1. verificar que la app todavía no está ejecutándose;
2. registrar nuevo hash, tamaño y MTime;
3. crear un segundo backup externo:
   - `post-migration-clean-baseline`;
4. verificar hash idéntico entre la base activa y este baseline.

Este segundo backup pasa a ser la referencia de restauración final.

### 7.4 Regla de cierre

En `PASS` o `FAIL` posterior a una migración exitosa:

- **no restaurar la base pre-migración**;
- restaurar el backup `post-migration-clean-baseline`;
- verificar hash idéntico al baseline;
- dejar la SQLite canónica migrada y sin datos UAT.

Sólo restaurar el backup pre-migración si `prisma migrate deploy` falla y no completa correctamente.

---

## 8. Gates backend

Con `node_modules` recién generado:

```powershell
cd I:\cajaApp-V3\workspace\backend
npm ci
npx prisma generate
npx prisma migrate status
npm run build
npm test
```

Gate:

- Prisma status actualizado;
- build PASS;
- 148/148 tests o una cantidad superior legítima;
- cero tests fallidos.

No modificar código si falla.

---

## 9. Gates frontend

```powershell
cd I:\cajaApp-V3\workspace\frontend
npm ci
npm run typecheck
npm run lint
npm run build
```

Gate:

- typecheck PASS;
- lint 0 errores;
- warnings documentados;
- build PASS.

No modificar código si falla.

---

## 10. Arranque y smoke post-migración

Usar el script autoritativo existente desde:

```text
I:\cajaApp-V3
```

No crear runners nuevos.

Verificar:

```text
GET /health => HTTP 200
GET /api/ai-advisor/context?... => HTTP 200
```

Además confirmar:

- el contexto contiene `sourceCount > 0`;
- `sourceFingerprint` tiene 64 caracteres;
- provider configurado;
- no aparece error de tabla inexistente;
- backend y frontend usan los puertos autoritativos.

Si `/api/ai-advisor/context` devuelve 500, guardar body y backend log y cerrar `FAIL`.

---

## 11. Cinco consultas reales consecutivas

Crear contexto UAT controlado mediante las APIs existentes.

Usar exactamente la misma pregunta:

> Explicá el balance realizado y esperado usando sólo fuentes de CajaApp.

Ejecutar las primeras cinco consultas consecutivas después del arranque limpio.

Para cada consulta registrar:

- timestamp;
- HTTP status;
- body completo sanitizado;
- interaction ID;
- context fingerprint;
- provider request ID;
- modelo;
- versión y hash del prompt;
- cantidad de intentos;
- outcome de cada intento;
- issues de reparación;
- citas;
- validación de cada `sourceId`.

Gate:

```text
5/5 HTTP 201 consecutivos
```

No descartar fallos.

No ejecutar consultas extra para sustituir resultados.

No cambiar código.

---

## 12. Playwright focal del Asesor IA

Ejecutar dos veces consecutivas:

```powershell
cd I:\cajaApp-V3\workspace\frontend

& "I:\Tools\node-v24.18.0-win-x64\npx.cmd" playwright test tests/ai-advisor.spec.ts `
  --project=chromium `
  --workers=1 `
  --retries=0 `
  --trace=on
```

Gate:

```text
2/2 PASS
```

Conservar:

- log;
- trace;
- screenshot/video si existe;
- respuesta HTTP;
- cleanup;
- IDs creados y eliminados.

---

## 13. Playwright completo

Sólo después de los gates anteriores:

```powershell
& "I:\Tools\node-v24.18.0-win-x64\npx.cmd" playwright test `
  --project=chromium `
  --workers=1 `
  --retries=0 `
  --trace=on
```

Gate:

- todos los tests PASS;
- ningún retry;
- ningún `force: true`;
- suite completa, sin filtro;
- no detener ante el primer fallo;
- no modificar código durante la ejecución.

Preservar:

- log completo;
- JSON/JUnit si está configurado;
- HTML report;
- `test-results`;
- traces;
- screenshots;
- videos;
- ZIP válido.

---

## 14. Cleanup

Al terminar:

1. limpiar mediante APIs existentes todos los datos UAT creados;
2. detener frontend y backend;
3. confirmar puertos libres;
4. confirmar cero procesos Node de CajaApp;
5. restaurar `post-migration-clean-baseline`;
6. verificar hash y tamaño idénticos;
7. confirmar `npx prisma migrate status` actualizado;
8. eliminar backend y frontend `node_modules`;
9. confirmar lockfiles sin cambios;
10. no borrar evidencia.

---

## 15. Evidencia obligatoria

Crear:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-MIGRATION-AND-FINAL-VALIDATION-evidence-v1.0.12
```

Archivos mínimos:

- `00-verdict.md`
- `01-environment.md`
- `02-integrity-preflight.md`
- `03-frozen-files-initial.txt`
- `04-node-modules-policy.md`
- `05-sqlite-pre-migration.txt`
- `06-sqlite-pre-migration-backup.txt`
- `07-prisma-status-before.log`
- `08-prisma-migrate-deploy.log`
- `09-prisma-status-after.log`
- `10-sqlite-post-migration-baseline.txt`
- `11-backend-npm-ci.log`
- `12-prisma-generate.log`
- `13-backend-build.log`
- `14-backend-tests.log`
- `15-frontend-npm-ci.log`
- `16-frontend-typecheck.log`
- `17-frontend-lint.log`
- `18-frontend-build.log`
- `19-startup.json`
- `20-ai-context-smoke.json`
- `21-ai-real-query-01.json`
- `22-ai-real-query-02.json`
- `23-ai-real-query-03.json`
- `24-ai-real-query-04.json`
- `25-ai-real-query-05.json`
- `26-ai-reliability-summary.md`
- `27-ai-playwright-run-01.log`
- `28-ai-playwright-run-02.log`
- `29-playwright-full.log`
- `30-playwright-results.zip`
- `31-cleanup.json`
- `32-sqlite-final.txt`
- `33-frozen-files-final.txt`
- `34-lockfile-comparison.md`
- `35-known-issues.md`
- `36-evidence-inventory.txt`
- `40-deliverable-to-architect.md`

Reglas:

1. ningún archivo obligatorio puede faltar;
2. ningún archivo puede tener 0 bytes;
3. inventario con nombre, tamaño y SHA-256;
4. el ZIP debe abrir;
5. no copiar logs de otras campañas;
6. no incluir `node_modules`;
7. no incluir secretos;
8. sincronizar completamente antes de entregar.

---

## 16. Criterio final

### PASS

Sólo si:

- raíz única `I:\cajaApp-V3`;
- código congelado sin cambios;
- lockfiles sin cambios;
- migraciones aplicadas correctamente;
- Prisma status actualizado;
- SQLite queda migrada;
- backup post-migración restaurado al cierre;
- backend PASS;
- frontend PASS;
- AI context HTTP 200;
- cinco consultas: 5/5 HTTP 201;
- Playwright focal: 2/2 PASS;
- Playwright completo: todos PASS;
- cleanup completo;
- `node_modules` eliminado;
- evidencia completa.

### FAIL

Cualquier gate incumplido.

### BLOCKED

Sólo ante una dependencia externa demostrable que impida ejecutar. Una migración pendiente o una respuesta inválida del modelo no es `BLOCKED`.

---

## 17. Cierre

1. no modificar código;
2. no iniciar otro vertical;
3. entregar `40-deliverable-to-architect.md`;
4. esperar auditoría del arquitecto.

---

**Fin de la instrucción `APPCAJA-V3-MIGRATION-AND-FINAL-VALIDATION-v1.0.12`.**
