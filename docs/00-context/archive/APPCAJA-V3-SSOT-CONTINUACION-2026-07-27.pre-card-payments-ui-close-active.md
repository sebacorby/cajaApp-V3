# APPCAJA V3 — SSOT DE CONTINUACIÓN

**Fecha de corte:** 2026-07-27  
**Última actualización:** 2026-07-27 — cierre funcional E2E de importación y convivencia Visa + Mastercard  
**Proyecto:** CajaApp V3  
**Root canónico:** `I:\cajaApp-V3`  
**Objetivo:** permitir retomar el trabajo sin depender del historial del chat y conservar el estado funcional realmente validado por el usuario.

---

## 1. Regla de trabajo vigente

Este documento es la fuente de continuidad operativa del proyecto.

### Forma de trabajo

La regla vigente es simple y vinculante:

- ChatGPT diseña la solución, diagnostica y modifica el código.
- El usuario realiza las pruebas funcionales finales.
- No se utilizan agentes externos/adicionales para programar, validar ni modificar el proyecto.
- No generar handoffs de ejecución para agentes salvo que el usuario cambie explícitamente esta regla.
- Un archivo de validación para agente creado durante el diagnóstico multicard queda obsoleto y no debe usarse como flujo operativo.

### Node.js

La única instalación válida para CajaApp V3 es:

`I:\Tools\node-v24.18.0-win-x64`

No recomendar otra instalación y no introducir checks nuevos de versión en scripts, package.json, launchers ni gates salvo pedido explícito.

### Arquitectura de importación de tarjetas

La importación de resúmenes de tarjeta debe seguir siendo determinística:

`PDF -> pdfplumber RAW -> parser programático por emisor -> coverage gate -> preview -> aceptación -> persistencia -> proyección`

La IA no debe interpretar los resúmenes de tarjeta.

---

## 2. Estado ejecutivo actual

### ESTADO: PASS FUNCIONAL PUNTA A PUNTA — VISA + MASTERCARD

El usuario confirmó exitosamente el flujo completo de carga de resúmenes.

Secuencia validada:

1. eliminar estados anteriores de prueba;
2. importar Mastercard Galicia julio 2026;
3. obtener preview determinística sin errores;
4. aceptar Mastercard;
5. importar Visa Galicia julio 2026;
6. obtener preview determinística sin errores;
7. aceptar Visa;
8. entrar a **Pagos de tarjeta**;
9. visualizar simultáneamente Visa y Mastercard como dos cuentas diferentes.

Resultado final confirmado por el usuario:

> Éxito punta a punta: los resúmenes cargan correctamente y ambas tarjetas quedan visibles.

Este punto se considera cerrado funcionalmente.

---

## 3. Datos reales confirmados de los resúmenes principales

### 3.1 Visa Galicia julio 2026

Datos canónicos:

- Banco: `Banco Galicia`
- Marca: `VISA`
- Resumen: `VI00000000001089271`
- Cuenta: `1163998245`
- Período: `2026-07`
- Vencimiento actual: `2026-07-13`
- Próximo cierre: `2026-07-30`
- Próximo vencimiento: `2026-08-07`
- Total ARS: `1.924.476,04`
- Total USD: `3,22`
- Pago mínimo: `621.010,00`
- Grupos/plásticos internos: `8238` y `9138`

Última importación real observada:

- layout: `galicia-visa`
- páginas: 8
- páginas con texto: 7
- filas estructuradas: 80
- líneas candidatas: 71
- líneas parseadas: 71
- referencias futuras: 6
- statement persistido: `7c1f0cbd-bd81-4b5d-8584-9c155eb64592`
- accountNumber persistido: `1163998245`

Los grupos 8238/9138 pertenecen a una única cuenta Visa. No deben transformarse en cuentas independientes.

### 3.2 Mastercard Galicia julio 2026

Datos canónicos:

