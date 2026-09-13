# APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.5


Estado: ISSUED / AUTORIZADA
Proyecto: CajaApp V3
Root obligatorio: I:\cajaApp-V3
Entorno: Windows x64 + Node.js exacto v24.18.0


## 1. Objetivo


Remediar exclusivamente la corrupción de sincronización y codificación detectada en v1.0.4 y ejecutar desde cero la validación consolidada completa. No abrir nuevos verticales, cambiar reglas de negocio, refactorizar, modificar tests para hacerlos pasar ni editar SSOT/backlog.


La campaña tiene dos etapas: Fase 5A de remediación estrictamente limitada y luego validación de sólo lectura/ejecución. Después de 5A queda prohibido modificar código, tests, configuración, migraciones, dependencias, prompts o contratos.


## 2. Antecedente


v1.0.4 terminó FAIL. Confirmó que schema.prisma ya no tiene BOM, el script headless -Stop funciona, SQLite fue restaurado y Docker/WSL no fueron finalizados. Los bloqueos fueron: archivos canónicos perdidos o renombrados por sincronización local, migration.sql ausente en la migración de reglas, y BOM UTF-8 extendido en 63 archivos técnicos.


El arquitecto republicó en Drive los archivos canónicos conservando sus IDs. Esta campaña debe materializarlos correctamente en I:\cajaApp-V3.


## 3. Evidencia


Mover la evidencia v1.0.4 desde pending-validation a rejected con sufijo -FAIL. Crear una carpeta nueva y única:


I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.5


No reutilizar logs, hashes, backups ni resultados anteriores. Registrar cada operación de remediación en 00-remediation.md.


## 4. Fase 5A: archivos canónicos


Verificar la existencia exacta de:


- workspace\backend\src\modules\movements\categories.service.ts
- workspace\backend\src\modules\global-search\global-search.service.ts
- workspace\backend\src\modules\global-search\global-search.routes.ts
- workspace\backend\src\modules\global-search\global-search.controller.ts
- workspace\backend\src\modules\global-search\global-search.schemas.ts
- workspace\frontend\src\components\finance\search\global-search-dialog.tsx
- workspace\frontend\src\components\finance\search\search-target-banner.tsx
- workspace\backend\prisma\migrations\20260711234500_add_category_rules\migration.sql


IDs canónicos Drive:


- categories.service.ts: 1dw2soqTRpbAcCNUme3lCe1b8ukx4oNsw
- global-search.service.ts: 12s3utBwaVEK6jtCQCtXPoytm6syXU2EN
- global-search.routes.ts: 18_ikf2JmG5W9r9HOBdy7c38wdaa7k2Rj
- global-search.controller.ts: 154VlL3loffpGNlPaHmwJwPt_zm5oPSyK
- global-search.schemas.ts: 1UQbubB2SNWOHm9mvvYTT0fLCrG1boNB6
- global-search-dialog.tsx: 11wMYjItSBWO-NlMB3FlrTX9IKwIoQqtP
- search-target-banner.tsx: 1PhH6o_YO-HSWgol6oQMrB_wRoU_6_BBG
- migration.sql: 1Ik3aSZSy5bZ9L0O_5B9PpnYMgRpb-_rK


Esperar a que Google Drive complete la sincronización. Si falta el nombre canónico y existe exactamente una copia (1) o (2) en la misma carpeta, se autoriza quitar únicamente el sufijo, sin editar contenido. Si hay varias variantes o no puede identificarse inequívocamente, marcar BLOCKED; no reconstruir código manualmente.


## 5. Hashes canónicos y BOM


Después de quitar únicamente un BOM inicial, los archivos anteriores deben producir:


- 00E3ED2DB1ACED3315FBBF0A5A964FE103B3DEEBE14C47AFA4D372BA6362EC29 categories.service.ts
- 71A99FD5A191F66D102BEF039B792F69E30EA940214EF789AF04C8B3D1025B94 global-search.service.ts
- B15C1DFDFEEE7E87079A23C219FC0ED50A63BC103F0B1603A82AC9D51B632EA3 global-search.routes.ts
- DDF5C7441C7B6E5E0EEE17E6C0CFD2A77DE758588BD98B4B45FE91612A07B24A global-search.controller.ts
- C06449249B364194B7EAA031DF35A25AA8F3B970E8A96CAC061A00433214941F global-search.schemas.ts
- 4C7BD8E4E664F4DF2CF3DDB74EABB8097FD292C3C1D6EC177E4E52FFB0BF8BE1 global-search-dialog.tsx
- 85C7528636F2F835FFEE36A6722D9E7A3BE17EEB3A0FEB1885C0F9513EF97E1D search-target-banner.tsx
- 3368E20A3CBFFE8CC36E18FC563C459E6939EE121C653D9AEC7722BE831E28B4 migration.sql


