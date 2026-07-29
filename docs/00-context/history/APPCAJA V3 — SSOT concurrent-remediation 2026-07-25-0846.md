# APPCAJA V3 — SSOT de ejecución vigente

**Estado:** VIGENTE — REMEDIACIÓN E1–E5 MATERIALIZADA / VALIDACIÓN LOCAL PENDIENTE  
**Fecha:** 25 de julio de 2026  
**Regla de gobierno:** ante contradicción entre reportes y código canónico, **manda el código**. Un PASS documental no prevalece sobre el comportamiento real de la aplicación.

---

## 1. Repositorio canónico

La única fuente vigente de CajaApp V3 es:

`/Javier Corbella/cajaApp-V3`

- `workspace/`: código real de la aplicación.
- `docs/`: documentación vigente.
- `contracts/`: contratos, schemas, prompts y ejemplos.
- `specs/`: especificaciones y evidencias históricas.
- `architecture-handoff/`: material de trabajo, backups y entregas de agentes; no gobierna sobre `workspace/`.

La copia previa de este SSOT fue conservada en:

`docs/00-context/history/APPCAJA V3 — SSOT pre-repair 2026-07-25.md`

---

## 2. Autorización operativa vigente

La pausa anterior quedó levantada por instrucción explícita del usuario para revisar y corregir E1–E5 y cualquier defecto directamente relacionado descubierto al leer el código.

El cierre de esta iteración requiere:

1. código canónico materializado;
2. validaciones técnicas focalizadas;
3. aplicación levantada con datos reales;
4. prueba funcional del usuario.

No declarar DONE funcional sólo porque existan tests verdes.

---

## 3. Estado real E1–E5

| ID | Hallazgo real | Estado de código |
|---|---|---|
| E1 — `missing_card_reference` | El fix preventivo de FEAT-027 evita nuevos `rowId` de preview, pero no reparaba registros históricos ya persistidos. | **Corregido en código:** existe reparación legacy idempotente y test dedicado; `start-app.py` la ejecuta antes de servir datos. Validación contra la DB real pendiente. |
| E2 — corrupción de `FutureDebtView.tsx` | El archivo había sido reconstruido previamente y luego volvió a recibir cambios de UI. | **Corregido/materializado:** componente canónico presente nuevamente en `workspace/frontend/.../FutureDebtView.tsx`. |
| E3 — UI desvanecida | Uso excesivo de tonos muted en información financiera y checkboxes con poco contraste. | **Corregido en código:** datos operativos usan contraste explícito; metadata secundaria queda diferenciada; checkbox usa borde visible. |
| E4 — select-all | El arreglo anterior incluía Pendientes en `allRowIds`, pero reutilizaba el mismo toggle global en scopes que se presentaban como locales. | **Corregido en código:** selección por tarjeta y selección de Pendientes trabajan con sus propios IDs. |
| E5 — zombie backend | `start_backend.py` utilizaba `DETACHED_PROCESS`, ruta absoluta y terminaba dejando al hijo desacoplado. | **Corregido en código:** backend foreground, rutas relativas, sin detach; `start-app.py` mantiene ownership de backend/frontend y mata árboles al cerrar de forma controlada. Hard-close debe verificarse en Windows real. |

---

## 4. E1 — reparación de referencias históricas

### 4.1 Causa

`FutureDebtService` resuelve la tarjeta de una proyección no manual a partir de `CardInstallmentProjection.rowId -> CardStatementRow.id -> groupKey -> CardStatementGroup`.

Antes del fix FEAT-027 algunas proyecciones guardaron el ID de fila del preview en vez del UUID persistido. Aunque `acceptDraft()` quedó corregido para nuevas cargas, esos registros viejos permanecían inválidos.

### 4.2 Implementación vigente

Archivos canónicos incorporados:

- `workspace/backend/src/modules/cards/legacy-projection-rowid-repair.ts`
- `workspace/backend/src/scripts/repair-legacy-projection-rowids.ts`
- `workspace/backend/tests/cards/legacy-projection-rowid-repair.test.ts`
- `workspace/backend/tests/cards/projection-rowid.test.ts`

`start-app.py` ejecuta la reparación legacy antes de levantar el backend. Si la reparación devuelve error, el launcher frena y no sirve datos financieros potencialmente inconsistentes.

### 4.3 Criterio de aceptación

Luego del arranque con la base real:

- la reparación debe finalizar sin error;
- `GET /api/future-debt` no debe reportar falsos `missing_card_reference` para proyecciones reparables;
- nuevas importaciones deben seguir persistiendo `rowId` válidos.

---

## 5. E2/E3/E4 — `FutureDebtView.tsx`

Archivo canónico:

`workspace/frontend/src/components/finance/transactions/FutureDebtView.tsx`

