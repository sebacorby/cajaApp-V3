APPCAJA V3 — P5 FINAL VERTICALS
FOCAL VALIDATION v1.3.1 (ADDENDUM SOBRE v1.3.0)

Estado: ISSUED / AUTORIZADA — REEMPLAZA EL GATE FRONTEND FOCAL Y EL PROCEDIMIENTO DE dev.db DE v1.3.0
Fecha: 09 de septiembre de 2026
Root canónico y único: I:\cajaApp-V3
Entorno obligatorio de validación: Windows x64 + Node.js exacto v24.18.0
Verticales: APP-MONTH-CLOSE-001 y APP-BACKUP-RESTORE-001
Integración focal obligatoria: APP-RECONCILIATION-001
Base: APPCAJA-V3-P5-FINAL-VERTICALS-SOURCE-AND-MATERIALIZATION-v1.3.0.md

0. POR QUÉ EXISTE ESTE ADDENDUM

La campaña v1.3.0 quedó BLOCKED en su gate frontend focal por dos causas de proceso, no de código (ver evidencia
architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-P5-FINAL-VERTICALS-evidence-v1.3.0/00-verdict.md):

1. `getByRole("alert")` en tests/month-close.spec.ts y tests/backup-restore.spec.ts coincidía en modo estricto con el
   route announcer de Next.js (`#__next-route-announcer__`, también role="alert"), además del mensaje propio de la app.
2. No se copió dev.db a la evidencia antes de materializar; sólo se registró su hash. En el cleanup no había contra qué
   restaurar exactamente y se usó dev.db.clean-backup (un backup genérico ajeno a esta campaña), que no coincidió con
   el hash inicial.

Los 21 archivos restantes del inventario de 23 ya están materializados en I:\cajaApp-V3 con los hashes exactos de
v1.3.0 (confirmado hash por hash sobre disco el 09/09/2026). No se re-materializa nada de eso. Este addendum:

- Corrige únicamente los dos specs de test (fila 22 y 23 del manifiesto de v1.3.0).
- Agrega el paso de backup físico de dev.db que faltaba.
- Reemplaza el gate frontend focal (sección 8 de v1.3.0) por el mismo comando, ahora sobre los specs corregidos.
- No reabre backend, migraciones, schema ni ningún otro archivo del inventario.

Prohibido: todo lo prohibido en la sección 0 de v1.3.0 sigue vigente. Además, prohibido tocar
cierres-section.tsx o respaldo-section.tsx para resolver el conflicto de selector — se resuelve exclusivamente
en los specs, acotando el locator al contenedor de sección.

1. ARCHIVOS CORREGIDOS (reemplazan sus filas en el manifiesto de v1.3.0)

PATH | ACTION | BYTES | SHA256
workspace/frontend/tests/month-close.spec.ts | replace | 4378 | 6201bb17981bad47ec742fdc9948f15ad8ad6a6662c7c0883c792779a7c36387
workspace/frontend/tests/backup-restore.spec.ts | replace | 4505 | f549d848a2dba846bdcda950bb959704c11ee0c229dff5278f22dbcd11d06953

Cambio funcional en ambos: se captura `const section = page.getByTestId("month-close-section" | "backup-restore-section")`
una vez, tras el `expect(section).toBeVisible()`, y cada `page.getByRole("alert")` posterior pasa a ser
`section.getByRole("alert")`. Ningún otro assert ni fixture cambia. El agente debe verificar que estos dos archivos en
disco coincidan exactamente con estos bytes/hash antes de correr el gate 3; si no coinciden, detener y declarar FAIL.

2. PREFLIGHT ESPECÍFICO DE ESTE ADDENDUM

