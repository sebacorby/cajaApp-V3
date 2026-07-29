# APPCAJA V3 — SSOT DE EJECUCIÓN VIGENTE

**Estado:** VIGENTE — REMEDIACIÓN E1–E7 MATERIALIZADA / VALIDACIÓN LOCAL PENDIENTE  
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
- El arquitecto/asistente diseña y escribe código. Los agentes, cuando sean utilizados, sólo compilan, levantan y ejecutan validaciones mínimas indicadas.
- Un build verde no equivale a aceptación funcional.

La pausa anterior quedó levantada por instrucción explícita del usuario del 25 de julio de 2026 para revisar y corregir directamente E1–E5 y cualquier defecto relacionado descubierto al leer el código.

Bloque activo:

`APP-CARDS-FUTURE-REDESIGN-001`

---

## 2. Intención funcional que sigue vigente

CajaApp V3 debe funcionar como un **motor financiero continuo**:

1. El usuario carga resúmenes inicialmente o de forma esporádica para establecer y conciliar deuda real.
2. La aplicación persiste obligaciones y mantiene el futuro sin necesitar un PDF nuevo todos los meses.
3. Cada compra, ingreso o compromiso posterior recalcula el futuro.
4. Las cuotas avanzan por períodos mensuales `YYYY-MM`; no por suma de treinta días.
5. Los resúmenes posteriores concilian y ajustan, pero no sostienen por sí solos la proyección.
6. La IA extrae/normaliza; la aplicación calcula, valida, persiste y proyecta.

Este repair no redefine la extracción del PDF ni sus contratos.

---

## 3. Diagnóstico real y correcciones

### E1 — `missing_card_reference`: prevención y reparación eran problemas distintos

El fix de aceptación existente evita que **nuevas** proyecciones conserven el ID temporal del preview: después de persistir `CardStatementRow`, las proyecciones quedan vinculadas al UUID real.

Eso no reparaba datos históricos. `FutureDebtService` resuelve una proyección no manual mediante:

`CardInstallmentProjection.rowId -> CardStatementRow.id -> groupKey -> CardStatementGroup`

Por lo tanto, proyecciones antiguas ya guardadas con un ID de preview seguían produciendo `missing_card_reference`.

#### Reparación legacy incorporada

Archivos:

- `workspace/backend/src/modules/cards/legacy-projection-rowid-repair.ts`
- `workspace/backend/src/scripts/repair-legacy-projection-rowids.ts`
- `workspace/backend/tests/cards/legacy-projection-rowid-repair.test.ts`

La reparación:

- considera sólo proyecciones no manuales cuyo `rowId` no corresponde a ninguna fila persistida;
- agrupa por `statementId + legacyRowId`;
- exige que la cuota fuente sea exactamente la anterior a la primera cuota futura y que comparta el mismo total;
- exige moneda coincidente;
- exige al menos un importe coincidente como ancla;
- normaliza importes AR/US antes de comparar (`3.356,37`, `3,356.37`, `$ 3.356,37` y `3356.37` pueden representar el mismo valor);
- sólo remapea si existe **una única fila candidata**;
- ante cero o múltiples candidatos no adivina: deja el registro sin modificar para que continúe visible como pendiente;
- es idempotente: una referencia ya reparada deja de pertenecer al conjunto legacy.

Runner manual:

`cd workspace\backend && npm run repair:projection-rowids`

`start-app.py` ejecuta el repair automáticamente antes de iniciar el backend. Si falla, el launcher aborta para no servir datos financieros sobre un estado parcialmente reparado.

### E2 — `FutureDebtView.tsx`

Archivo canónico:

`workspace/frontend/src/components/finance/transactions/FutureDebtView.tsx`

La vista fue reemplazada por una implementación canónica completa que conserva:

- contrato de `future-debt-api.ts`;
- horizonte de 1 a 24 meses;
- totales ARS/USD separados;
- agrupación por mes y tarjeta;
- sección de Pendientes;
- diagnósticos de integridad;
- selección y borrado de filas;
- `data-testid` relevantes para la suite existente.

