# APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.6

Estado: ISSUED / AUTORIZADA
Proyecto: CajaApp V3
Root obligatorio: `I:\cajaApp-V3`
Entorno obligatorio: Windows x64 + Node.js exacto `v24.18.0`

## 1. Objetivo

Remediar exclusivamente los dos defectos confirmados por la campaña `v1.0.5` y ejecutar desde cero la validación consolidada completa de CajaApp V3.

Defectos confirmados:

1. Falta `workspace\frontend\src\lib\finance\global-search-api.ts`.
2. `workspace\frontend\src\components\finance\charts\category-donut.tsx` muta `cumulativeShare` durante render y falla lint.

El arquitecto ya corrigió ambos archivos en Drive y publicó copias exactas en una carpeta sincronizable. No reconstruir código, no reinterpretar contratos y no aplicar otras remediaciones.

## 2. Gobierno

- `APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.5` terminó `FAIL` y está `SUPERSEDED`.
- Su evidencia ya fue movida físicamente a `agents-to-architect\rejected\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.5-FAIL`.
- Esta `v1.0.6` es la única instrucción vigente.
- La campaña tiene una fase de remediación limitada `6A`; después de finalizarla queda prohibido modificar código, tests, configuración, migraciones, dependencias, prompts, contratos o SQLite.
- Un fallo en un gate no autoriza arreglos durante la campaña. Continuar los gates técnicamente ejecutables para devolver un diagnóstico completo.

## 3. Evidencia nueva

Crear una carpeta nueva y única:

`I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.6`

No reutilizar logs, backups, hashes ni resultados de versiones anteriores.

## 4. Fase 6A — recuperación canónica obligatoria

Carpeta origen:

`H:\Google Drive\cajaApp-V3\architecture-handoff\architect-to-agents\issued\APPCAJA-V3-v1.0.6-CANONICAL-RECOVERY`

También puede aparecer bajo la ruta sincronizada equivalente de `I:\cajaApp-V3\architecture-handoff\architect-to-agents\issued`.

La carpeta contiene exactamente:

- `global-search-api.ts`
- `category-donut.tsx`

Copiar, sin editar ni reformatear, hacia:

- `global-search-api.ts` → `I:\cajaApp-V3\workspace\frontend\src\lib\finance\global-search-api.ts`
- `category-donut.tsx` → `I:\cajaApp-V3\workspace\frontend\src\components\finance\charts\category-donut.tsx`

Se autoriza únicamente retirar los tres bytes iniciales `EF BB BF` si el archivo sincronizado contiene BOM. No cambiar saltos de línea, espacios, comillas, tipos ni lógica.

SHA-256 esperados después de retirar únicamente un BOM inicial:

- `global-search-api.ts`: `233FEA4649A6D876C1504E5A13757B4077AC6EFA4AC97DDEE867342DC46EE8D5`
- `category-donut.tsx`: `39074CA6A2E14C7D9BA0AB3E884C3B36F56B833034C36F7CE758FF5E01FF7BDA`

Registrar en `00-remediation.md`:

- ruta origen;
- ruta destino;
- existencia previa;
- bytes iniciales;
- hash antes;
- operación realizada;
- hash después;
- confirmación de que el único cambio adicional permitido fue retirar BOM.

Si la carpeta de recuperación no está sincronizada, esperar/refrescar la unidad montada. Marcar `BLOCKED` sólo si la carpeta continúa ausente y no existe ninguna fuente exacta disponible. No descargar por URL sin autenticación y no reconstruir manualmente.

## 5. Preflight de integridad

Antes de instalar dependencias, comprobar y registrar:

- los dos archivos de Fase 6A existen con nombre exacto;
- los hashes coinciden;
- los ocho archivos recuperados en `v1.0.5` continúan presentes;
- `migration.sql` de `20260711234500_add_category_rules` existe y no está vacío;
- `schema.prisma` comienza con `generator client` y no tiene BOM;
- cero archivos con sufijos `(1)`, `(2)`, `copy`, `copia`, `TEMP-` o `~` dentro de fuentes/tests/migraciones activas;
- cero archivos con BOM dentro del alcance técnico autorizado de `v1.0.5`;
- `dist`, `.next`, `coverage`, `playwright-report` y `test-results` fueron limpiados;
- los lockfiles no fueron modificados.

