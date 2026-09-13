# APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.8


Estado: ISSUED / AUTORIZADA
Proyecto: CajaApp V3
Root operativo obligatorio del agente: `I:\cajaApp-V3-real`
Repo canónico administrado por el arquitecto: Google Drive, sincronizado en `I:\cajaApp-V3`
Entorno obligatorio: Windows x64 + Node.js exacto `v24.18.0`


## 1. Objetivo


Materializar exclusivamente las quince correcciones canónicas derivadas de la auditoría de `v1.0.7` y ejecutar desde cero la validación consolidada completa.


La campaña `v1.0.7` terminó `FAIL` válido. La auditoría arquitectónica confirmó tres defectos de producto y once desalineaciones UAT, no trece defectos funcionales independientes.


### Defectos de producto corregidos


1. Categorías: el backend reasignaba correctamente a la categoría de sistema `Sin clasificar`, pero el selector no representaba su ID y quedaba visualmente vacío.
2. Tarjetas: el historial no estaba disponible cuando no existía un resumen activo o aceptado.
3. Asesor IA: el guardrail numérico interpretaba los guiones internos de fechas ISO como signos negativos y podía rechazar una respuesta válida con HTTP 422.


### UAT corregida


Las pruebas ahora esperan el cierre real de overlays, usan `Inicio` como navegación vigente, leen valores de inputs, reconocen componentes desmontados al completar importaciones, expanden el mes correcto, comparan Salud Financiera contra la API autoritativa, evitan selectores ambiguos entre desktop y mobile y vuelven a adquirir el panel lateral después de navegar.


## 2. Gobierno


- `APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.7` está ejecutada, rechazada como FAIL y superseded.
- Esta `v1.0.8` es la única campaña de validación vigente.
- El agente ejecuta únicamente en `I:\cajaApp-V3-real`.
- `I:\cajaApp-V3` se usa exclusivamente como fuente sincronizada de instrucciones y archivos canónicos.
- La única modificación permitida es la materialización exacta de Fase 8A.
- Finalizada Fase 8A, queda prohibido modificar código, tests, configuración, migraciones, dependencias, prompts, contratos o SQLite.
- Un fallo no autoriza remediaciones durante la campaña. Deben continuar todos los gates técnicamente ejecutables.
- No reutilizar logs, capturas, backups, resultados ni evidencia de campañas anteriores.


Crear evidencia únicamente en:


`I:\cajaApp-V3-real\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.8`


## 3. Guardia de roots


Antes de operar:


1. verificar que `I:\cajaApp-V3-real` existe;
2. registrar `Resolve-Path 'I:\cajaApp-V3-real'`;
3. establecerlo como directorio actual;
4. verificar que `I:\cajaApp-V3` existe como fuente sincronizada;
5. confirmar que ningún build, test, migración, servidor o Playwright se ejecutará dentro de `I:\cajaApp-V3`.


Si el root operativo no está disponible, responder `BLOCKED`. No sustituirlo por otra ruta.


## 4. Fase 8A — materialización exacta


Fuente autorizada:


`I:\cajaApp-V3\architecture-handoff\architect-to-agents\issued\APPCAJA-V3-v1.0.8-CANONICAL-RECOVERY`


Leer primero `RECOVERY-MANIFEST-v1.0.8.md` y copiar los quince archivos hacia los destinos relativos indicados bajo `I:\cajaApp-V3-real`.


Reglas obligatorias:


- copiar únicamente los archivos enumerados en el manifiesto;
- no reconstruir ni editar manualmente contenido;
- si una fuente comienza con una marca UTF-8, retirar sólo esa marca al escribir el destino;
- calcular SHA-256 de la fuente normalizada y del destino final;
- exigir igualdad de hashes;
- registrar origen, destino, tamaño, presencia de marca UTF-8 y hashes en `00-remediation.md`;
- verificar que todos los destinos existen después de la copia.


No aplicar ningún cambio adicional.


## 5. Preflight posterior a Fase 8A


Comprobar y registrar:


- root operativo exacto `I:\cajaApp-V3-real`;
- fuente canónica identificada como `I:\cajaApp-V3`;
- quince archivos materializados y con hashes coincidentes;
- cero marcas UTF-8 iniciales en archivos técnicos activos;
- cero archivos activos con sufijos `(1)`, `(2)`, `copy`, `copia`, `TEMP-` o `~`;
- `schema.prisma` sin marca inicial y comenzando con `generator client`;
- migración `20260711234500_add_category_rules\migration.sql` presente y no vacía;
- lockfiles registrados antes de instalar;
- ausencia de `dist`, `.next`, `coverage`, `playwright-report` y `test-results` después de limpiar esos directorios generados.


No comparar contra hashes históricos. Registrar un baseline local después de Fase 8A y compararlo al cierre para detectar modificaciones posteriores.


## 6. Protección de SQLite


Base real:


`I:\cajaApp-V3-real\workspace\backend\prisma\dev.db`


Antes de Prisma:


1. registrar tamaño, fecha y SHA-256;
2. crear una copia `PRE-v1.0.8-dev.db` fuera de la ruta activa;
3. verificar que el hash del backup coincide con el inicial.


En un bloque `finally`, incluso ante FAIL o BLOCKED:


1. detener CajaApp mediante el script obligatorio;
2. restaurar la copia inicial;
3. verificar hash final idéntico al inicial;
4. confirmar ausencia de datos UAT residuales;
5. confirmar cero procesos Node de CajaApp y puertos 11436/11437 libres.


Cualquier diferencia de hash de SQLite es `FAIL crítico`.


## 7. Toolchain obligatorio


No utilizar `node`, `npm` o `npx` resueltos por PATH. Usar exclusivamente:


- `I:\Tools\node-v24.18.0-win-x64\node.exe`
- `I:\Tools\node-v24.18.0-win-x64\npm.cmd`
- `I:\Tools\node-v24.18.0-win-x64\npx.cmd`


Confirmar que Node devuelve exactamente `v24.18.0`.


## 8. Backend completo


Directorio: `I:\cajaApp-V3-real\workspace\backend`


Ejecutar con las rutas absolutas anteriores:


1. `npm ci`
2. `npm run prisma:generate`
3. `npm run prisma:migrate:deploy`
4. `npx prisma migrate status`
5. `npm run build`
6. `npm run test`


Registrar comando, cwd, inicio, fin, duración, exit code, stdout y stderr. Criterios: Prisma PASS, build PASS, todas las suites y tests PASS, incluida la nueva regresión de fechas ISO, y lockfile sin cambios.


## 9. Frontend completo


Directorio: `I:\cajaApp-V3-real\workspace\frontend`


Ejecutar:


1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build`


Criterios: typecheck, lint y build PASS; lockfile sin cambios; ningún import resuelve a copias.


## 10. Script headless obligatorio


Detención inicial:


```powershell
& "I:\cajaApp-V3-real\cajaapp-headless-up.ps1" -Stop -JsonOnly
```


Debe devolver `ok:true`, preservar Docker/WSL y dejar libres 11436/11437.


Arranque único:


```powershell
& "I:\cajaApp-V3-real\cajaapp-headless-up.ps1" `
  -Rebuild `
  -JsonOnly `
  -BackendPort 11436 `
  -FrontendPort 11437
```


Está prohibido levantar servidores mediante otros comandos o wrappers.


Validar:


- `http://127.0.0.1:11436/health`
- `http://127.0.0.1:11437`


## 11. Smoke API


Validar con parámetros reales del período:


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


Todos deben devolver respuesta 2xx y contrato JSON válido.


## 12. Proveedor y Asesor IA real


Verificar configuración sin imprimir secretos. Ejecutar una consulta real mediante `Invoke-RestMethod` o `curl.exe`, con JSON UTF-8 válido, contra:


`POST http://127.0.0.1:11436/api/ai-advisor/ask`


La pregunta debe exigir contexto estructurado y citas, pero no una simulación. Verificar:


- HTTP 201;
- ausencia de `AI_ADVISOR_UNGROUNDED_NUMBER`;
- request ID real;
- contexto `advisor-context-v1.0.0`;
- fórmula `fh-v1.0.0`;
- claims con `sourceIds` existentes;
- citas materializadas;
- historial creado y eliminado durante cleanup;
- ausencia de documentos originales en el request al proveedor;
- ausencia de modificaciones sobre registros financieros.


Si existe una indisponibilidad externa real de red, autenticación o modelo, registrar evidencia y continuar todos los demás gates. Un HTTP 422 por validación de negocio es FAIL, no bloqueo externo.


## 13. Playwright completo


Definir antes de ejecutar:


```powershell
$env:CAJAAPP_API_BASE_URL = "http://127.0.0.1:11436"
$env:CAJAAPP_FRONTEND_BASE_URL = "http://127.0.0.1:11437"
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:11437"
$env:PLAYWRIGHT_HTML_OPEN = "never"
```


Verificar primero que `page.goto('/')` navega a 11437 y que el DOM pertenece a CajaApp.


Ejecutar la suite completa, sin filtros:


```powershell
& "I:\Tools\node-v24.18.0-win-x64\npx.cmd" playwright test `
  --project=chromium `
  --workers=1 `
  --retries=0 `
  --trace=on
```


La herramienta que invoque Playwright debe permitir al menos 90 minutos o dejar que la suite finalice por sus propios timeouts. No interrumpirla por un timeout externo breve.


Criterios:


- discovery completo de los 25 tests vigentes, salvo que Playwright demuestre otro total por cambios canónicos posteriores;
- todos PASS;
- cero failed;
- cero skipped;
- cero retries;
- `ai-advisor.spec.ts` incluido en la misma ejecución;
- evidencia HTML/JSON, traces, screenshots y videos preservada antes del cleanup;
- cleanup de datos UAT demostrado por cada spec.


## 14. Responsive y accesibilidad


La suite debe completar `quality-audit.spec.ts` en sus tres escenarios y demostrar:


- navegación desktop y mobile;
- foco de teclado;
- `aria-current` autoritativo;
- ausencia de controles ficticios o decorativos accionables;
- panel lateral y secciones principales visibles en mobile;
- sin errores de consola o página bloqueantes.


## 15. Cleanup e integridad final


Después de preservar la evidencia fuera del workspace:


- eliminar datos y archivos UAT;
- eliminar `dist`, `.next`, `coverage`, `playwright-report` y `test-results` del workspace;
- recalcular hashes del baseline posterior a Fase 8A y demostrar que no hubo modificaciones durante los gates;
- confirmar lockfiles sin cambios;
- detener exclusivamente con `cajaapp-headless-up.ps1`;
- confirmar 11436/11437 libres;
- confirmar cero procesos Node de CajaApp;
- confirmar Docker/WSL vivos;
- restaurar SQLite y verificar hash exacto.


## 16. Evidencia mínima


Crear como mínimo:


- `00-remediation.md`
- `00-verdict.md`
- `01-roots-environment.md`
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


## 17. Veredicto


`PASS` sólo si todos los gates pasan, incluida la consulta real del Asesor IA y Playwright completo.


`BLOCKED` sólo si el único impedimento restante es una dependencia externa demostrada del proveedor IA y todos los demás gates pasan.


`FAIL` ante cualquier defecto reproducible del repo, build, tests, script, smoke, guardrail IA, Playwright, integridad, cleanup o restauración.


El agente deja la evidencia en `pending-validation`; no la mueve a `accepted` ni `rejected`.


## 18. Respuesta final del agente


```text
Veredicto: PASS | FAIL | BLOCKED
Root operativo validado: I:\cajaApp-V3-real
Repo canónico fuente: I:\cajaApp-V3
Evidencia: I:\cajaApp-V3-real\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.8
Defectos principales: <lista breve o NINGUNO>
Proveedor IA: PASS | BLOCKED | FAIL — <detalle breve>
Playwright: PASS | FAIL — <passed/failed/skipped/duración>
SQLite restaurado: SI/NO — <hash inicial> / <hash final>
Servicios detenidos: SI/NO — <detalle>
```