- Banco: `Banco Galicia`
- Marca: `MASTERCARD BLACK`
- Resumen: `027012704157`
- N° de Socio / cuenta estable: `2724883-0-4`
- Período: `2026-07`
- Vencimiento actual: `2026-07-13`
- Próximo cierre: `2026-07-30`
- Próximo vencimiento: `2026-08-07`
- Total ARS: `1.425.613,43`
- Total USD: `0,00`

Última importación real observada:

- layout: `galicia-mastercard`
- páginas: 6
- filas estructuradas: 61
- líneas candidatas: 53
- líneas parseadas: 53
- referencias futuras: 6
- statement persistido: `5b01ebf0-d9bc-49ba-b4a8-4c0224846a9a`
- accountNumber persistido: `2724883-0-4`

Los adicionales del resumen Mastercard son grupos internos del statement y no cuentas separadas.

---

## 4. Identidad canónica vigente

El sistema separa dos conceptos que no deben volver a confundirse.

### 4.1 Identidad del resumen concreto

Conceptualmente:

`summaryKey = issuer namespace + statementNumber + periodKey + currentDueDate`

Ejemplos actuales:

Visa:

`banco galicia|visa|statement:vi00000000001089271|period:2026-07|date:2026-07-13`

Mastercard:

`banco galicia|mastercard black|statement:027012704157|period:2026-07|date:2026-07-13`

Regla:

- mismo resumen canónico -> puede versionarse/supersederse;
- resumen distinto -> jamás debe ser reemplazado por otro sólo por compartir banco o período.

### 4.2 Identidad estable de la cuenta

Visa Galicia:

`accountSeriesKey <- N° Cuenta 1163998245`

Mastercard Galicia:

`accountSeriesKey <- N° de Socio 2724883-0-4`

Reglas:

- dos identificadores de cuenta diferentes nunca se fusionan;
- titular/adicional no define identidad de cuenta;
- últimos cuatro dígitos no definen identidad de cuenta;
- un legacy sin identidad confiable debe mantenerse separado antes que fusionarse por heurística.

---

## 5. Parsers determinísticos — estado validado

### Mastercard Galicia

Parser base preservado:

`workspace/backend/src/modules/card-import/galicia-mastercard.parser.base.ts`

Wrapper de identidad:

`workspace/backend/src/modules/card-import/galicia-mastercard.parser.ts`

El wrapper extrae:

`N° de Socio: 2724883-0-4`

Coverage funcional confirmado:

- 53/53 líneas candidatas;
- 0 líneas financieras perdidas;
- 61 filas;
- 6 referencias futuras.

### Visa Galicia

Parser base preservado:

`workspace/backend/src/modules/card-import/galicia-visa.parser.base.ts`

Wrapper de identidad:

`workspace/backend/src/modules/card-import/galicia-visa.parser.ts`

El wrapper preserva:

`N° Cuenta: 1163998245`

Correcciones ya incorporadas y que no deben regresarse:

#### Microsoft USD

RAW:

`07-06-26 K Microsoft*Micros MicrosoftUSD 3,22 029107 3,22`

Resultado esperado:

- ARS: `null`
- USD: `3,22`
- moneda: `USD`
- comprobante: `029107`

#### IVA Plan V

RAW:

`28-05-26 DB IVA $ PLAN V 040943 62494,55 13.123,85`

Resultado esperado:

- tipo: `tax`
- ARS real: `13.123,85`
- USD: `null`
- comprobante: `040943`
- base `62.494,55` preservada en originalText.

---

## 6. Pagos de tarjeta — contrato funcional vigente

La pantalla representa cuentas/resúmenes reales, no plásticos internos.

Debe cumplirse siempre:

- Visa y Mastercard pueden coexistir simultáneamente.
- Agregar/aceptar un resumen nunca debe borrar u ocultar otra cuenta distinta.
- Titular y adicionales de un mismo resumen pertenecen al mismo statement.
- Dos Visa diferentes deben poder coexistir si tienen identidad de cuenta diferente.
- El resumen mensual más nuevo de una misma cuenta puede reemplazar al anterior para la proyección corriente.
- Las cuotas se proyectan por secuencia mensual real, nunca sumando 30 días.
- Los impuestos se muestran al final de la tabla.
- Los impuestos futuros se recalculan dinámicamente.
- El total real mensual usa ARS + USD convertido por la cotización configurada.

### Cotización USD

Existe configuración compartida `USD_ARS`.

Fórmula funcional:

`TOTAL_REAL_ARS = TOTAL_ARS + TOTAL_USD * COTIZACION_USD_ARS`

Si hay USD y no existe cotización válida, no inventar valor.

---

## 7. Motor fiscal vigente

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

## 8. Bug multicard cerrado — diagnóstico definitivo

### Síntoma original

Secuencia que reproducía el problema:

1. Mastercard aceptada correctamente.
2. Visa aceptada correctamente.
3. En Pagos de tarjeta sólo aparecía Visa.
4. Parecía que Mastercard había sido borrada o reemplazada.

### Hipótesis descartadas durante el diagnóstico

Se investigaron y descartaron como causa final:

- borrado físico de Mastercard al aceptar Visa;
- colisión de `summaryKey` entre Visa y Mastercard;
- colisión de `accountNumber`;
- selección multicard backend incorrecta;
- frontend consumiendo sólo `cards[0]`;
- bundle backend viejo;
- Zod descartando `accountNumber` en el schema activo.

### Evidencia backend definitiva

El backend llegó a cargar dos candidates:

- Visa `1163998245`
- Mastercard `2724883-0-4`

Luego seleccionó dos statements.

Cada statement generó una card:

- Visa: 68 movimientos;
- Mastercard: 55 movimientos.

La respuesta final del backend informó:

`cardCount: 2`

con:

- `VISA · Banco Galicia · Cuenta •••• 8245`
- `MASTERCARD BLACK · Banco Galicia · Cuenta •••• 8304`

Por lo tanto, persistencia, identidad, selección y presentación backend estaban entregando correctamente dos cuentas.

### Causa raíz real

La sección frontend que montaba Pagos de tarjeta tenía este hack CSS:

`[&_[data-testid='card-payments-view']>div:nth-child(3)]:hidden`

Con la estructura actual del componente:

1. controles de cotización/horizonte;
2. Visa;
3. Mastercard.

Ese selector ocultaba exactamente el tercer `div`, es decir, Mastercard.

La segunda tarjeta existía, estaba en el JSON y React la renderizaba, pero CSS la hacía invisible.

### Corrección final

Archivo corregido:

`workspace/frontend/src/components/finance/sections/deuda-futura-section.tsx`

Estado vigente:

```tsx
"use client";

import { CardPaymentsWorkspace } from "@/components/finance/transactions/CardPaymentsWorkspace";

export function DeudaFuturaSection() {
  return <CardPaymentsWorkspace />;
}
```

Se eliminó por completo el selector `nth-child(3):hidden`.

### Validación del usuario

Después del cambio, el usuario confirmó que Visa y Mastercard aparecen correctamente y que la carga de ambos resúmenes funciona punta a punta.

**Estado del bug:** CERRADO / PASS funcional.

---

## 9. Cambios backend activos asociados a identidad/multicard

Archivos relevantes actuales:

`workspace/backend/src/modules/cards/card-statement-identity.ts`

`workspace/backend/src/modules/cards/card-statement-identity.test.ts`

`workspace/backend/src/modules/cards/cards.service.ts`

`workspace/backend/src/modules/cards/cards.service.base.ts`

`workspace/backend/src/modules/cards/cards.schemas.ts`

`workspace/backend/src/modules/cards/cards.schemas.base.ts`

`workspace/backend/src/modules/cards/card-payments-multicard.ts`

