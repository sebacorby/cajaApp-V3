# APPCAJA V3 — SSOT DE EJECUCIÓN VIGENTE

**Estado:** VIGENTE — REMEDIACIÓN E1–E7 MATERIALIZADA / ENTORNO NODE CORREGIDO A 24.18.0 / VALIDACIÓN LOCAL PENDIENTE  
**Fecha:** 25 de julio de 2026  
**Regla de gobierno:** ante contradicción entre reportes, documentación y código canónico, **manda el código**. La aceptación funcional final corresponde al usuario.

---

## 1. Repositorio canónico

La única fuente vigente de CajaApp V3 es:

`/Javier Corbella/cajaApp-V3`

Reglas obligatorias:

- `workspace/` contiene el código real de la aplicación.
- `docs/` contiene documentación vigente, pero nunca prevalece sobre el código ejecutable.
- `contracts/` contiene contratos, prompts, schemas y ejemplos.
- `architecture-handoff/` contiene instrucciones, evidencias, backups y material de trabajo; no gobierna sobre `workspace/`.
- No usar Google Drive para CajaApp V3 salvo autorización explícita del usuario.
- El arquitecto/asistente diseña y escribe código. Los agentes sólo compilan, levantan y ejecutan validaciones mínimas indicadas.
- Un build verde no equivale a aceptación funcional.

Bloque activo:

`APP-CARDS-FUTURE-REDESIGN-001`

---

## 2. Entorno operativo oficial

El entorno oficial vigente de CajaApp V3 es:

- Windows x64.
- **Node.js v24.18.0**.
- Python disponible para los launchers del root.
- Backend en `11436`.
- Frontend en `11437`.

Regla obligatoria:

- **Node 22 queda supersedido y no debe volver a exigirse en CajaApp V3.**
- `workspace/backend/package.json` declara `engines.node = "24.18.0"`.
- `workspace/frontend/package.json` declara `engines.node = "24.18.0"`.
- Ambos `package-lock.json` ya declaran `engines.node = "24.18.0"` en el paquete raíz.
- `start-app.py` y `start_backend.py` validan `v24.18.0`.

La modificación del 25 de julio que cambió accidentalmente el runtime a Node 22 fue un error de arquitectura y queda formalmente anulada por esta actualización.

---

## 3. Intención funcional vigente

CajaApp V3 debe funcionar como un **motor financiero continuo**:

1. El usuario carga resúmenes inicialmente o de forma esporádica para establecer y conciliar deuda real.
2. La aplicación persiste obligaciones y mantiene el futuro sin necesitar un PDF nuevo todos los meses.
3. Cada compra, ingreso o compromiso posterior recalcula el futuro.
4. Las cuotas avanzan por períodos mensuales `YYYY-MM`; no por suma de treinta días.
5. Los resúmenes posteriores concilian y ajustan, pero no sostienen por sí solos la proyección.
6. La IA extrae/normaliza; la aplicación calcula, valida, persiste y proyecta.

Esta remediación no redefine la extracción del PDF ni sus contratos.

---

## 4. Diagnóstico y correcciones vigentes

### E1 — `missing_card_reference`

El camino de aceptación ya evita que nuevas proyecciones conserven IDs temporales del preview. Para datos históricos se incorporó una reparación conservadora:

- `workspace/backend/src/modules/cards/legacy-projection-rowid-repair.ts`
- `workspace/backend/src/scripts/repair-legacy-projection-rowids.ts`
- `workspace/backend/tests/cards/legacy-projection-rowid-repair.test.ts`

La reparación sólo remapea cuando existe una única fila candidata compatible por statement, secuencia de cuota, moneda e importe. Los casos ambiguos permanecen pendientes.

Runner manual:

`cd workspace\backend && npm run repair:projection-rowids`

`start-app.py` ejecuta el repair antes de iniciar el backend.

### E2 — `FutureDebtView.tsx`

Archivo canónico:

`workspace/frontend/src/components/finance/transactions/FutureDebtView.tsx`

La vista conserva el wire contract vigente, horizonte de 1 a 24 meses, totales ARS/USD, agrupación por mes/tarjeta, Pendientes, diagnósticos, selección y borrado.

### E3 — contraste financiero

Importes, descripciones, estados, origen y diagnósticos usan contraste explícito. Metadata secundaria puede usar tonos atenuados, pero no la información financiera principal.

### E4 — scopes de selección

La implementación vigente separa:

- selección global: todas las filas visibles confirmadas + pendientes;
- selección por tarjeta: sólo IDs de esa tarjeta;
- selección de Pendientes: sólo IDs pendientes;
- selección individual: sólo esa fila.

Regresión:

`workspace/frontend/tests/future-debt-selection.spec.ts`

### E5 — lifecycle y backend zombie

El defecto concreto estaba en el helper histórico que usaba ruta absoluta y `DETACHED_PROCESS`.

Correcciones vigentes:

