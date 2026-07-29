# PRD — APP-FUTURE-DEBT-001

## Deuda futura de tarjetas

**Producto:** CajaApp V3  
**Tipo:** Product Requirements Document  
**Estado:** **BORRADOR PARA VALIDACIÓN FUNCIONAL — NO AUTORIZA IMPLEMENTACIÓN**  
**Versión:** `1.0.0`  
**Fecha:** 24 de julio de 2026  
**Responsable funcional final:** Usuario  
**Responsable de diseño y documentación:** Arquitecto/asistente  
**Repositorio canónico:** `/Javier Corbella/cajaApp-V3`  
**SSOT relacionado:** `docs/00-context/APPCAJA V3 — SSOT de ejecución vigente.md`

---

## 1. Resumen ejecutivo

CajaApp necesita mostrar la deuda futura real de las tarjetas de crédito sin depender de que el usuario cargue un nuevo resumen todos los meses.

La funcionalidad debe representar exclusivamente obligaciones futuras ya asumidas, principalmente cuotas pendientes de compras presentes en resúmenes aceptados y compras manuales registradas en la aplicación.

La última implementación técnica de esta funcionalidad compiló, pero fue rechazada en la prueba de uso real porque el resultado observado no representó correctamente la deuda futura esperada. Por ese motivo, este PRD define primero el comportamiento funcional completo y sus criterios de aceptación antes de autorizar una nueva modificación de código.

Este documento no prescribe todavía una solución técnica concreta. Define qué debe hacer el producto, qué datos debe mostrar, qué debe excluir y cómo se validará.

---

## 2. Problema

La deuda futura puede quedar incorrecta cuando el sistema:

- confunde una fila real del resumen con una cuota futura;
- vuelve a dividir el importe de una cuota ya individualizada;
- suma simultáneamente una compra fuente y sus cuotas derivadas;
- usa la fecha del consumo en lugar del período de facturación;
- desplaza meses sumando treinta días;
- mezcla monedas;
- duplica cuotas al releer o recalcular;
- considera como futuras cuotas que ya pertenecen al resumen actual;
- depende de una nueva carga mensual para mantener las cuotas pendientes;
- presenta totales que no coinciden con el detalle visible.

El resultado debe ser financieramente comprensible y verificable por el usuario, no sólo técnicamente consistente.

---

## 3. Objetivo del producto

Permitir que el usuario consulte, por período mensual, tarjeta y moneda, todas las obligaciones futuras confirmadas de sus tarjetas, con trazabilidad suficiente para comprobar de dónde proviene cada importe.

### Resultado esperado

El usuario debe poder responder con confianza:

- cuánto debe pagar en cada mes futuro;
- qué tarjeta origina cada importe;
- qué compra o cuota compone ese total;
- qué número de cuota corresponde;
- en qué moneda está expresada;
- de qué resumen o compra manual proviene;
- si el dato es confirmado o estimado.

---

## 4. Principios funcionales

1. **La deuda futura es un compromiso confirmado.**  
   Una cuota pendiente de una compra ya realizada no es una estimación presupuestaria.

2. **El tiempo se modela por períodos mensuales `YYYY-MM`.**  
   No se calculan cuotas sumando treinta días.

3. **Una fila de resumen representa un hecho actual.**  
   La cuota incluida en el resumen no debe volver a aparecer como deuda futura.

4. **El importe de una cuota importada no se divide nuevamente.**  
   Si el resumen muestra una cuota individual, ese mismo importe se replica en las cuotas futuras equivalentes.

5. **Cada obligación futura se cuenta una sola vez.**  
   La compra fuente y sus ocurrencias futuras no pueden sumarse simultáneamente.

6. **Las monedas no se mezclan.**  
   ARS y USD se totalizan y muestran por separado.

7. **El detalle gobierna el total.**  
   Todo total mensual debe poder reconstruirse exactamente a partir de sus filas visibles.

8. **La lectura de Deuda futura no debe alterar datos.**  
   Consultar la pantalla o el endpoint no crea, elimina, reemplaza ni reconcilia cuotas.