No reconstruir esta vista desde tests, logs o copias parciales en futuras iteraciones. El archivo de `workspace/` es la fuente.

### E3 — contraste financiero

Criterio vigente:

- importes, descripción, estado, origen y diagnósticos usan colores explícitos de alto contraste;
- metadata secundaria puede usar gris, pero no información financiera principal;
- checkboxes usan borde visible explícito;
- estados/diagnósticos amber y emerald usan fondos y texto de contraste reforzado.

No aplicar reemplazos globales de `text-muted-foreground` sin distinguir dato operativo de metadata secundaria.

### E4 — `select-all` anterior seguía roto

El fix anterior incorporó Pendientes a `allRowIds`, pero reutilizaba el mismo `allSelected` y `handleToggleAll` global en controles visualmente locales.

Eso permitía que el checkbox de una tarjeta o de Pendientes afectara filas fuera de su bloque.

La implementación vigente separa scopes:

- `Seleccionar todo` -> todas las filas visibles, confirmadas + pendientes;
- checkbox de tarjeta -> sólo IDs de esa tarjeta;
- checkbox de Pendientes -> sólo IDs pendientes;
- checkbox individual -> sólo esa fila;
- deseleccionar un scope sólo elimina IDs de ese scope y conserva otras selecciones.

Regresión agregada:

`workspace/frontend/tests/future-debt-selection.spec.ts`

### E5 — backend zombie: la causa documentada estaba invertida parcialmente

El `start-app.py` anterior ya iniciaba backend/frontend como hijos normales e intentaba terminar árboles con `taskkill /T`.

El defecto concreto adicional estaba en `start_backend.py`, que:

- contenía una ruta absoluta a una PC específica;
- usaba `DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP`;
- terminaba luego del `Popen`, dejando el backend desacoplado.

Correcciones vigentes:

- `start_backend.py` usa paths relativos al repo y mantiene el backend en foreground;
- no utiliza `DETACHED_PROCESS`;
- verifica que `11436` esté libre antes de iniciar;
- `start-app.py` es el launcher principal y conserva ownership de backend/frontend;
- valida `11436` y `11437` antes del arranque;
- registra `SIGINT`, `SIGTERM` y `SIGBREAK` cuando corresponde;
- en Windows cierra el árbol con `taskkill /F /T /PID` en shutdown controlado;
- `scripts/kill-port.bat PORT` mata únicamente el listener del puerto solicitado;
- `scripts/kill-ollama-port.bat` queda como wrapper de compatibilidad y exige puerto explícito.

No se promete supervivencia perfecta ante kill forzado del sistema operativo, corte de energía o cierre no interceptable. El objetivo del fix es eliminar el detach deliberado y manejar correctamente el lifecycle normal y de interrupción.

### E6 — test `projection-rowid` inválido

El test anterior utilizaba `afterEach(...)` sin importarlo desde Vitest, por lo que la cobertura documentada no era confiable.

Fue reemplazado por:

`workspace/backend/tests/cards/projection-rowid.test.ts`

El test nuevo acepta un draft real de prueba y verifica que cada `CardInstallmentProjection` no manual referencia un `CardStatementRow.id` realmente persistido.

### E7 — Node.js declarado de forma inconsistente

Backend y frontend todavía declaraban `node: 24.18.0` aunque el entorno operativo vigente de CajaApp V3 es Node.js 22.x.

Se alinearon:

- `workspace/backend/package.json` -> `engines.node = "22.x"`;
- `workspace/frontend/package.json` -> `engines.node = "22.x"`;
- `start-app.py` bloquea si `node --version` no comienza con `v22.`.

El backend agrega además:

`repair:projection-rowids`

Los `package-lock.json` conservan metadata histórica del engine en el registro raíz generado anteriormente. Esa metadata no gobierna el engine del proyecto durante `npm ci`; los manifests y el launcher son la regla ejecutable. No se reescriben locks completos únicamente por esa metadata.

