# language: es
Característica: Multi-currency Future Debt Totals
  The system preserves source currencies and reconciles each monthly total with its visible detail.

  Antecedentes:
    Dado que la importación del resumen ya fue aceptada
    Y que Deuda futura sólo consulta datos persistidos
    Y que los períodos se representan con el formato "YYYY-MM"

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

  Escenario: El total mensual coincide con el detalle
    Dado tres cuotas ARS de 10000, 15000 y 25000 en "2026-08"
    Cuando consulto el período "2026-08"
    Entonces el total ARS mostrado es 50000
    Y la suma de las filas visibles es exactamente 50000
