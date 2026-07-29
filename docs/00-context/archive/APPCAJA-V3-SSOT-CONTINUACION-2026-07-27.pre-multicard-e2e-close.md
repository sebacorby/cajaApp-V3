# APPCAJA V3 — SSOT DE CONTINUACIÓN

**Fecha de corte:** 2026-07-27  
**Proyecto:** CajaApp V3  
**Root:** `I:\cajaApp-V3`  
**Objetivo de este documento:** permitir retomar el trabajo en un nuevo hilo de chat sin depender del historial anterior.

---

## 1. Regla de trabajo vigente

Este documento es el punto de continuidad para el trabajo actual de CajaApp V3.

La arquitectura debe mantenerse determinística para importación de resúmenes de tarjeta:

`PDF -> pdfplumber RAW -> parser programático por emisor -> coverage gate -> preview -> aceptación -> persistencia -> proyección`.

La IA no debe intervenir en la interpretación de resúmenes de tarjeta. Puede seguir existiendo para otras funciones del producto, pero `/import` de tarjetas debe permanecer programático.

### Node

No agregar validaciones de versión de Node en scripts, backend, frontend, package.json, launchers ni gates.

La instalación utilizada por este proyecto es:

`I:\Tools\node-v24.18.0-win-x64`

No volver a introducir checks de versión ni recomendar otra instalación de Node para este proyecto.

---

## 2. Estado funcional alcanzado antes del último cambio de identidad

### Mastercard Galicia

El parser determinístico Mastercard Galicia estaba validado funcionalmente contra fixture/golden:

- 53/53 líneas candidatas parseadas.
- 0 líneas financieras perdidas.
- 100% coverage.
- 61 filas estructuradas.
- 6 referencias futuras de cuotas.

Parser activo/base preservado:

`workspace/backend/src/modules/card-import/galicia-mastercard.parser.base.ts`

### Visa Galicia

El parser determinístico Visa Galicia logró una ejecución real con:

- layout: `galicia-visa`
- 71 líneas candidatas.
- 71 líneas parseadas.
- 0 perdidas.
- 6 filas de referencia futura.
- parser: ~4 ms.
- extracción RAW pdfplumber: ~579 ms.
- total importación: ~657 ms.
- draft terminó en `preview_ready`.

Datos del resumen Visa real utilizado:

- Resumen: `VI00000000001089271`
- Marca: `VISA`
- Banco: Banco Galicia
- N° Cuenta visible en PDF: `1163998245`
- Total ARS: `1.924.476,04`
- Total USD: `3,22`
- Pago mínimo: `621.010,00`
- Vencimiento actual: `2026-07-13`
- Próximo cierre: `2026-07-30`
- Próximo vencimiento: `2026-08-07`
- plásticos/grupos: `8238` y `9138`

Los plásticos 8238/9138 son grupos internos del mismo resumen/cuenta; no deben convertirse en dos cuentas de tarjeta.

### Correcciones Visa ya incorporadas

#### Microsoft USD

RAW:

`07-06-26 K Microsoft*Micros MicrosoftUSD 3,22 029107 3,22`

Debe quedar:

- ARS: `null`
- USD: `3,22`
- moneda: `USD`
- comprobante: `029107`

#### IVA Plan V

RAW:

`28-05-26 DB IVA $ PLAN V 040943 62494,55 13.123,85`

Debe interpretarse como:

- tipo: `tax`
- ARS real: `13.123,85`
- USD: `null`
- comprobante: `040943`
- base imponible `62.494,55` preservada en `originalText`

Parser Visa actual usa wrapper + base:

`workspace/backend/src/modules/card-import/galicia-visa.parser.ts`

`workspace/backend/src/modules/card-import/galicia-visa.parser.base.ts`

---

## 3. Pagos de tarjeta — comportamiento esperado

La sección **Pagos de tarjeta** debe representar cuentas/resúmenes reales, no grupos internos de titular/adicional.

Requisitos vigentes:

- Visa y Mastercard deben coexistir simultáneamente.
- Agregar una tarjeta/resumen nunca debe borrar otra tarjeta distinta.
- Titular y adicionales de un mismo resumen pertenecen al mismo statement y no deben crear cuentas independientes.
- Dos Visa diferentes deben poder coexistir.
- Las cuotas deben proyectarse mes a mes por secuencia real (`01/06 -> 02/06 -> ...`), nunca sumando 30 días.
- Los impuestos deben aparecer al final de cada tabla.
- Los impuestos futuros son dinámicos, no importes fijos copiados.
- Total real mensual: `ARS + USD * cotización USD/ARS`.

### Cotización USD

Existe configuración `USD_ARS` compartida entre Tarjetas y Pagos de tarjeta.

El total real esperado es:

`TOTAL_REAL_ARS = TOTAL_ARS + TOTAL_USD * COTIZACION_USD_ARS`