`workspace/backend/src/modules/cards/card-payments-multicard.test.ts`

`workspace/backend/src/modules/cards/card-payments-presentation.ts`

`workspace/backend/src/modules/cards/card-payments-statement-normalizer.ts`

`workspace/backend/src/modules/imports/imports.service.ts`

### cards.service.ts

El wrapper actual recanonicaliza los statements relevantes después de aceptar un draft para evitar que reglas legacy de activación por período hagan desaparecer otra cuenta distinta.

La regla buscada es:

- duplicado/versiones del mismo summary -> viejo `superseded`, nuevo `accepted`;
- summaries de cuentas diferentes -> permanecen independientes.

### card-payments-presentation.ts

El read path actual toma statements históricos que no tengan `status = archived`, y luego aplica la selección canónica multicard.

Durante el diagnóstico se agregaron trazas `card-payments.multicard.*` para observar:

- candidates loaded;
- candidates selected;
- statement presented;
- final response.

Estas trazas cumplieron su objetivo diagnóstico y pueden retirarse después de que el usuario termine las verificaciones adicionales.

No retirarlas en medio de una prueba que todavía pueda necesitar evidencia.

---

## 10. Reimportación / versionado exacto — estado real

La regla funcional deseada sigue siendo:

> volver a cargar exactamente el mismo resumen debe permitir una nueva preview y, al aceptar, versionar el summary anterior sin afectar otras cuentas.

La convivencia Visa + Mastercard quedó validada.

Sin embargo, la prueba final realizada para cerrar este bug fue:

- borrar los statements anteriores;
- importar Mastercard;
- aceptar;
- importar Visa;
- aceptar;
- comprobar ambas visibles.

Por lo tanto, **la recarga exacta del mismo PDF sobre un statement ya existente sin borrarlo antes no debe marcarse todavía como validada en esta sesión**.

No confundir el PASS multicard con la validación de versionado byte-a-byte idéntico.

---

## 11. Lifecycle de borrado observado

Durante la prueba se comprobó que el hard delete de un statement libera su documento de importación cuando queda sin referencias.

Eventos observados:

`Card statement hard-deleted`

`card-import.release.completed`

`card-statement.delete.import-release`

Esto permitió volver a cargar los mismos PDFs después de eliminar los statements de prueba.

---

## 12. UI — estado actual

### Procesamiento del resumen

La consola persistente de pasos de procesamiento fue retirada de Tarjetas porque el parser determinístico es rápido y no requiere una experiencia de IA en streaming.

No reintroducirla salvo decisión de producto explícita.

### Pagos de tarjeta

Estado validado:

- Visa visible como cuenta única;
- Mastercard visible como cuenta única;
- los dos plásticos Visa permanecen consolidados;
- impuestos al final;
- columnas de meses proyectados visibles;
- horizonte configurable;
- cotización USD configurable.

### Scroll

La intención vigente sigue siendo Fecha/Descripción como columnas fijas y meses desplazables horizontalmente.

Si las verificaciones visuales extra detectan un defecto de scroll, tratarlo como UI y no modificar identidad/persistencia salvo evidencia directa.

---

## 13. Observaciones técnicas no bloqueantes

### 13.1 Next.js / Dropbox EPERM

En un arranque se observó:

`EPERM: operation not permitted, rename ... frontend\.next\dev\...`

Next/Turbopack reintentó operaciones sobre `.next` dentro de una carpeta sincronizada por Dropbox, llegó a devolver un HTTP 500 transitorio y luego el frontend terminó respondiendo HTTP 200.

Este error **no fue la causa del bug multicard**.

Queda como riesgo de entorno a vigilar si vuelve a producir inestabilidad del frontend.

No modificar lógica financiera para resolver este EPERM.

### 13.2 Future-debt diagnostics

En logs recientes todavía apareció:

`missingCardRows: 24`

junto con lecturas de deuda futura con filas visibles.

