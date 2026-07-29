# SSOT — APP-REPORTS-VISUAL-PARITY-002

Estado: IMPLEMENTADO / REVALIDACIÓN v1.0.1 PENDIENTE.
Fecha: 18 de julio de 2026.

APP-E2E-P5-ACCESSIBILITY-001 permanece CERRADO / PASS.

## Estado del vertical

La implementación de Reportes permanece sin cambios. La campaña v1.0.0 fue invalidada por comparar Dropbox content hash contra SHA-256 local. No se confirmó defecto de código ni modificación no autorizada.

La revalidación v1.0.1 usa exclusivamente SHA-256 local como gate vinculante y compara cada archivo vigente contra su copia `implemented`.

## Alcance implementado

- evolución mensual en barras o área;
- lista o donut de gastos por categoría;
- selector ARS/USD sin conversión ni suma entre monedas;
- tablas accesibles equivalentes al payload;
- drilldown a Movimientos;
- exportación CSV preservada;
- estados vacíos honestos;
- compatibilidad preservada con gráficos de Dashboard.

No cambió backend, `reports-api.ts`, cálculos, Prisma, dependencias, navegación ni configuración.

Únicas instrucciones activas:
- `APPCAJA-V3-APP-REPORTS-VISUAL-PARITY-002-REVALIDATION-v1.0.1.md`
- `APPCAJA-V3-APP-REPORTS-VISUAL-PARITY-002-REVALIDATION-v1.0.1-CHECKLIST.md`

Evidencia esperada:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-REPORTS-VISUAL-PARITY-002-evidence-v1.0.1/`

El siguiente vertical permanece bloqueado hasta el veredicto arquitectónico.