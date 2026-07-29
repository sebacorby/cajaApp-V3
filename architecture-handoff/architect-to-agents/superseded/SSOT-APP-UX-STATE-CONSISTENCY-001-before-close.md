# SSOT — APP-UX-STATE-CONSISTENCY-001

Estado: IMPLEMENTADO / VALIDACIÓN v1.0.0 PENDIENTE.
Fecha: 18 de julio de 2026.

APP-NAV-IA-001 permanece CERRADO / PASS.

## Implementación

CajaApp incorpora un contrato compartido `real-v1` para estados de interfaz en Cierres, Respaldo, Importaciones, Conciliación y Asesor IA.

El patrón aporta:
- boundary reutilizable con scope accesible por módulo;
- fallback de carga basado en Suspense;
- fallback de error de render con reintento real por remount;
- roles y live regions para error, carga y éxito;
- foco visible y respeto de reduced motion;
- mensajes específicos conservados dentro de cada vertical;
- ausencia total de controles para forzar estados demo.

Las implementaciones funcionales previas se preservan exactamente como archivos `.legacy.tsx`. Los nombres canónicos contienen wrappers mínimos que aplican el patrón compartido. Esto evita reescribir cálculos, APIs, confirmaciones, tablas o flujos mobile ya aceptados.

## Archivos vivos del vertical

- `workspace/frontend/src/components/finance/states/async-state.tsx`
- cinco wrappers canónicos de sección;
- cinco implementaciones `.legacy.tsx` preservadas;
- `workspace/frontend/tests/state-consistency.spec.ts`

Total: 12 archivos.

`section-router.tsx` fue restaurado exactamente a su contenido previo. No cambiaron backend, APIs, dependencias, lockfiles, `.env`, Prisma ni SQLite.

Backups y copias implementadas:
`architecture-handoff/architect-to-agents/superseded/APP-UX-STATE-CONSISTENCY-001-inspection/`

Instrucciones activas:
- `APPCAJA-V3-APP-UX-STATE-CONSISTENCY-001-VALIDATION-v1.0.0.md`
- `APPCAJA-V3-APP-UX-STATE-CONSISTENCY-001-VALIDATION-v1.0.0-CHECKLIST.md`

Evidencia esperada:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-UX-STATE-CONSISTENCY-001-evidence-v1.0.0/`

Las campañas técnicas `APP-SEC-DEPS-001` y `APP-AI-UX-STABILITY-001` permanecen bloqueadas hasta el veredicto arquitectónico.
