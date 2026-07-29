# language: es
Característica: Confirmed Future Debt Visualization
  The user can review confirmed future credit card obligations with calendar periods and exact installment amounts.

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
