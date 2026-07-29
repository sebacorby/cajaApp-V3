# SSOT — APP-HEALTH-COMPACT-001

Estado: IMPLEMENTADO / VALIDACIÓN v1.0.0 PENDIENTE.
Fecha: 18 de julio de 2026.

APP-REPORTS-VISUAL-PARITY-002 permanece CERRADO / PASS.

## Alcance implementado

El Sidebar desktop/mobile incorpora un indicador compacto de Salud financiera que:
- consume la evaluación real de `GET /api/financial-health`;
- comparte una única consulta entre Sidebar desktop y mobile;
- refleja score, banda, confianza, período y fórmula para ARS y USD;
- no recalcula puntajes, bandas ni confianza en frontend;
- muestra textos explícitos además de colores;
- presenta `Sin datos suficientes` cuando corresponde;
- navega al módulo Salud para consultar fórmula y evidencia;
- mantiene AlertCenter y SidebarDataQuality como funciones independientes;
- actualiza la evaluación cuando cambia el período global.

## Archivos modificados

- `workspace/frontend/src/components/finance/financial-health/financial-health-compact-provider.tsx`
- `workspace/frontend/src/components/finance/layout/app-shell.tsx`
- `workspace/frontend/src/components/finance/layout/sidebar.tsx`
- `workspace/frontend/tests/financial-health-compact.spec.ts`

No cambió backend, fórmula financiera, `financial-health-api.ts`, módulo Salud completo, Dashboard, Header, navegación, dependencias, Prisma ni SQLite.

Originales y copias implementadas:
`architecture-handoff/architect-to-agents/superseded/APP-HEALTH-COMPACT-001-inspection/`

Únicas instrucciones activas:
- `APPCAJA-V3-APP-HEALTH-COMPACT-001-VALIDATION-v1.0.0.md`
- `APPCAJA-V3-APP-HEALTH-COMPACT-001-VALIDATION-v1.0.0-CHECKLIST.md`

Evidencia esperada:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-HEALTH-COMPACT-001-evidence-v1.0.0/`

El siguiente vertical permanece bloqueado hasta el veredicto arquitectónico.