9. **La importación de resúmenes queda fuera de este cambio.**  
   Este PRD consume datos ya aceptados o persistidos; no redefine la extracción ni el importador.

10. **La aceptación funcional del usuario es el gate final.**  
    Typecheck, build y pruebas automatizadas son necesarios, pero no suficientes.

---

## 5. Alcance

### 5.1 Incluido

- Deuda futura originada por cuotas de compras presentes en resúmenes aceptados.
- Deuda futura originada por compras manuales con tarjeta, cuando ya exista un plan de cuotas persistido.
- Agrupación mensual por período `YYYY-MM`.
- Separación por tarjeta.
- Separación por moneda.
- Totales mensuales y acumulados.
- Detalle de cada cuota futura.
- Trazabilidad al origen.
- Detección y exclusión de duplicados.
- Manejo explícito de datos inválidos o incompletos.
- Persistencia de la deuda futura sin exigir un nuevo resumen mensual.
- Validación funcional con datos reales controlados por el usuario.

### 5.2 Fuera de alcance

- Extracción del PDF.
- Prompt o proveedor de IA.
- JSON normalizado del importador.
- Mapper de filas del resumen.
- Pantalla de revisión y aceptación del resumen.
- Conciliación automática con un resumen posterior.
- Adelanto o cancelación de cuotas.
- Refinanciaciones, intereses futuros o planes bancarios no presentes en los datos.
- Préstamos, alquileres y otros compromisos externos a tarjetas.
- Proyección de ingresos.
- Rediseño visual completo del frontend.
- Migración automática de datos históricos incorrectos.

Estas capacidades deberán definirse en PRD independientes o en una versión posterior aprobada de este documento.

---

## 6. Actores

### Usuario

Persona que administra sus finanzas y necesita visualizar obligaciones futuras reales.

### Sistema CajaApp

Responsable de leer ocurrencias futuras persistidas, aplicar reglas de inclusión y exclusión, agruparlas y exponer resultados trazables.

### Importador de resúmenes

Fuente externa a este alcance que entrega datos previamente aceptados. No debe ser modificado por esta feature.

---

## 7. Definiciones

| Término | Definición |
|---|---|
| Período | Mes financiero en formato `YYYY-MM`. |
| Resumen actual | Documento aceptado que contiene hechos y cuotas correspondientes a su período. |
| Cuota actual | Número de cuota incluido en el resumen o compra vigente. |
| Cuota total | Cantidad total de cuotas del plan. |
| Cuota futura | Ocurrencia posterior a la cuota actual y perteneciente a un período mensual futuro. |
| Compra fuente | Compra original que origina un plan de cuotas. |
| Ocurrencia | Cuota individual asignada a un período específico. |
| Compromiso confirmado | Obligación ya asumida cuyo importe y existencia son conocidos. |
| Proyección estimada | Valor aproximado que todavía no constituye una obligación confirmada. |
| Trazabilidad | Capacidad de relacionar una cuota futura con su tarjeta, compra, resumen y fila de origen. |
| Duplicado | Dos registros que representan la misma cuota económica en el mismo período. |

---

## 8. Fuentes de verdad

| Dato | Fuente de verdad funcional |
|---|---|
| Período del resumen | Metadata validada del resumen aceptado. |
| Tarjeta | Tarjeta asociada al resumen o compra manual. |
| Descripción | Descripción normalizada conservando referencia al origen. |
| Importe de cuota importada | Importe de la fila de cuota presente en el resumen. |
| Moneda | Moneda de la fila u ocurrencia de origen. |
| Cuota actual y total | Valor normalizado del plan, por ejemplo `3/6`. |
| Primer período futuro importado | Período del resumen más un mes calendario. |
| Cuotas futuras | Ocurrencias persistidas y vigentes del plan. |
| Total mensual | Suma exacta de las ocurrencias incluidas en ese mes y moneda. |
| Estado confirmado o estimado | Estado persistido explícitamente; no inferido por la UI. |

