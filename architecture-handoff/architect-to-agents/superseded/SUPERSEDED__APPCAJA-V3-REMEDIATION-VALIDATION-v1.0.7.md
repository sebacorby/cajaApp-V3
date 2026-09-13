# APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.7


Estado: ISSUED / AUTORIZADA
Proyecto: CajaApp V3
Root operativo obligatorio del agente: `I:\cajaApp-V3-real`
Repo canónico administrado por el arquitecto: Google Drive, sincronizado localmente en `I:\cajaApp-V3`
Entorno obligatorio: Windows x64 + Node.js exacto `v24.18.0`


## 1. Objetivo


Ejecutar desde cero la validación consolidada completa de CajaApp V3 en la copia operativa del agente `I:\cajaApp-V3-real`, después de materializar allí las correcciones publicadas por el arquitecto en Google Drive y sincronizadas en `I:\cajaApp-V3`. Esta campaña reemplaza a `v1.0.6`, que terminó `FAIL` válido y queda `SUPERSEDED` por los defectos e inconsistencias detectados.


La evidencia `v1.0.6` es una validación válida de la copia operativa del agente. Sus resultados confirmados fueron:


- Prisma, backend build/tests, frontend typecheck/lint/build y headless pasaron en la copia usada.
- Los hashes documentados en Fase 6A eran incorrectos por diferencias BOM/CRLF; no constituyen defecto de código.
- `npm` global ligado a Node 22 no es defecto si se usa de forma absoluta el toolchain Node 24 obligatorio.
- la ruta correcta de deuda futura es `/api/future-commitments`;
- las fallas UI de Alertas, Presupuestos y Categorías no son válidas porque Playwright apuntó al puerto 3000 de Docker/WSL y no al frontend CajaApp levantado en 11437;
- la consulta manual al Asesor IA falló por un request PowerShell con `Content-Length` inválido antes de demostrar disponibilidad o indisponibilidad del proveedor.


## 2. Gobierno


- `APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.6` terminó `FAIL` válido y está `SUPERSEDED`.
- Su evidencia debe conservarse en `agents-to-architect\rejected\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.6-FAIL`.
- Esta `v1.0.7` es la única instrucción vigente.
- El agente ejecuta builds, tests, headless, smoke, IA, Playwright y produce evidencia exclusivamente en `I:\cajaApp-V3-real`.
- `I:\cajaApp-V3` es la copia sincronizada del repo canónico de Drive administrado por el arquitecto; se usa como fuente de archivos e instrucciones publicados, no como root de ejecución del agente.
- Está prohibido ejecutar gates o modificar el repo canónico sincronizado en `I:\cajaApp-V3` fuera de las copias exactas autorizadas hacia `I:\cajaApp-V3-real`.
- Después de la Fase 7A queda prohibido modificar código, tests, configuración, migraciones, dependencias, prompts, contratos o SQLite.
- Un fallo no autoriza arreglos durante la campaña. Continuar todos los gates técnicamente ejecutables.


## 3. Separación de roots y guardia operativa obligatoria


Antes de cualquier operación:


1. Verificar que `I:\cajaApp-V3-real` existe.
2. Ejecutar `Resolve-Path 'I:\cajaApp-V3-real'` y registrar el resultado.
3. Cambiar el directorio actual exactamente a `I:\cajaApp-V3-real`.
4. Confirmar que la ruta actual normalizada es exactamente `I:\cajaApp-V3-real`.
5. Verificar, cuando sea necesario materializar correcciones, que la copia canónica sincronizada `I:\cajaApp-V3` existe y contiene los archivos publicados.
6. Confirmar que ningún build, test, migración, servidor o Playwright se ejecuta dentro de `I:\cajaApp-V3`.


Si `I:\cajaApp-V3-real` no existe o no es accesible, detener y responder `BLOCKED`. No sustituir el root operativo. Si `I:\cajaApp-V3` no está disponible pero los archivos exactos de Fase 7A ya existen en la copia operativa con el contenido requerido, registrar la situación y continuar; de lo contrario, responder `BLOCKED` por falta de materialización canónica.


Crear evidencia únicamente en:


`I:\cajaApp-V3-real\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.7`


No reutilizar logs, backups, hashes ni resultados anteriores.


## 4. Fase 7A — remediación local limitada


### 4.1 Configuración Playwright canónica


El arquitecto actualizó el archivo canónico en Drive, sincronizado en:


