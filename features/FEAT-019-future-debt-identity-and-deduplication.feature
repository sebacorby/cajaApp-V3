# language: es
Característica: Future Debt Functional Identity and Deduplication
  The system counts each economic obligation once while retaining distinct installments of the same plan.

  Antecedentes:
    Dado que la importación del resumen ya fue aceptada
    Y que Deuda futura sólo consulta datos persistidos
    Y que los períodos se representan con el formato "YYYY-MM"

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