Cualquier diferencia lógica o hash incorrecto produce `FAIL` o `BLOCKED` según corresponda. No corregirla durante la validación.

## 6. SQLite

Base real:

`I:\cajaApp-V3\workspace\backend\prisma\dev.db`

Antes de Prisma:

1. registrar tamaño, fecha y SHA-256;
2. crear `PRE-v1.0.6-dev.db` fuera de la ruta activa;
3. comprobar que el backup tenga el mismo hash.

En un bloque `finally`, incluso con `FAIL` o `BLOCKED`:

1. detener CajaApp mediante el script obligatorio;
2. restaurar `PRE-v1.0.6-dev.db`;
3. verificar hash final idéntico al inicial;
4. confirmar ausencia de datos UAT;
5. confirmar cero procesos Node de CajaApp y puertos `11436/11437` libres.

Diferencia de hash = `FAIL crítico`.

## 7. Entorno y script obligatorio

Registrar:

- ruta de trabajo;
- versión/edición de Windows;
- arquitectura;
- ruta de `node.exe`;
- `node --version`, que debe ser exactamente `v24.18.0`;
- `npm --version`;
- hashes de `package.json` y `package-lock.json` backend/frontend;
- ocupantes de puertos `11436`, `11437` y `3000`;
- hash de `cajaapp-headless-up.ps1`.

Ejecutar:

```powershell
& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Stop -JsonOnly
```

Debe devolver `ok:true` aunque Docker/WSL ocupe el puerto 3000 y no debe finalizar procesos externos.

Está prohibido levantar backend o frontend con `npm`, `node`, `Start-Process`, otro script o un wrapper.

## 8. Backend completo

En `I:\cajaApp-V3\workspace\backend` ejecutar, registrando comando, directorio, inicio, fin, duración, exit code, stdout y stderr:

1. `npm ci`
2. `npm run prisma:generate`
3. `npm run prisma:migrate:deploy`
4. `npx prisma migrate status`
5. `npm run build`
6. `npm run test`

Criterios:

- lockfile sin cambios;
- Prisma generate/deploy/status PASS;
- ninguna migración ausente o vacía;
- build PASS;
- todas las suites y tests PASS;
- cero tests skipped salvo una justificación autorizada explícitamente, que actualmente no existe.

## 9. Frontend completo

En `I:\cajaApp-V3\workspace\frontend` ejecutar:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build`

Criterios:

- lockfile sin cambios;
- `global-search-api.ts` resuelve correctamente desde `global-search-dialog.tsx`;
- typecheck PASS;
- lint PASS, incluyendo `category-donut.tsx` sin mutación durante render;
- build PASS;
- ningún import resuelve a copias con sufijos.

## 10. Arranque headless obligatorio

Usar exclusivamente:

```powershell
& "I:\cajaApp-V3\cajaapp-headless-up.ps1" `
  -Rebuild `
  -JsonOnly `
  -BackendPort 11436 `
  -FrontendPort 11437
```

Guardar JSON, PIDs, URLs, estado y logs. Validar:

- `http://127.0.0.1:11436/health`
- `http://127.0.0.1:11437`

El mismo script debe usarse para detener.

## 11. Smoke API

Con el entorno levantado por el script, validar como mínimo:

- `GET /health`
- `GET /api/settings`
- `GET /api/dashboard?from=<inicio>&to=<fin>`
- `GET /api/reports?from=<inicio>&to=<fin>`
- `GET /api/future?from=<mes>&months=3`
- `GET /api/budgets/overview?from=<mes>&to=<mes>&status=active`
- `GET /api/goals/overview?status=active&limit=4`
- `GET /api/financial-health?from=<inicio>&to=<fin>`
- `GET /api/financial-health/history?limit=6`
- `GET /api/ai-advisor/context?from=<inicio>&to=<fin>`
- `GET /api/ai-advisor/history?limit=12`
- `GET /api/search?q=ingreso&page=1&limit=10`

Para búsqueda global verificar además:

- HTTP 200;
- `items` es un array;
- `pagination.page`, `limit`, `total` y `hasMore` existen;
- cada resultado posee `id`, `type`, `title`, `matchedField` y `destination`;
- el cliente frontend tipado representa el contrato real.

## 12. Proveedor IA y Asesor IA

Verificar sin imprimir secretos:

- proveedor y modelo configurados;
- `AI_MOCK_MODE`;
- prompt `advisor-prompt-v1.0.0`;
- schema `advisor-response-v1.0.0`.

