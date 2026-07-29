# APPCAJA V3 — REDISEÑO DE TARJETAS Y DEUDA FUTURA

Versión: `v1.0.0`  
Bloque: `APP-CARDS-FUTURE-REDESIGN-001`  
Fecha: 23 de julio de 2026  
Estado: EN IMPLEMENTACIÓN

## 1. Propósito

Este documento define el rediseño del dominio de Tarjetas y Deuda futura para que CajaApp mantenga una proyección financiera continua sin depender de la importación mensual de resúmenes.

## 2. Problema actual

La aplicación tiene correctamente representadas las filas del resumen, pero utiliza anclas temporales inconsistentes para proyectar cuotas:

- el período del resumen puede inferirse desde fechas de consumos;
- una compra manual comienza en el mes de compra;
- los ciclos de cierre y vencimiento no son una regla común;
- la vista de Deuda futura consume resultados derivados sin controlar cómo fueron originados;
- el sistema no tiene todavía una identidad estable de plan de cuotas.

Consecuencia: un consumo `3/6` puede quedar desplazado, incompleto o calculado con una recurrencia incorrecta.

## 3. Principios del rediseño

1. El tiempo financiero se representa por períodos mensuales `YYYY-MM`.
2. Las fechas diarias sirven para decidir a qué ciclo pertenece una compra, no para sumar treinta días.
3. Un resumen aceptado es un hecho histórico.
4. Las cuotas restantes son compromisos confirmados.
5. Una compra manual crea un plan persistente independiente de futuras importaciones.
6. Deuda futura no inventa cuotas: consume ocurrencias generadas por planes válidos.
7. Una importación posterior concilia y confirma; no reemplaza destructivamente.
8. Toda ocurrencia debe poder rastrearse hasta su origen.

## 4. Lenguaje de dominio

### Período del resumen

Mes autoritativo al que pertenece el resumen aceptado. Se expresa como `YYYY-MM`.

### Ciclo de tarjeta

Conjunto de fecha de cierre y fecha de vencimiento que determina el primer período de una compra.

### Plan de cuotas

Compromiso que describe:

- origen;
- importe por cuota;
- moneda;
- cuota inicial conocida;
- total de cuotas;
- primer período aplicable;
- estado;
- trazabilidad.

### Ocurrencia de cuota

Instancia mensual de un plan. Ejemplo: cuota `4/6` en `2026-08`.

### Conciliación

Comparación entre una ocurrencia esperada y una fila observada en un resumen posterior.

## 5. Invariantes

### I-01 — Secuencia

Para un plan `current/total`, la primera cuota futura es `current + 1` y la última es `total`.

### I-02 — Cantidad

`cantidad futura = total - current`

### I-03 — Calendario

Cada cuota avanza exactamente un mes calendario mediante `addMonths(YYYY-MM, 1)`.

### I-04 — Importe importado

El importe de una fila de resumen en cuotas es el importe de esa cuota. No se divide nuevamente.

### I-05 — Importe manual

Una compra manual con importe total se divide por la cantidad de cuotas. Cualquier resto de centavos se asigna de manera determinística a la primera cuota.

### I-06 — Sin recurrencia inventada

Un campo de cuota ausente o inválido no genera ocurrencias automáticas.

### I-07 — Independencia documental

Una vez creado un plan, sus ocurrencias futuras no dependen de importar otro PDF.

### I-08 — No duplicación

La misma cuota lógica no puede existir dos veces para el mismo plan y número de cuota.

### I-09 — Histórico inmutable

Una conciliación o corrección no debe reescribir silenciosamente movimientos históricos aceptados.

## 6. Algoritmo para filas importadas

Entrada:

- `statementPeriodKey`;
- `installmentCurrent`;
- `installmentTotal`;
- importe de cuota;
- moneda;
- detalle y comprobante;
- identidad de fila.

Proceso:

```text
si current >= total:
    no generar futuro

para cuota = current + 1 hasta total:
    offset = cuota - current
    monthKey = statementPeriodKey + offset meses
    crear ocurrencia confirmada
```

Ejemplo:

```text
statementPeriodKey = 2026-07
cuota observada = 3/6
importe = 20.000 ARS

2026-08 -> 4/6 -> 20.000 ARS
2026-09 -> 5/6 -> 20.000 ARS
2026-10 -> 6/6 -> 20.000 ARS
```

## 7. Algoritmo para compras manuales

Entrada:

- fecha de compra;
- próximo cierre conocido;
- próximo vencimiento conocido;
- período del último resumen;
- importe total;
- cantidad de cuotas.