`I:\cajaApp-V3\workspace\frontend\playwright.config.ts`

Destino operativo obligatorio del agente:

`I:\cajaApp-V3-real\workspace\frontend\playwright.config.ts`


La configuración debe contener:


```ts
const FRONTEND_BASE_URL =
  process.env.CAJAAPP_FRONTEND_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  "http://127.0.0.1:11437";
```


y:


```ts
baseURL: FRONTEND_BASE_URL,
```


Fuente de recuperación, sólo si la sincronización local no materializó la versión nueva:


`I:\cajaApp-V3\architecture-handoff\architect-to-agents\issued\APPCAJA-V3-v1.0.7-CANONICAL-RECOVERY\playwright.config.ts`

Copiar desde esa fuente sincronizada hacia:

`I:\cajaApp-V3-real\workspace\frontend\playwright.config.ts`


También puede aparecer en la unidad montada equivalente de Google Drive.


Se autoriza:


- copiar ese único archivo desde el repo canónico sincronizado hacia `I:\cajaApp-V3-real\workspace\frontend\playwright.config.ts` sin reinterpretar lógica;
- retirar exclusivamente un BOM inicial `EF BB BF` de `playwright.config.ts`;
- no usar hashes predeclarados sensibles a CRLF/LF; registrar hash local antes y después y conservarlo como baseline de campaña.


### 4.2 Residuos exactos


El arquitecto eliminó del repo canónico de Drive las copias conflictivas. Si todavía existen en la copia operativa `I:\cajaApp-V3-real` por una materialización anterior, se autoriza eliminar exclusivamente:


- `I:\cajaApp-V3-real\workspace\backend\src\modules\reports\TEMP-CajaAppV3_reports_service_currency_fix_v1.ts`
- `I:\cajaApp-V3-real\workspace\frontend\src\lib\finance\global-search-api (1).ts`


Antes de eliminarlos, verificar que existen los canónicos:


- `I:\cajaApp-V3-real\workspace\backend\src\modules\reports\reports.service.ts`
- `I:\cajaApp-V3-real\workspace\frontend\src\lib\finance\global-search-api.ts`


No eliminar ningún otro archivo fuente por patrón.


### 4.3 Artefactos generados


Antes del preflight se autoriza y exige eliminar directorios generados, si existen:


- `I:\cajaApp-V3-real\workspace\backend\dist`
- `I:\cajaApp-V3-real\workspace\backend\coverage`
- `I:\cajaApp-V3-real\workspace\frontend\.next`
- `I:\cajaApp-V3-real\workspace\frontend\coverage`
- `I:\cajaApp-V3-real\workspace\frontend\playwright-report`
- `I:\cajaApp-V3-real\workspace\frontend\test-results`


Su existencia antes de este cleanup no es un defecto del producto. Después del cleanup deben estar ausentes o vacíos.


Registrar todas las operaciones en `00-remediation.md`.


## 5. Preflight de integridad


Después de Fase 7A comprobar:


- root operativo exacto `I:\cajaApp-V3-real`;
- repo canónico sincronizado identificado como `I:\cajaApp-V3`, usado sólo como fuente;
- `playwright.config.ts` usa `CAJAAPP_FRONTEND_BASE_URL` y fallback `11437`;
- cero BOM en archivos técnicos activos;
- cero archivos activos con sufijos `(1)`, `(2)`, `copy`, `copia`, `TEMP-` o `~`;
- los ocho archivos recuperados en v1.0.5 y `global-search-api.ts` continúan presentes;
- `migration.sql` de `20260711234500_add_category_rules` existe y no está vacío;
- `schema.prisma` comienza con `generator client` y no tiene BOM;
- artefactos generados limpiados;
- lockfiles registrados sin cambios.


No comparar archivos de código contra hashes predeclarados externos. Registrar hashes iniciales y comparar los mismos archivos al final para detectar cambios no autorizados.


## 6. SQLite


Base real:


`I:\cajaApp-V3-real\workspace\backend\prisma\dev.db`


Antes de Prisma:


1. registrar tamaño, fecha y SHA-256;
2. crear `PRE-v1.0.7-dev.db` fuera de la ruta activa;
3. comprobar igualdad de hash.


En `finally`, incluso con `FAIL` o `BLOCKED`:


1. detener CajaApp mediante el script obligatorio;
2. restaurar `PRE-v1.0.7-dev.db`;
3. verificar hash final idéntico al inicial;
4. confirmar ausencia de datos UAT;
5. confirmar cero procesos Node de CajaApp y puertos 11436/11437 libres.


Diferencia de hash = `FAIL crítico`.


## 7. Toolchain Node.js obligatorio


No usar `node`, `npm` o `npx` resueltos por PATH.


Usar exclusivamente:


- Node: `I:\Tools\node-v24.18.0-win-x64\node.exe`
- npm: `I:\Tools\node-v24.18.0-win-x64\npm.cmd`
- npx: `I:\Tools\node-v24.18.0-win-x64\npx.cmd`


Validar que Node devuelve exactamente `v24.18.0`. El estado de un `npm` global distinto no es defecto del repo y sólo debe registrarse como contexto informativo.


## 8. Script headless obligatorio


Detención inicial:


```powershell
& "I:\cajaApp-V3-real\cajaapp-headless-up.ps1" -Stop -JsonOnly
```


Debe devolver `ok:true`, no finalizar Docker/WSL y dejar libres 11436/11437.


Está prohibido levantar backend o frontend mediante npm, node, Start-Process, wrappers u otro script.


Arranque único:


```powershell
& "I:\cajaApp-V3-real\cajaapp-headless-up.ps1" `
  -Rebuild `
  -JsonOnly `
  -BackendPort 11436 `
  -FrontendPort 11437
```


Validar:


- `http://127.0.0.1:11436/health`
- `http://127.0.0.1:11437`


## 9. Backend completo


En `I:\cajaApp-V3-real\workspace\backend`, usando rutas absolutas de npm/npx:


1. `npm ci`
2. `npm run prisma:generate`
3. `npm run prisma:migrate:deploy`
4. `npx prisma migrate status`
5. `npm run build`
6. `npm run test`


Registrar comando exacto, cwd, inicio, fin, duración, exit code, stdout y stderr.


Criterios: Prisma PASS, build PASS, todas las suites/tests PASS, lockfile sin cambios.


## 10. Frontend completo


En `I:\cajaApp-V3-real\workspace\frontend`, usando npm absoluto:


1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build`


Criterios: typecheck, lint y build PASS; lockfile sin cambios; ningún import resuelve a copias.


## 11. Smoke API corregido


Con el ecosistema levantado por el script, validar:


- `GET /health`
- `GET /api/settings`
- `GET /api/dashboard?from=<inicio>&to=<fin>`
- `GET /api/reports?from=<inicio>&to=<fin>`
- `GET /api/future-commitments?from=<mes>&months=3`
- `GET /api/budgets/overview?from=<mes>&to=<mes>&status=active`
- `GET /api/goals/overview?status=active&limit=4`
- `GET /api/financial-health?from=<inicio>&to=<fin>`
- `GET /api/financial-health/history?limit=6`
- `GET /api/ai-advisor/context?from=<inicio>&to=<fin>`
- `GET /api/ai-advisor/history?limit=12`
- `GET /api/search?q=ingreso&page=1&limit=10`


La ruta `/api/future` está prohibida porque no forma parte del contrato vigente.


## 12. Proveedor y Asesor IA


Verificar configuración sin imprimir secretos.


`ollama list` puede registrarse sólo como inventario local; no determina por sí solo si un modelo con sufijo `:cloud` está disponible.


La disponibilidad real se determina mediante una solicitud válida a la aplicación. No usar `Invoke-WebRequest` con un body que produzca discrepancia de `Content-Length`.


Usar una de estas formas:


- `curl.exe` con un archivo JSON UTF-8 y header `Content-Type: application/json`;
- `Invoke-RestMethod` con `ConvertTo-Json` y `-ContentType 'application/json'`.


Validar primero `GET /api/ai-advisor/context`. Luego ejecutar `POST /api/ai-advisor/ask` y registrar status/body sanitizado y backend log.


Si el proveedor responde correctamente, comprobar HTTP 201, request ID, contexto, fórmula, claims, citas, historial y cleanup.


Si existe un error real de autenticación, red o disponibilidad del modelo, clasificar este gate como `BLOCKED`, continuar todos los gates no dependientes de IA y no declararlo defecto del repo sin evidencia.


## 13. Playwright corregido


Definir antes de ejecutar:


```powershell
$env:CAJAAPP_API_BASE_URL = "http://127.0.0.1:11436"
$env:CAJAAPP_FRONTEND_BASE_URL = "http://127.0.0.1:11437"
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:11437"
$env:PLAYWRIGHT_HTML_OPEN = "never"
```


Verificar mediante una prueba mínima que `page.goto('/')` navega a puerto 11437 y que `document.title`/DOM corresponden a CajaApp, no a Docker/WSL.


### 13.1 Suite core no dependiente del proveedor IA


Ejecutar con `npx.cmd` absoluto:


```powershell
& "I:\Tools\node-v24.18.0-win-x64\npx.cmd" playwright test `
  --project=chromium `
  --workers=1 `
  --retries=0 `
  --trace=on `
  --grep-invert "Asesor IA usa contexto estructurado"
```