Ejecutar una consulta real y comprobar:

- HTTP 201;
- request ID real;
- contexto `advisor-context-v1.0.0`;
- fórmula `fh-v1.0.0`;
- claims con `sourceIds` existentes;
- citas materializadas;
- historial creado y luego eliminado;
- ningún documento original enviado;
- ningún registro financiero modificado.

Una dependencia externa no disponible bloquea sólo este gate. No falsificar respuestas.

## 13. Playwright, responsive y accesibilidad

Ejecutar la suite completa mediante el mecanismo oficial existente. No crear wrappers, no filtrar specs, no incrementar timeouts para ocultar fallos y no modificar asserts.

Debe cubrir como mínimo:

- once secciones desktop/mobile;
- privacidad de importes;
- Dashboard y gráficos, incluidos lista/donut;
- Movimientos y categorías;
- Presupuestos;
- Objetivos;
- Alertas;
- Búsqueda global, apertura, consulta, paginación y navegación contextual;
- Salud Financiera;
- Asesor IA;
- importación PDF real;
- responsive;
- accesibilidad;
- cleanup UAT.

Registrar total, passed, failed, skipped, duración y ubicación del reporte.

## 14. Cleanup e integridad final

Al finalizar:

- eliminar datos y archivos UAT;
- eliminar artefactos de build/reporte temporales según la instrucción;
- recalcular hashes críticos;
- confirmar que los únicos cambios autorizados fueron los dos archivos de Fase 6A y retiro de BOM;
- detener mediante `cajaapp-headless-up.ps1`;
- confirmar puertos `11436/11437` libres;
- confirmar cero procesos Node de CajaApp;
- confirmar Docker/WSL vivos;
- restaurar SQLite y verificar hash exacto.

## 15. Evidencia mínima

La carpeta `v1.0.6` debe contener:

- `00-remediation.md`
- `00-verdict.md`
- `01-environment.md`
- `02-integrity-preflight.md`
- `03-file-inventory.txt`
- `04-sqlite-initial.md`
- `05-backend-install.log`
- `06-prisma-generate.log`
- `07-prisma-migrate-deploy.log`
- `08-prisma-migrate-status.log`
- `09-backend-build.log`
- `10-backend-tests.log`
- `11-frontend-install.log`
- `12-frontend-typecheck.log`
- `13-frontend-lint.log`
- `14-frontend-build.log`
- `15-headless-start.json`
- `16-headless-status.json`
- `17-smoke-api.md`
- `18-ai-provider.md`
- `19-ai-advisor.md`
- `20-playwright.log`
- `21-playwright-summary.md`
- `22-responsive-accessibility.md`
- `23-cleanup.md`
- `24-final-hashes.md`
- `25-sqlite-final.md`
- `26-known-issues.md`
- `27-evidence-inventory.txt`

Cada comando debe registrar comando exacto, directorio, timestamps, duración, exit code, stdout/stderr y clasificación `PASS`, `FAIL`, `BLOCKED` o `NOT RUN`.

## 16. Veredicto

`PASS` sólo si:

- los dos archivos de Fase 6A coinciden con sus hashes;
- integridad y BOM PASS;
- Prisma generate/deploy/status PASS;
- backend build/tests PASS;
- frontend typecheck/lint/build PASS;
- headless PASS usando únicamente el script;
- smoke PASS;
- proveedor IA/Asesor IA PASS o dependencia externa claramente BLOCKED sin afectar otros gates;
- Playwright completo PASS sin skipped;
- responsive/accesibilidad PASS;
- SQLite restaurado con hash exacto;
- no quedan procesos ni puertos CajaApp ocupados.

`FAIL` ante cualquier defecto reproducible del repo, migraciones, build, tests, script, smoke, UAT, integridad o restauración.

`BLOCKED` sólo ante una dependencia externa o ausencia inequívoca de una fuente canónica que no pueda obtenerse desde la carpeta de recuperación.

El agente deja la evidencia en `pending-validation`; no la mueve a `accepted`.

## 17. Respuesta final del agente

Responder únicamente:

```text
Veredicto: PASS | FAIL | BLOCKED
Evidencia: I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.6
Defectos principales: <lista breve o NINGUNO>
SQLite restaurado: SI/NO — <hash inicial> / <hash final>
Servicios detenidos: SI/NO — <detalle de puertos y procesos>
```
