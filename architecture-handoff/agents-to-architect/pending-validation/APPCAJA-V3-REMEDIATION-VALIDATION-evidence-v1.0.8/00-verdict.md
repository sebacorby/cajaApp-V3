# 00-verdict.md

Veredicto final — APPCAJA-V3-REMEDIATION-VALIDATION-v1.0.8

Timestamp: 2026-07-15T01:56:00

## Veredicto

**FAIL**

## Justificación

La campaña v1.0.8 mejora respecto a v1.0.7 (de 13 fallos a 8 fallos en Playwright), pero no alcanza `PASS` porque fallaron gates obligatorios:

1. **Asesor IA (gate 11):** FAIL. El POST `/api/ai-advisor/ask` devolvió HTTP 422 (`AI_ADVISOR_UNKNOWN_SOURCE`). El proveedor fue alcanzado y respondió, pero el backend rechazó la respuesta porque la IA citó una fuente inexistente (`summary.currencies.ARS`). No se obtuvo HTTP 201.
2. **Playwright completo (gate 12):** FAIL. La suite ejecutó 25 tests, de los cuales 17 aprobaron y 8 fallaron. No se cumple el criterio de 0 failed.
3. **Responsive y accesibilidad (gate 13):** FAIL por dependencia del gate 12. Aunque `quality-audit` aprobó, otros tests de responsive/mobile fallaron.

## Gates aprobados

- Materialización Fase 8A (15 hashes coinciden) ✅
- Root operativo y separación de roots ✅
- Preflight de integridad ✅
- Backup y restauración de SQLite ✅
- Backend install, Prisma generate/deploy/status, build, tests (129 tests passed) ✅
- Frontend install, typecheck, lint, build ✅
- Headless start/stop ✅
- Smoke API corregido (12 endpoints) ✅
- AI provider config (GET context) ✅
- Cleanup e integridad final ✅

## Gates fallidos

- AI advisor POST (422 AI_ADVISOR_UNKNOWN_SOURCE) ❌
- Playwright completo (8/25 tests fallados) ❌
- Responsive y accesibilidad (dependencia de suite) ❌

## Estado de integridad

- SQLite restaurado: SÍ, hash final idéntico al inicial (`1ED5E387BD68AB1779D28803B2AA264A18A6FAAF6FFD35A6083AD4E72535A1D0`).
- Servicios detenidos: SÍ (cajaapp-headless-up.ps1 detuvo PIDs 36240 y 42624).
- Puertos 11436/11437: LIBRES.
- Artefactos generados eliminados: SÍ.
- Hashes de 15 archivos remediados: coinciden con el manifiesto.
- Lockfiles: sin cambios.

## Evidencia

`I:\cajaApp-V3-real\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-REMEDIATION-VALIDATION-evidence-v1.0.8`
