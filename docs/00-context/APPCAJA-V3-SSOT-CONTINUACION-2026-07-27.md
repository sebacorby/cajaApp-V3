# APPCAJA V3 — SSOT DE CONTINUACIÓN

**Fecha de corte:** 2026-07-27  
**Última actualización:** 2026-07-27 — cierre funcional y visual de **Pagos de tarjeta**  
**Proyecto:** CajaApp V3  
**Root canónico:** `I:\cajaApp-V3`  
**Objetivo:** permitir retomar el trabajo sin depender del historial del chat y conservar únicamente el estado funcional realmente vigente/validado.

---

## 1. Regla de trabajo vigente

Este documento es la fuente de continuidad operativa del proyecto.

### Forma de trabajo

La regla vigente es vinculante:

- ChatGPT diseña la solución, diagnostica y modifica directamente el código.
- El usuario realiza las pruebas funcionales finales.
- No se utilizan agentes externos/adicionales para programar, validar ni modificar el proyecto.
- No generar handoffs, specs de ejecución ni tareas para agentes salvo que el usuario cambie explícitamente esta regla.
- Cuando se modifica código, preservar rollback razonable antes de cambios sensibles.

### Node.js obligatorio

La única instalación válida de Node para este proyecto es:

`I:\Tools\node-v24.18.0-win-x64`

No recomendar otra instalación y no introducir checks nuevos de versión en scripts, `package.json`, launchers ni gates salvo pedido explícito.

---

## 2. Estado ejecutivo actual

### ESTADO GENERAL DEL MÓDULO PAGOS DE TARJETA

**CERRADO POR AHORA / PASS FUNCIONAL PUNTA A PUNTA + AJUSTES UI VALIDADOS**

El usuario confirmó exitosamente:

1. importación determinística de Mastercard Galicia;
2. aceptación del resumen Mastercard;
3. importación determinística de Visa Galicia;
4. aceptación del resumen Visa;
5. convivencia simultánea de ambas cuentas en **Pagos de tarjeta**;
6. apertura/cierre independiente de cada tarjeta;
7. ambas tarjetas cerradas por default al entrar;
8. visualización del total agregado del próximo mes inmediato;
9. corrección de alineación de `Total a pagar`, `Cotización USD`, `Aplicar` y `Horizonte`;
10. mejora visual del formulario **Nuevo movimiento** para evitar campos pegados a los bordes.

El usuario indicó explícitamente que **Pagos de tarjeta queda cerrado por el momento**.

---

## 3. Arquitectura de importación de tarjetas — contrato vigente

La importación de resúmenes debe seguir siendo determinística:

`PDF -> pdfplumber RAW -> parser programático por emisor -> coverage gate -> preview -> aceptación -> persistencia -> proyección`

La IA no debe interpretar los resúmenes de tarjeta.

Reglas:

- parser programático por layout/emisor;
- la preview debe representar el RAW extraído;
- la aceptación persiste datos normalizados;
- las proyecciones se calculan desde secuencias de cuotas aceptadas;
- las cuotas futuras nunca se generan sumando 30 días;
- titular/adicional son grupos internos del mismo resumen, no cuentas independientes.

---

## 4. Datos reales confirmados

### 4.1 Visa Galicia julio 2026

- Banco: `Banco Galicia`
- Marca: `VISA`
- Resumen: `VI00000000001089271`
- Cuenta: `1163998245`
- Período: `2026-07`
- Vencimiento actual: `2026-07-13`
- Próximo cierre: `2026-07-30`
- Próximo vencimiento: `2026-08-07`
- Grupos/plásticos internos: `8238` y `9138`
- Layout: `galicia-visa`
- Páginas: 8
- Filas estructuradas observadas: 80
- Líneas candidatas: 71
- Líneas parseadas: 71
- Referencias futuras: 6
- Account identity persistida: `1163998245`

Los grupos 8238/9138 pertenecen a una única cuenta Visa.

### 4.2 Mastercard Galicia julio 2026

- Banco: `Banco Galicia`
- Marca: `MASTERCARD BLACK`
- Resumen: `027012704157`
- N° de Socio / cuenta estable: `2724883-0-4`
- Período: `2026-07`
- Vencimiento actual: `2026-07-13`
- Próximo cierre: `2026-07-30`
- Próximo vencimiento: `2026-08-07`
- Layout: `galicia-mastercard`
- Páginas: 6
- Filas estructuradas observadas: 61
- Líneas candidatas: 53
- Líneas parseadas: 53
- Referencias futuras: 6
- Account identity persistida: `2724883-0-4`

Los adicionales del resumen Mastercard son grupos internos del statement y no cuentas separadas.

---

## 5. Identidad canónica vigente

El sistema separa dos conceptos.

### 5.1 Identidad del resumen concreto