Si hay USD y no hay cotización configurada, no inventar valor; debe informarse que falta cotización.

### Motor fiscal incorporado

Se implementó lógica para proyectar reglas fiscales derivadas del propio resumen.

Visa real muestra:

- `DB IVA $ PLAN V`: IVA 21% sobre interés/base del Plan V.
- `IVA RG 4240 21%`: 21% sobre la base informada/convertida.
- `IMPUESTO DE SELLOS`: regla inferida del resumen, aproximadamente 1% sobre la base gravada.
- `IMPUESTO DE SELLOS P`: aplica sobre USD convertido a ARS cuando corresponde.

Los impuestos futuros deben recalcularse después de proyectar compras/cuotas del mes.

Pipeline esperado:

`cuotas/compras -> bases imponibles -> impuestos dinámicos -> subtotal ARS/USD -> conversión USD -> total real`.

Archivos relevantes:

`workspace/backend/src/modules/cards/card-payments-tax-engine.ts`

`workspace/backend/src/modules/cards/card-payments-tax-engine.test.ts`

---

## 4. UI — decisiones recientes

### Consola “Procesamiento del resumen”

Fue retirada de la pantalla de Tarjetas porque dejó de aportar valor con el parser determinístico rápido.

No debe volver a mostrarse una lista persistente de steps/spinner después de descartar ni durante una importación normal.

### Scroll de Pagos

Se corrigió visualmente la intención para que Fecha/Descripción queden como columnas fijas y el scroll horizontal no atraviese visualmente esas filas.

Esta parte debe volver a verificarse visualmente después del próximo restart/build.

---

## 5. Problema raíz descubierto: identidad de resumen vs identidad de cuenta

Las iteraciones anteriores intentaron decidir “misma tarjeta” por:

- banco + marca;
- últimos 4;
- conjuntos de plásticos;
- titular/adicional;
- `statementNumber` como fallback.

Eso fue incorrecto y produjo síntomas como:

- cargar Visa y hacer desaparecer Mastercard;
- mezclar titular/adicional;
- consolidar dos cuentas Visa diferentes;
- mostrar sólo el último resumen en Pagos.

La nueva arquitectura separa dos identidades.

---

## 6. Identidad canónica definida

### 6.1. Identidad del resumen concreto

La clave de un resumen debe construirse con:

`statementNumber + periodKey + fecha del resumen`

La fecha usada en la implementación actual es la fecha de vencimiento del resumen (`currentDueDate`) como fecha estable disponible en el contrato.

Conceptualmente:

`summaryKey = issuer namespace + statementNumber + periodKey + currentDueDate`

Ejemplo Visa:

`Banco Galicia | VISA | VI00000000001089271 | 2026-07 | 2026-07-13`

Regla:

- mismo número + mismo período + misma fecha = mismo resumen/versionado;
- distinto número o distinto período/fecha = otro resumen.

El usuario pidió explícitamente este criterio para garantizar que una recarga de la misma factura sustituya/versione la existente sin confundir meses distintos.

### 6.2. Identidad estable de la cuenta/serie

Sirve únicamente para relacionar resúmenes mensuales de la misma cuenta.

No debe depender de titular/adicional ni de grupos.

Identificadores reales encontrados en los PDFs:

#### Visa Galicia

`N° Cuenta: 1163998245`

#### Mastercard Galicia

`N° de Socio: 2724883-0-4`

Estos identificadores pasan a ser la base de `accountSeriesKey`.

Reglas:

- si hay `accountNumber/accountSeriesKey` confiable, puede elegirse el resumen más nuevo de esa misma cuenta para proyección actual;
- dos account identifiers diferentes nunca se fusionan;
- si un resumen legacy no tiene identificador confiable, CajaApp debe mantenerlo separado antes que inferir/fusionar por últimos 4.

### 6.3. Titular/adicional

Titular y adicionales son grupos internos del statement.

Ejemplo Visa real:

- grupo/plástico `8238`
- grupo/plástico `9138`

Ambos pertenecen al mismo `N° Cuenta 1163998245` y al mismo resumen `VI00000000001089271`.

No usar `8238/9138` para identificar la cuenta.

---

## 7. Datos reales confirmados de los dos PDFs principales

### Visa Galicia julio 2026

Archivo:

`workspace/backend/storage/52aa7b23f558457e84d21a5077d8424d43aac5a13dd555eb4b7f5ebd526f1aa7_visa-galicia-mas-julio2026.pdf`

RAW confirma:

- `Resumen N° VI00000000001089271`
- `Tarjeta Crédito VISA`
- `N° Cuenta: 1163998245`
- fechas: `28-May-26 05-Jun-26 02-Jul-26 13-Jul-26 30-Jul-26 07-Ago-26`
- total ARS `1.924.476,04`
- total USD `3,22`

