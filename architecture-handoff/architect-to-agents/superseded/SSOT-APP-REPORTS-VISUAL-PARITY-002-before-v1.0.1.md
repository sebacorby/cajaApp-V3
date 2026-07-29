# SSOT — APP-REPORTS-VISUAL-PARITY-002

Estado: IMPLEMENTADO / VALIDACIÓN v1.0.0 PENDIENTE.
Fecha: 18 de julio de 2026.

APP-E2E-P5-ACCESSIBILITY-001 permanece CERRADO / PASS.

## Alcance implementado

Reportes ahora reutiliza contratos visuales comunes con Dashboard y ofrece:
- evolución mensual en barras o área;
- lista o donut de gastos por categoría;
- selector ARS/USD sin conversión ni suma entre monedas;
- tablas accesibles equivalentes al payload;
- drilldown a Movimientos;
- exportación CSV preservada;
- estados vacíos honestos.

Se modificaron exclusivamente cinco archivos frontend. No cambió backend, `reports-api.ts`, cálculos, Prisma, dependencias, navegación ni configuración.

Originales y copias implementadas:
`architecture-handoff/architect-to-agents/superseded/APP-REPORTS-VISUAL-PARITY-002-inspection/`

Únicas instrucciones activas:
- `APPCAJA-V3-APP-REPORTS-VISUAL-PARITY-002-VALIDATION-v1.0.0.md`
- `APPCAJA-V3-APP-REPORTS-VISUAL-PARITY-002-VALIDATION-v1.0.0-CHECKLIST.md`

Evidencia esperada:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-REPORTS-VISUAL-PARITY-002-evidence-v1.0.0/`

El siguiente vertical permanece bloqueado hasta el veredicto arquitectónico.