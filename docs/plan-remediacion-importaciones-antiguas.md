Plan de remediación: eliminación de importaciones antiguas

Contexto

Actualmente, las importaciones antiguas no pueden eliminarse una vez que dejan de ser la versión activa. El comportamiento esperado es que una importación histórica consolidada pueda eliminarse de forma segura, sin dejar datos dependientes, inconsistencias de versionado ni bloqueos para volver a importar el mismo archivo.

La implementación se realizará sobre la rama:

feat/fix-importaciones

1. Problema observado

El flujo actual distingue entre distintos estados de una importación de resumen de tarjeta:

accepted: versión aceptada y, normalmente, activa.

superseded: versión reemplazada por una importación más reciente.

archived: versión archivada.

Drafts u otros estados intermedios: importaciones todavía no consolidadas.

La eliminación existente parece estar restringida a resúmenes en estado accepted. Cuando una nueva importación reemplaza una anterior, la versión vieja pasa a superseded, por lo que deja de cumplir la validación requerida para ser eliminada.

Esto genera una situación inconsistente:

La importación vieja continúa visible en el Centro de importaciones.

El usuario intenta eliminarla.

El backend rechaza la operación por el estado del resumen.

No existe una alternativa clara para limpiar esa importación histórica.

2. Objetivo

Permitir la eliminación segura de importaciones históricas consolidadas, incluyendo versiones:

accepted

superseded

archived

La solución debe:

preservar la integridad de los datos;

eliminar las entidades dependientes;

mantener una única versión activa por período;

promover una versión anterior cuando se elimina la activa;

permitir volver a importar el archivo eliminado;

diferenciar correctamente entre eliminación de un resumen consolidado y descarte de un draft;

exponer el comportamiento desde el Centro de importaciones;

actualizar correctamente la interfaz después de la operación.

3. Alcance

Incluido

Diagnóstico del flujo actual.

Ajuste de reglas de dominio para eliminación.

Cambios en el servicio de tarjetas.

Integración con el Centro de importaciones.

Actualización de respuestas API.

Actualización de la interfaz.

Manejo de promoción de versiones.

Limpieza de dependencias.

Pruebas unitarias, de integración y de interfaz.

Verificación de datos históricos.

No incluido

Eliminación automática de importaciones.

Limpieza masiva de registros sin revisión.

Cambio general del modelo de versionado.

Rediseño completo del Centro de importaciones.

Migraciones destructivas salvo que el diagnóstico detecte inconsistencias reales.

4. Reproducción y diagnóstico

Antes de modificar el comportamiento, reproducir el problema con datos controlados.

Escenarios a preparar

Un resumen accepted y activo.

Una versión anterior con estado superseded.

Un resumen con estado archived.

Un draft pendiente.

Una importación en procesamiento o incompleta.

Dos o más versiones asociadas al mismo historyKey.

Información a registrar

Para cada escenario:

identificador mostrado por el Centro de importaciones;

tipo de entidad asociado;

estado actual;

historyKey;

valor de isActiveForPeriod;

endpoint utilizado para eliminar;

respuesta HTTP;

error de dominio retornado;

entidades dependientes existentes;

estado del documento de origen.

Resultado esperado del diagnóstico

Determinar con precisión si el bloqueo está en:

la interfaz;

el endpoint;

la selección del identificador;

la validación de estados;

la lógica de versionado;

la relación entre el Centro de importaciones y el módulo de tarjetas.

5. Política de eliminación

Resúmenes consolidados

Permitir eliminación definitiva para:

accepted
superseded
archived

Drafts

Los drafts no deben eliminarse mediante el flujo de resúmenes consolidados. Deben continuar utilizando el mecanismo específico de descarte.

Estados no eliminables

Bloquear la eliminación de importaciones:

en procesamiento;

incompletas;

bloqueadas por otra operación;

con un estado desconocido o inválido.

En esos casos, devolver un error de dominio claro y una respuesta HTTP 409 Conflict.

Regla de versión activa

Debe existir como máximo una versión activa por historyKey.

Cuando se elimina una versión no activa:

no debe modificarse la versión activa actual.

Cuando se elimina la versión activa:

debe buscarse la versión histórica más reciente disponible;

