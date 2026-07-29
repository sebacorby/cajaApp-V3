# language: es
Característica: Future Debt Traceability and Card Grouping
  Every visible future obligation exposes complete source information and can be attributed to its card.

  Antecedentes:
    Dado que la importación del resumen ya fue aceptada
    Y que Deuda futura sólo consulta datos persistidos
    Y que los períodos se representan con el formato "YYYY-MM"

  Escenario: Agrupación por tarjeta
    Dado cuotas futuras de una tarjeta Visa y una tarjeta Mastercard en el mismo período
    Cuando consulto Deuda futura
    Entonces puedo identificar cuánto aporta Visa al total
    Y puedo identificar cuánto aporta Mastercard al total
    Y el total del período coincide con la suma de ambas tarjetas

  Escenario: Trazabilidad completa
    Dado una cuota futura visible
    Cuando consulto su detalle
    Entonces puedo identificar directamente la tarjeta
    Y el período
    Y la descripción
    Y el número de cuota y total
    Y el importe y moneda
    Y el tipo de origen
    Y la referencia al resumen o compra manual
    Y su estado confirmado o estimado
    Y no necesito expandir otra sección para ver esos datos
