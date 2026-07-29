# 00-verdict.md

Veredicto final — APPCAJA-V3-REMEDIATION-VALIDATION v1.0.6

Fecha/hora: 2026-07-14T19:54:00
Raíz: `I:\cajaApp-V3-real`

## Resumen de gates

| Gate | Resultado | Detalle |
|------|-------------|---------|
| Fase 6A — recuperación canónica | FAIL | Los dos archivos se copiaron con BOM retirado, pero sus hashes no coinciden con los esperados del documento. |
| Preflight de integridad | FAIL | Hash mismatch Fase 6A; archivos con sufijos activos; artefactos de build no limpios. |
| SQLite backup inicial | PASS | Backup creado y hash verificado. |
| Entorno y script stop inicial | PASS | Node v24.18.0 disponible; script `cajaapp-headless-up.ps1 -Stop` devolvió `ok: true`. Se usó `I:\Tools\node-v24.18.0-win-x64\npm.cmd` para evitar npm global ligado a v22.14.0. |
| Backend install | PASS | `npm ci` exitoso. |
| Prisma generate | PASS | Exitoso. |
| Prisma migrate deploy | PASS | Exitoso. |
| Prisma migrate status | PASS | Exitoso. |
| Backend build | PASS | Exitoso. |
| Backend tests | PASS | 25 files, 128 tests passed. |
| Frontend install | PASS | `npm ci` exitoso. |
| Frontend typecheck | PASS | Exitoso. |
| Frontend lint | PASS | Exitoso. |
| Frontend build | PASS | Exitoso. |
| Headless start | PASS | Backend PID 49876 y frontend PID 34292 levantados; health endpoints OK. |
| Smoke API | FAIL parcial | 11 de 12 endpoints documentados respondieron 200; `/api/future` devolvió 404 (ruta real: `/api/future-commitments`). Búsqueda global con estructura correcta. |
| Proveedor IA | PASS config / BLOCKED ejecución | Configuración correcta (ollama, modelo, AI_MOCK_MODE=false, prompt/schema v1.0.0). Modelo no disponible localmente. |
| Asesor IA consulta real | BLOCKED | No se pudo ejecutar consulta real HTTP 201 por modelo Ollama ausente. |
| Playwright | FAIL | Interrumpida por timeout a 15 min; 4 fallas confirmadas en tests iniciales. |
| Responsive y accesibilidad | NOT RUN | Bloqueado por falla/interrupción de Playwright. |
| Cleanup e integridad final | PASS | Servicios detenidos, SQLite restaurado con hash exacto, UAT removido, artefactos limpiados. |

## Veredicto global

**FAIL**

Razones principales:
1. Los hashes de los dos archivos canónicos de Fase 6A no coinciden con los esperados del documento.
2. El entorno `npm` global está ligado a Node v22.14.0 en lugar de v24.18.0 (se mitigó con ruta explícita).
3. El preflight reporta archivos con sufijos activos y build artifacts no limpios.
4. Smoke API: discrepancia de ruta `/api/future` vs `/api/future-commitments`.
5. Dependencia externa Ollama bloquea el gate de Asesor IA y contribuye a la falla de `ai-advisor.spec.ts` en Playwright.
6. Playwright no completó y presentó fallas iniciales.
7. Responsive y accesibilidad no pudieron verificarse.

SQLite restaurado: SÍ — hash exacto `1ED5E387BD68AB1779D28803B2AA264A18A6FAAF6FFD35A6083AD4E72535A1D0`.
Servicios detenidos: SÍ — puertos 11436 y 11437 libres; cero procesos Node de CajaApp; Docker/WSL vivos en puerto 3000.
