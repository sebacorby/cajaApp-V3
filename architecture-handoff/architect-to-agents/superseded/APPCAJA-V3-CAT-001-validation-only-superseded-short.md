# APPCAJA-V3-CAT-001 — VALIDACIÓN SOLAMENTE




**Estado:** vigente  
**Proyecto:** CajaApp V3  
**Root:** `I:/cajaApp-V3`  
**Entorno obligatorio:** Windows x64 + Node.js exacto `v24.18.0`




## 1. Objetivo




Validar la implementación de administración de categorías, recategorización de movimientos y sugerencias determinísticas para importaciones CSV.




El código ya fue implementado por el arquitecto/asistente. El agente únicamente ejecuta instalación, migración, build, tests, smoke y UAT; no modifica archivos.




## 2. Prohibiciones absolutas




El agente no puede editar código, Prisma, migraciones, tests, documentación, dependencias, `package.json`, lockfiles, `.env`, launcher ni el SSOT `docs/00-context/APPCAJA-V3-IMPLEMENTATION-TRACEABILITY.md`.




No ejecutar `prisma migrate reset`, `prisma db push`, `npm install`, `npm audit fix`, `npm audit fix --force`, wrappers ni scripts auxiliares. Ante cualquier fallo, conservar evidencia y reportar; no remediar.




## 3. Gate de entorno




Abrir PowerShell y ejecutar:




```powershell
$NodeHome = "I:/Tools/node-v24.18.0-win-x64"
$env:Path = "$NodeHome;$env:Path"
where.exe node
node --version
npm --version
```




`node --version` debe ser exactamente `v24.18.0` y la primera ruta de Node debe corresponder a `I:/Tools/node-v24.18.0-win-x64/node.exe`. Si falla, resultado `BLOCKED` y finalizar.




## 4. Backend




Ubicarse en `I:/cajaApp-V3/workspace/backend`.




Antes de migrar, resolver `DATABASE_URL` y crear un respaldo timestamped de la SQLite fuera del workspace. No adjuntar la base ni exponer datos personales.




Ejecutar exactamente:




```powershell
npm ci
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build
npm run test
```




Confirmar que se aplicó la migración:




```text
20260711234500_add_category_rules
```




Confirmar que Vitest descubrió y ejecutó:




```text
tests/movements/categories.rules.test.ts
```




El test debe cubrir normalización de tildes y mayúsculas, prioridad, coincidencia más específica y ausencia de coincidencia.




Guardar logs completos de instalación, Prisma, migración, build y tests. No declarar PASS si la migración o el test nuevo no fueron ejecutados realmente.




## 5. Smoke API




Con el backend iniciado mediante los mecanismos existentes del proyecto, validar sin crear scripts:




1. `GET /api/movements/categories?includeInactive=true`.
2. Crear una categoría no sistema con nombre, color hexadecimal, ícono y palabras clave.
3. Editarla y comprobar persistencia.
4. `POST /api/movements/categories/suggest` con una descripción que coincida con una palabra clave.
5. Crear un movimiento manual temporal y asignarle la categoría mediante `PUT /api/movements/categories/assignment`.
6. Archivar la categoría y comprobar que el movimiento se reasigna a `Sin clasificar`.
7. Restaurar la categoría.
8. Confirmar que no se puede renombrar ni archivar una categoría del sistema.




Eliminar o anular únicamente los datos temporales creados por esta prueba cuando los endpoints existentes lo permitan.




## 6. Frontend




Ubicarse en `I:/cajaApp-V3/workspace/frontend` y ejecutar:




```powershell
npm ci
npm run typecheck
npm run lint
npm run build
npx playwright test tests/categories.spec.ts
```




El build actual debe ejecutar primero `npm run typecheck`. No aceptar un build que muestre que los errores TypeScript fueron ignorados. Registrar por separado los códigos de salida de typecheck, lint, build y Playwright. El spec `tests/categories.spec.ts` debe descubrirse y finalizar PASS sin ser editado.




Las vulnerabilidades moderadas preexistentes informadas por npm no bloquean este gate funcional, pero deben quedar en observaciones. Está prohibido ejecutar correcciones automáticas de dependencias.




## 7. UAT visual




Iniciar CajaApp con `I:/cajaApp-V3/start-cajaapp.ps1` y validar desde la UI real:




1. Abrir Movimientos y luego el panel Categorías.
2. Crear una categoría temporal con color, ícono y al menos dos palabras clave.
3. Editar nombre, color, ícono y palabras clave; cerrar y volver a abrir el panel para confirmar persistencia.
4. Crear un movimiento manual temporal y cambiar su categoría desde el selector rápido del ledger.
5. Refrescar la página y comprobar persistencia.
6. Importar un CSV de prueba cuyo comercio coincida con una palabra clave y verificar que el preview sugiera la categoría.
7. Archivar la categoría temporal; comprobar que los movimientos asociados pasan a `Sin clasificar` y que el historial no se borra.
8. Restaurarla y confirmar que vuelve a la lista activa.
9. Comprobar visualmente que una categoría del sistema está identificada y no ofrece acción de archivo.
10. Abrir Ingresos y Tarjetas para confirmar que continúan funcionando.




No usar datos personales en capturas o logs.




## 8. Criterio de resultado




### PASS




Solamente si se cumple todo:




- Node exacto y ruta correcta;
- `npm ci` backend y frontend PASS;
- Prisma generate y migrate deploy PASS sin reset;
- backend build y tests PASS, incluyendo el test de reglas;
- frontend typecheck, lint, build y `tests/categories.spec.ts` PASS;
- CRUD, sugerencia, asignación, archivo, reasignación y restauración PASS;
- UAT visual y persistencia PASS;
- Ingresos y Tarjetas continúan operativos;
- ningún archivo gobernado fue modificado por el agente.




### FAIL




Cuando el entorno es correcto, pero falla código, migración, test, build, typecheck, lint, smoke o UAT.




### BLOCKED




Sólo por versión/ruta incorrecta de Node, permisos, acceso al proyecto o indisponibilidad ambiental que impida ejecutar los comandos. No convertir FAIL o BLOCKED en PASS mediante cambios locales.




## 9. Entregable único




Crear solamente:




```text
I:/cajaApp-V3/architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-CAT-001-validation-report-v1.0.0.md
```




No crear ZIP. El reporte debe incluir resultado global, entorno, tabla de comandos con exit codes, migración aplicada, tests descubiertos, smoke API, UAT visual, integridad de archivos, ubicación de logs y errores completos.




No modificar ni mover el SSOT. No mover el reporte a `accepted` o `rejected`: esa decisión corresponde al arquitecto después de auditar la evidencia.