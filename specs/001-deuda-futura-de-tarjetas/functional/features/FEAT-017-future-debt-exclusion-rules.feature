# language: es
Característica: Future Debt Exclusion Rules
  The system excludes current, completed, and already represented obligations from future debt.

  Antecedentes:
    Dado que la importación del resumen ya fue aceptada
    Y que Deuda futura sólo consulta datos persistidos
    Y que los períodos se representan con el formato "YYYY-MM"

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

  Escenario: El importe de la cuota importada no se vuelve a dividir
    Dado una fila de resumen con cuota "3/6" e importe ARS 18000
    Cuando se representan sus cuotas futuras
    Entonces cada ocurrencia futura conserva el importe ARS 18000
    Y ninguna ocurrencia muestra ARS 3000

  Escenario: La compra fuente no se suma junto con sus cuotas
    Dado una compra manual por ARS 90000 en 3 cuotas
    Y tres ocurrencias persistidas de ARS 30000
    Cuando consulto Deuda futura
    Entonces se suman únicamente las ocurrencias futuras vigentes
    Y no se agregan ARS 90000 adicionales por la compra fuente
