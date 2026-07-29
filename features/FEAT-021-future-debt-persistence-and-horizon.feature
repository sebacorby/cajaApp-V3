# language: es
Característica: Future Debt Persistence and Monthly Horizon
  The user can inspect a bounded monthly horizon, reveal the current period when needed, and retain future obligations without new imports.

  Antecedentes:
    Dado que la importación del resumen ya fue aceptada
    Y que Deuda futura sólo consulta datos persistidos
    Y que los períodos se representan con el formato "YYYY-MM"

  Escenario: Consulta limitada por horizonte
    Dado cuotas futuras distribuidas durante 18 meses
    Cuando consulto Deuda futura con el horizonte predeterminado
    Entonces se muestran únicamente los primeros 6 períodos del horizonte
    Y las cuotas posteriores continúan persistidas
    Y ampliar el horizonte permite verlas sin recalcular ni importar otro resumen

  Escenario: El usuario puede ampliar el horizonte hasta 24 meses
    Dado cuotas futuras distribuidas durante 24 meses
    Cuando consulto Deuda futura con un horizonte ampliado de 24 meses
    Entonces se muestran los períodos comprendidos dentro de los 24 meses
    Y las cuotas posteriores al horizonte no se muestran
    Y ninguna cuota se elimina por limitar el horizonte

  Escenario: El período actual se oculta por defecto
    Dado un resumen vigente del período "2026-07"
    Y una cuota perteneciente a ese resumen en el período "2026-07"
    Cuando consulto Deuda futura con la configuración predeterminada
    Entonces el período "2026-07" permanece oculto
    Y la cuota perteneciente al resumen vigente no se muestra como deuda futura

  Escenario: El usuario puede mostrar el período actual
    Dado un resumen vigente del período "2026-07"
    Y una cuota perteneciente a ese resumen en el período "2026-07"
    Cuando consulto Deuda futura con la opción de mostrar el período actual activada
    Entonces el período "2026-07" se muestra
    Y la cuota conserva su período, importe y trazabilidad

  Escenario: Persistencia sin cargar nuevos resúmenes
    Dado un plan con cuotas futuras hasta "2026-12"
    Y que no se cargan nuevos resúmenes durante tres meses
    Cuando consulto Deuda futura nuevamente
    Entonces las cuotas pendientes continúan disponibles
    Y conservan sus períodos, importes y referencias de origen