Cualquier diferencia produce BLOCKED.


Se autoriza retirar exclusivamente los tres bytes iniciales EF BB BF de archivos técnicos ubicados en cajaapp-headless-up.ps1, workspace/backend/src, workspace/backend/tests, workspace/backend/prisma/schema.prisma, workspace/backend/prisma/migrations, workspace/frontend/src, workspace/frontend/tests, archivos de configuración backend/frontend y contracts.


Extensiones autorizadas: .ts .tsx .js .mjs .cjs .json .prisma .sql .md .toml .yaml .yml .ps1.


Excluir node_modules, .next, dist, coverage, playwright-report, test-results, architecture-handoff/agents-to-architect, dev.db y todos los binarios.


Por cada archivo con BOM: calcular hash original; comprobar que los bytes nuevos sean exactamente los originales desde la posición 4; guardar sin otra transformación; calcular hash final; registrar ambos hashes. No cambiar saltos de línea, espacios ni formato. El escaneo final del alcance autorizado debe devolver cero archivos con BOM.


Eliminar dist, .next, coverage, playwright-report y test-results. Eliminar copias con sufijo (1), (2), copy, copia, TEMP- o ~ únicamente cuando el canónico existe y el contenido coincide después de ignorar un BOM inicial. Registrar los hashes comparados.


Resultado obligatorio de 5A: ocho archivos canónicos presentes con hash exacto; migration.sql no vacío; cero BOM; cero duplicados ambiguos; schema.prisma comienza con generator client.


## 6. SQLite


Base real: I:\cajaApp-V3\workspace\backend\prisma\dev.db.


Antes de Prisma: registrar tamaño, fecha y SHA-256; crear PRE-v1.0.5-dev.db fuera de la ruta activa; comprobar igualdad de hash.


En finally, incluso con FAIL o BLOCKED: detener CajaApp con el script obligatorio, restaurar PRE-v1.0.5-dev.db, verificar hash final idéntico al inicial, confirmar ausencia de datos UAT y procesos CajaApp. Diferencia de hash = FAIL crítico.


## 7. Preflight


Registrar ruta, Windows, arquitectura, node.exe, node --version exacto v24.18.0, npm --version, hashes de package.json/package-lock backend/frontend, puertos 11436/11437/3000, procesos Docker/WSL sin finalizarlos y hash del script.


Ejecutar obligatoriamente:


& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Stop -JsonOnly


Debe devolver ok:true aunque el puerto 3000 esté ocupado por Docker/WSL; esos PIDs deben seguir vivos.


## 8. Backend


En workspace/backend ejecutar y registrar comando, duración, exit code, stdout y stderr:


- npm ci
- npm run prisma:generate
- npm run prisma:migrate:deploy
- npx prisma migrate status
- npm run build
- npm run test


Criterios: lockfile sin cambios; Prisma generate/deploy/status PASS sin P3015; build PASS; todas las suites PASS. Un fallo no autoriza cambios de código. Continuar gates técnicamente ejecutables.


## 9. Frontend


En workspace/frontend ejecutar:


- npm ci
- npm run typecheck
- npm run lint
- npm run build


Criterios: lockfile sin cambios; typecheck, lint y build PASS; ningún import resuelve a archivos con sufijo de copia.


## 10. Arranque obligatorio


Está prohibido levantar backend o frontend manualmente con npm, node, Start-Process u otro script.


Usar exclusivamente:


& "I:\cajaApp-V3\cajaapp-headless-up.ps1" -Rebuild -JsonOnly -BackendPort 11436 -FrontendPort 11437


Guardar JSON, PIDs, URLs, estado y logs. Validar http://127.0.0.1:11436/health y http://127.0.0.1:11437. El mismo script debe usarse para detener.


## 11. Smoke API


Con el entorno levantado por el script, validar como mínimo:


- GET /health
- GET /api/settings
- GET /api/dashboard?from=<inicio>&to=<fin>
- GET /api/reports?from=<inicio>&to=<fin>
- GET /api/future?from=<mes>&months=3
- GET /api/budgets/overview?from=<mes>&to=<mes>&status=active
- GET /api/goals/overview?status=active&limit=4
- GET /api/financial-health?from=<inicio>&to=<fin>
- GET /api/financial-health/history?limit=6
- GET /api/ai-advisor/context?from=<inicio>&to=<fin>
- GET /api/ai-advisor/history?limit=12
- GET /api/search?q=ingreso&page=1&limit=10


Registrar status, duración y resumen del contrato sin secretos.


## 12. Proveedor IA y Asesor IA


Verificar proveedor/modelo sin imprimir credenciales, AI_MOCK_MODE, prompt advisor-prompt-v1.0.0 y schema advisor-response-v1.0.0.


Ejecutar una consulta real del Asesor IA y comprobar: HTTP 201, request ID real, contexto advisor-context-v1.0.0, fórmula fh-v1.0.0, claims con sourceIds existentes, citas materializadas, historial creado y luego eliminado, ningún documento original enviado y ningún registro financiero modificado.


Si falta una dependencia externa, clasificar sólo este gate como BLOCKED; no falsificar respuesta.


## 13. Playwright y UAT


Ejecutar Playwright mediante el mecanismo oficial existente en el repo. No crear wrappers nuevos.


La suite completa debe cubrir navegación de once secciones desktop/mobile, privacidad de importes, Dashboard y tendencias, Movimientos y categorías, Presupuestos, Objetivos, Alertas, Búsqueda global, Salud Financiera, Asesor IA, responsive, accesibilidad y cleanup.


Registrar total, passed, failed, skipped, duración y reportes. No cambiar asserts ni aumentar timeouts para ocultar fallos.


## 14. Integridad y cleanup final


Después de los gates:


- recalcular hashes críticos;
- confirmar que las únicas diferencias autorizadas sean quitar BOM y renombrar copias exactas;
- eliminar artefactos UAT y build temporales;
- detener mediante cajaapp-headless-up.ps1;
- confirmar puertos 11436/11437 libres;
- confirmar cero procesos Node de CajaApp;
- confirmar Docker/WSL vivos;
- restaurar SQLite y verificar hash exacto.


## 15. Evidencia obligatoria


La carpeta v1.0.5 debe contener como mínimo:


00-remediation.md
00-verdict.md
01-environment.md
02-integrity-preflight.md
03-file-inventory.txt
04-sqlite-initial.md
05-backend-install.log
06-prisma-generate.log
07-prisma-migrate-deploy.log
08-prisma-migrate-status.log
09-backend-build.log
10-backend-tests.log
11-frontend-install.log
12-frontend-typecheck.log
13-frontend-lint.log
14-frontend-build.log
15-headless-start.json
16-headless-status.json
17-smoke-api.md
18-ai-provider.md
19-ai-advisor.md
20-playwright.log
21-playwright-summary.md
22-responsive-accessibility.md
23-cleanup.md
24-final-hashes.md
25-sqlite-final.md
26-known-issues.md
27-evidence-inventory.txt


Cada comando debe registrar comando exacto, directorio, inicio/fin, duración, exit code, stdout/stderr y clasificación PASS/FAIL/BLOCKED/NOT RUN.


## 16. Veredicto


PASS sólo si 5A termina sin diferencias lógicas, los hashes canónicos coinciden, BOM=0, Prisma generate/deploy/status PASS, backend build/tests PASS, frontend typecheck/lint/build PASS, headless PASS usando sólo el script, smoke PASS, Playwright completo PASS, SQLite restaurado con hash exacto y no quedan procesos o puertos CajaApp ocupados.


FAIL ante cualquier defecto reproducible del repo, migraciones, build, tests, script, smoke, UAT, integridad o restauración.


BLOCKED sólo ante dependencia externa o ausencia inequívoca de una fuente canónica que el agente no puede reconstruir.


El agente no mueve su evidencia a accepted; la deja en pending-validation para auditoría.


## 17. Respuesta final del agente


Responder únicamente:


Veredicto: PASS | FAIL | BLOCKED
Evidencia: I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.5
Defectos principales: <lista breve o NINGUNO>
SQLite restaurado: SI/NO — hash inicial/final
Servicios detenidos: SI/NO — puertos 11436/11437


No afirmar PASS si algún gate obligatorio no fue ejecutado.