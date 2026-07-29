# APPCAJA-V3 — APP-REPORTS-VISUAL-PARITY-002
## Revalidación v1.0.1

Estado: ACTIVA / SÓLO VALIDACIÓN.
Fecha: 18 de julio de 2026.

Root local canónico:
`C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`

Entorno obligatorio: Windows x64 y Node.js exacto v24.18.0.

## Motivo

La campaña v1.0.0 fue invalidada porque se compararon Dropbox content hashes contra SHA-256 locales. No hubo cambio de código ni defecto productivo.

## Regla de integridad

La integridad local vinculante se valida exclusivamente con SHA-256 mediante `Get-FileHash -Algorithm SHA256`.

No comparar Dropbox content hash con SHA-256. El Dropbox content hash no forma parte del gate ejecutable del agente.

Cada archivo vigente también debe coincidir en tamaño y SHA-256 con su copia `implemented` en:
`architecture-handoff/architect-to-agents/superseded/APP-REPORTS-VISUAL-PARITY-002-inspection/`

## Autoridad

El agente sólo ejecuta y documenta validación. No modifica código, tests, dependencias, SQLite, configuración, documentación ni instrucciones. Cualquier fallo produce evidencia FAIL y detención inmediata.

## Playwright focal exacto

`npx playwright test tests/e2e/deuda-futura/reports.spec.ts tests/chart-parity.spec.ts tests/e2e/dashboard.spec.ts --project=chromium --workers=1 --retries=0`

No usar filtros adicionales, skips, retries ni actualización de snapshots.

Evidencia esperada:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-REPORTS-VISUAL-PARITY-002-evidence-v1.0.1/`

El checklist v1.0.1 es vinculante.