Conceptualmente:

`summaryKey = issuer namespace + statementNumber + periodKey + currentDueDate`

Regla:

- mismo resumen canónico -> puede versionarse/supersederse;
- resumen distinto -> jamás debe ser reemplazado por otro sólo por compartir banco o período.

### 5.2 Identidad estable de cuenta

Visa Galicia:

`accountSeriesKey <- N° Cuenta 1163998245`

Mastercard Galicia:

`accountSeriesKey <- N° de Socio 2724883-0-4`

Reglas obligatorias:

- dos identificadores de cuenta distintos nunca se fusionan;
- titular/adicional no define identidad de cuenta;
- últimos cuatro dígitos no definen identidad de cuenta;
- legacy sin identidad confiable debe mantenerse separado antes que fusionarse por heurística.

---

## 6. Parsers determinísticos — estado vigente

### Mastercard Galicia

Archivos:

`workspace/backend/src/modules/card-import/galicia-mastercard.parser.base.ts`

`workspace/backend/src/modules/card-import/galicia-mastercard.parser.ts`

El wrapper de identidad extrae el N° de Socio real:

`2724883-0-4`

Coverage observado:

- 53/53 líneas candidatas;
- 61 filas;
- 6 referencias futuras.

### Visa Galicia

Archivos:

`workspace/backend/src/modules/card-import/galicia-visa.parser.base.ts`

`workspace/backend/src/modules/card-import/galicia-visa.parser.ts`

El wrapper preserva:

`N° Cuenta: 1163998245`

Correcciones que no deben regresarse:

#### Microsoft USD

RAW representativo:

`07-06-26 K Microsoft*Micros MicrosoftUSD 3,22 029107 3,22`

Resultado esperado:

- ARS: `null`
- USD: `3,22`
- moneda: `USD`
- comprobante: `029107`

#### IVA Plan V

RAW representativo:

`28-05-26 DB IVA $ PLAN V 040943 62494,55 13.123,85`

Resultado esperado:

- tipo: `tax`
- ARS real: `13.123,85`
- USD: `null`
- comprobante: `040943`
- base imponible preservada en `originalText`.

---

## 7. Pagos de tarjeta — contrato funcional vigente

La pantalla representa cuentas/resúmenes reales, no plásticos internos.

Debe cumplirse siempre:

- Visa y Mastercard pueden coexistir simultáneamente.
- Agregar/aceptar un resumen nunca debe borrar u ocultar otra cuenta distinta.
- Titular y adicionales de un mismo resumen pertenecen al mismo statement.
- Dos Visa diferentes deben poder coexistir si tienen identidad de cuenta diferente.
- El resumen mensual más nuevo de una misma cuenta puede reemplazar al anterior para la proyección corriente.
- Las cuotas se proyectan por secuencia mensual real.
- Los impuestos se muestran al final de la tabla.
- Los impuestos futuros se recalculan dinámicamente.
- El total real mensual usa ARS + USD convertido por la cotización configurada.

### Cotización USD

Existe configuración compartida `USD_ARS`.

Fórmula conceptual:

`TOTAL_REAL_ARS = TOTAL_ARS + TOTAL_USD * COTIZACION_USD_ARS`

Si hay USD y no existe cotización válida, no inventar valor.

---

## 8. Bug multicard — causa raíz definitiva y cierre

### Síntoma original

1. Mastercard se importaba y aceptaba correctamente.
2. Visa se importaba y aceptaba correctamente.
3. En **Pagos de tarjeta** sólo se veía Visa.
4. Parecía que Mastercard había sido borrada/reemplazada.

### Evidencia backend

La instrumentación demostró que el backend cargaba y presentaba dos cuentas:

- Visa `1163998245` -> 68 movimientos;
- Mastercard `2724883-0-4` -> 55 movimientos.

La respuesta final informaba:

`cardCount: 2`

Por lo tanto, persistencia, identidad, selección multicard y presentación backend estaban entregando correctamente ambas tarjetas.

### Causa raíz real

La sección frontend que montaba Pagos de tarjeta tenía un hack CSS equivalente a:

`[&_[data-testid='card-payments-view']>div:nth-child(3)]:hidden`

Con la estructura actual:

1. controles;
2. Visa;
3. Mastercard.

Ese selector ocultaba exactamente Mastercard aunque estuviera correctamente renderizada.

### Corrección

Archivo:

`workspace/frontend/src/components/finance/sections/deuda-futura-section.tsx`

Estado vigente:

```tsx
"use client";

import { CardPaymentsWorkspace } from "@/components/finance/transactions/CardPaymentsWorkspace";

export function DeudaFuturaSection() {
  return <CardPaymentsWorkspace />;
}
```

Se eliminó completamente el selector `nth-child(3):hidden`.

**Estado del bug:** CERRADO / PASS funcional.

