# APPCAJA-V3-CAT-001 — VALIDACIÓN SOLAMENTE

**Estado:** vigente  
**Proyecto:** CajaApp V3  
**Root:** `I:\cajaApp-V3`  
**Vertical:** Administración de categorías

## 1. Objetivo

Validar en el entorno local real la implementación ya realizada de administración de categorías, reglas determinísticas y recategorización.

El agente únicamente ejecuta comandos, pruebas y UAT, guarda evidencia y entrega un reporte. **No está autorizado a modificar código, configuración, migraciones, tests, documentación, dependencias ni el SSOT.**

## 2. Entorno obligatorio

- Windows x64.
- PowerShell.
- Distribución exacta: `node-v24.18.0-win-x64`.
- `node --version` debe devolver exactamente `v24.18.0`.
- Binario esperado: `I:\Tools\node-v24.18.0-win-x64\node.exe`.
- npm, no Bun.
- No usar Linux, WSL, Docker ni Node alternativo.

Si la versión o ruta no coinciden exactamente, finalizar como `BLOCKED` sin ejecutar instalaciones.

## 3. Prohibiciones

No realizar ninguna de estas acciones:

- editar archivos;
- corregir errores encontrados;
- ejecutar `npm install`;
- ejecutar `npm audit fix`, especialmente con `--force`;
- actualizar paquetes;
- editar `package.json` o lockfiles;
- ejecutar `prisma db push`;
- ejecutar `prisma migrate reset`;
- borrar o reemplazar SQLite;
- crear scripts auxiliares, wrappers, `.bat`, `.cmd` o JavaScript de prueba;
- modificar `APPCAJA-V3-IMPLEMENTATION-TRACEABILITY.md`;
- modificar tests para hacerlos pasar;
- cambiar reglas, categorías o datos reales fuera de la UAT controlada.

Ante un fallo, registrar el error completo y continuar sólo si el siguiente paso no depende del fallido. No remediar.

## 4. Evidencia