La revisión posterior al reporte detectó que E4 no estaba realmente cerrado. El checkbox de una tarjeta y el de Pendientes terminaban usando el toggle global, pese a que sus labels indicaban scope local.

La implementación materializada separa los scopes:

- cada tarjeta calcula sus propios `cardRowIds`;
- el checkbox de una tarjeta llama al toggle sólo con esos IDs;
- Pendientes calcula sus propios IDs y no debe afectar filas de tarjetas;
- la selección individual continúa usando `selectedIds` compartido para permitir borrado combinado explícito;
- el contraste de importes, descripciones, origen y estados se mantiene alto;
- metadata secundaria puede seguir usando tonos más suaves.

**Regla funcional:** un control que visualmente pertenece a una tarjeta o a Pendientes nunca puede seleccionar/deseleccionar filas fuera de ese scope.

---

## 6. E5 — lifecycle de procesos

### 6.1 Defecto anterior

El viejo `start_backend.py`:

- tenía una ruta absoluta de una PC específica;
- usaba `subprocess.DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP`;
- terminaba después del `Popen`.

Eso era conceptualmente incompatible con impedir procesos huérfanos.

### 6.2 Implementación vigente

`start_backend.py` ahora:

- resuelve el proyecto mediante `Path(__file__)`;
- levanta Node en foreground;
- no usa `DETACHED_PROCESS`;
- rechaza iniciar si `11436` ya está ocupado.

`start-app.py` ahora:

- exige Node.js 22.x;
- valida `11436` y `11437` antes del arranque;
- ejecuta reparación E1 antes de servir;
- mantiene referencias a backend/frontend;
- usa process groups;
- registra `SIGINT`, `SIGTERM` y `SIGBREAK` cuando corresponde;
- en shutdown controlado ejecuta `taskkill /F /T /PID` en Windows para cerrar el árbol completo.

Herramienta de emergencia:

`scripts/kill-port.bat PORT`

Sólo busca procesos `LISTENING` del puerto solicitado; reemplaza el uso de `kill-ollama-port.bat` como herramienta genérica para CajaApp.

### 6.3 Gate pendiente

La corrección de detach ya está materializada, pero el caso exacto de cierre abrupto debe probarse en Windows real:

1. iniciar CajaApp;
2. registrar PID backend/frontend;
3. cerrar el launcher;
4. comprobar que no quede listener en `11436` ni `11437`;
5. repetir con cierre de ventana/terminal para cubrir el caso que originó E5.

---

## 7. Archivos históricos y backups

Durante la remediación los originales fueron apartados en:

`architecture-handoff/architect-working/repair-20260725/replaced-originals/`

También existen backups en:

`architecture-handoff/architect-working/repair-20260725/backups/`

No son código canónico. Se conservan sólo para rollback/auditoría.

---

## 8. Validación técnica mínima requerida

Ejecutar sobre la máquina local sincronizada:

`cd workspace/backend && npm run test -- --run tests/cards/projection-rowid.test.ts tests/cards/legacy-projection-rowid-repair.test.ts`

`cd workspace/backend && npx tsc --noEmit`

`cd workspace/frontend && npm run typecheck`

Ejecutar Playwright focalizado en deuda futura/selección/eliminación.

Luego levantar exclusivamente con:

`python start-app.py`

No usar launchers detached para la validación.

---

## 9. Prueba funcional obligatoria

La iteración se considera aceptable sólo si el usuario confirma en UI real:

- tarjeta correcta en deuda futura;
- ausencia de falsos `missing_card_reference`;
- selección individual correcta;
- select-all de una tarjeta no toca otras tarjetas;
- select-all de Pendientes no toca tarjetas;
- eliminación persiste y refresca la UI;
- legibilidad financiera correcta;
- al cerrar la aplicación no queda backend zombie.

---

## 10. Corrección al reporte anterior

El reporte agregado como antigua Sección 14 fue útil para enumerar E1–E5, pero dos cierres eran incorrectos:

1. **E4:** agregar Pendientes al conjunto global no era suficiente; además había que separar el scope de cada selector.
2. **E5:** `DETACHED_PROCESS` no era una solución de lifecycle; era parte del problema.

También se aclara E1: el fix de `acceptDraft()` prevenía nuevas referencias inválidas, pero hacía falta una reparación explícita de datos históricos.

---

## 11. Regla de continuidad

A partir de este punto:

- no reconstruir `FutureDebtView.tsx` desde tests ni desde copias parciales;
- no introducir procesos detached para backend/frontend;
- no declarar reparado `missing_card_reference` sólo con un test de creación: validar también datos históricos y respuesta real de deuda futura;
- ante discrepancias, volver a leer `workspace/` antes de modificar este SSOT.

**Estado final de esta actualización:** remediación materializada; validación técnica/local y aceptación funcional pendientes.
