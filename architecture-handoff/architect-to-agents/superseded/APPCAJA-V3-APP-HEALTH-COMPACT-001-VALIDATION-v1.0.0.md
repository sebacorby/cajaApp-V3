# APPCAJA-V3 — APP-HEALTH-COMPACT-001
## Validación v1.0.0

Estado: ACTIVA / SÓLO VALIDACIÓN
Fecha: 18 de julio de 2026
Root: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`
Entorno: Windows x64 y Node.js v24.18.0 exacto.

## Objetivo
Validar el indicador compacto de Salud financiera del Sidebar desktop/mobile. Consume la evaluación determinística real y muestra score, banda, confianza, período y fórmula por moneda. Debe navegar al detalle, mostrar un estado explícito sin datos y conservar Alertas y Calidad del dato independientes.

## Archivos
- `workspace/frontend/src/components/finance/financial-health/financial-health-compact-provider.tsx`
- `workspace/frontend/src/components/finance/layout/app-shell.tsx`
- `workspace/frontend/src/components/finance/layout/sidebar.tsx`
- `workspace/frontend/tests/financial-health-compact.spec.ts`

No cambió backend, fórmula, API, Salud completa, Dashboard, Header, SidebarDataQuality, AlertCenter, navegación, dependencias, Prisma ni SQLite.

El agente sólo valida y documenta. No modifica archivos. La integridad se verifica exclusivamente con SHA-256 local; no usar Dropbox content hashes.

Playwright exacto:
`npx playwright test tests/financial-health-compact.spec.ts tests/financial-health.spec.ts tests/sidebar-data-quality.spec.ts tests/quality-audit.spec.ts --project=chromium --workers=1 --retries=0`

Evidencia:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-HEALTH-COMPACT-001-evidence-v1.0.0/`

El checklist v1.0.0 es vinculante.