esa versión debe promoverse a activa;

si no existen versiones anteriores, el período queda sin resumen activo.

6. Cambios en el backend

6.1. Servicio de tarjetas

Actualizar la operación responsable de eliminar un resumen.

La lógica debe ejecutarse dentro de una transacción.

Flujo propuesto

Buscar el resumen por identificador.

Validar que exista.

Validar que su estado sea eliminable.

Cargar:

historyKey;

estado;

indicador de versión activa;

documento asociado;

versiones relacionadas;

compras o compromisos manuales asociados.

Determinar si la versión a eliminar es la activa.

Si es activa, seleccionar la versión anterior más reciente.

Resolver el tratamiento de compras manuales.

Eliminar el resumen y sus dependencias.

Promover la versión anterior cuando corresponda.

Liberar o actualizar el documento de origen.

Confirmar que no existan múltiples versiones activas.

Retornar un resultado estructurado.

Resultado sugerido

type DeleteStatementResult = {
  deletedStatementId: string;
  deletedDocumentId: string | null;
  promotedStatementId: string | null;
  historyKey: string | null;
};

Errores de dominio

Evitar validar mediante comparación de mensajes de texto.

Definir errores tipados o códigos estables, por ejemplo:

STATEMENT_NOT_FOUND
STATEMENT_STATUS_NOT_DELETABLE
STATEMENT_DELETE_CONFLICT
STATEMENT_VERSION_PROMOTION_FAILED

6.2. Promoción de versiones

Extraer o reutilizar una función común para seleccionar y promover versiones.

Responsabilidades de la función

recibir el historyKey;

excluir la versión eliminada;

buscar la versión histórica más reciente;

desactivar cualquier versión marcada erróneamente como activa;

actualizar la versión seleccionada;

asignar:

status = "accepted"
isActiveForPeriod = true
archivedAt = null

Orden de selección

La versión a promover debe elegirse mediante un criterio estable, por ejemplo:

fecha de aceptación;

fecha de creación;

número de versión;

identificador como último desempate.

La regla elegida debe quedar documentada y cubierta por pruebas.

6.3. Compras y compromisos manuales

Definir explícitamente qué sucede con datos manuales asociados al resumen.

Política recomendada

Cuando se elimina una versión activa y se promueve otra:

trasladar a la versión promovida las compras manuales que representen compromisos vigentes;

evitar duplicados;

conservar fechas, cuotas y referencias;

registrar qué elementos fueron trasladados.

Cuando se elimina una versión no activa:

eliminar únicamente los datos dependientes exclusivos de esa versión;

no modificar compras de la versión activa.

Cuando no existe una versión para promover:

eliminar las compras exclusivamente dependientes del resumen;

conservar solo aquellas que pertenezcan a una entidad independiente del resumen, si el modelo lo permite.

Esta política debe validarse contra el modelo actual antes de implementarla.

6.4. Eliminación en cascada

Verificar que la eliminación de un resumen también elimine o desacople correctamente:

secciones;

grupos;

filas;

consumos importados;

proyecciones de cuotas;

relaciones con deuda futura;

compras manuales dependientes;

metadatos derivados;

referencias del Centro de importaciones.

No asumir que todas las relaciones tienen onDelete: Cascade. Confirmar el esquema y agregar limpieza explícita dentro de la transacción cuando sea necesario.

6.5. Documento de origen

Después de eliminar una importación consolidada:

el documento no debe continuar marcado como procesado;

no debe quedar ligado a una entidad inexistente;

debe poder volver a importarse;

deben limpiarse hashes, referencias o bloqueos que impidan una nueva carga, según la política actual.

Si el documento es compartido por más de una entidad, no eliminarlo físicamente sin verificar sus referencias.

7. Centro de importaciones

Agregar una operación explícita para eliminar una importación desde el contexto del Centro de importaciones.

Endpoint sugerido

DELETE /api/import-center/card_statement/:entityId

El nombre final debe respetar las convenciones existentes del proyecto.

Resolución por tipo de entidad

El controlador debe:

localizar la entrada del Centro de importaciones;

determinar si representa un draft o un resumen consolidado;

delegar en el servicio correspondiente;

no duplicar reglas de negocio.

Delegación

