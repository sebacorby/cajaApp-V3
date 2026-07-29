# SSOT — APP-NAV-IA-001

Estado: IMPLEMENTADO / VALIDACIÓN v1.0.0 PENDIENTE.
Fecha: 18 de julio de 2026.

APP-HEALTH-COMPACT-001 permanece CERRADO / PASS.

## Alcance implementado

La navegación real de CajaApp queda organizada en cinco grupos siempre expandidos:
- Operación: Inicio, Movimientos, Ingresos, Tarjetas y Deuda futura.
- Ingesta y calidad: Importaciones y Conciliación.
- Planificación: Presupuestos y Objetivos.
- Análisis: Reportes, Salud financiera y Asesor IA.
- Sistema: Cierres, Respaldo y Configuración.

Las quince secciones conservan sus `SectionId`, destinos y acceso directo. `NAV_ITEMS` continúa disponible como lista plana derivada del orden de grupos para compatibilidad con consumidores existentes.

El Sidebar incorpora estructura semántica por grupo, nombres accesibles, `aria-current`, foco visible y los mismos controles en desktop y mobile. Salud compacta y Calidad del dato permanecen independientes.

## Archivos
- `workspace/frontend/src/lib/finance/nav.ts`
- `workspace/frontend/src/components/finance/layout/sidebar.tsx`
- `workspace/frontend/tests/navigation-information-architecture.spec.ts`

No cambió backend, `ui-store.ts`, Header, AppShell, rutas, módulos, dependencias, Prisma ni SQLite.

Backups y copias implementadas:
`architecture-handoff/architect-to-agents/superseded/APP-NAV-IA-001-inspection/`

Instrucciones activas:
- `APPCAJA-V3-APP-NAV-IA-001-VALIDATION-v1.0.0.md`
- `APPCAJA-V3-APP-NAV-IA-001-VALIDATION-v1.0.0-CHECKLIST.md`

Evidencia esperada:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-NAV-IA-001-evidence-v1.0.0/`

El siguiente vertical permanece bloqueado hasta el veredicto arquitectónico.
