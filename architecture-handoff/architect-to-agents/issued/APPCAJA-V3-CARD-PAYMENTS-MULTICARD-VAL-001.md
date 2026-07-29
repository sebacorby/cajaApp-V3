# APPCAJA V3 — CARD PAYMENTS MULTICARD — VALIDACIÓN 001

**Tipo:** VALIDACIÓN SOLAMENTE  
**Proyecto:** CajaApp V3  
**Root:** `I:\cajaApp-V3`  
**Fecha:** 2026-07-27/28  
**Objetivo:** validar la corrección arquitectónica que impide que aceptar/importar una tarjeta haga desaparecer otra tarjeta distinta de **Pagos de tarjeta**.

---

## 1. REGLA PRINCIPAL

Este trabajo es **VALIDACIÓN**, no implementación.

El agente:

- NO debe modificar código fuente.
- NO debe crear wrappers, scripts auxiliares ni launchers.
- NO debe limpiar ni recrear la base de datos.
- NO debe borrar statements, drafts ni documentos.
- NO debe reimportar PDFs antes de la primera verificación de runtime.
- NO debe modificar parsers Visa/Mastercard.
- NO debe introducir heurísticas por últimos 4 dígitos.
- NO debe modificar configuración de Node.
- Si encuentra un fallo, debe capturar evidencia, clasificarlo y detenerse.

---

## 2. NODE OBLIGATORIO DEL PROYECTO

La única instalación válida de Node para esta validación es:

`I:\Tools\node-v24.18.0-win-x64`

No instalar, cambiar ni recomendar otra versión.

No agregar checks de versión al proyecto.

Antes de ejecutar comandos, utilizar esa instalación en la sesión actual.

PowerShell, una sola línea:

`$env:PATH='I:\Tools\node-v24.18.0-win-x64;'+$env:PATH; node -v; npm -v`

La salida esperada de Node es `v24.18.0`.

---

## 3. CONTEXTO DEL DEFECTO REPRODUCIDO

Secuencia real informada por el usuario:

1. Importó y aceptó Mastercard Galicia.
2. Mastercard quedó visible correctamente.
3. Luego importó y aceptó Visa Galicia.
4. La importación Visa terminó sin error.
5. En **Pagos de tarjeta** quedó visible solamente Visa.
6. Mastercard desapareció completamente de la vista.

Esto viola el contrato funcional vigente:

- Visa y Mastercard deben coexistir.
- aceptar un resumen de una cuenta NO puede desactivar otra cuenta distinta;
- titular/adicional son grupos internos de un mismo statement;
- únicamente una nueva versión del MISMO resumen canónico puede superseder una versión previa de ese resumen.

---

## 4. IDENTIDADES CANÓNICAS QUE NO DEBEN MEZCLARSE

### Visa Galicia real

- Marca: VISA
- Banco: Banco Galicia
- Statement: `VI00000000001089271`
- Account identifier: `1163998245`
- Período: `2026-07`
- Vencimiento actual: `2026-07-13`

### Mastercard Galicia real

- Marca: MASTERCARD BLACK
- Banco: Banco Galicia
- Statement: `027012704157`
- Account identifier / N° de Socio: `2724883-0-4`
- Período: `2026-07`
- Vencimiento actual: `2026-07-13`

Son dos cuentas/series distintas y jamás deben colapsarse entre sí.

---

## 5. CAMBIO ENTREGADO PARA VALIDAR

Archivos runtime modificados por el arquitecto:

`workspace/backend/src/modules/cards/cards.service.ts`

`workspace/backend/src/modules/cards/card-payments-presentation.ts`

Archivos de identidad/selección que se mantienen como soporte del comportamiento:

`workspace/backend/src/modules/cards/card-statement-identity.ts`

`workspace/backend/src/modules/cards/card-payments-multicard.ts`

`workspace/backend/src/modules/cards/card-payments-multicard.test.ts`

### Cambio A — aceptación/versionado

`cards.service.ts` ahora toma un snapshot de todos los statements históricos no archivados con estado `accepted`/`superseded` ANTES de delegar la persistencia al servicio base.

