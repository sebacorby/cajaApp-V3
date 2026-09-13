# APPCAJA-V3-PLAYWRIGHT-AI-STABILIZATION-AND-FINAL-CLOSURE-v1.0.14

**Estado:** ISSUED / AUTORIZADA  
**Proyecto:** CajaApp V3  
**Fecha:** 2026-07-15  
**Root canónico y único:** `I:\cajaApp-V3`  
**Entorno obligatorio:** Windows x64 + Node.js exacto `v24.18.0`

---

## 1. Objetivo único

Cerrar técnicamente el vertical del Asesor IA después del fix de consistencia del fingerprint:

1. conservar y congelar el fix backend de `v1.0.13`;
2. corregir únicamente la estructura temporal del E2E focal;
3. mantener toda la cobertura funcional existente;
4. ejecutar Playwright focal dos veces;
5. ejecutar Playwright completo;
6. ejecutar correctamente los gates frontend, incluido lint real con cero errores;
7. entregar evidencia completa y sincronizada;
8. restaurar SQLite y eliminar `node_modules`.

No abrir ningún otro vertical.

---

## 2. Veredicto de v1.0.13

`APPCAJA-V3-AI-FINGERPRINT-CONSISTENCY-AND-FINAL-VALIDATION-v1.0.13` queda cerrada como:

```text
FAIL
```

No existe el estado formal `PARTIAL PASS`.

### 2.1 Cambios aceptados provisionalmente

Se aceptan y quedan congelados:

- `normalizeAdvisorPeriod()`;
- normalización explícita de `{from,to}`;
- `buildContextFingerprint()`;
- uso consistente del período en `context()` y `ask()`;
- fingerprint independiente de `mode`, `currency` y `question`;
- fingerprint determinístico de simulaciones;
- seis tests nuevos;
- suite backend informada como 154/154 PASS;
- smoke de fingerprint informado como 3/3;
- cinco consultas reales informadas como 5/5 HTTP 201;
- SQLite restaurada al baseline post-migración;
- lockfiles sin cambios.

### 2.2 Motivos del FAIL

1. Playwright focal no terminó PASS.
2. Playwright completo no terminó PASS.
3. La carpeta sincronizada de evidencia contiene sólo:
   - `30-validation-summary.md`;
   - `40-deliverable-to-architect.md`.
4. No existen en Drive los logs, smokes, consultas, inventarios, cleanup ni resultados exigidos.
5. El resumen declara `Frontend lint: PASS` pero también registra `183 errors from playwright-report artifacts`.
6. Un gate con 183 errores es `FAIL`, aunque los errores provengan de artefactos generados.
7. La afirmación de que el timeout es sólo temporal no está demostrada porque no se entregó el log focal ni el punto exacto donde venció.

---

## 3. Alcance autorizado

### Archivo modificable

```text
workspace/frontend/tests/ai-advisor.spec.ts
```

### Archivo modificable sólo si es imprescindible para declarar directorios de salida ya existentes

```text
workspace/frontend/playwright.config.ts
```

No modificarlo para aumentar retries, ocultar fallos o reducir cobertura.

### Archivos congelados

No modificar:

```text
workspace/backend/src/modules/ai-advisor/ai-advisor.service.ts
workspace/backend/tests/ai-advisor/ai-advisor.service.test.ts
workspace/backend/src/modules/ai-advisor/ai-advisor.schemas.ts
contracts/prompts/advisor/01-explain-financial-context.md
workspace/backend/prisma/schema.prisma
workspace/backend/prisma/migrations/**
workspace/backend/package.json
workspace/backend/package-lock.json
workspace/frontend/package.json
workspace/frontend/package-lock.json
```

También queda congelado todo frontend productivo.

Registrar SHA-256 inicial y final de los archivos congelados. Deben coincidir.

---

## 4. Diagnóstico del test focal

El spec actual concentra en un único test:

1. creación de dos movimientos;
2. lectura del contexto;
3. primera consulta real por API;
4. validación de fingerprint, claims y citas;
5. navegación desktop;
6. segunda consulta real desde UI;
7. validación visual;
8. navegación mobile;
9. cleanup.

El test tiene un presupuesto total de 240 segundos y contiene dos invocaciones reales al modelo. Un solo intento de reparación puede duplicar la duración de una consulta.

La remediación no consiste en subir arbitrariamente el timeout global. Debe separar responsabilidades para que cada test contenga una sola consulta real al modelo.

---

## 5. Remediación obligatoria del spec

Dividir `ai-advisor.spec.ts` en dos tests independientes.

### 5.1 Test A — contrato API y fingerprint

Nombre sugerido:

```text
Asesor IA mantiene fingerprint, claims y citas consistentes
```

Debe:

