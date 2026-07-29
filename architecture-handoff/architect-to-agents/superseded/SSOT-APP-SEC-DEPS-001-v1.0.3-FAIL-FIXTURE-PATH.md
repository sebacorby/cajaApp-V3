# SSOT — APP-SEC-DEPS-001

Estado: v1.0.0 FAIL EBUSY; v1.0.1 FAIL por fixtures y comparación incompleta; v1.0.2 INVALIDADA antes de ejecución; v1.0.3 ACTIVA.
Fecha: 18 de julio de 2026.
Repositorio canónico: Dropbox.
Root local canónico: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`.

## Objetivo
Cerrar la deuda de dependencias frontend con `npm audit` total 0 sin introducir regresiones respecto del baseline funcional aceptado.

## Historial
- v1.0.0: candidato correcto; `npm ci` bloqueado por EBUSY al ejecutarse dentro de Dropbox; rollback exacto.
- v1.0.1: staging externo; npm ci, audit 0, npm ls, typecheck, lint, build y health PASS. Playwright 37 PASS / 5 FAIL; tres fallos fueron ENOENT de fixtures y dos quedaron sin comparación baseline/candidate. No hubo promoción.
- v1.0.2: INVALIDADA. Los scripts publicados como v1.0.2 todavía referenciaban internamente staging, evidencia, materializador y versión v1.0.1, y además sólo creaban una copia candidate. Fueron movidos a `superseded` sin ejecutar ni promover.

## Bloque activo: v1.0.3
La campaña activa crea dos stagings independientes fuera de Dropbox:
- `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.3\baseline\frontend`
- `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.3\candidate\frontend`

Ambas copias deben contener idéntico código, tests y configuración. Sólo candidate recibe la remediación de `package.json` y `package-lock.json`.

## Hashes autoritativos
Baseline:
- package.json `7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B`
- package-lock.json `DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED`

Candidato:
- package.json `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`
- package-lock.json `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`

Los archivos canónicos permanecen en baseline hasta PASS y promoción atómica.

## Fixtures obligatorios
El script de staging debe materializarlos desde Dropbox en:
- `%LOCALAPPDATA%\CajaApp\validation\docs\08-artifacts\visa-galicia-julio2026.pdf`
- `%LOCALAPPDATA%\CajaApp\validation\contracts\examples\salary-receipts\salary-receipt.sanitized.base.pdf`

Debe registrar tamaño y SHA-256. Cualquier ausencia o ENOENT produce FAIL.

## Criterio de aceptación
Candidate debe cumplir:
- `npm audit` total 0;
- npm ci, typecheck, lint, build y health PASS;
- versiones seguras y ausencia de copias vulnerables anidadas;
- cero fallos nuevos frente a baseline;
- ningún test que pase en baseline puede fallar en candidate;
- cero ENOENT, skips y retries;
- SQLite restaurada al hash inicial;
- procesos y puertos 11436/11437 libres.

La promoción se realiza únicamente mediante `APPCAJA-V3-APP-SEC-DEPS-001-PROMOTE-v1.0.3.ps1` y requiere `GATES-PASS.json` v1.0.3.

## Artefactos activos en issued
- `APPCAJA-V3-APP-SEC-DEPS-001-REMEDIATE-STAGING-v1.0.3.mjs`
- `APPCAJA-V3-APP-SEC-DEPS-001-STAGE-v1.0.3.ps1`
- `APPCAJA-V3-APP-SEC-DEPS-001-PROMOTE-v1.0.3.ps1`
- `APPCAJA-V3-APP-SEC-DEPS-001-IMPLEMENTATION-AND-VALIDATION-v1.0.3.md`
- `APPCAJA-V3-APP-SEC-DEPS-001-IMPLEMENTATION-AND-VALIDATION-v1.0.3-CHECKLIST.md`

## Evidencia esperada
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.3/`

## Dependencia posterior
`APP-AI-UX-STABILITY-001` permanece bloqueado hasta que APP-SEC-DEPS-001 sea aceptado y los package files canónicos coincidan con los hashes candidato.