Resumen consolidado:

cardsService.deleteStatement(...)

Draft:

servicio de descarte de drafts

Estado no eliminable:

respuesta 409 Conflict

Respuesta sugerida

{
  "deleted": true,
  "entityType": "card_statement",
  "deletedEntityId": "statement-id",
  "promotedEntityId": "previous-statement-id",
  "documentReleased": true
}

8. Capacidades expuestas por la API

El frontend no debería inferir si una importación puede eliminarse solamente a partir del estado.

Agregar información explícita en las respuestas de listado y detalle:

actions: {
  canDelete: boolean;
  deleteMode: "statement" | "draft" | null;
  disabledReason: string | null;
}

Ejemplos

Importación histórica eliminable

{
  "canDelete": true,
  "deleteMode": "statement",
  "disabledReason": null
}

Draft eliminable

{
  "canDelete": true,
  "deleteMode": "draft",
  "disabledReason": null
}

Importación en procesamiento

{
  "canDelete": false,
  "deleteMode": null,
  "disabledReason": "La importación todavía está en procesamiento."
}

9. Cambios en la interfaz

Acción de eliminación

Mostrar la acción Eliminar importación cuando:

actions.canDelete = true

No basar la visibilidad únicamente en el estado.

Confirmación

Antes de ejecutar la operación, mostrar:

entidad o banco;

período;

fecha de importación;

versión;

estado;

advertencia sobre la eliminación de datos derivados.

Cuando se elimina la versión activa y existe una versión anterior, informar que esa versión será reactivada.

Texto sugerido

Esta acción eliminará la importación y sus datos derivados, incluidas las
proyecciones asociadas. Si existe una versión anterior para el mismo período,
será reactivada automáticamente. Esta operación no se puede deshacer.

Después de eliminar

La interfaz debe:

cerrar el diálogo;

retirar el registro del listado;

invalidar la consulta del Centro de importaciones;

invalidar consultas de tarjetas;

invalidar consultas de deuda futura;

invalidar consultas del período afectado;

mostrar una notificación de éxito;

informar si otra versión fue promovida.

Mensajes de resultado

Sin promoción

La importación fue eliminada correctamente.

Con promoción

La importación fue eliminada y se reactivó la versión anterior del período.

Conflicto

La importación no puede eliminarse en su estado actual.

10. Consistencia de datos históricos

Antes de desplegar el cambio, ejecutar un diagnóstico sobre los datos existentes.

Validaciones

resúmenes sin historyKey;

más de una versión activa para el mismo historyKey;

resúmenes activos con estado distinto de accepted;

resúmenes superseded marcados como activos;

versiones sin documento de origen;

documentos ligados a entidades inexistentes;

proyecciones huérfanas;

compras manuales huérfanas;

registros del Centro de importaciones sin entidad válida;

estados históricos no contemplados.

Estrategia

Generar un reporte.

Clasificar inconsistencias.

Corregir automáticamente solo los casos determinísticos.

Revisar manualmente los casos ambiguos.

Evitar una migración destructiva general salvo necesidad comprobada.

11. Pruebas

11.1. Pruebas unitarias

Cubrir como mínimo:

Permite eliminar un resumen accepted.

Permite eliminar un resumen superseded.

Permite eliminar un resumen archived.

Rechaza estados no eliminables.

Rechaza un identificador inexistente.

No promueve otra versión al eliminar una versión inactiva.

Promueve la versión anterior al eliminar la activa.

No deja más de una versión activa.

Selecciona correctamente la versión más reciente.

Devuelve códigos de error estables.

Retorna el resultado estructurado esperado.

11.2. Pruebas de integración

Eliminar una versión superseded.

Verificar que la activa no cambie.

Eliminar la versión activa.

Verificar que se promueva la versión correcta.

Verificar que se eliminen entidades dependientes.

Verificar que la deuda futura se recalcule.

Verificar el tratamiento de compras manuales.

Verificar que el documento quede disponible para reimportación.

Verificar que el Centro de importaciones deje de listar el registro.

Verificar respuesta 409 para estados no eliminables.

Verificar rollback completo ante un error intermedio.

11.3. Pruebas de interfaz

La acción aparece para importaciones históricas eliminables.

