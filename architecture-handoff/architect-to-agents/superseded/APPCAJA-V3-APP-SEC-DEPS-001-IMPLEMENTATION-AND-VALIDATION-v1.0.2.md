# APP-SEC-DEPS-001 — IMPLEMENTACIÓN Y VALIDACIÓN v1.0.2

Estado: ACTIVA.
Root canónico: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`
Entorno: Windows x64, Node `v24.18.0`.

## Objetivo
Validar el mismo candidato de dependencias de v1.0.1 sin confundir fallos preexistentes de Playwright con regresiones del lockfile.

## Archivos de producto autorizados
Únicamente:
- `workspace/frontend/package.json`
- `workspace/frontend/package-lock.json`

No modificar código, tests, backend, configuración, `.env`, Prisma ni SQLite.

## Baseline y candidato
Baseline SHA-256:
- package.json `7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B`
- package-lock.json `DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED`

Candidato SHA-256:
- package.json `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`
- package-lock.json `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`

## Staging
Usar `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.2` con dos copias independientes:
- `baseline\frontend`
- `candidate\frontend`

Crear ambas desde el frontend canónico excluyendo `node_modules`, `.next`, `test-results`, `prototype`, `download` y logs. Aplicar `APPCAJA-V3-APP-SEC-DEPS-001-REMEDIATE-STAGING-v1.0.2.mjs` sólo a candidate.

## Fixtures obligatorios
Verificar antes de ejecutar tests:
- `%LOCALAPPDATA%\CajaApp\validation\docs\08-artifacts\visa-galicia-julio2026.pdf`
- `%LOCALAPPDATA%\CajaApp\validation\contracts\examples\salary-receipts\salary-receipt.sanitized.base.pdf`

Registrar existencia, tamaño y SHA-256 en `fixtures-manifest.json`. Si falta alguno: FAIL, sin ejecutar suite ni promover.

## Gates comunes
En baseline y candidate ejecutar de forma independiente:
- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- backend canónico HTTP 200 en 11436
- frontend del staging HTTP 200 en 11437
- todos los `tests/**/*.spec.ts`, excepto `ai-advisor.spec.ts`, con Chromium, `--workers=1 --retries=0`

En candidate además:
- `npm audit --json`: total 0
- `npm ls next postcss js-yaml uuid prismjs`
- confirmar ausencia de postcss 8.4.31, uuid 8.3.2 y prismjs 1.27.0 anidados.

## Comparación vinculante
Generar `BASELINE-RESULT.json`, `CANDIDATE-RESULT.json` y `COMPARISON.json` con passed, failed, skipped, retries y nombres exactos de tests fallidos.

Promoción permitida sólo si:
- candidate audit = 0;
- candidate typecheck/lint/build/health PASS;
- candidate no introduce ningún fallo nuevo respecto de baseline;
- ningún test que pase en baseline falla en candidate;
- no hay ENOENT de fixtures;
- cero skips y retries;
- SQLite vuelve a su hash inicial y puertos quedan libres.

Si baseline tiene fallos preexistentes idénticos en candidate, documentarlos como deuda separada y no imputarlos al cambio de dependencias. Aun así, la promoción requiere que la comparación sea exacta y que no exista degradación.

## Promoción
Crear `GATES-PASS.json` sólo cuando todos los requisitos anteriores estén cumplidos. Luego ejecutar `APPCAJA-V3-APP-SEC-DEPS-001-PROMOTE-v1.0.2.ps1` y verificar los dos hashes candidatos en el canónico.

Ante cualquier fallo: no promover; restaurar SQLite; liberar procesos y puertos; emitir FAIL.

## Evidencia
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.2/`

Incluir preflight, fixtures, audit, npm ls, gates baseline/candidate, comparación, health, Playwright, cleanup, hashes y `00-verdict.md`.