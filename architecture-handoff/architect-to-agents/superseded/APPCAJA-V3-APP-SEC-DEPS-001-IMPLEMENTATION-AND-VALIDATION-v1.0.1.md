# APP-SEC-DEPS-001 — IMPLEMENTACIÓN Y VALIDACIÓN v1.0.1

Estado: ACTIVA.
Fecha: 18 de julio de 2026.
Root canónico: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`
Node obligatorio: `I:\Tools\node-v24.18.0-win-x64\node.exe` v24.18.0.

## Motivo de v1.0.1

La v1.0.0 terminó FAIL ambiental. El materializador produjo los hashes candidatos correctos, pero `npm ci` dentro de Dropbox falló cinco veces con `EBUSY` sobre rutas diferentes. El rollback fue completo.

Esta campaña evita instalar `node_modules` dentro de la carpeta sincronizada. Todo `npm ci`, audit, build, servidores frontend y Playwright se ejecuta desde:

`%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.1\frontend`

El workspace canónico sólo recibe `package.json` y `package-lock.json` después de todos los gates en PASS.

## Alcance autorizado

Únicos archivos de producto modificables al final:

- `workspace/frontend/package.json`
- `workspace/frontend/package-lock.json`

No modificar código fuente, tests, backend, `.env`, configuraciones, Prisma ni SQLite.
No usar `npm audit fix`, `--force`, otra versión ni otra estrategia de dependencias.

## Integridad vinculante

Baseline canónico:

- package.json: `7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B`
- package-lock.json: `DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED`

Candidato validable:

- package.json: `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`
- package-lock.json: `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`

## Evidencia

Crear:

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.1/`

Guardar preflight, hashes, logs completos, audit JSON, npm ls, typecheck, lint, build, health, Playwright, capturas/traces/videos, promoción, cleanup, SQLite y `00-verdict.md`.

## Fase 1 — Preflight

1. Verificar root y Node exactos.
2. Verificar que 11436 y 11437 estén libres.
3. Calcular hashes canónicos y exigir el baseline.
4. Copiar `workspace/backend/prisma/dev.db` a evidencia y registrar SHA-256 inicial.
5. Confirmar que no se modificó código ni tests.

## Fase 2 — Preparar staging fuera de Dropbox

Desde PowerShell:

```powershell
$root = 'C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3'
& "$root\architecture-handoff\architect-to-agents\issued\APPCAJA-V3-APP-SEC-DEPS-001-STAGE-v1.0.1.ps1" -Root $root |
  Tee-Object "$root\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.1\01-stage-output.txt"
```

El script debe terminar con exit 0, dejar el canónico intacto y crear `stage-manifest.json` fuera de Dropbox.

## Fase 3 — Dependencias y audit en staging

```powershell
$stage = Join-Path $env:LOCALAPPDATA 'CajaApp\validation\APP-SEC-DEPS-001-v1.0.1\frontend'
Set-Location $stage
& 'I:\Tools\node-v24.18.0-win-x64\npm.cmd' ci
& 'I:\Tools\node-v24.18.0-win-x64\npm.cmd' audit --json | Set-Content '<EVIDENCIA>\02-audit-after.json' -Encoding utf8
& 'I:\Tools\node-v24.18.0-win-x64\npm.cmd' ls next postcss js-yaml uuid prismjs next-auth next-intl @mdxeditor/editor react-syntax-highlighter --all | Tee-Object '<EVIDENCIA>\03-npm-ls.txt'
```

Gates:

- `npm ci` exit 0, sin EBUSY.
- audit: info/low/moderate/high/critical/total = 0.
- Next resuelto continúa en 16.2.10.
- postcss 8.5.16, js-yaml 4.2.0, uuid seguro y prismjs 1.30.0.
- no copias vulnerables anidadas.

## Fase 4 — Gates frontend en staging

Ejecutar y guardar logs separados:

```powershell
npm run typecheck
npm run lint
npm run build
```

Todos deben finalizar con exit 0. Los warnings preexistentes deben documentarse y no crecer.

## Fase 5 — Runtime real

Backend desde el workspace canónico, sin instalar ni modificar dependencias:

```powershell
Set-Location "$root\workspace\backend"
npm run build
$env:PORT='11436'
npm run start
```

Frontend desde staging ya construido:

```powershell
Set-Location $stage
$env:PORT='11437'
$env:HOSTNAME='127.0.0.1'
npm run start
```

Verificar HTTP 200 en backend y frontend. Registrar PIDs y logs.

## Fase 6 — Playwright determinístico completo

Desde staging, enumerar todos los `tests/*.spec.ts` excepto `ai-advisor.spec.ts`, cuya estabilidad pertenece a `APP-AI-UX-STABILITY-001`:

```powershell
$env:CAJAAPP_API_BASE_URL='http://127.0.0.1:11436'
$env:CAJAAPP_FRONTEND_BASE_URL='http://127.0.0.1:11437'
$tests = Get-ChildItem "$stage\tests" -Filter '*.spec.ts' |
  Where-Object { $_.Name -ne 'ai-advisor.spec.ts' } |
  Sort-Object Name |
  ForEach-Object { $_.FullName }
npx playwright test $tests --project=chromium --workers=1 --retries=0
```

Criterios:

- todos los tests seleccionados PASS;
- cero failed, skipped y retries;
- cero strict-mode violations;
- capturas, videos y traces presentes;
- ningún timeout aumentado.

## Fase 7 — Cleanup previo a promoción

1. Detener frontend y backend por PID.
2. Confirmar 11436 y 11437 libres.
3. Restaurar SQLite desde el backup y comprobar SHA-256 inicial.
4. Crear en evidencia `GATES-PASS.json` sólo si todos los gates anteriores pasaron.

Formato obligatorio:

```json
{
  "vertical": "APP-SEC-DEPS-001",
  "version": "v1.0.1",
  "auditTotal": 0,
  "npmCi": true,
  "npmLs": true,
  "typecheck": true,
  "lint": true,
  "build": true,
  "backendHealth": true,
  "frontendHealth": true,
  "playwright": true,
  "playwrightPassed": 0,
  "playwrightFailed": 0,
  "playwrightSkipped": 0,
  "playwrightRetries": 0,
  "cleanup": true,
  "sqliteRestored": true
}
```

Reemplazar `playwrightPassed` con el total real.

## Fase 8 — Promoción atómica

Sólo después del manifiesto PASS:

```powershell
& "$root\architecture-handoff\architect-to-agents\issued\APPCAJA-V3-APP-SEC-DEPS-001-PROMOTE-v1.0.1.ps1" -Root $root -Evidence '<EVIDENCIA>' |
  Tee-Object '<EVIDENCIA>\promotion-output.txt'
```

La promoción debe:

- volver a verificar baseline canónico;
- verificar hashes candidatos en staging;
- preservar copias pre-promoción;
- escribir únicamente package.json y package-lock.json;
- comprobar hashes finales exactos;
- restaurar ambos archivos automáticamente ante cualquier error.

Después de promover, ejecutar en el canónico sólo comprobaciones sin instalación:

```powershell
Get-FileHash workspace/frontend/package.json -Algorithm SHA256
Get-FileHash workspace/frontend/package-lock.json -Algorithm SHA256
```

No ejecutar `npm ci` dentro de Dropbox.

## Política de FAIL

Ante cualquier fallo antes de promoción:

- no tocar el canónico;
- restaurar SQLite;
- liberar procesos/puertos;
- conservar staging y logs para auditoría;
- emitir FAIL.

Ante fallo durante promoción, el script restaura ambos archivos al baseline. Verificarlo y emitir FAIL.

No intentar otra solución ni habilitar `APP-AI-UX-STABILITY-001`.