- `start_backend.py` usa paths relativos y mantiene ownership del proceso;
- `start-app.py` controla backend/frontend;
- no se utiliza `DETACHED_PROCESS`;
- se validan puertos antes del arranque;
- Windows cierra árboles con `taskkill /F /T /PID`;
- `scripts/kill-port.bat PORT` actúa únicamente sobre el listener solicitado.

### E6 — integridad `projection-rowid`

El test anterior utilizaba `afterEach` sin importarlo. Fue reemplazado por:

`workspace/backend/tests/cards/projection-rowid.test.ts`

El test valida que las proyecciones no manuales creadas por el flujo de aceptación apunten a `CardStatementRow.id` persistidos.

### E7 — Node.js

**Estado corregido:** CajaApp V3 usa **Node.js v24.18.0**.

La exigencia de Node 22 introducida en una remediación anterior fue incorrecta y queda supersedida.

Archivos gobernantes:

- `workspace/backend/package.json` → `engines.node = "24.18.0"`;
- `workspace/frontend/package.json` → `engines.node = "24.18.0"`;
- `workspace/backend/package-lock.json` → package raíz `24.18.0`;
- `workspace/frontend/package-lock.json` → package raíz `24.18.0`;
- `start-app.py` → requiere `v24.18.0`;
- `start_backend.py` → requiere `v24.18.0`.

---

## 5. Archivos canónicos tocados por la remediación funcional

### Backend

- `workspace/backend/src/modules/cards/legacy-projection-rowid-repair.ts`
- `workspace/backend/src/scripts/repair-legacy-projection-rowids.ts`
- `workspace/backend/tests/cards/legacy-projection-rowid-repair.test.ts`
- `workspace/backend/tests/cards/projection-rowid.test.ts`
- `workspace/backend/package.json`

### Frontend

- `workspace/frontend/src/components/finance/transactions/FutureDebtView.tsx`
- `workspace/frontend/tests/future-debt-selection.spec.ts`
- `workspace/frontend/package.json`

### Operación

- `start-app.py`
- `start_backend.py`
- `scripts/kill-port.bat`
- `scripts/kill-ollama-port.bat`

---

## 6. Fuera de alcance

No se modificó deliberadamente:

- prompt de extracción de IA;
- schema del JSON extraído;
- render/extracción del PDF;
- orden proveniente del resumen;
- `future-debt-api.ts` y su wire contract;
- lógica financiera no relacionada con recuperación de referencia fila/tarjeta.

---

## 7. Estado de validación

**NO declarar PASS todavía.**

El código fue materializado en Dropbox, pero la validación runtime debe ejecutarse en el entorno local oficial con **Node.js v24.18.0**.

Backend:

`cd workspace\backend && npm run build && npx vitest run --no-file-parallelism tests/cards/legacy-projection-rowid-repair.test.ts tests/cards/projection-rowid.test.ts`

Frontend:

`cd workspace\frontend && npm run typecheck && npx playwright test tests/future-debt.spec.ts tests/future-debt-selection.spec.ts`

Arranque desde el root:

`python start-app.py`

Smoke mínimo:

- `node --version` devuelve `v24.18.0`;
- `http://127.0.0.1:11436/health` responde;
- `http://127.0.0.1:11437` responde;
- el repair legacy imprime estadísticas antes del arranque;
- los matches únicos dejan de generar falsos `missing_card_reference`;
- los casos ambiguos permanecen Pendientes;
- select-all global, por tarjeta y Pendientes son independientes;
- borrado persiste y refresca Deuda Futura.

Gate Windows E5:

1. iniciar con `python start-app.py`;
2. registrar listeners/PIDs de `11436` y `11437`;
3. cerrar con Ctrl+C y confirmar que ambos puertos quedan libres;
4. repetir cerrando la ventana/terminal;
5. si queda listener, registrar PID y árbol antes de aplicar otro fix.

---

## 8. Criterio de aceptación

El repair pasa a **VALIDADO TÉCNICAMENTE** sólo cuando los gates focalizados terminan exitosamente bajo Node.js v24.18.0.

Pasa a **ACEPTADO FUNCIONALMENTE** únicamente después de la prueba real del usuario con sus datos.

No avanzar con otro vertical del rediseño antes de esa aceptación.

---

## 9. Trazabilidad y rollback

SSOT históricos y material previo se preservan en:

- `docs/00-context/history/`
- `architecture-handoff/architect-working/repair-20260725/`

No eliminar evidencia hasta la aceptación funcional del usuario.

---

## 10. Regla de continuidad

A partir de este estado:

- leer `workspace/` antes de modificar documentación;
- no reconstruir código desde tests si existe source canónico;
- no introducir launchers detached;
- no considerar `missing_card_reference` cerrado sólo por el camino de creación;
- no asignar una fila legacy si existe ambigüedad;
- no declarar DONE únicamente por build/test;
- **no volver a exigir Node 22 para CajaApp V3; el runtime oficial es Node.js v24.18.0.**
