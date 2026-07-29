# APPCAJA-V3 — APP-SEC-DEPS-001 — IMPLEMENTACIÓN Y VALIDACIÓN v1.0.4

Estado: ISSUED / AUTORIZADA.
Fecha: 18 de julio de 2026.
Bloque activo único: `APP-SEC-DEPS-001`.
Repositorio canónico: Dropbox.
Root local canónico obligatorio:
`C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`
Entorno obligatorio: Windows x64 + Node.js exacto `v24.18.0`.

## 1. Objetivo

Validar y promover una actualización controlada de las dependencias frontend que deje `npm audit` en cero sin introducir regresiones respecto del baseline funcional aceptado.

La campaña compara dos copias externas a Dropbox:

- baseline: código canónico y package files actuales;
- candidate: el mismo código, tests y configuración, cambiando únicamente `package.json` y `package-lock.json`.

`APP-AI-UX-STABILITY-001` permanece bloqueado. No abrir otro vertical.

## 2. Regla de herramientas — BLOQUEANTE

No crear ni ejecutar scripts, wrappers o runners propios para staging, Playwright, comparación, promoción, cleanup o movimiento de evidencia.

Está prohibido usar:

- los artefactos `v1.0.2` o `v1.0.3`;
- scripts `STAGE`, `PROMOTE` o `REMEDIATE` de campañas anteriores;
- runners JavaScript/PowerShell nuevos;
- wrappers que oculten stdout, stderr o exit code;
- `npm install` o `npm audit fix`;
- mocks, `page.route`, skips o retries.

Usar exclusivamente:

- PowerShell y herramientas nativas del sistema para archivos, procesos, hashes y puertos;
- `npm`, `npx` y Playwright CLI directos;
- las herramientas de edición disponibles para modificar solamente los dos package files del candidate staging.

## 3. Archivos productivos autorizados

Los únicos archivos del workspace canónico que pueden cambiar, y únicamente después del PASS integral, son:

- `workspace/frontend/package.json`
- `workspace/frontend/package-lock.json`

No modificar código, tests, backend, `.env`, Prisma, migraciones, configuración ni SQLite.

## 4. Hashes autoritativos

Baseline canónico obligatorio:

- `package.json`: `7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B`
- `package-lock.json`: `DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED`

Candidate esperado:

- `package.json`: `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`
- `package-lock.json`: `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`

Si los hashes canónicos iniciales no coinciden, emitir `BLOCKED` y detenerse sin modificar nada.

## 5. Preflight

Registrar en `00-preflight.txt`:

- root actual;
- versión y ruta de Node;
- versión y ruta de npm/npx;
- estado inicial de puertos 11436 y 11437;
- hashes iniciales de ambos package files;
- hash inicial de `workspace/backend/prisma/dev.db`;
- ausencia de procesos propios de una campaña anterior.

El Node autorizado es:
`I:\Tools\node-v24.18.0-win-x64\node.exe`

Usar los ejecutables `npm.cmd` y `npx.cmd` ubicados junto a ese Node.

Crear una copia binaria inicial de SQLite dentro de la evidencia antes de ejecutar cualquier gate.

## 6. Staging externo

Usar exactamente:

- `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.4\baseline\frontend`
- `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.4\candidate\frontend`

Eliminar cualquier staging anterior `v1.0.4` con PowerShell nativo.

Copiar `workspace/frontend` a ambas ubicaciones con `robocopy` o `Copy-Item`, excluyendo:

- `node_modules`
- `.next`
- `test-results`
- `playwright-report`
- `prototype`
- `download`
- `.git`
- logs
- `test-result*.json`
- `tsconfig.tsbuildinfo`

Verificar que todos los archivos fuera de `package.json` y `package-lock.json` tengan el mismo inventario y SHA-256 entre baseline y candidate. Registrar la comparación en `01-staging-integrity.json`.

## 7. Fixtures reales obligatorios

Fuentes canónicas en Dropbox:

- `docs/08-artifacts/visa-galicia-julio2026.pdf`
- `contracts/examples/salary-receipts/salary-receipt.sanitized.base.pdf`

Materializarlos mediante copia nativa en:

- `%LOCALAPPDATA%\CajaApp\validation\docs\08-artifacts\visa-galicia-julio2026.pdf`
- `%LOCALAPPDATA%\CajaApp\validation\contracts\examples\salary-receipts\salary-receipt.sanitized.base.pdf`

Registrar origen, destino, tamaño y SHA-256 en `02-fixtures-manifest.json`.

No modificar los PDFs originales. Los tests que necesiten evitar deduplicación deben crear una copia byte-distinta por ejecución y eliminarla en `finally`.

Si falta un fixture o aparece `ENOENT`, el veredicto es `FAIL`.

## 8. Materialización del candidate

Modificar únicamente los dos package files dentro del candidate staging usando la herramienta de edición disponible; no guardar un script de remediación.

### package.json

Agregar en la raíz:

```json
"overrides": {
  "postcss": "8.5.16",
  "js-yaml": "4.2.0",
  "uuid": "$uuid",
  "prismjs": "1.30.0"
}
```

No cambiar ninguna otra clave.

### package-lock.json

Aplicar exactamente estas operaciones:

1. Eliminar `packages["node_modules/next/node_modules/postcss"]`.
2. Eliminar `packages["node_modules/next-auth/node_modules/uuid"]`.
3. Eliminar `packages["node_modules/refractor/node_modules/prismjs"]`.
4. Reemplazar `packages["node_modules/js-yaml"]` por:

```json
{
  "version": "4.2.0",
  "resolved": "https://registry.npmjs.org/js-yaml/-/js-yaml-4.2.0.tgz",
  "integrity": "sha512-ePWsvanv0DWuDRsW8dnt+R4jQ31SCRCQ7hhNcPXZPsoBZiemuZNYGf7adZdqX2D86j6rvKp3RpCxVTSb8WQlOw==",
  "license": "MIT",
  "funding": [
    { "type": "github", "url": "https://github.com/sponsors/puzrin" },
    { "type": "github", "url": "https://github.com/sponsors/nodeca" }
  ],
  "dependencies": { "argparse": "^2.0.1" },
  "bin": { "js-yaml": "bin/js-yaml.js" }
}
```

Guardar ambos JSON con indentación de dos espacios y salto LF final.

Verificar inmediatamente los dos hashes candidate. Si no coinciden exactamente con los hashes autoritativos, emitir `FAIL` y no continuar.

## 9. Gates técnicos baseline y candidate

Ejecutar cada campaña de forma independiente. Limpiar `node_modules`, `.next`, `test-results` y `playwright-report` antes de cada una.

