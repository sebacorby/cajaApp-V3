# APP-SEC-DEPS-001 — REVALIDACIÓN v1.0.3-R1

Estado: ACTIVA.
Vertical único activo: `APP-SEC-DEPS-001`.
Root canónico: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`
Entorno obligatorio: Windows x64, Node `I:\Tools\node-v24.18.0-win-x64\node.exe` (`v24.18.0`).

## Motivo
La ejecución v1.0.3 terminó en FAIL técnico aunque la remediación de dependencias fue correcta:
- candidate `npm audit`: 0 vulnerabilidades;
- versiones seguras confirmadas;
- typecheck, lint, build y health PASS en baseline y candidate;
- `candidateNewFailures = 0`;
- `baselinePassedCandidateFailed = 0`;
- canonical y SQLite intactos.

La causa raíz fue exclusivamente la ubicación incorrecta de fixtures. El STAGE anterior los copió bajo `%LOCALAPPDATA%\CajaApp\validation\docs` y `%LOCALAPPDATA%\CajaApp\validation\contracts`, mientras los tests los resuelven desde el root versionado `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.3\...`.

## Alcance autorizado
No modificar código de producto, tests, backend, Prisma, SQLite, `.env`, configuración funcional ni fixtures canónicos.

Sólo pueden cambiar como producto, y únicamente después de PASS mediante el script de promoción:
- `workspace/frontend/package.json`
- `workspace/frontend/package-lock.json`

No abrir `APP-AI-UX-STABILITY-001` ni otro vertical.

## Artefactos obligatorios
Ejecutar esta campaña usando:
- `APPCAJA-V3-APP-SEC-DEPS-001-STAGE-v1.0.3-R1.ps1`
- `APPCAJA-V3-APP-SEC-DEPS-001-REMEDIATE-STAGING-v1.0.3.mjs`
- `APPCAJA-V3-APP-SEC-DEPS-001-PROMOTE-v1.0.3.ps1`

La identidad técnica del gate y de promoción permanece `version = v1.0.3`; `R1` identifica solamente esta remediación de fixture path.

## Hashes autoritativos
Baseline:
- package.json `7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B`
- package-lock.json `DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED`

Candidate:
- package.json `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`
- package-lock.json `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`

## Paso 1 — Preflight
1. Confirmar root exacto y Node exacto.
2. Confirmar que los package files canónicos siguen en hashes baseline.
3. Registrar SHA-256 inicial de SQLite y crear backup.
4. Confirmar que puertos 11436 y 11437 están libres antes de iniciar.
5. No ejecutar `npm install` en el canónico.

## Paso 2 — Staging corregido
Ejecutar `APPCAJA-V3-APP-SEC-DEPS-001-STAGE-v1.0.3-R1.ps1`.

Debe recrear fuera de Dropbox:
- `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.3\baseline\frontend`
- `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.3\candidate\frontend`

Los fixtures deben quedar exactamente en:
- `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.3\docs\08-artifacts\visa-galicia-julio2026.pdf`
- `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.3\contracts\examples\salary-receipts\salary-receipt.sanitized.base.pdf`

Verificar en `stage-manifest.json` y `fixtures-manifest.json`:
- targets exactos dentro de `$stagingRoot`;
- tamaños mayores que cero;
- SHA-256 idéntico al fixture canónico;
- ausencia de los dos archivos en los paths legacy incorrectos.

Cualquier desviación: FAIL inmediato, sin promoción.

## Paso 3 — Gates independientes
Ejecutar en baseline y candidate, sin reutilizar `node_modules`:
- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- frontend HTTP 200 en 11437
- Playwright completo de `tests/**/*.spec.ts`, excluyendo únicamente `ai-advisor.spec.ts`, Chromium, `--workers=1 --retries=0`

Usar backend real en 11436 y Ollama real. No mocks.

En candidate además:
- `npm audit --json`: total 0;
- `npm ls next postcss js-yaml uuid prismjs`;
- Next 16.2.10;
- PostCSS 8.5.16;
- js-yaml 4.2.0;
- uuid 11.1.1;
- PrismJS 1.30.0;
- ausencia de las copias vulnerables anidadas conocidas.

## Paso 4 — Regla de comparación vinculante
Crear nuevamente:
- `BASELINE-RESULT.json`
- `CANDIDATE-RESULT.json`
- `COMPARISON.json`

PASS de comparación requiere simultáneamente:
- `candidateNewFailures = 0`;
- `baselinePassedCandidateFailed = 0`;
- `fixtureEnoentCount = 0`;
- `playwrightSkipped = 0`;
- `playwrightRetries = 0`;
- ejecución completa y parseable de Playwright en baseline y candidate;
- ningún error de infraestructura, arranque o reporte.

Los fallos comunes idénticos entre baseline y candidate son deuda preexistente y no constituyen regresión de esta remediación. Pueden permanecer si:
- el conjunto y nombre exacto son idénticos en ambos;
- no son ENOENT de fixtures;
- no impiden calcular todos los campos anteriores;
- no existe degradación específica del candidate.

Para `GATES-PASS.json`, `baselinePlaywright` y `candidatePlaywright` significan que cada ejecución terminó, produjo reporte parseable y fue comparada correctamente; no significan necesariamente cero tests fallidos comunes.

`comparisonPass` debe ser `true` únicamente si se cumplen todas las condiciones anteriores.

## Paso 5 — GATES-PASS y promoción
Crear `GATES-PASS.json` sólo después de confirmar todos los gates. Debe usar:
- `vertical`: `APP-SEC-DEPS-001`
- `version`: `v1.0.3`

Después ejecutar:
`APPCAJA-V3-APP-SEC-DEPS-001-PROMOTE-v1.0.3.ps1`

La promoción debe:
- guardar package files pre-promoción en evidencia;
- promover únicamente package.json y package-lock.json;
- verificar hashes candidate exactos;
- hacer rollback automático ante cualquier error.

Tras promoción:
- volver a comprobar hashes canónicos candidate;
- comprobar `npm audit` total 0;
- registrar `promotion-result.json`.

## Paso 6 — Cleanup
- detener sólo procesos iniciados por esta campaña;
- dejar puertos 11436/11437 libres;
- restaurar SQLite al SHA-256 inicial exacto;
- limpiar staging temporal que no sea evidencia;
- no alterar fixtures canónicos.

## Evidencia
Entregar nuevamente en:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.3/`

La evidencia anterior ya fue rechazada y no debe reutilizarse.

Incluir como mínimo:
- preflight;
- stage y fixture manifests;
- npm ci de ambas copias;
- audit y npm ls candidate;
- typecheck/lint/build/health de ambas;
- Playwright y resultados parseados de ambas;
- comparación;
- GATES-PASS si corresponde;
- promoción o constancia explícita de no promoción;
- cleanup, puertos y SQLite;
- hashes finales;
- `00-verdict.md`.

Veredictos permitidos: PASS, FAIL o BLOCKED.

## Checklist final obligatorio
Reportar al final:
- `TOTAL_TASKS=16`
- `DONE=<n>`
- `PENDING=<n>`
- `BLOCKED=<n>`

Las 16 tareas son: preflight, hashes baseline, SQLite backup, STAGE R1, fixtures correctos, baseline npm ci, baseline static gates, baseline runtime/Playwright, candidate npm ci, audit 0, npm ls seguro, candidate static gates, candidate runtime/Playwright, comparación, promoción, cleanup/evidencia.
