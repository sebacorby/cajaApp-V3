# APPCAJA V3 — RECHAZO P5 v1.3.0

Estado: RECHAZADA — FAIL
Fecha: 17 de julio de 2026

## Bloqueantes

- El preflight encontró 3 de 5 baselines válidos y la campaña continuó.
- No se creó el backup previo obligatorio.
- `schema.prisma` fue corregido manualmente durante la materialización.
- El manifiesto no coincidió con `schema.prisma`, `nav.ts` y `backup-restore.service.ts`.
- Frontend lint terminó con un error.
- Playwright terminó 1 de 3 PASS.
- Los smokes funcionales y la restauración real quedaron incompletos.
- SQLite no volvió al hash inicial.
- La entrega contenía solamente `00-verdict.md`, sin evidencia auditable completa.

## Correcciones del arquitecto

- `backup-restore.spec.ts`: alertas acotadas a `backup-restore-section`.
- `month-close.spec.ts`: alertas acotadas a `month-close-section`.
- `nav.ts`: recreado como UTF-8 canónico, sin cambio funcional.
- La fuente v1.3.0 fue movida a `architect-to-agents/superseded`.

## SQLite

El baseline histórico anterior no tiene copia binaria recuperable. La v1.3.1 debe crear un backup binario nuevo antes del primer gate y restaurarlo exactamente al finalizar.

Próxima instrucción: `APPCAJA-V3-P5-FINAL-VERTICALS-REMEDIATION-AND-REVALIDATION-v1.3.1.md`.