Esta exclusión única está autorizada para separar una dependencia externa. No aplicar ningún otro filtro.


La ejecución no debe ser cortada por un timeout externo de 15 minutos. Configurar la herramienta/agente para permitir al menos 60 minutos o dejar que Playwright termine por sus propios timeouts.


La suite core debe completar y cubrir navegación, Alertas, Presupuestos, Categorías, búsqueda global, gráficos, importaciones, responsive, accesibilidad y cleanup.


### 13.2 Spec del Asesor IA


Sólo si el gate 12 confirmó proveedor disponible, ejecutar:


```powershell
& "I:\Tools\node-v24.18.0-win-x64\npx.cmd" playwright test tests/ai-advisor.spec.ts `
  --project=chromium `
  --workers=1 `
  --retries=0 `
  --trace=on
```


Si el proveedor está realmente bloqueado, registrar `NOT RUN — BLOCKED BY EXTERNAL PROVIDER` para este único spec. No convertirlo en FAIL de la suite core.


## 14. Responsive y accesibilidad


Deben verificarse mediante la suite core, incluido `quality-audit.spec.ts`, en desktop y mobile. Registrar resultados concretos; no aceptar `NOT RUN` si la suite core puede ejecutarse.


## 15. Cleanup e integridad final


Al finalizar:


- eliminar datos y archivos UAT;
- eliminar dist, `.next`, coverage, playwright-report y test-results después de preservar evidencia necesaria fuera del workspace;
- recalcular hashes de archivos críticos y comparar contra el baseline inicial;
- confirmar que no se modificó código después de Fase 7A;
- detener exclusivamente con `cajaapp-headless-up.ps1`;
- confirmar 11436/11437 libres;
- confirmar cero procesos Node de CajaApp;
- confirmar Docker/WSL vivos;
- restaurar SQLite y verificar hash exacto.


## 16. Evidencia mínima


Crear como mínimo:


- `00-remediation.md`
- `00-verdict.md`
- `01-root-environment.md`
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
- `20-playwright-core.log`
- `21-playwright-core-summary.md`
- `22-playwright-ai.log` o `22-playwright-ai-blocked.md`
- `23-responsive-accessibility.md`
- `24-cleanup.md`
- `25-final-hashes.md`
- `26-sqlite-final.md`
- `27-known-issues.md`
- `28-evidence-inventory.txt`


## 17. Veredicto


`PASS` sólo si todos los gates, incluido proveedor/Asesor IA y ambos bloques Playwright, pasan.


`BLOCKED` si el único impedimento restante es una dependencia externa real del proveedor IA, la suite core y todos los demás gates pasan, SQLite queda restaurado y no quedan procesos/puertos.


`FAIL` ante defectos reproducibles del repo, build, tests, script, smoke corregido, suite core, integridad o restauración.


Si los gates se ejecutan en una ruta distinta de `I:\cajaApp-V3-real`, la campaña queda inválida. `I:\cajaApp-V3` permanece como fuente canónica sincronizada y no reemplaza al root operativo del agente.


El agente deja la evidencia en `pending-validation`; no la mueve a `accepted`.


## 18. Respuesta final del agente


Responder únicamente:


```text
Veredicto: PASS | FAIL | BLOCKED
Root operativo validado: I:\cajaApp-V3-real
Repo canónico fuente: I:\cajaApp-V3
Evidencia: I:\cajaApp-V3-real\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.7
Defectos principales: <lista breve o NINGUNO>
Proveedor IA: PASS | BLOCKED | FAIL — <detalle breve>
Playwright core: PASS | FAIL — <passed/failed/skipped/duración>
SQLite restaurado: SI/NO — <hash inicial> / <hash final>
Servicios detenidos: SI/NO — <detalle>
```