Crear una carpeta liviana:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-CAT-001-evidence-v1.0.0
```

Guardar allí los logs indicados. No incluir:

- bases SQLite;
- `.env`;
- secretos;
- `node_modules`;
- `.next`;
- `dist`;
- documentos financieros;
- CSV reales del usuario.

## 5. Gate de entorno

En una consola PowerShell nueva:

```powershell
$NodeHome = "I:\Tools\node-v24.18.0-win-x64"
$env:Path = "$NodeHome;$env:Path"
Set-Location -LiteralPath "I:\cajaApp-V3"
where.exe node
where.exe npm
node --version
npm --version
node -p "process.platform + ' ' + process.arch + ' node-v' + process.versions.node"
```

Registrar la salida en `environment.log`.

Criterios:

- primera ruta de `where.exe node`: `I:\Tools\node-v24.18.0-win-x64\node.exe`;
- Node: `v24.18.0`;
- plataforma: `win32 x64`.

## 6. Backend

### 6.1 Preparación

Ubicarse en:

```powershell
Set-Location -LiteralPath "I:\cajaApp-V3\workspace\backend"
```

Resolver `DATABASE_URL` sin imprimir secretos. Si corresponde a SQLite y el archivo existe, crear un respaldo con timestamp bajo `%TEMP%\cajaapp-sqlite-backups`. No adjuntar el respaldo.

### 6.2 Instalación, Prisma, migración, build y tests

Ejecutar, en este orden:

```powershell
npm ci
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build
npm run test
```

Guardar:

- `backend-npm-ci.log`;
- `backend-prisma-generate.log`;
- `backend-migrate-deploy.log`;
- `backend-build.log`;
- `backend-tests.log`.

Confirmar expresamente:

- migración `20260711234500_add_category_rules` aplicada o ya aplicada;
- Prisma Client generado;
- build con exit code `0`;
- descubrimiento y ejecución de `tests/movements/categories.rules.test.ts`;
- resultado de los tests existentes de Movimientos y CSV;
- ninguna migración fue editada o regenerada.

## 7. Smoke API

Con el backend iniciado mediante las herramientas existentes del proyecto, validar sin crear scripts auxiliares:

1. `GET /api/movements/categories?includeInactive=true` devuelve categorías, palabras clave y conteos.
2. Crear una categoría temporal `CAT-UAT-<timestamp>` con color, ícono y dos palabras clave.
3. Editar color, ícono y palabras clave.
4. Crear un movimiento manual temporal y asignarle la categoría mediante `PUT /api/movements/categories/assignment`.
5. Confirmar el cambio en `GET /api/movements`.
6. Ejecutar `POST /api/movements/categories/suggest` con una descripción coincidente y confirmar la sugerencia exacta.
7. Archivar la categoría temporal y comprobar que el movimiento queda en `Sin clasificar`.
8. Restaurar la categoría.
9. Confirmar que intentar archivar `Sin clasificar` o renombrar una categoría del sistema devuelve error controlado.
10. Anular/eliminar el movimiento temporal.
11. Dejar la categoría temporal archivada para que no aparezca en nuevas cargas.

No usar datos financieros personales.

## 8. Frontend

Ubicarse en:

```powershell
Set-Location -LiteralPath "I:\cajaApp-V3\workspace\frontend"
```

Ejecutar:

```powershell
npm ci
npm run typecheck
npm run lint
npm run build
```

Guardar:

- `frontend-npm-ci.log`;
- `frontend-typecheck.log`;
- `frontend-lint.log`;
- `frontend-build.log`.

Criterios:

- `npm run typecheck` debe ejecutar `tsc --noEmit` y terminar con código `0`;
- `next.config.ts` no debe contener `ignoreBuildErrors: true`;
- `npm run build` debe ejecutar primero el typecheck;
- build final con código `0`;
- las 9 vulnerabilidades moderadas preexistentes no bloquean este gate y no deben remediarse en esta tarea.

## 9. Playwright

Con backend y frontend reales iniciados, ejecutar desde frontend:

```powershell
npx playwright test tests/categories.spec.ts
```

Guardar `playwright-categories.log`, screenshots y trace sólo si Playwright los genera naturalmente.

No modificar el spec si falla.

## 10. UAT manual

Desde la UI real:

1. abrir `Movimientos`;
2. abrir `Categorías`;
3. crear una categoría con nombre, color, ícono y palabras clave;
4. editarla;
5. verificar conteos de uso;
6. crear un movimiento manual sin categoría;
7. asignar la categoría directamente desde el ledger;
8. refrescar y confirmar persistencia;
9. verificar que una fila CSV aceptada también permita cambio rápido de categoría;
10. cargar un CSV de prueba sanitizado con una descripción coincidente y confirmar que el preview sugiere la categoría;
11. archivar la categoría y confirmar reasignación a `Sin clasificar`;
12. restaurarla;
13. confirmar que las categorías del sistema están identificadas y no pueden archivarse ni renombrarse;
14. limpiar el movimiento temporal y dejar archivada la categoría temporal.

No adjuntar el CSV ni datos personales.

## 11. Integridad

Comprobar que el agente no modificó intencionalmente:

```text
workspace/backend/src/**
workspace/backend/prisma/schema.prisma
workspace/backend/prisma/migrations/**
workspace/backend/tests/**
workspace/backend/package.json
workspace/backend/package-lock.json
workspace/frontend/src/**
workspace/frontend/tests/**
workspace/frontend/next.config.ts
workspace/frontend/package.json
workspace/frontend/package-lock.json
docs/**
architecture-handoff/architect-to-agents/**
start-cajaapp.ps1
```

Son aceptables únicamente artifacts naturales de instalación, compilación y pruebas.

## 12. Criterio final

### PASS

Sólo si pasan:

- entorno exacto;
- backup previo de SQLite cuando corresponda;
- `npm ci` backend/frontend;
- Prisma generate y migrate deploy;
- backend build y tests;
- smoke API completo;
- frontend typecheck, lint y build;
- Playwright de categorías;
- UAT manual;
- persistencia y recategorización;
- integridad sin cambios de código.

### FAIL

El entorno es correcto, pero falla una compilación, test, smoke, Playwright, UAT o integridad.

### BLOCKED

No puede alcanzarse el gate por entorno, permisos, accesos o recursos externos imprescindibles.

## 13. Entregable único

Crear únicamente:

```text
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-CAT-001-validation-report-v1.0.0.md
```

No crear ZIP.

El reporte debe incluir:

- PASS, FAIL o BLOCKED;
- Node y npm exactos;
- tabla de comandos y exit codes;
- migración aplicada;
- tests descubiertos y resultados;
- smoke API;
- typecheck, lint y build frontend;
- Playwright;
- UAT;
- integridad;
- ubicación de logs;
- errores completos y honestos;
- confirmación explícita de que el agente no modificó código ni documentación.
