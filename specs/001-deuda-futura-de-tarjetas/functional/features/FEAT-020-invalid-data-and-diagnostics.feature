# language: es
Característica: Invalid Data and Future Debt Diagnostics
  The system excludes unsafe data from currency totals and exposes actionable diagnostics without inventing debt.

  Antecedentes:
    Dado que la importación del resumen ya fue aceptada
    Y que Deuda futura sólo consulta datos persistidos
    Y que los períodos se representan con el formato "YYYY-MM"

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
    Y la ocurrencia no se incorpora a los totales de tarjetas
    Y se muestra en una sección diferenciada de "pendientes"
    Y expone un diagnóstico trazable

  Escenario: Una obligación asumida con estado projected se considera confirmada
    Dado una ocurrencia futura con estado técnico "projected"
    Y que su origen es un resumen aceptado o una compra manual con plan de cuotas persistido
    Cuando consulto Deuda futura
    Entonces la ocurrencia se muestra con estado funcional "confirmado"
    Y el sistema la trata como una obligación confirmada