Resolución del primer período:

```text
si existen próximo cierre y próximo vencimiento:
    si purchaseDate <= nextClosingDate:
        firstBillingMonth = mes(nextDueDate)
    si purchaseDate > nextClosingDate:
        firstBillingMonth = mes(nextDueDate) + 1 mes
si faltan fechas:
    firstBillingMonth = statementPeriodKey + 1 mes
    marcar fecha estimada
```

Luego se generan `1/N` a `N/N`, una por mes.

## 8. Modelo objetivo de persistencia

La evolución final separará plan y ocurrencia.

### CardInstallmentPlan

Campos propuestos:

- `id`;
- `sourceType`: `statement_row` o `manual_purchase`;
- `sourceId`;
- `cardIdentity`;
- `description`;
- `referenceRaw`;
- `receiptRaw`;
- `currency`;
- `installmentAmountRaw`;
- `installmentStart`;
- `installmentTotal`;
- `anchorMonthKey`;
- `status`: `active`, `completed`, `cancelled`, `replaced`;
- `billingAnchorEstimated`;
- timestamps.

### CardInstallmentOccurrence

Campos propuestos:

- `id`;
- `planId`;
- `monthKey`;
- `installmentNumber`;
- `amountRaw`;
- `status`: `expected`, `confirmed`, `adjusted`, `cancelled`;
- `matchedStatementRowId` opcional;
- `dueDateEstimated`;
- timestamps.

Restricción obligatoria:

`unique(planId, installmentNumber)`

## 9. Compatibilidad transitoria

La primera etapa conserva `CardInstallmentProjection` para no romper la aplicación mientras se introduce una única lógica de calendario.

Durante esta etapa:

- la generación mensual se centraliza;
- las filas importadas y compras manuales usan el mismo servicio de calendario;
- Deuda futura continúa leyendo las proyecciones existentes;
- la migración a Plan + Ocurrencia se realiza en la etapa siguiente.

## 10. Componentes

### CardBillingCalendarService

Responsabilidades:

- validar `YYYY-MM`;
- validar fechas ISO;
- parsear `current/total` estrictamente;
- resolver período del resumen desde metadata;
- generar cuotas restantes;
- resolver primer período de compras manuales;
- generar el calendario completo de una compra manual.

No accede a Prisma y no conoce HTTP.

### InstallmentProjectionService

Responsabilidades transitorias:

- convertir filas aceptadas en proyecciones;
- delegar toda secuencia mensual al calendario común;
- omitir filas inválidas con diagnóstico explícito;
- agregar totales mensuales.

### ManualPurchasesService

Responsabilidades:

- validar compra;
- obtener metadata del ciclo de tarjeta;
- crear compra y calendario dentro de una transacción;
- eliminar compra y proyecciones asociadas de forma atómica.

### FutureService

Responsabilidad objetivo:

- presentar hechos, compromisos confirmados y estimaciones;
- no calcular planes;
- consumir ocurrencias activas y rastreables.

## 11. Migración de datos

La migración debe ejecutarse después de estabilizar el calendario común.

Plan:

1. identificar proyecciones existentes por resumen/fila o compra manual;
2. recalcular con el período real del resumen;
3. comparar calendario anterior y nuevo;
4. sustituir únicamente datos derivados;
5. conservar resúmenes, filas y compras originales;
6. emitir reporte de diferencias;
7. no tocar movimientos reales ni ingresos.

## 12. Observabilidad mínima

Cada generación debe registrar:

- tipo de origen;
- origen ID;
- período ancla;
- cuota actual/total;
- cantidad de ocurrencias;
- primer y último mes;
- si el ancla fue estimada;
- filas inválidas omitidas.

Nunca registrar documentos completos ni datos sensibles innecesarios.

## 13. Validación técnica mínima

El agente ejecutará:

- Prisma generate cuando corresponda;
- typecheck;
- build backend;
- build frontend si se modifica contrato visible;
- arranque local;
- health check;
- smoke de lectura de Tarjetas y Deuda futura.

El usuario validará funcionalmente los casos reales.

## 14. Entrega actual

Incluye:

- actualización del SSOT;
- este documento de arquitectura;
- servicio común de calendario mensual;
- adaptación inicial de proyección importada;
- adaptación inicial de compras manuales.

No incluye todavía:

- nueva estructura Prisma Plan + Ocurrencia;
- migración de proyecciones históricas;
- conciliación automática completa;
- compromisos externos a tarjeta.