---

## 9. Reglas de negocio

### RN-001 — Secuencia mensual

Las cuotas avanzan por meses calendario.

Ejemplo:

- período del resumen: `2026-07`;
- cuota presente: `3/6`;
- futuras: `2026-08` `4/6`, `2026-09` `5/6`, `2026-10` `6/6`.

### RN-002 — Exclusión de la cuota actual

La cuota presente en el resumen pertenece al período del resumen y no forma parte de Deuda futura.

### RN-003 — Última cuota

Una compra `1/1` o una cuota final como `6/6` no genera ocurrencias futuras.

### RN-004 — Importe de cuota

El importe mostrado por el resumen para una cuota se considera importe individual de esa cuota. No se divide por la cantidad total de cuotas.

### RN-005 — Moneda

Cada ocurrencia conserva su moneda de origen. Los totales ARS y USD son independientes.

### RN-006 — Identidad y deduplicación

Una misma ocurrencia económica sólo puede aparecer una vez. La identidad funcional debe incluir como mínimo:

- identidad del plan o compra fuente;
- número de cuota;
- período;
- moneda;
- tarjeta.

La implementación técnica podrá usar otra clave equivalente, siempre que garantice el mismo comportamiento.

### RN-007 — Compra fuente versus ocurrencias

La compra fuente no se suma como deuda futura cuando sus cuotas futuras ya están representadas por ocurrencias.

### RN-008 — Fecha del consumo

La fecha del consumo puede mostrarse como dato informativo, pero no gobierna el período mensual de una cuota futura.

### RN-009 — Lectura no destructiva

Consultar Deuda futura no modifica planes, cuotas, resúmenes ni compras.

### RN-010 — Horizonte

El usuario puede consultar un horizonte mensual. El horizonte limita la visualización, pero no elimina ocurrencias fuera del rango.

### RN-011 — Totales

Para cada combinación de período y moneda:

`total mensual = suma de importes de todas las cuotas visibles incluidas`

No se realizan conversiones automáticas entre monedas.

### RN-012 — Persistencia sin nuevos resúmenes

Las cuotas futuras deben continuar disponibles aunque no se importe otro resumen durante varios meses.

### RN-013 — Datos inválidos

Cuando una cuota no puede interpretarse de manera segura, el sistema no inventa recurrencias. Debe excluirla del total futuro y registrar un diagnóstico trazable.

### RN-014 — Trazabilidad

Cada fila futura debe permitir identificar como mínimo:

- tarjeta;
- período;
- descripción;
- número de cuota y total;
- importe;
- moneda;
- tipo de origen;
- referencia del resumen o compra manual;
- estado confirmado o estimado.

### RN-015 — Orden

Los períodos se ordenan cronológicamente de menor a mayor. Dentro de cada período, las filas se ordenan de forma estable por tarjeta y referencia de origen.

### RN-016 — Idempotencia de lectura

Dos consultas consecutivas sin cambios en los datos deben devolver el mismo resultado funcional y los mismos totales.

---

## 10. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-001 | Mostrar deuda futura agrupada por período mensual. | Obligatorio |
| RF-002 | Separar los totales por moneda. | Obligatorio |
| RF-003 | Mostrar el aporte de cada tarjeta. | Obligatorio |
| RF-004 | Exponer el detalle de cada cuota futura. | Obligatorio |
| RF-005 | Excluir la cuota ya incluida en el resumen actual. | Obligatorio |
| RF-006 | Excluir compras `1/1` y cuotas finales. | Obligatorio |
| RF-007 | No dividir nuevamente el importe de una cuota importada. | Obligatorio |
| RF-008 | No duplicar compra fuente y cuotas derivadas. | Obligatorio |
| RF-009 | Mantener la deuda futura sin nuevas importaciones. | Obligatorio |
| RF-010 | Permitir acotar la consulta por horizonte mensual. | Obligatorio |
| RF-011 | Informar datos inválidos sin inventar deuda. | Obligatorio |
| RF-012 | Mantener trazabilidad al origen. | Obligatorio |
| RF-013 | Garantizar coincidencia exacta entre detalle y total. | Obligatorio |
| RF-014 | No modificar datos durante la consulta. | Obligatorio |
| RF-015 | Mostrar estado vacío comprensible cuando no exista deuda futura. | Obligatorio |