Después de aceptar el nuevo draft:

- recupera el statement recién creado;
- vuelve a reunir todos los statements relevantes capturados antes de la aceptación;
- agrupa por `summaryKey` canónico;
- sólo versiones reales del MISMO summary se versionan entre sí;
- el más reciente del mismo summary queda `accepted`;
- versiones anteriores del mismo summary quedan `superseded`;
- Visa y Mastercard quedan en grupos canónicos diferentes y por lo tanto ambas deben permanecer aceptadas;
- se limpia cualquier `archivedAt/archivedReason` colateral generado por el versionado legacy sobre statements que ya pertenecían a la historia aceptada.

### Cambio B — lectura de Pagos de tarjeta

`card-payments-presentation.ts` consulta statements con:

- `status = accepted` o `superseded`.

Durante esta transición ya NO excluye por `archivedAt` en ese read path, porque una versión legacy pudo haber cargado accidentalmente `archivedAt` sobre un statement superseded que seguía perteneciendo a la historia aceptada.

Un archivado manual real sigue fuera de Pagos porque su estado es `archived`.

La selección posterior continúa usando:

1. deduplicación por summary canónico;
2. selección del resumen más nuevo por account series confiable;
3. separación conservadora de legacy sin identidad estable.

---

## 6. BACKUPS / ROLLBACK — NO MODIFICAR

Backups creados por el arquitecto:

`architecture-handoff/architect-working/card-statement-identity-fix-20260728/backups/cards.service.before-global-canonicalize.ts`

`architecture-handoff/architect-working/card-statement-identity-fix-20260728/backups/card-payments-presentation.before-legacy-archive-read.ts`

Readbacks:

`architecture-handoff/architect-working/card-statement-identity-fix-20260728/readback/cards.service.after-global-canonicalize.ts.txt`

`architecture-handoff/architect-working/card-statement-identity-fix-20260728/readback/card-payments-presentation.after-legacy-archive-read.ts.txt`

No mover, borrar ni restaurar estos archivos durante la validación.

---

## 7. GATE 1 — BUILD BACKEND

Directorio:

`I:\cajaApp-V3\workspace\backend`

PowerShell, una sola línea:

`cd I:\cajaApp-V3\workspace\backend; $env:PATH='I:\Tools\node-v24.18.0-win-x64;'+$env:PATH; npm run build`

### PASS

- `tsc -p tsconfig.json` termina con exit code 0.

### FAIL

- cualquier error TypeScript;
- import inexistente;
- incompatibilidad Prisma/types;
- error de sintaxis.

Si falla: guardar salida completa y detener la validación. NO corregir código.

---

## 8. GATE 2 — TEST MULTICARD MÍNIMO

No ejecutar suite E2E completa.

Ejecutar únicamente el test unitario existente de selección/merge multicard.

PowerShell, una sola línea:

`cd I:\cajaApp-V3\workspace\backend; $env:PATH='I:\Tools\node-v24.18.0-win-x64;'+$env:PATH; npm test -- src/modules/cards/card-payments-multicard.test.ts`

Casos relevantes que deben seguir PASS:

- Visa + Mastercard simultáneamente;
- titular/adicional no crean cuentas independientes;
- duplicate summary real colapsa;
- dos Visa distintas permanecen separadas;
- misma account series usa sólo el resumen mensual más reciente;
- legacy sin accountNumber no se fusiona por heurística;
- merge mensual conserva las dos tarjetas y suma totales.

Si falla: guardar salida completa y detenerse. NO modificar tests ni source.

---

## 9. GATE 3 — RUNTIME CON EL ESTADO ACTUAL DE DB

### MUY IMPORTANTE

Para esta primera prueba:

- NO borrar DB;
- NO reimportar Mastercard;
- NO reimportar Visa;
- NO aceptar nuevos drafts;
- NO limpiar datos.

Reiniciar CajaApp usando el mecanismo normal ya existente del proyecto.

No crear un launcher nuevo.

Luego abrir directamente:

**Pagos de tarjeta**

### PASS esperado

Deben aparecer simultáneamente como dos cuentas independientes:

- Visa Galicia;
- Mastercard Galicia.

Visa puede mostrarse con sufijo derivado de su cuenta, por ejemplo `Cuenta •••• 8245`.

Mastercard debe seguir representando su propio statement/cuenta y NO quedar absorbida dentro de Visa.

### También verificar

- los dos plásticos/grupos Visa 8238 y 9138 continúan consolidados dentro de una sola cuenta Visa;
- esos grupos NO aparecen como dos tarjetas independientes;
- Mastercard no queda mezclada con Visa;
- no aparece una tercera cuenta espuria por titular/adicional.

### FAIL

Si sigue apareciendo sólo Visa:

1. NO reimportar nada.
2. Capturar screenshot.
3. Capturar logs backend de la carga de Pagos de tarjeta.
4. Informar el resultado exacto.
5. Detenerse.

---

## 10. GATE 4 — REIMPORTACIÓN EXACTA, SÓLO SI GATE 3 PASS

Ejecutar este gate únicamente si Visa + Mastercard ya aparecen juntas.

Elegir UNO de los dos PDFs ya aceptados y volver a importarlo byte-a-byte igual.

Preferencia: usar Visa para reproducir la secuencia original.

Flujo:

1. importar el mismo PDF;
2. comprobar que llega a preview;
3. aceptar la nueva preview;
4. volver a Pagos de tarjeta.

### PASS esperado de versionado

Para el summary recargado:

- versión anterior -> `superseded`;
- versión nueva -> `accepted`;
- misma identidad canónica de summary;
- account series conservada.

Para la otra tarjeta distinta:

- debe permanecer visible;
- no debe cambiar a una identidad del summary recargado;
- no debe desaparecer;
- no debe fusionarse.

### PASS visual final

Después de reimportar Visa:

- Visa visible;
- Mastercard visible;
- no hay duplicado visual de la Visa vieja y nueva;
- no hay tarjetas por grupo/adicional.

---

## 11. NO VALIDAR / NO TOCAR EN ESTA ITERACIÓN

No ampliar el alcance hacia:

- IA advisor;
- imports de otros documentos;
- ingresos;
- conciliación;
- movimientos generales;
- frontend visual fuera de Pagos de tarjeta;
- refactors;
- migraciones Prisma;
- limpieza de datos legacy;
- optimizaciones no relacionadas.

---

## 12. EVIDENCIA DE SALIDA

Crear una carpeta nueva bajo:

`architecture-handoff/agents-to-architect/pending-validation/`

Nombre sugerido:

`APPCAJA-V3-CARD-PAYMENTS-MULTICARD-VAL-001-evidence`

Incluir como mínimo:

- `node-version.txt`
- `backend-build.txt`
- `multicard-test.txt`
- `runtime-result.md`
- screenshot de Pagos de tarjeta después del restart;
- screenshot final después de la reimportación, sólo si Gate 4 fue ejecutado;
- logs relevantes si hubo FAIL.

No crear ZIP salvo pedido posterior.

---

## 13. FORMATO DEL REPORTE DEL AGENTE

Responder al arquitecto con:

### RESULTADO

`PASS` o `FAIL`

### GATES

- Backend build: PASS/FAIL
- Multicard unit test: PASS/FAIL
- Runtime DB actual Visa + Mastercard: PASS/FAIL
- Exact reimport/versioning: PASS/FAIL/NOT RUN

### OBSERVACIÓN VISUAL

Indicar exactamente cuántas cuentas aparecen y sus labels.

### SI HAY FAIL

Indicar:

- primer punto exacto de fallo;
- archivo/comando o pantalla;
- error textual;
- evidencia generada;
- clasificación tentativa: código / datos legacy / proceso runtime / test.

NO proponer ni aplicar una corrección adicional sin una nueva instrucción del arquitecto.

---

## 14. CRITERIO FINAL DE ACEPTACIÓN

Esta corrección queda validada únicamente si se demuestra en runtime que:

**Mastercard Galicia + Visa Galicia coexisten simultáneamente en Pagos de tarjeta, y reimportar/versionar una de ellas no elimina ni fusiona la otra.**
