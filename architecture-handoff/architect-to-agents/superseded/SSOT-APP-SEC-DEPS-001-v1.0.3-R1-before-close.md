# SSOT — APP-SEC-DEPS-001

Estado: v1.0.3 FAIL por fixture path; v1.0.3-R1 ACTIVA.
Fecha: 19 de julio de 2026.
Repositorio canónico: Dropbox.
Root local canónico: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`.

## Objetivo
Cerrar la deuda de dependencias frontend con `npm audit` total 0 y sin introducir regresiones respecto del baseline funcional aceptado.

## Historial relevante
- v1.0.0: FAIL EBUSY al ejecutar instalación dentro de Dropbox; rollback exacto.
- v1.0.1: FAIL por fixtures y comparación incompleta.
- v1.0.2: INVALIDADA antes de ejecución por referencias internas obsoletas.
- v1.0.3: FAIL técnico. La remediación de dependencias fue correcta, pero el STAGE ubicó los fixtures fuera del root versionado de staging.

## Resultado auditado de v1.0.3
Confirmado:
- hashes baseline correctos;
- STAGE, npm ci, typecheck, lint, build y health PASS en ambas copias;
- candidate `npm audit` total 0;
- versiones seguras confirmadas;
- baseline 37/42 y candidate 37/42;
- `candidateNewFailures = 0`;
- `baselinePassedCandidateFailed = 0`;
- `fixtureEnoentCount = 3`;
- `comparisonPass = false`;
- promoción no ejecutada;
- canonical intacto;
- SQLite restaurado al hash inicial;
- puertos liberados.

Causa raíz:
- el STAGE v1.0.3 copió los PDFs en `%LOCALAPPDATA%\CajaApp\validation\docs` y `%LOCALAPPDATA%\CajaApp\validation\contracts`;
- los tests los buscan en `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.3\docs` y `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.3\contracts`.

La evidencia v1.0.3 fue rechazada físicamente en:
`architecture-handoff/agents-to-architect/rejected/APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.3-FAIL-FIXTURE-PATH/`

## Bloque activo: v1.0.3-R1
La identidad técnica del gate y del script de promoción continúa siendo `v1.0.3`. `R1` identifica la corrección mínima de path y la revalidación.

Artefactos activos:
- `architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-SEC-DEPS-001-REVALIDATION-v1.0.3-R1.md`
- `architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-SEC-DEPS-001-STAGE-v1.0.3-R1.ps1`
- `architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-SEC-DEPS-001-REMEDIATE-STAGING-v1.0.3.mjs`
- `architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-SEC-DEPS-001-PROMOTE-v1.0.3.ps1`

No existe un checklist separado activo. La instrucción R1 es el único documento operativo vigente.

## Hashes autoritativos
Baseline:
- package.json `7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B`
- package-lock.json `DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED`

Candidate:
- package.json `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`
- package-lock.json `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`

Los package files canónicos permanecen en baseline hasta PASS y promoción atómica.

## Fixtures obligatorios corregidos
Deben existir exactamente en:
- `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.3\docs\08-artifacts\visa-galicia-julio2026.pdf`
- `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.3\contracts\examples\salary-receipts\salary-receipt.sanitized.base.pdf`

Cada fixture debe tener tamaño mayor que cero y SHA-256 idéntico al canónico. Los paths legacy incorrectos deben quedar sin esos archivos.

## Criterio de aceptación R1
Candidate debe cumplir:
- `npm audit` total 0;
- versiones seguras y ausencia de copias vulnerables anidadas;
- npm ci, typecheck, lint, build y health PASS en baseline y candidate;
- ejecución completa y parseable de Playwright en ambas copias;
- `candidateNewFailures = 0`;
- `baselinePassedCandidateFailed = 0`;
- `fixtureEnoentCount = 0`;
- `playwrightSkipped = 0`;
- `playwrightRetries = 0`;
- ningún error de infraestructura;
- SQLite restaurada al hash inicial;
- puertos 11436/11437 libres.

Los fallos comunes idénticos entre baseline y candidate son deuda preexistente y no bloquean esta remediación si no son ENOENT, no impiden calcular los gates y no existe degradación del candidate.

En `GATES-PASS.json`, `baselinePlaywright` y `candidatePlaywright` significan ejecución completa, reporte parseable y comparación válida. `comparisonPass` puede ser true con fallos comunes idénticos siempre que todos los criterios anteriores sean satisfechos.

## Evidencia esperada
La revalidación debe entregar nuevamente en:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.3/`

## Dependencia posterior
`APP-AI-UX-STABILITY-001` permanece bloqueado hasta que:
- APP-SEC-DEPS-001 sea aceptado;
- los package files canónicos coincidan con los hashes candidate;
- la evidencia PASS sea movida físicamente a accepted.
