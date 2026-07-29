# language: es
Característica: Idempotent and Non-destructive Future Debt Reads
  Reading future debt returns stable results and never changes persisted financial data.

  Antecedentes:
    Dado que la importación del resumen ya fue aceptada
    Y que Deuda futura sólo consulta datos persistidos
    Y que los períodos se representan con el formato "YYYY-MM"

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
