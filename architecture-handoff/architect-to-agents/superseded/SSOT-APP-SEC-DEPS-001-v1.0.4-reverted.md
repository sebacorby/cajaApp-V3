# SSOT — APP-SEC-DEPS-001

Estado: v1.0.0 FAIL EBUSY; v1.0.1 FAIL por fixtures y comparación incompleta; v1.0.2 INVALIDADA; v1.0.3 INVALIDADA antes de ejecución; v1.0.4 ACTIVA.
Fecha: 18 de julio de 2026.
Repositorio canónico: Dropbox.
Root local canónico: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`.

## Objetivo

Cerrar la deuda de dependencias frontend con `npm audit` total 0 sin introducir regresiones respecto del baseline funcional aceptado.

## Historial vinculante

- v1.0.0: candidato correcto; `npm ci` bloqueado por EBUSY al ejecutarse dentro de Dropbox. Rollback exacto.
- v1.0.1: staging externo; npm ci, audit 0, npm ls, typecheck, lint, build y health PASS. Playwright 37 PASS / 5 FAIL; tres fallos fueron `ENOENT` de fixtures y dos quedaron sin comparación baseline/candidate. No hubo promoción.
- v1.0.2: INVALIDADA. Sus artefactos nombrados v1.0.2 todavía referenciaban internamente v1.0.1 y no implementaban dos stagings completos.
- v1.0.3: INVALIDADA antes de ejecución. Introducía wrappers nuevos para operaciones que deben realizarse con herramientas nativas, Playwright CLI y comandos directos. Todos sus artefactos fueron movidos a `superseded`.

## Bloque activo único: v1.0.4

Existe una sola instrucción activa:

`architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-SEC-DEPS-001-IMPLEMENTATION-AND-VALIDATION-v1.0.4.md`

No existen scripts, runners ni checklist separados activos para esta campaña.

## Regla de herramientas

La campaña v1.0.4 debe usar:

- PowerShell y herramientas nativas del sistema para archivos, procesos, hashes, puertos, promoción y cleanup;
- npm/npx directos;
- Playwright CLI directo;
- herramientas de edición para modificar exclusivamente los package files del candidate staging.

Está prohibido crear scripts o wrappers de staging, validación, Playwright, comparación, promoción, cleanup o movimiento de evidencia.

## Hashes autoritativos

Baseline:

- package.json `7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B`
- package-lock.json `DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED`

Candidate:

- package.json `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`
- package-lock.json `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`

Los package files canónicos permanecen en baseline hasta PASS y promoción controlada.

## Stagings externos

- `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.4\baseline\frontend`
- `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.4\candidate\frontend`

Ambos deben contener el mismo código, tests y configuración. Sólo candidate puede diferir en `package.json` y `package-lock.json`.

## Fixtures reales

Fuentes canónicas dentro de Dropbox:

- `docs/08-artifacts/visa-galicia-julio2026.pdf`
- `contracts/examples/salary-receipts/salary-receipt.sanitized.base.pdf`

Cualquier ausencia o `ENOENT` produce FAIL.

## Criterio de aceptación

Candidate debe cumplir:

- `npm audit` total 0;
- npm ci, typecheck, lint, build y health PASS;
- versiones seguras y ausencia de copias vulnerables anidadas;
- cero fallos nuevos respecto del baseline;
- ningún test que pase en baseline puede fallar en candidate;
- fallos preexistentes permitidos únicamente si coinciden por nombre exacto;
- cero `ENOENT`, skips y retries;
- SQLite restaurada al hash inicial;
- procesos propios detenidos y puertos 11436/11437 libres;
- package files canónicos promovidos únicamente después de `GATES-PASS.json` válido.

## Evidencia esperada

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.4/`

El agente deja la evidencia en `pending-validation`. No modifica este SSOT ni mueve la evidencia. El arquitecto audita y la mueve físicamente a `accepted` o `rejected`.

## Dependencias posteriores

`APP-AI-UX-STABILITY-001` permanece bloqueado hasta la aceptación de APP-SEC-DEPS-001.

Después de Seguridad:

1. APP-AI-UX-STABILITY-001.
2. APP-FINAL-CLOSURE.

No abrir otro vertical mientras v1.0.4 permanezca activa.