En baseline y candidate ejecutar, capturando comando, stdout, stderr, duración y exit code:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build`

En candidate además ejecutar:

- `npm audit --json`
- `npm ls next postcss js-yaml uuid prismjs`

Requisitos del candidate:

- total de vulnerabilidades: 0;
- Next resuelto `16.2.10`;
- PostCSS `8.5.16`;
- js-yaml `4.2.0`;
- uuid `11.1.1`;
- PrismJS `1.30.0`;
- ausencia de PostCSS `8.4.31`, uuid `8.3.2` y PrismJS `1.27.0` anidados.

## 10. Runtime y Playwright

Usar procesos reales iniciados directamente con `Start-Process`; no usar scripts de arranque.

Backend:

- directorio: `workspace/backend` canónico;
- puerto: 11436;
- ejecutar el backend real con Node exacto;
- exigir HTTP 200 en `/health`.

Frontend:

- iniciar primero el build baseline en 11437;
- ejecutar su campaña Playwright;
- detenerlo y verificar puerto libre;
- iniciar luego el build candidate en 11437;
- ejecutar su campaña Playwright;
- detenerlo y verificar puerto libre.

Ejecutar Playwright CLI directo con Chromium, `--workers=1`, `--retries=0` y reporter JSON.

Incluir todos los archivos `tests/**/*.spec.ts` excepto `ai-advisor.spec.ts`. No aplicar otros filtros.

Guardar:

- `BASELINE-RESULT.json`
- `CANDIDATE-RESULT.json`
- logs de runtime;
- JSON completo de Playwright de ambas campañas.

Cada resultado debe incluir:

- passed;
- failed;
- skipped;
- retries;
- nombres exactos de tests fallidos;
- detección de `ENOENT`;
- exit code.

## 11. Comparación vinculante

Crear `COMPARISON.json` usando PowerShell nativo y los JSON de reporter, sin guardar un runner adicional.

La comparación debe demostrar:

- candidate no introduce ningún test fallido nuevo;
- ningún test que pasa en baseline falla en candidate;
- el conjunto de fallos candidate es subconjunto del conjunto de fallos baseline;
- cero `ENOENT`;
- cero skips;
- cero retries.

Se permiten fallos preexistentes únicamente cuando aparecen con el mismo nombre exacto en baseline y candidate. Deben registrarse como deuda separada y no imputarse al cambio de dependencias.

## 12. Promoción

Crear `GATES-PASS.json` únicamente cuando todos los requisitos anteriores sean verdaderos.

Debe incluir al menos:

- vertical: `APP-SEC-DEPS-001`;
- version: `v1.0.4`;
- auditTotal: 0;
- gates baseline y candidate;
- resultados Playwright;
- noNewFailures: true;
- noBaselinePassBecameCandidateFail: true;
- fixturesPresent: true;
- enoent: 0;
- skipped: 0;
- retries: 0;
- cleanup: true;
- sqliteRestored: true.

Sólo después:

1. Copiar los package files canónicos a la evidencia como `package.json.pre-promotion` y `package-lock.json.pre-promotion`.
2. Copiar los dos package files validados del candidate al workspace canónico usando archivos temporales y `Move-Item` nativo.
3. Verificar los hashes candidate en el workspace canónico.
4. Ante cualquier error, restaurar inmediatamente las copias pre-promoción.
5. Registrar `promotion-result.json`.

No promocionar si el veredicto es `FAIL` o `BLOCKED`.

## 13. Cleanup obligatorio

En `finally`:

- detener exclusivamente los PIDs iniciados por la campaña;
- liberar puertos 11436 y 11437;
- restaurar `dev.db` desde la copia binaria inicial;
- verificar que el SHA-256 final de SQLite coincida con el inicial;
- eliminar `node_modules`, `.next`, `test-results` y `playwright-report` de ambos stagings;
- conservar los logs y JSON en la evidencia;
- no tocar datos ni procesos ajenos.

## 14. Evidencia

Crear una única carpeta:

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.4/`

Contenido mínimo:

- `00-preflight.txt`
- `01-staging-integrity.json`
- `02-fixtures-manifest.json`
- hashes baseline/candidate
- logs npm baseline/candidate
- audit y npm ls candidate
- health backend/frontend
- Playwright JSON baseline/candidate
- `BASELINE-RESULT.json`
- `CANDIDATE-RESULT.json`
- `COMPARISON.json`
- `GATES-PASS.json` sólo si corresponde
- archivos pre-promoción y `promotion-result.json` sólo si corresponde
- cleanup y hashes finales
- `task-checklist-review.md`
- `00-verdict.md`

`task-checklist-review.md` debe informar:

- `TOTAL_TASKS`
- `DONE`
- `PENDING`
- `BLOCKED`

Repasar toda esta instrucción antes de declarar el resultado.

## 15. Veredicto

Únicos veredictos válidos:

- `PASS`
- `FAIL`
- `BLOCKED`

No existe `PARTIAL PASS`.

El agente no mueve la evidencia a `accepted` ni `rejected` y no modifica el SSOT. El arquitecto auditará el resultado y realizará el movimiento físico.