---

## 11. Requisitos de presentación

El PRD no obliga a rediseñar la interfaz completa, pero cualquier UI utilizada debe representar:

- período mensual;
- total ARS;
- total USD;
- tarjetas incluidas;
- filas de detalle;
- descripción;
- cuota, por ejemplo `4/6`;
- importe y moneda;
- origen;
- estado confirmado o estimado;
- diagnóstico visible o accesible para datos excluidos.

La interfaz no debe mostrar un único total mezclando monedas.

Cuando no haya deuda futura debe mostrar un mensaje explícito, no una grilla rota ni un total ambiguo.

---

## 12. Requisitos no funcionales

### RNF-001 — Exactitud

Los cálculos monetarios deben evitar errores de punto flotante visibles. Los totales deben coincidir con el detalle al centavo.

### RNF-002 — Determinismo

Con los mismos datos persistidos, la respuesta debe ser idéntica.

### RNF-003 — Rendimiento

La consulta de un horizonte de hasta 24 meses debe responder de forma interactiva en una instalación local normal.

### RNF-004 — Auditabilidad

Las exclusiones y deduplicaciones deben poder diagnosticarse sin revisar manualmente la base de datos.

### RNF-005 — Compatibilidad

La implementación debe respetar los contratos vigentes del backend y frontend o versionarlos explícitamente cuando el PRD aprobado exija un cambio.

### RNF-006 — Seguridad de datos

La consulta no debe enviar información financiera a proveedores de IA. La IA no participa en el cálculo de Deuda futura.

---

## 13. Criterios de aceptación en Gherkin