---

## 4. Archivos canónicos tocados por este repair

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

### Documentación

- `docs/00-context/APPCAJA V3 — SSOT de ejecución vigente.md`

---

## 5. Fuera de alcance de este repair

No se modificó deliberadamente:

- prompt de extracción de IA;
- schema del JSON extraído;
- render/extracción del PDF;
- orden proveniente del resumen;
- `future-debt-api.ts` y su wire contract;
- lógica financiera no relacionada con recuperación de referencia de fila/tarjeta;
- importación del resumen salvo la integridad de `rowId` que ya estaba corregida para cargas nuevas.

---

## 6. Estado de validación

**NO declarar PASS todavía.**

El código fue materializado e inspeccionado en Dropbox, pero esta sesión no ejecutó Node, TypeScript, Vitest, Playwright ni la aplicación local. No existe evidencia honesta de build/runtime posterior a este repair hasta ejecutar los gates siguientes.

Backend:

`cd workspace\backend && npm run build && npx vitest run --no-file-parallelism tests/cards/legacy-projection-rowid-repair.test.ts tests/cards/projection-rowid.test.ts`

Frontend:

`cd workspace\frontend && npm run typecheck && npx playwright test tests/future-debt.spec.ts tests/future-debt-selection.spec.ts`

Arranque desde el root:

`python start-app.py`

Si un proceso previo ocupa el backend:

`scripts\kill-port.bat 11436`

Smoke mínimo posterior:

- `http://127.0.0.1:11436/health` responde;
- `http://127.0.0.1:11437` responde;
- el repair legacy imprime estadísticas antes del arranque;
- los grupos con match único dejan de producir falsos `missing_card_reference`;
- los casos ambiguos permanecen en Pendientes;
- select-all global, por tarjeta y de Pendientes son independientes;
- borrado de filas persiste y refresca Deuda Futura.

Gate Windows para E5:

1. iniciar con `python start-app.py`;
2. registrar listeners/PIDs de `11436` y `11437`;
3. cerrar normalmente con Ctrl+C y confirmar que ambos puertos quedan libres;
4. repetir cerrando la ventana/terminal para cubrir el escenario que originó el zombie;
5. si queda un listener, registrar PID y árbol antes de aplicar otro fix.

---

## 7. Criterio de aceptación

El repair pasa a **VALIDADO TÉCNICAMENTE** sólo si los gates anteriores terminan exitosamente.

Pasa a **ACEPTADO FUNCIONALMENTE** únicamente después de la prueba real del usuario con sus datos.

No avanzar con otro vertical del rediseño antes de esa aceptación.

---

## 8. Trazabilidad y rollback

SSOT previos preservados:

- `docs/00-context/history/APPCAJA V3 — SSOT pre-repair 2026-07-25.md`
- `docs/00-context/history/APPCAJA V3 — SSOT concurrent-remediation 2026-07-25-0846.md`

Material de auditoría y rollback:

`architecture-handoff/architect-working/repair-20260725/`

- `backups/`: copias previas a reemplazos;
- `replaced-originals/`: originales apartados de sus rutas canónicas y versiones intermedias;
- archivos `.txt` en la raíz: snapshots de inspección.

No eliminar estas evidencias hasta que el usuario acepte funcionalmente el repair.

---

## 9. Regla de continuidad

A partir de este estado:

- leer `workspace/` antes de modificar este SSOT;
- no reconstruir código desde tests si el source canónico existe;
- no introducir launchers detached para backend/frontend;
- no considerar `missing_card_reference` cerrado sólo por el camino de creación: validar también datos históricos;
- no asignar una fila legacy por similitud si hay ambigüedad;
- no declarar DONE por build/test sin prueba real del usuario.

**Estado final de esta actualización:** código de remediación materializado; validación técnica local y aceptación funcional pendientes.