### Mastercard Galicia julio 2026

Archivo:

`workspace/backend/storage/e3b49c88e8d95ce54d84f1261efd232cd8ebe10e6d65fe77fdc23300d36b2cee_master-galicia-julio2026.pdf`

RAW confirma:

- `Resumen N° 027012704157`
- `Tarjeta Crédito MASTERCARD BLACK`
- `N° de Socio: 2724883-0-4`
- fechas: `28-May-26 05-Jun-26 02-Jul-26 13-Jul-26 30-Jul-26 07-Ago-26`
- total ARS `1.425.613,43`
- total USD `0,00`
- incluye adicionales, pero siguen perteneciendo al mismo resumen Mastercard.

---

## 8. Barrida completa aplicada el 2026-07-27

Se hizo una pasada amplia para eliminar la inferencia por últimos 4 y reemplazarla por identidad canónica.

### Archivos activos principales modificados/agregados

#### Identidad/versionado

`workspace/backend/src/modules/cards/card-statement-identity.ts`

`workspace/backend/src/modules/cards/card-statement-identity.test.ts`

#### Servicio de tarjetas

`workspace/backend/src/modules/cards/cards.service.ts`

Base anterior preservada en:

`workspace/backend/src/modules/cards/cards.service.base.ts`

#### Schema

`workspace/backend/src/modules/cards/cards.schemas.ts`

Base anterior preservada en:

`workspace/backend/src/modules/cards/cards.schemas.base.ts`

#### Multi-card / Pagos

`workspace/backend/src/modules/cards/card-payments-multicard.ts`

`workspace/backend/src/modules/cards/card-payments-multicard.test.ts`

`workspace/backend/src/modules/cards/card-payments-presentation.ts`

#### Parsers

`workspace/backend/src/modules/card-import/galicia-visa.parser.ts`

`workspace/backend/src/modules/card-import/galicia-visa.parser.base.ts`

`workspace/backend/src/modules/card-import/galicia-mastercard.parser.ts`

`workspace/backend/src/modules/card-import/galicia-mastercard.parser.base.ts`

Los wrappers nuevos extraen/preservan identificadores de cuenta sin reescribir la lógica financiera de los parsers base.

#### Importación / reimport exacto

`workspace/backend/src/modules/imports/imports.service.ts`

Se modificó la fachada para contemplar recarga del mismo PDF sin depender exclusivamente del bloqueo por SHA-256.

---

## 9. Reimportación y SHA-256

Antes, el importador determinístico bloqueaba un PDF byte-a-byte idéntico si su SHA ya estaba vinculado a un accepted/superseded/archived statement o draft activo.

Eso contradecía la regla funcional deseada:

“Si vuelvo a cargar exactamente el mismo resumen, debe poder generar nueva preview y, al aceptar, sustituir/versionar el anterior.”

La nueva fachada de importación intenta permitir esta recarga de forma segura:

- el resumen viejo se mantiene vigente mientras se revisa la nueva preview;
- si la nueva importación termina correctamente en `preview_ready`, puede aceptarse;
- al aceptar, el canonicalizador de `summaryKey` debe versionar/sustituir el resumen anterior equivalente;
- si la nueva importación falla, no debe ocultar/desactivar el estado válido anterior.

**IMPORTANTE:** esta lógica fue implementada pero todavía necesita prueba real completa en la máquina Windows después de reiniciar CajaApp.

---

## 10. Estado de persistencia / statements legacy

Pagos de tarjeta fue ajustado para considerar statements `accepted` y también legacy `superseded` no archivados durante la transición, porque versiones anteriores pudieron marcar incorrectamente una Mastercard o Visa como superseded.

La selección nueva debe:

1. deduplicar verdaderos duplicados por `summaryKey`;
2. si existe identificador de cuenta confiable, elegir el resumen más reciente de esa serie para la vista/proyección actual;
3. conservar separados los legacy sin `accountNumber` antes que fusionarlos por heurísticas débiles.

No limpiar DB ni reimportar todo automáticamente antes de verificar qué statements legacy reaparecen con esta lógica.

---

## 11. Archivos de rollback de la última barrida

Carpeta de trabajo de la pasada:

`architecture-handoff/architect-working/card-statement-identity-sweep-20260727/`

Backups:

`architecture-handoff/architect-working/card-statement-identity-sweep-20260727/backups/`

Replaced:

`architecture-handoff/architect-working/card-statement-identity-sweep-20260727/replaced/`

Readback:

`architecture-handoff/architect-working/card-statement-identity-sweep-20260727/readback/`

Candidates:

`architecture-handoff/architect-working/card-statement-identity-sweep-20260727/candidates/`

No borrar estas carpetas hasta validar la pasada en runtime.

---

## 12. Otras carpetas de rollback relevantes

### Parser Visa

`architecture-handoff/architect-working/parser-visa-20260727/`

