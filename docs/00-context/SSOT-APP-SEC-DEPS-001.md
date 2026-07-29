# SSOT — APP-SEC-DEPS-001

Estado: CERRADO / PASS.
Fecha de cierre: 19 de julio de 2026.
Campaña aceptada: `v1.0.3-R1`.
Repositorio canónico: Dropbox.

## Resultado técnico

- Candidate `npm audit`: 0 vulnerabilidades.
- Versiones seguras confirmadas.
- Baseline: 39/42.
- Candidate: 40/42.
- `candidateNewFailures = 0`.
- `baselinePassedCandidateFailed = 0`.
- `fixtureEnoentCount = 0`.
- `playwrightSkipped = 0`.
- `playwrightRetries = 0`.
- `comparisonPass = true`.
- Candidate corrigió `privacy-mode.spec.ts:55`.
- Promoción atómica: PASS.
- SQLite restaurada al hash inicial.
- Puertos 11436/11437 libres.

## Hashes canónicos promovidos

- `workspace/frontend/package.json`: `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`.
- `workspace/frontend/package-lock.json`: `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`.

## Deuda separada

Permanecen dos fallos comunes preexistentes de Recibos de sueldo, sin relación con la remediación de dependencias:

- `tests/salary-receipts.real.spec.ts:22:5`;
- `tests/salary-receipts.spec.ts:62:5`.

## Evidencia aceptada

`architecture-handoff/agents-to-architect/accepted/APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.3-R1-PASS/`

## Gobernanza

La instrucción, STAGE, materializador y PROMOTE de Seguridad están archivados en `architecture-handoff/architect-to-agents/superseded/`.

Siguiente vertical activo: `APP-AI-UX-STABILITY-001`.
