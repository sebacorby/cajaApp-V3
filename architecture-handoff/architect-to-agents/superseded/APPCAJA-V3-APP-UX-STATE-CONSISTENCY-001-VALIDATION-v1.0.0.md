# APP-UX-STATE-CONSISTENCY-001 — VALIDACIÓN v1.0.0

Estado: ACTIVA / SÓLO VALIDACIÓN.
Root local: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`
Entorno: Windows x64, Node `v24.18.0`.

Validar sin modificar código, pruebas, configuración, dependencias, lockfiles, Prisma ni SQLite.

La integridad se comprueba exclusivamente con SHA-256 local: los 12 archivos del checklist deben coincidir con sus copias `implemented` en `architecture-handoff/architect-to-agents/superseded/APP-UX-STATE-CONSISTENCY-001-inspection/`. Nunca comparar Dropbox content hash con SHA-256.

Gates:
- frontend: `npm ci`, typecheck, lint y build;
- backend/frontend reales HTTP 200 en 11436/11437;
- ejecutar exactamente:
`npx playwright test tests/state-consistency.spec.ts tests/month-close.spec.ts tests/backup-restore.spec.ts tests/import-center.spec.ts tests/reconciliation.spec.ts tests/quality-audit.spec.ts --project=chromium --workers=1 --retries=0`
- cero skips, retries y strict-mode violations;
- loading, empty, error, retry y success reproducibles por datos reales o fixtures de contrato;
- ningún control de estados demo;
- retry sólo mediante operación real;
- Cierres y Respaldo preservan mobile y accesibilidad;
- backup/restauración de SQLite y cleanup de puertos/procesos.

La prueba del Asesor valida error/retry UI mediante fixture controlada. No llamar al proveedor IA remoto ni aumentar timeouts; esa deuda corresponde a `APP-AI-UX-STABILITY-001`.

Evidencia:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-UX-STATE-CONSISTENCY-001-evidence-v1.0.0/`

Incluir preflight, inventario, SHA-256, logs, JSON Playwright, screenshots, traces, videos, health, SQLite, cleanup y `00-verdict.md`.