Contiene backups/replaced/readback/candidates/verification de las correcciones Visa.

### UI reset / consola

`architecture-handoff/architect-working/parser-ui-reset-20260727/`

### Pagos multi-card previo

`architecture-handoff/architect-working/card-payments-multicard-20260727/`

### Identidad multi-card previa

`architecture-handoff/architect-working/card-payments-multicard-identity-20260727/`

### Tax / FX / scroll

`architecture-handoff/architect-working/card-payments-tax-fx-20260727/`

Estas carpetas documentan iteraciones previas y permiten rollback, pero la pasada `card-statement-identity-sweep-20260727` es la más reciente y tiene prioridad.

---

## 13. Qué NO afirmar todavía

No afirmar que la última barrida completa está validada end-to-end.

Lo que sí se verificó durante desarrollo:

- lectura real del RAW Visa y Mastercard;
- presencia de `N° Cuenta` y `N° de Socio`;
- coherencia de contratos TypeScript inspeccionados;
- validaciones/simulaciones aisladas de selección multi-card;
- sintaxis aislada de candidatos.

Lo que todavía NO se ejecutó con evidencia final en la máquina Windows después del último swap:

- build completo backend/frontend;
- suite real del repo;
- restart + carga completa de la UI;
- verificación final Visa + Mastercard simultáneas;
- reimport exacto por SHA;
- aceptación de nueva versión y reemplazo correcto;
- regresión completa de cuotas/impuestos/cotización después del nuevo modelo de identidad.

Nunca decir “tests pasaron” si el usuario no aporta logs o no se ejecutaron realmente en su entorno.

---

## 14. Próximo paso EXACTO al abrir el nuevo chat

No comenzar programando más.

Primero:

1. Leer este SSOT completo.
2. Verificar los archivos activos indicados arriba.
3. Pedir al usuario que reinicie CajaApp si todavía no lo hizo después de la pasada de identidad.
4. Entrar directamente a **Pagos de tarjeta** sin reimportar nada.
5. Verificar si aparecen simultáneamente:
   - Visa Galicia.
   - Mastercard Galicia.
6. Verificar que titular/adicional estén contenidos dentro de su resumen y no generen cuentas nuevas.
7. Si ambas aparecen correctamente, probar reimportar exactamente uno de los PDFs ya aceptados.
8. Verificar que ya no sea bloqueado exclusivamente por SHA.
9. Aceptar la nueva preview y comprobar:
   - misma `summaryKey` -> anterior superseded, nueva accepted;
   - otra tarjeta distinta permanece intacta;
   - Pagos sigue mostrando ambas cuentas;
   - cuotas futuras siguen propagándose;
   - impuestos dinámicos siguen al final;
   - cotización USD y total real siguen correctos.

Si falla alguno de estos pasos, diagnosticar desde evidencia/logs y no volver a introducir heurísticas por últimos 4.

---

## 15. Invariantes que no deben romperse

- Importación de tarjetas = determinística, sin IA.
- Nunca identificar una cuenta por titular/adicional.
- Nunca fusionar tarjetas distintas por banco+marca.
- Nunca usar coincidencia parcial de últimos 4 como identidad.
- `statementNumber + periodKey + fecha` identifica el resumen/versionado.
- `N° Cuenta` / `N° de Socio` identifica la serie estable cuando existe.
- Ante falta de identificador estable en legacy: mantener separado antes que fusionar.
- Visa y Mastercard deben coexistir.
- Dos Visa distintas deben coexistir.
- Titular + adicionales del mismo resumen deben permanecer bajo una sola cuenta/resumen.
- Cuotas futuras se proyectan por secuencia mensual, nunca +30 días.
- Impuestos futuros son dinámicos según base/tasa, no valores fijos repetidos.
- Total real = ARS + USD * cotización.
- No agregar validación de versión de Node.
- Node del entorno: `I:\Tools\node-v24.18.0-win-x64`.

---

## 16. Criterio de cierre del problema actual

La corrección de identidad se considera cerrada únicamente cuando se valide en runtime este escenario:

1. Existe un resumen Visa aceptado.
2. Existe un resumen Mastercard aceptado.
3. Pagos de tarjeta muestra ambos simultáneamente.
4. Los adicionales de cada resumen no crean tarjetas nuevas.
5. Se carga otro resumen de la misma cuenta en otro período y reemplaza sólo la versión actual de esa cuenta.
6. Se carga una segunda Visa con otro `N° Cuenta` y ambas Visa permanecen separadas.
7. Se vuelve a cargar exactamente el mismo PDF y se genera/versiona correctamente el mismo resumen sin borrar otras cuentas.
8. Proyección de cuotas, impuestos, USD y total real siguen siendo correctos.

Hasta completar esos ocho puntos, mantener disponibles todos los backups de la pasada.