```gherkin
# language: es

Característica: Visualización de deuda futura confirmada de tarjetas
  Como usuario de CajaApp
  Quiero conocer mis obligaciones futuras por mes, tarjeta y moneda
  Para planificar mis finanzas con información verificable y sin duplicaciones

  Antecedentes:
    Dado que la importación del resumen ya fue aceptada
    Y que Deuda futura sólo consulta datos persistidos
    Y que los períodos se representan con el formato "YYYY-MM"

  Escenario: No existe deuda futura
    Dado que no hay ocurrencias vigentes posteriores al período actual
    Cuando consulto Deuda futura
    Entonces el sistema muestra un estado vacío comprensible
    Y el total ARS es cero
    Y el total USD es cero
    Y no inventa cuotas futuras

  Escenario: Una compra de una sola cuota no genera deuda futura
    Dado un resumen del período "2026-07"
    Y una fila de compra con cuota "1/1"
    Cuando consulto Deuda futura
    Entonces esa compra no aparece en ningún período posterior
    Y su importe no se incluye en los totales futuros

  Escenario: Una cuota final no genera deuda futura
    Dado un resumen del período "2026-07"
    Y una fila con cuota "6/6"
    Cuando consulto Deuda futura
    Entonces no se genera una cuota "7/6"
    Y la fila actual no aparece como deuda futura

  Escenario: Proyección correcta de una cuota 1 de 3
    Dado un resumen del período "2026-07"
    Y una fila con cuota "1/3" por ARS 10000
    Cuando consulto Deuda futura
    Entonces aparece la cuota "2/3" en "2026-08" por ARS 10000
    Y aparece la cuota "3/3" en "2026-09" por ARS 10000
    Y no aparece la cuota "1/3" en Deuda futura
    Y el importe no se divide nuevamente

  Escenario: Proyección correcta de una cuota 3 de 6
    Dado un resumen del período "2026-07"
    Y una fila con cuota "3/6" por ARS 25000
    Cuando consulto Deuda futura
    Entonces aparece la cuota "4/6" en "2026-08" por ARS 25000
    Y aparece la cuota "5/6" en "2026-09" por ARS 25000
    Y aparece la cuota "6/6" en "2026-10" por ARS 25000
    Y no aparecen cuotas posteriores a "6/6"

  Escenario: El importe de la cuota importada no se vuelve a dividir
    Dado una fila de resumen con cuota "3/6" e importe ARS 18000
    Cuando se representan sus cuotas futuras
    Entonces cada ocurrencia futura conserva el importe ARS 18000
    Y ninguna ocurrencia muestra ARS 3000

  Escenario: La moneda USD se conserva separada
    Dado una fila con cuota "2/4" por USD 50
    Cuando consulto Deuda futura
    Entonces las cuotas futuras se totalizan en USD
    Y no se suman al total ARS
    Y el sistema no realiza conversión de moneda automática

  Escenario: ARS y USD conviven sin mezclarse
    Dado una cuota futura por ARS 10000 en "2026-08"
    Y una cuota futura por USD 40 en "2026-08"
    Cuando consulto el período "2026-08"
    Entonces el total ARS es ARS 10000
    Y el total USD es USD 40
    Y no se muestra un total monetario único combinado

  Escenario: La fecha del consumo no cambia el período de la cuota
    Dado un resumen del período "2026-07"
    Y una compra con fecha de consumo "2026-06-28"
    Y una cuota actual "2/4"
    Cuando consulto Deuda futura
    Entonces la cuota "3/4" pertenece a "2026-08"
    Y el sistema no utiliza junio como período base

  Escenario: Los meses avanzan por calendario y no por treinta días
    Dado una cuota futura que comienza en "2026-02"
    Cuando se generan los períodos siguientes
    Entonces la secuencia continúa con "2026-03" y "2026-04"
    Y no depende de que febrero tenga 28 o 29 días

  Escenario: La compra fuente no se suma junto con sus cuotas
    Dado una compra manual por ARS 90000 en 3 cuotas
    Y tres ocurrencias persistidas de ARS 30000
    Cuando consulto Deuda futura
    Entonces se suman únicamente las ocurrencias futuras vigentes
    Y no se agregan ARS 90000 adicionales por la compra fuente

  Escenario: Una ocurrencia duplicada se cuenta una sola vez
    Dado dos registros que representan la misma tarjeta, plan, cuota, período y moneda
    Cuando consulto Deuda futura
    Entonces la obligación aparece una sola vez
    Y su importe se suma una sola vez
    Y el sistema registra un diagnóstico de duplicación

  Escenario: Dos cuotas distintas del mismo plan no se consideran duplicadas
    Dado una cuota "4/6" en "2026-08"
    Y una cuota "5/6" en "2026-09"
    Cuando consulto Deuda futura
    Entonces ambas aparecen en sus respectivos períodos
    Y ninguna es eliminada por deduplicación

  Escenario: El total mensual coincide con el detalle
    Dado tres cuotas ARS de 10000, 15000 y 25000 en "2026-08"
    Cuando consulto el período "2026-08"
    Entonces el total ARS mostrado es 50000
    Y la suma de las filas visibles es exactamente 50000

  Escenario: Agrupación por tarjeta
    Dado cuotas futuras de una tarjeta Visa y una tarjeta Mastercard en el mismo período
    Cuando consulto Deuda futura
    Entonces puedo identificar cuánto aporta Visa al total
    Y puedo identificar cuánto aporta Mastercard al total
    Y el total del período coincide con la suma de ambas tarjetas

  Escenario: Consulta limitada por horizonte
    Dado cuotas futuras distribuidas durante 18 meses
    Cuando consulto un horizonte de 6 meses
    Entonces se muestran únicamente los primeros 6 períodos del horizonte
    Y las cuotas posteriores continúan persistidas
    Y ampliar el horizonte permite verlas sin recalcular ni importar otro resumen

  Escenario: Persistencia sin cargar nuevos resúmenes
    Dado un plan con cuotas futuras hasta "2026-12"
    Y que no se cargan nuevos resúmenes durante tres meses
    Cuando consulto Deuda futura nuevamente
    Entonces las cuotas pendientes continúan disponibles
    Y conservan sus períodos, importes y referencias de origen

  Escenario: Cuota inválida
    Dado una fila cuyo valor de cuota es ambiguo o inválido
    Cuando el sistema evalúa su inclusión en Deuda futura
    Entonces no inventa una cantidad de cuotas
    Y no incluye un importe futuro derivado de esa fila
    Y registra un diagnóstico trazable

  Escenario: Falta de moneda
    Dado una ocurrencia futura sin moneda válida
    Cuando consulto Deuda futura
    Entonces la ocurrencia no se suma a ARS ni a USD
    Y el sistema registra un diagnóstico de dato incompleto
    Y no asume una moneda por defecto silenciosamente

  Escenario: Falta de tarjeta asociada
    Dado una ocurrencia futura sin referencia válida a una tarjeta
    Cuando consulto Deuda futura
    Entonces el sistema no altera el importe ni inventa una tarjeta
    Y expone un diagnóstico trazable
    Y la política de inclusión o exclusión queda visible para validación

  Escenario: Lectura idempotente
    Dado que no hubo cambios en resúmenes, compras ni ocurrencias
    Cuando consulto Deuda futura dos veces consecutivas
    Entonces ambas consultas devuelven los mismos períodos
    Y devuelven las mismas filas
    Y devuelven los mismos totales

  Escenario: Consultar Deuda futura no modifica datos
    Dado un conjunto persistido de cuotas futuras
    Cuando abro y actualizo la vista de Deuda futura
    Entonces no se crean nuevas cuotas
    Y no se eliminan cuotas existentes
    Y no cambia el estado de ninguna ocurrencia

  Escenario: Trazabilidad completa
    Dado una cuota futura visible
    Cuando consulto su detalle
    Entonces puedo identificar la tarjeta
    Y el período
    Y la descripción
    Y el número de cuota y total
    Y el importe y moneda
    Y el tipo de origen
    Y la referencia al resumen o compra manual
    Y su estado confirmado o estimado
```