1. crear ingreso y egreso UAT;
2. consultar `/api/ai-advisor/context`;
3. comprobar HTTP 200;
4. comprobar `sourceCount > 0`;
5. comprobar fingerprint de 64 caracteres;
6. realizar una sola consulta `/api/ai-advisor/ask`;
7. comprobar HTTP 201;
8. comprobar igualdad exacta entre:
   - `context.sourceFingerprint`;
   - `interaction.context.fingerprint`;
9. comprobar `provider.requestId`;
10. comprobar claims no vacíos;
11. comprobar que cada `sourceId` citado existe en `answer.citations`;
12. eliminar interacción y movimientos creados.

Timeout máximo por test:

```ts
test.setTimeout(240_000);
```

### 5.2 Test B — experiencia UI desktop y mobile

Nombre sugerido:

```text
Asesor IA responde en UI desktop y conserva acceso mobile
```

Debe:

1. crear su propio ingreso y egreso UAT;
2. abrir CajaApp;
3. ingresar a Asesor IA;
4. comprobar resumen de contexto visible;
5. enviar una sola consulta real desde UI;
6. esperar respuesta visible;
7. comprobar interaction ID;
8. comprobar al menos un claim;
9. comprobar al menos una cita;
10. cambiar viewport a `390x844`;
11. recargar;
12. abrir menú;
13. ingresar a Asesor IA;
14. comprobar sección visible;
15. eliminar interacción y movimientos creados.

Timeout máximo por test:

```ts
test.setTimeout(240_000);
```

### 5.3 Reglas estrictas

- Una consulta real al modelo por test.
- Mantener todas las aserciones originales distribuidas entre ambos tests.
- No eliminar la validación mobile.
- No eliminar claims ni citas.
- No quitar la igualdad de fingerprints.
- No usar `test.skip`, `test.fixme` ni `test.fail`.
- No usar `expect.soft`.
- No agregar retries.
- No usar `force: true`.
- No aumentar el timeout global de Playwright.
- No usar waits arbitrarios.
- No reemplazar la IA real por mock.
- No compartir IDs mutables entre tests.
- Cada test debe tener datos y cleanup independientes.
- El cleanup debe ejecutarse en `finally`.
- Registrar duración por etapa mediante `test.step()` o marcas equivalentes.

---

## 6. Limpieza previa obligatoria

Antes de `npm ci`, lint, build o Playwright eliminar únicamente artefactos regenerables:

```text
workspace/frontend/.next
workspace/frontend/playwright-report
workspace/frontend/test-results
workspace/frontend/coverage
workspace/backend/dist
workspace/backend/coverage
```

También eliminar:

```text
workspace/backend/node_modules
workspace/frontend/node_modules
```

No eliminar código, SQLite, migraciones ni evidencia histórica.

### Gate de lint

Ejecutar lint después de limpiar artefactos y antes de ejecutar Playwright.

Resultado obligatorio:

```text
0 errors
```

Los warnings deben documentarse.

No modificar ESLint para ignorar errores reales.

---

## 7. Recuperación y protección SQLite

Base:

```text
I:\cajaApp-V3\workspace\backend\prisma\dev.db
```

Baseline post-migración aceptado:

```text
E24E819EF022028C034214104B62CC409D9161211D43D8EA0A1683A932351208
```

Antes de iniciar:

1. detener CajaApp;
2. confirmar puertos libres;
3. verificar hash actual;
4. si no coincide, restaurar el backup post-migración;
5. verificar hash exacto;
6. crear backup externo de campaña;
7. ejecutar `npx prisma migrate status`;
8. confirmar esquema actualizado.

Al cierre:

1. detener procesos;
2. restaurar el backup limpio;
3. verificar hash exacto;
4. confirmar Prisma actualizado;
5. confirmar puertos libres.

No usar `migrate reset`.

---

## 8. Política de `node_modules`

Al inicio:

1. eliminar ambos `node_modules`;
2. registrar hashes de lockfiles;
3. ejecutar `npm ci` por separado.

Al cierre:

1. verificar lockfiles sin cambios;
2. eliminar ambos `node_modules`;
3. confirmar que no existen.

No usar `npm install`.

---

## 9. Gates backend congelado

Desde:

```text
I:\cajaApp-V3\workspace\backend
```

Ejecutar:

```powershell
npm ci
npx prisma generate
npx prisma migrate status
npm run build
npm test
```

Gate:

- Prisma up to date;
- build PASS;
- 154/154 tests o cantidad superior legítima;
- cero fallos;
- hashes del servicio y tests backend sin cambios.

---

## 10. Gates frontend

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

Gate:

- typecheck PASS;
- lint con cero errores;
- build PASS.

---

## 11. Medición previa del proveedor

Antes de Playwright ejecutar tres consultas reales consecutivas con la misma pregunta:

> Explicá el balance realizado y esperado usando sólo fuentes de CajaApp.

