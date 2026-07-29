# APP-SEC-DEPS-001 — IMPLEMENTACIÓN Y VALIDACIÓN v1.0.3

Estado: ACTIVA.
Root canónico: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`
Entorno obligatorio: Windows x64, Node `v24.18.0`.

## Motivo de esta versión
La campaña v1.0.2 queda invalidada antes de ejecución porque sus scripts `STAGE` y `PROMOTE` todavía referenciaban internamente rutas, evidencia, materializador y versión `v1.0.1`. La v1.0.3 corrige esas referencias y materializa dos copias independientes: baseline y candidate.

## Alcance autorizado
Únicamente pueden cambiar como producto, y sólo luego del PASS:
- `workspace/frontend/package.json`
- `workspace/frontend/package-lock.json`

No modificar código, tests, backend, Prisma, SQLite, `.env`, configuración ni fixtures canónicos.

## Baseline y candidato
Baseline SHA-256:
- package.json `7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B`
- package-lock.json `DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED`

Candidato SHA-256:
- package.json `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`
- package-lock.json `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`

## Preparación obligatoria
Ejecutar:
`APPCAJA-V3-APP-SEC-DEPS-001-STAGE-v1.0.3.ps1`

Debe crear fuera de Dropbox:
- `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.3\baseline\frontend`
- `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.3\candidate\frontend`

El script debe:
- comprobar hashes baseline en el canónico;
- copiar el mismo código, tests y configuración a ambas copias;
- aplicar la remediación sólo a candidate;
- materializar y registrar los dos fixtures desde Dropbox;
- producir `stage-manifest.json` y `fixtures-manifest.json`.

## Fixtures obligatorios
- `%LOCALAPPDATA%\CajaApp\validation\docs\08-artifacts\visa-galicia-julio2026.pdf`
- `%LOCALAPPDATA%\CajaApp\validation\contracts\examples\salary-receipts\salary-receipt.sanitized.base.pdf`

Si falta alguno, su tamaño es cero o no puede calcularse SHA-256: FAIL inmediato.

## Gates baseline y candidate
Ejecutar independientemente en ambas copias:
- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- frontend HTTP 200 en 11437
- todos los `tests/**/*.spec.ts`, excepto `ai-advisor.spec.ts`, Chromium, `--workers=1 --retries=0`

Usar backend canónico real en 11436. No mocks.

En candidate además:
- `npm audit --json`: total 0
- `npm ls next postcss js-yaml uuid prismjs`
- confirmar Next 16.2.10, PostCSS 8.5.16, js-yaml 4.2.0, uuid 11.1.1 y PrismJS 1.30.0
- confirmar ausencia de `next/node_modules/postcss@8.4.31`, `next-auth/node_modules/uuid@8.3.2` y `refractor/node_modules/prismjs@1.27.0`

## Comparación vinculante
Crear:
- `BASELINE-RESULT.json`
- `CANDIDATE-RESULT.json`
- `COMPARISON.json`

Cada resultado debe incluir passed, failed, skipped, retries y nombres exactos de tests fallidos.

La comparación debe calcular:
- `candidateNewFailures`
- `baselinePassedCandidateFailed`
- fallos comunes
- ENOENT de fixtures

La promoción sólo está permitida si:
- audit total 0;
- typecheck/lint/build/health PASS en ambos;
- candidate no introduce fallos nuevos;
- ningún test que pasa en baseline falla en candidate;
- cero ENOENT, skips y retries;
- SQLite vuelve al hash inicial;
- procesos y puertos 11436/11437 quedan libres.

Los fallos comunes baseline/candidate pueden documentarse como deuda preexistente, pero no habilitan promoción si impiden demostrar los campos requeridos o si existe degradación.

## GATES-PASS.json
Crear únicamente con todos los requisitos confirmados. Debe incluir exactamente:
- `vertical`: `APP-SEC-DEPS-001`
- `version`: `v1.0.3`
- `auditTotal`
- `candidateNewFailures`
- `baselinePassedCandidateFailed`
- `playwrightSkipped`
- `playwrightRetries`
- `fixtureEnoentCount`
- booleanos: `baselineNpmCi`, `candidateNpmCi`, `candidateNpmLs`, `baselineTypecheck`, `candidateTypecheck`, `baselineLint`, `candidateLint`, `baselineBuild`, `candidateBuild`, `backendHealth`, `baselineFrontendHealth`, `candidateFrontendHealth`, `baselinePlaywright`, `candidatePlaywright`, `comparisonPass`, `cleanup`, `sqliteRestored`.

## Promoción
Sólo después del PASS ejecutar:
`APPCAJA-V3-APP-SEC-DEPS-001-PROMOTE-v1.0.3.ps1`

El script debe conservar copias pre-promoción, promover atómicamente y verificar los dos hashes candidato. Ante cualquier error debe restaurar baseline.

## Evidencia
Entregar en:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.3/`

Incluir preflight, manifests, npm ci, audit, npm ls, typecheck, lint, build, health, Playwright de ambas copias, comparación, cleanup, hashes, SQLite, promoción y `00-verdict.md`.

Veredicto permitido: PASS, FAIL o BLOCKED.
No abrir `APP-AI-UX-STABILITY-001` hasta cerrar este bloque.