---

## 9. UX actual de Pagos de tarjeta — cierre 2026-07-27

### 9.1 Tarjetas cerradas por default

Al ingresar a **Pagos de tarjeta** todas las cuentas arrancan cerradas.

Comportamiento esperado y validado:

- Visa cerrada;
- Mastercard cerrada;
- el usuario abre manualmente la que necesita;
- una tarjeta no debe abrir otra automáticamente.

### 9.2 Total agregado del próximo mes

Se agregó un bloque superior:

`TOTAL A PAGAR`

Su período representa el próximo mes inmediato posterior al resumen base.

Ejemplo vigente observado:

`AGO 2026 · 2 tarjetas`

El valor se calcula agregando `totalsByMonth` de todas las tarjetas seleccionadas para ese mes y convirtiendo USD con la cotización configurada cuando corresponde.

En la última validación visual el bloque mostró:

`$ 2.592.160,23`

Este importe se registra como valor visual observado del estado de datos actual; no debe hardcodearse.

### 9.3 Toolbar superior

Los siguientes componentes quedaron alineados visualmente en una única fila desktop:

- `Total a pagar`;
- `Cotización USD`;
- input de cotización;
- `Aplicar`;
- `Horizonte`.

Se ajustó altura y alineación inferior para que `Aplicar` no quede desplazado respecto del input y el selector.

### 9.4 Implementación UI preservando la vista financiera validada

La vista financiera original se preservó como base:

`workspace/frontend/src/components/finance/transactions/CardPaymentsView.base.tsx`

El wrapper activo es:

`workspace/frontend/src/components/finance/transactions/CardPaymentsView.tsx`

Responsabilidades del wrapper actual:

- total agregado;
- cierre inicial de cards;
- ajuste visual de la toolbar;
- refresco del total al aplicar cotización.

La lógica financiera de tabla existente permanece en la base y no debe reescribirse sin necesidad.

---

## 10. Nuevo movimiento — ajuste visual

El formulario **Nuevo movimiento / Editar movimiento** estaba demasiado pegado a los bordes del Sheet.

Se dejó un wrapper específico para ese formulario, evitando modificar globalmente todos los `Sheet` de CajaApp.

Archivos:

`workspace/frontend/src/components/finance/sections/movimientos-section.tsx`

`workspace/frontend/src/components/finance/sections/movimientos-section.base.tsx`

Objetivo del wrapper:

- padding lateral consistente;
- mayor separación entre bloques;
- header con espacio para el botón cerrar;
- footer respirado;
- mantener el diseño general del resto de CajaApp.

El componente global `workspace/frontend/src/components/ui/sheet.tsx` quedó restaurado para no introducir regresiones en otros drawers.

---

## 11. Backend activo asociado a identidad/multicard

Archivos relevantes:

`workspace/backend/src/modules/cards/card-statement-identity.ts`

`workspace/backend/src/modules/cards/card-statement-identity.test.ts`

`workspace/backend/src/modules/cards/cards.service.ts`

`workspace/backend/src/modules/cards/cards.service.base.ts`

`workspace/backend/src/modules/cards/cards.schemas.ts`

`workspace/backend/src/modules/cards/cards.schemas.base.ts`

`workspace/backend/src/modules/cards/card-payments-multicard.ts`

`workspace/backend/src/modules/cards/card-payments-multicard.test.ts`

`workspace/backend/src/modules/cards/card-payments-presentation.ts`

`workspace/backend/src/modules/cards/card-payments-presentation.base.ts`

`workspace/backend/src/modules/cards/card-payments-statement-normalizer.ts`

`workspace/backend/src/modules/cards/card-payments-tax-engine.ts`

No volver a reducir el endpoint a un único statement/card.

---

## 12. Motor fiscal vigente

Archivos principales:

`workspace/backend/src/modules/cards/card-payments-tax-engine.ts`

`workspace/backend/src/modules/cards/card-payments-tax-engine.test.ts`

Reglas derivadas del resumen Visa actualmente contempladas:

- `DB IVA $ PLAN V`
- `IVA RG 4240 21%`
- `IMPUESTO DE SELLOS`
- `IMPUESTO DE SELLOS P`

Pipeline conceptual:

`cuotas/compras -> bases imponibles -> impuestos dinámicos -> subtotal ARS/USD -> conversión USD -> total real`

No copiar impuestos futuros como importes fijos de un resumen anterior.

---

## 13. Evidencia funcional real confirmada por el usuario

### Importación

Mastercard Galicia:

- PDF extraído con `pdfplumber`;
- layout `galicia-mastercard`;
- preview lista;
- aceptado sin error.

Visa Galicia:

- PDF extraído con `pdfplumber`;
- layout `galicia-visa`;
- preview lista;
- aceptado sin error.

### Pagos de tarjeta