La acción aparece con el modo correcto para drafts.

La acción se deshabilita durante procesamiento.

El diálogo muestra los datos correctos.

La confirmación ejecuta el endpoint apropiado.

El listado se actualiza sin recargar la página.

Las vistas de tarjetas y deuda futura se actualizan.

Se informa la promoción de una versión anterior.

Los errores del backend se muestran de forma comprensible.

La acción evita envíos duplicados.

12. Observabilidad

Agregar registros estructurados para la operación.

Datos recomendados

usuario que ejecutó la eliminación;

identificador del resumen;

identificador del documento;

historyKey;

estado previo;

indicador de versión activa;

versión promovida;

cantidad de dependencias eliminadas;

cantidad de compras trasladadas;

resultado;

error, si ocurrió.

Evitar registrar información sensible del contenido del resumen.

13. Seguridad y permisos

Confirmar que la eliminación:

requiere autenticación;

respeta el alcance del usuario o cuenta;

valida la propiedad de la importación;

no permite eliminar entidades de otra organización;

evita enumeración de identificadores;

utiliza la misma política de autorización que el resto del módulo.

Cuando el recurso no pertenece al usuario, responder según la convención existente del proyecto, preferentemente sin revelar su existencia.

14. Estrategia de implementación

Etapa 1: diagnóstico

Reproducir el error.

Identificar validación exacta.

Revisar estados y relaciones.

Confirmar política para compras manuales.

Etapa 2: dominio y backend

Ampliar estados eliminables.

Crear errores tipados.

Implementar transacción.

Incorporar promoción de versiones.

Asegurar limpieza de dependencias.

Liberar documento de origen.

Etapa 3: Centro de importaciones

Agregar endpoint.

Delegar al servicio correcto.

Exponer actions.

Normalizar respuestas y errores.

Etapa 4: frontend

Mostrar acción según capacidades.

Agregar confirmación.

Integrar endpoint.

Invalidar consultas relacionadas.

Mostrar resultados y errores.

Etapa 5: calidad

Agregar pruebas.

Ejecutar diagnóstico de datos.

Probar reimportación.

Validar rollback.

Revisar permisos y registros.

15. Criterios de aceptación

El cambio se considera terminado cuando:

Una importación superseded puede eliminarse.

Una importación archived puede eliminarse.

Una importación accepted puede eliminarse.

Al eliminar una versión no activa, la activa actual no cambia.

Al eliminar la versión activa, se promueve la versión histórica correcta.

Nunca quedan dos versiones activas para el mismo historyKey.

No quedan proyecciones ni entidades dependientes huérfanas.

La deuda futura deja de incluir datos de la importación eliminada.

Las compras manuales siguen la política definida.

El registro desaparece del Centro de importaciones.

El documento puede volver a importarse.

Los drafts siguen utilizando su flujo específico de descarte.

Los estados en procesamiento retornan 409.

La interfaz se actualiza sin una recarga completa.

La eliminación es atómica y hace rollback ante errores.

Las pruebas automatizadas pasan.

No se detectan regresiones en el flujo normal de importación.

16. Riesgos

Promoción incorrecta

Podría reactivarse una versión que no corresponde.

Mitigación: definir un orden estable, agregar pruebas y validar el historyKey.

Pérdida de compras manuales

Las compras manuales podrían eliminarse cuando deberían conservarse.

Mitigación: acordar la política antes de implementar y cubrirla con pruebas de integración.

Datos huérfanos

Algunas relaciones podrían no tener cascada configurada.

Mitigación: auditar el esquema y verificar las tablas después de eliminar.

Doble versión activa

Una falla parcial podría dejar más de una versión activa.

Mitigación: ejecutar eliminación y promoción en una única transacción.

Bloqueo de reimportación

El documento podría seguir marcado como procesado.

Mitigación: incluir la liberación del documento en la misma transacción y probar la reimportación.

17. Definición de terminado

La funcionalidad queda completada cuando una persona puede eliminar desde el Centro de importaciones cualquier importación histórica consolidada permitida, con limpieza integral de sus datos derivados, mantenimiento correcto del versionado, actualización inmediata de las vistas afectadas y posibilidad de volver a importar el archivo eliminado.