Este warning no fue investigado ni cerrado como parte del bug multicard.

Debe tratarse como observación independiente si las verificaciones funcionales muestran un síntoma real en deuda futura.

No declarar defecto sólo por el contador sin revisar las filas afectadas.

---

## 14. Backups relevantes de esta corrección

### Backend

`architecture-handoff/architect-working/card-statement-identity-fix-20260728/backups/cards.service.before-global-canonicalize.ts`

`architecture-handoff/architect-working/card-statement-identity-fix-20260728/backups/card-payments-presentation.before-legacy-archive-read.ts`

`architecture-handoff/architect-working/card-payments-runtime-wiring-20260728/backups/card-payments-presentation.before-runtime-trace.ts`

### Frontend

`architecture-handoff/architect-working/card-payments-runtime-wiring-20260728/backups/deuda-futura-section.before-remove-third-child-hide.tsx`

### SSOT anterior

La versión completa inmediatamente anterior de este documento fue preservada en:

`docs/00-context/archive/APPCAJA-V3-SSOT-CONTINUACION-2026-07-27.pre-multicard-e2e-close.md`

No borrar estos backups hasta cerrar las verificaciones adicionales.

---

## 15. Lecciones vinculantes del incidente

1. Antes de modificar persistencia por un problema visual, comprobar la respuesta real de `/api/card-payments`.
2. Si backend devuelve todas las cards, inspeccionar DOM/CSS antes de tocar identidad.
3. No usar selectores posicionales como `nth-child(N)` para ocultar componentes financieros dinámicos.
4. Una cuenta no se identifica por últimos cuatro, titular/adicional ni posición en UI.
5. Visa y Mastercard de un mismo banco y período no son versiones una de otra.
6. Mantener instrumentación temporal cuando todavía hay pruebas reales en curso; retirarla recién después.
7. No limpiar DB antes de capturar evidencia cuando un estado roto puede revelar la causa.
8. No atribuir a Next/Dropbox un defecto funcional si el API demuestra que el dato correcto está llegando.

---

## 16. Criterio de continuidad desde este punto

Hasta que el usuario termine sus verificaciones extra:

- no abrir un vertical nuevo por iniciativa propia;
- no cambiar parsers Visa/Mastercard sin evidencia de error de parsing;
- no cambiar identidad canónica si ambas cuentas siguen coexistiendo;
- conservar temporalmente las trazas multicard;
- registrar cualquier anomalía nueva con screenshot + log correspondiente;
- separar claramente errores de UI, datos, proyección e identidad.

Cuando el usuario indique con qué seguir, este documento debe tomarse como punto de partida.

---

## 17. Resumen de estado para retomar rápido

**IMPORTACIÓN TARJETAS:** PASS E2E.  
**MASTERCARD GALICIA:** PASS.  
**VISA GALICIA:** PASS.  
**VISA + MASTERCARD SIMULTÁNEAS:** PASS.  
**IDENTIDAD DE CUENTA:** confirmada por `1163998245` y `2724883-0-4`.  
**BACKEND `/api/card-payments`:** devuelve 2 cards.  
**BUG VISUAL MULTICARD:** cerrado; lo causaba `nth-child(3):hidden`.  
**PARSERS DETERMINÍSTICOS:** vigentes.  
**IA EN IMPORT DE TARJETAS:** prohibida/no utilizada.  
**REIMPORT EXACTO SOBRE SUMMARY EXISTENTE:** pendiente de validación específica.  
**TRAZAS MULTICARD TEMPORALES:** aún presentes mientras el usuario verifica.  
**NEXT `.next` EPERM EN DROPBOX:** observado, no bloqueante, vigilar.  
**FUTURE-DEBT `missingCardRows: 24`:** observado, no analizado todavía.  
**FORMA DE TRABAJO:** ChatGPT codea, usuario prueba, sin agentes externos.

---

**Fin del SSOT de continuación actualizado.**