Después de aceptar ambos resúmenes el usuario confirmó visualmente:

- `VISA · Banco Galicia · Cuenta •••• 8245`;
- `MASTERCARD BLACK · Banco Galicia · Cuenta •••• 8304`;
- ambas cuentas simultáneas;
- cada una expandible de forma independiente;
- luego ambas cerradas por default tras el ajuste UX;
- total agregado superior visible;
- toolbar final alineada.

**Conclusión:** el flujo real PDF -> parser -> preview -> aceptación -> persistencia -> multicard -> proyección -> UI está operativo para los dos resúmenes Galicia usados en UAT real.

---

## 14. Pendientes que NO bloquean el cierre actual de Pagos de tarjeta

Estos puntos quedan fuera del cierre funcional actual y sólo deben retomarse si vuelven a ser relevantes:

### 14.1 Reimportación exacta/versionado del mismo summary

Todavía conviene validar más adelante el caso específico:

- importar exactamente el mismo PDF ya aceptado;
- aceptar una nueva versión;
- versión previa -> `superseded`;
- nueva versión -> `accepted`;
- otra tarjeta distinta permanece visible.

No es bloqueante para el cierre actual porque el flujo multicard nuevo ya fue validado con dos resúmenes reales distintos.

### 14.2 Trazas temporales multicard

Durante el diagnóstico se agregaron trazas del tipo:

- `card-payments.multicard.loaded`;
- `card-payments.multicard.selected`;
- `card-payments.multicard.statement-presented`;
- `card-payments.multicard.final`.

Pueden limpiarse en una iteración técnica posterior cuando no se necesiten más para diagnóstico.

### 14.3 EPERM de `.next` bajo Dropbox

Se observó ocasionalmente un error `EPERM` de Next/Turbopack al renombrar/escribir archivos dentro de `.next` en la carpeta sincronizada por Dropbox.

No fue la causa del bug multicard y no bloqueó el cierre funcional.

Si reaparece de forma persistente, tratarlo como problema de cache/runtime de Next + sincronización Dropbox, separado de la lógica financiera.

### 14.4 Diagnóstico histórico `missingCardRows`

Se observaron advertencias `missingCardRows` durante estados intermedios anteriores de la DB.

Después de borrar los statements de prueba anteriores el contador llegó a `0` con `visibleRows: 0` antes de las nuevas cargas.

No asumir que el warning histórico sigue vigente. Sólo reabrirlo si aparece nuevamente en una prueba actual con datos activos.

---

## 15. Backups relevantes recientes

### Cierre multicard / CSS

`architecture-handoff/architect-working/card-payments-runtime-wiring-20260728/backups/deuda-futura-section.before-remove-third-child-hide.tsx`

### UI Pagos de tarjeta

`architecture-handoff/architect-working/card-payments-ui-polish-20260727/backups/CardPaymentsView.wrapper-v1.tsx`

`architecture-handoff/architect-working/card-payments-ui-polish-20260727/backups/CardPaymentsView.before-final-alignment.tsx`

### Nuevo movimiento / Sheet

`architecture-handoff/architect-working/card-payments-ui-polish-20260727/backups/sheet.before-padding.tsx`

`architecture-handoff/architect-working/card-payments-ui-polish-20260727/backups/sheet.global-padding-v1.tsx`

La implementación anterior completa de movimientos permanece además en:

`workspace/frontend/src/components/finance/sections/movimientos-section.base.tsx`

---

## 16. Estado de continuidad recomendado

Cuando se retome CajaApp V3 después de este punto:

1. considerar **Pagos de tarjeta cerrado por ahora**;
2. no volver a tocar parser/identidad/multicard salvo una regresión reproducible;
3. mantener Visa + Mastercard como prueba real de no regresión;
4. preservar el comportamiento de cards cerradas por default y total agregado del próximo mes;
5. continuar con el próximo módulo/objetivo que indique el usuario;
6. si se vuelve a tocar Pagos de tarjeta, validar siempre que ambas cuentas sigan coexistiendo.

---

## 17. Regla de verdad para próximos cambios

Ante discrepancias entre documentación antigua, backups, handoffs o conversaciones anteriores:

1. este SSOT vigente tiene prioridad;
2. luego manda el comportamiento real validado por el usuario;
3. los archivos `*.base.*` preservan implementaciones anteriores pero no son la interfaz activa;
4. backups dentro de `architecture-handoff/architect-working` no deben tratarse como runtime;
5. no reintroducir soluciones antiguas que vuelvan a ocultar, fusionar o reemplazar cuentas diferentes.

**Estado al cierre:** CajaApp V3 carga y presenta correctamente los resúmenes reales Visa Galicia + Mastercard Galicia; Pagos de tarjeta queda funcionalmente estable y visualmente cerrado por el momento.