---

## 14. Datos mínimos para validación funcional

La prueba real deberá ejecutarse con un conjunto controlado y conocido antes de usar datos financieros amplios.

### Dataset A — Casos básicos ARS

| Descripción | Cuota actual | Importe | Período resumen | Futuro esperado |
|---|---:|---:|---|---|
| Compra contado | `1/1` | ARS 12000 | `2026-07` | Ninguno |
| Compra corta | `1/3` | ARS 10000 | `2026-07` | Ago `2/3`, Sep `3/3` |
| Compra avanzada | `3/6` | ARS 25000 | `2026-07` | Ago `4/6`, Sep `5/6`, Oct `6/6` |
| Compra final | `6/6` | ARS 8000 | `2026-07` | Ninguno |

### Dataset B — Monedas

- Una cuota futura ARS.
- Una cuota futura USD.
- Ambas en el mismo período.
- Totales separados y sin conversión.

### Dataset C — Duplicación

- Una compra fuente.
- Sus cuotas persistidas.
- Una repetición deliberada de la misma ocurrencia.
- Resultado esperado: una sola obligación económica por cuota.

### Dataset D — Datos inválidos

- Cuota vacía.
- Cuota con formato ambiguo.
- Moneda faltante.
- Tarjeta inexistente.
- Resultado esperado: ninguna deuda inventada y diagnóstico visible.

---

## 15. Estrategia de validación

### Fase 1 — Revisión del PRD

El usuario revisa y corrige:

- alcance;
- reglas financieras;
- escenarios Gherkin;
- datos de prueba;
- definición de deuda futura.

No se modifica código antes de la aprobación explícita del PRD.

### Fase 2 — Diseño técnico

Después de aprobar el PRD se documentará:

- fuentes de datos concretas;
- modelo de identidad y deduplicación;
- contrato de respuesta;
- estrategia de persistencia;
- impacto en frontend y backend;
- plan de reversión.