1. Confirmar pwd/root, node --version v24.18.0, backend y frontend como en v1.3.0 §3.1.
2. Detener CajaApp con el mecanismo autoritativo y confirmar puertos 11436/11437 libres (v1.3.0 §3.2).
3. Backup físico de dev.db antes de tocar nada (paso que faltó en v1.3.0):
   - Copiar workspace/backend/prisma/dev.db →
     architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-P5-FINAL-VERTICALS-evidence-v1.3.1/PRE-v1.3.1-cajaapp.db
   - Ya ejecutado por el arquitecto el 09/09/2026. SHA-256 de ambos archivos confirmado idéntico:
     24317a0e8f5b561e56c3d84e33337ca856f1c9916ac604f7dd0e8d47a2795272
   - El agente debe re-verificar este hash contra el dev.db actual antes de continuar. Si no coincide (porque el
     estado local cambió desde que se tomó el backup), detener y declarar BLOCKED — no re-crear el backup por su
     cuenta ni continuar sobre un estado no verificado.
4. Confirmar que los 21 archivos restantes del inventario de v1.3.0 siguen presentes con sus hashes exactos (no
   requiere volver a materializar; sólo verificar).
5. Aplicar los dos archivos de la sección 1 de este addendum (ya aplicados por el arquitecto el 09/09/2026;
   el agente verifica bytes/hash, no los reescribe).

3. GATE BACKEND FOCAL

Sin cambios respecto a v1.3.0 §6. Ejecutar desde workspace/backend:

npm ci
npm run prisma:generate
npm run prisma:migrate:status
npm run prisma:migrate:deploy
npm run build
npx vitest run tests/reconciliation/reconciliation.test.ts tests/month-close/month-close.test.ts tests/backup-restore/backup-restore.test.ts

4. SMOKE API REAL OBLIGATORIO

Sin cambios respecto a v1.3.0 §7. Ejecutar todos los casos listados ahí para Conciliación, Cierre mensual y Backup/Restore.

5. GATE FRONTEND FOCAL (reemplaza v1.3.0 §8)

Ejecutar desde workspace/frontend:

npm ci
npm run typecheck
npm run lint
npm run build
npx playwright test tests/reconciliation.spec.ts tests/month-close.spec.ts tests/backup-restore.spec.ts --workers=1 --retries=0

Sin filtros adicionales, skips ni retries. Si `getByRole("alert")` vuelve a fallar en modo estricto después de este
cambio, es un defecto nuevo — declarar FAIL, no reintroducir el selector sin acotar.

6. INTEGRIDAD, CLEANUP Y EVIDENCIA (reemplaza el criterio de restauración de v1.3.0 §9)

- PRAGMA integrity_check y PRAGMA foreign_key_check al final.
- Eliminar sólo datos UAT mediante API o procedimiento documentado.
- Restaurar dev.db exactamente al hash registrado en la sección 2.3 de este addendum
  (24317a0e8f5b561e56c3d84e33337ca856f1c9916ac604f7dd0e8d47a2795272), usando la copia PRE-v1.3.1-cajaapp.db como
  fuente de restauración — no dev.db.clean-backup.
- Confirmar ambos package-lock.json sin cambios.
- Confirmar los 23 archivos del inventario (21 sin cambios de v1.3.0 + 2 de la sección 1 de este addendum) con sus
  hashes finales.
- Eliminar node_modules, dist, .next, test-results y playwright-report generados por los gates.
- Detener servicios y demostrar puertos libres.
- Evidencia única en:
  I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-P5-FINAL-VERTICALS-evidence-v1.3.1
  (carpeta ya creada por el arquitecto con PRE-v1.3.1-cajaapp.db; el agente agrega ahí el resto de la evidencia).
- No actualizar el SSOT. El arquitecto lo hace sólo después de auditar la evidencia.

7. CRITERIO DE VEREDICTO

Igual a v1.3.0 §10: PASS sólo si materialización (verificación), backend, smoke, frontend, integridad, cleanup y
evidencia están completos. FAIL ante cualquier defecto reproducible, hash distinto, gate rojo o dato restaurado
incorrecto. BLOCKED sólo por dependencia externa demostrable antes de reproducir un defecto del vertical — incluyendo
el caso descrito en 2.3 si el hash de dev.db ya no coincide al momento de ejecutar.

Si este addendum termina PASS, cubre simultáneamente el alcance de APP-P5-FOCAL-VALIDATION-001 (Conciliación +
Cierre mensual + Backup/Restore), porque los gates 3-6 de este documento son exactamente esa validación conjunta.
No se requiere una campaña separada para ese ítem del backlog.