Registrar por consulta:

- inicio;
- fin;
- duración total;
- HTTP status;
- número de intentos;
- duración por intento;
- request IDs;
- fingerprint de contexto;
- fingerprint de interacción;
- igualdad de fingerprints;
- cleanup.

Gate:

```text
3/3 HTTP 201
3/3 fingerprints iguales
cada consulta menor a 180 segundos
```

No sustituir fallos con ejecuciones adicionales.

---

## 12. Playwright focal

Ejecutar:

```powershell
cd I:\cajaApp-V3\workspace\frontend

& "I:\Tools\node-v24.18.0-win-x64\npx.cmd" playwright test tests/ai-advisor.spec.ts `
  --project=chromium `
  --workers=1 `
  --retries=0 `
  --trace=on
```

Ejecutar dos veces consecutivas.

Gate:

```text
2/2 ejecuciones PASS
```

Cada ejecución debe aprobar ambos tests.

Conservar logs y traces de cada corrida.

---

## 13. Playwright completo

Sólo después de aprobar focal 2/2:

```powershell
& "I:\Tools\node-v24.18.0-win-x64\npx.cmd" playwright test `
  --project=chromium `
  --workers=1 `
  --retries=0 `
  --trace=on
```

Gate:

- todos los tests PASS;
- cero retries;
- cero skips nuevos;
- suite sin filtros;
- código congelado durante la ejecución.

---

## 14. Evidencia obligatoria

Crear:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-PLAYWRIGHT-AI-STABILIZATION-AND-FINAL-CLOSURE-evidence-v1.0.14
```

Debe contener:

- `00-verdict.md`
- `01-environment.md`
- `02-integrity-preflight.md`
- `03-v1013-audit.md`
- `04-sqlite-initial.md`
- `05-change-summary.md`
- `06-ai-spec-before.md`
- `07-ai-spec-after.md`
- `08-frozen-files-initial.txt`
- `09-frozen-files-final.txt`
- `10-lockfile-comparison.md`
- `11-node-modules-policy.md`
- `12-backend-npm-ci.log`
- `13-prisma-generate.log`
- `14-prisma-status.log`
- `15-backend-build.log`
- `16-backend-tests.log`
- `17-frontend-npm-ci.log`
- `18-frontend-typecheck.log`
- `19-frontend-lint.log`
- `20-frontend-build.log`
- `21-startup.json`
- `22-ai-timing-query-01.json`
- `23-ai-timing-query-02.json`
- `24-ai-timing-query-03.json`
- `25-ai-timing-summary.md`
- `26-ai-playwright-run-01.log`
- `27-ai-playwright-run-02.log`
- `28-playwright-full.log`
- `29-playwright-results.zip`
- `30-cleanup.json`
- `31-sqlite-final.md`
- `32-known-issues.md`
- `33-evidence-inventory.txt`
- `40-deliverable-to-architect.md`

### Reglas

1. Ningún archivo obligatorio puede faltar.
2. Ningún archivo puede tener cero bytes.
3. No usar placeholders `{}` o `[]`.
4. El inventario debe incluir tamaño y SHA-256.
5. El ZIP debe abrir.
6. No copiar evidencia de campañas anteriores.
7. No incluir secretos.
8. No incluir `node_modules`.
9. Después de sincronizar, listar la carpeta desde Drive.
10. La carpeta visible en Drive debe contener todos los archivos anteriores.
11. No entregar si Drive sólo muestra un subconjunto.
12. No declarar `PARTIAL PASS`.

---

## 15. Archivo de campaña anterior

Mover:

```text
APPCAJA-V3-AI-FINGERPRINT-CONSISTENCY-AND-FINAL-VALIDATION-evidence-v1.0.13
```

desde `pending-validation` hacia:

```text
architecture-handoff\agents-to-architect\rejected
```

No completar retrospectivamente la evidencia.

---

## 16. Criterio final

### PASS

Sólo si:

- backend fingerprint congelado y sin regresiones;
- backend tests PASS;
- lint real con cero errores;
- medición IA 3/3 PASS;
- Playwright focal 2/2 PASS;
- Playwright completo PASS;
- SQLite restaurada al baseline;
- lockfiles sin cambios;
- `node_modules` eliminado;
- evidencia completa y sincronizada en Drive.

### FAIL

Cualquier gate incumplido.

### BLOCKED

Sólo ante una dependencia externa demostrable. Un timeout de test, error de lint, falta de evidencia, fallo de cleanup o sincronización incompleta es `FAIL`.

---

## 17. Cierre

1. no iniciar otro vertical;
2. entregar `40-deliverable-to-architect.md`;
3. esperar auditoría.

---

**Fin de la instrucción `APPCAJA-V3-PLAYWRIGHT-AI-STABILIZATION-AND-FINAL-CLOSURE-v1.0.14`.**