### Fase 3 — Implementación acotada

Se implementará únicamente lo autorizado por el diseño aprobado.

### Fase 4 — Validación técnica mínima

- typecheck;
- build;
- pruebas unitarias de reglas puras;
- smoke de endpoint y pantalla;
- logs.

### Fase 5 — Validación funcional real

El usuario ejecutará los datasets acordados y comparará resultados fila por fila y total por total.

La feature sólo se considera aceptada cuando el usuario confirma que el comportamiento real coincide con el PRD.

---

## 16. Métricas de éxito

La funcionalidad se considera exitosa cuando:

- el 100 % de los escenarios obligatorios aprobados pasa en uso real;
- no existen duplicaciones económicas visibles;
- los totales coinciden exactamente con el detalle;
- ARS y USD permanecen separados;
- ninguna cuota actual se presenta como futura;
- ninguna cuota se desplaza por sumar treinta días;
- la deuda futura continúa disponible sin nuevas cargas mensuales;
- el usuario puede rastrear cada importe hasta su origen;
- el usuario acepta explícitamente el resultado.

---

## 17. Riesgos

| Riesgo | Impacto | Mitigación requerida |
|---|---|---|
| Proyecciones históricas incorrectas ya persistidas | Totales incorrectos aunque la lectura sea correcta | Diagnóstico previo y PRD de migración separado. |
| Falta de identidad estable del plan | Duplicados o cuotas perdidas | Diseñar identidad antes de implementar. |
| Mezcla de fuentes reales y derivadas | Doble contabilización | Clasificación explícita por tipo de registro. |
| Contrato frontend insuficiente | Datos correctos pero imposibles de auditar | Versionar contrato o ampliar detalle. |
| Datos inválidos silenciosos | Totales engañosos | Diagnósticos visibles y exclusión segura. |
| Reconciliación futura no definida | Conflictos al importar otro resumen | PRD independiente de conciliación. |

---

## 18. Dependencias

- Datos de resumen previamente aceptados.
- Identificación estable de tarjetas.
- Persistencia disponible para ocurrencias futuras.
- Moneda explícita por movimiento u ocurrencia.
- Contrato capaz de exponer período, tarjeta, cuota, importe, moneda y origen.

La IA no es dependencia para calcular ni leer Deuda futura.

---

## 19. Decisiones pendientes de aprobación del usuario

Antes de pasar a diseño técnico deben confirmarse explícitamente:

1. Si el alcance inicial incluye compras manuales o sólo cuotas derivadas de resúmenes.
2. Cómo debe mostrarse una ocurrencia sin tarjeta válida: excluida del total o incluida en una sección de pendientes.
3. Si el horizonte predeterminado será 6, 12 o 24 meses.
4. Si el período actual debe ocultarse siempre o sólo cuando pertenece al resumen vigente.
5. Qué nivel de detalle debe verse directamente y cuál puede estar en una expansión.
6. Si las proyecciones almacenadas con estado técnico `projected` deben considerarse funcionalmente confirmadas cuando provienen de una obligación ya asumida.
7. Qué dataset real utilizará el usuario como prueba de aceptación.

Estas decisiones no deben resolverse por inferencia durante la implementación.

---

## 20. Gate de aprobación

Este PRD pasa de **BORRADOR** a **APROBADO PARA DISEÑO TÉCNICO** únicamente cuando el usuario confirme expresamente que:

- el alcance representa lo que necesita;
- las reglas de negocio son correctas;
- los escenarios Gherkin cubren el comportamiento esperado;
- las decisiones pendientes fueron resueltas;
- el dataset de aceptación fue acordado.

La aprobación de este documento no autoriza automáticamente la implementación. Primero deberá existir un diseño técnico derivado y aprobado.

---

## 21. Historial

| Versión | Fecha | Estado | Descripción |
|---|---|---|---|
| `1.0.0` | 24-07-2026 | Borrador | PRD inicial creado después del rechazo funcional de la implementación de Deuda futura. |
