# SSOT — APP-SEC-DEPS-001

Estado: v1.0.1 RECHAZADA / FAIL DE INFRAESTRUCTURA DE PRUEBAS; v1.0.2 ACTIVA.
Fecha: 18 de julio de 2026.

## Historial
- v1.0.0: candidato correcto, npm ci bloqueado por EBUSY dentro de Dropbox; rollback exacto.
- v1.0.1: staging externo resolvió EBUSY; npm ci, audit 0, npm ls, typecheck, lint, build y health pasaron. Playwright terminó 37 PASS / 5 FAIL; tres fallos fueron ENOENT por fixtures ausentes y dos requieren comparación contra baseline. No hubo promoción.

Evidencias rechazadas:
- `agents-to-architect/rejected/APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.0-FAIL-EBUSY/`
- `agents-to-architect/rejected/APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.1-FAIL-FIXTURES/`

## v1.0.2
Se conserva el mismo candidato. Se ejecutan dos stagings fuera de Dropbox: baseline y candidate, con idéntico código, tests, configuración y fixtures. Sólo difieren los package files.

Fixtures obligatorios:
- `%LOCALAPPDATA%\CajaApp\validation\docs\08-artifacts\visa-galicia-julio2026.pdf`
- `%LOCALAPPDATA%\CajaApp\validation\contracts\examples\salary-receipts\salary-receipt.sanitized.base.pdf`

Promoción permitida sólo si candidate obtiene audit 0, gates técnicos PASS, cero fallos nuevos respecto de baseline, ningún test pasa en baseline y falla en candidate, cero ENOENT, skips y retries, cleanup completo y SQLite restaurada.

## Hashes
Baseline:
- package.json `7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B`
- package-lock.json `DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED`

Candidato:
- package.json `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`
- package-lock.json `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`

Los archivos canónicos permanecen en baseline hasta PASS.

## Activos
`issued` contiene los cinco artefactos v1.0.2: remediador, staging, promoción, instrucción y checklist.

Evidencia esperada:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.2/`

`APP-AI-UX-STABILITY-001` permanece bloqueado.