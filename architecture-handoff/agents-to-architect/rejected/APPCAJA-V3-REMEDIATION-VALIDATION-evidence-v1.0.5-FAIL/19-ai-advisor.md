# Asesor IA

Status: **NOT RUN**

Razón: El arranque headless falló (`cajaapp-headless-up.ps1 -Rebuild` retornó `ok:false`) debido a errores de build/typecheck en el frontend. Sin entorno levantado, no es posible ejecutar una consulta real del Asesor IA.

Validaciones planificadas (no ejecutadas):
- Ejecutar consulta real del Asesor IA.
- Comprobar HTTP 201, request ID real, contexto advisor-context-v1.0.0, fórmula fh-v1.0.0.
- Verificar claims con sourceIds existentes, citas materializadas, historial creado y eliminado.
- Confirmar que no se enviaron documentos originales ni se modificaron registros financieros.
