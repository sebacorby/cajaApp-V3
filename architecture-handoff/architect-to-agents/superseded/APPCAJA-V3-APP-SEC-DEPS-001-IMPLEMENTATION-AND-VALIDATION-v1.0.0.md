# APP-SEC-DEPS-001 — IMPLEMENTACIÓN Y VALIDACIÓN v1.0.0

Estado: ACTIVA.
Proyecto: CajaApp V3.
Root canónico Dropbox local: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`.
Entorno obligatorio: Windows x64 y Node.js exacto `v24.18.0`.

## Objetivo único

Materializar de forma atómica la remediación de dependencias frontend y demostrar que el audit queda en cero sin introducir regresiones.

El backlog registraba nueve vulnerabilidades moderadas. El audit actualizado detectó diez moderadas. La solución autorizada no usa `npm audit fix`, no baja Next y no aplica majors funcionales.

## Alcance permitido

Únicos archivos de producto modificables:

- `workspace/frontend/package.json`
- `workspace/frontend/package-lock.json`

Puede crear evidencia únicamente en:

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.0/`

Está prohibido modificar código fuente, tests, backend, `.env`, Prisma, SQLite, scripts de arranque, configuración de Next, Tailwind o Playwright.

## Preflight bloqueante

1. Confirmar root exacto y Node `v24.18.0`.
2. Confirmar puertos 11436 y 11437 libres.
3. Respaldar `workspace/backend/prisma/dev.db` y registrar SHA-256.
4. Registrar SHA-256 inicial:
   - `package.json`: `7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B`
   - `package-lock.json`: `DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED`
5. Crear copias locales temporales de ambos archivos para rollback.
6. Si cualquier hash difiere, detener sin modificar y emitir FAIL.

## Materialización autorizada

Desde el root ejecutar exactamente:

```powershell
node architecture-handoff\architect-to-agents\issued\APPCAJA-V3-APP-SEC-DEPS-001-REMEDIATE-v1.0.0.mjs workspace\frontend
```

El script debe finalizar con código 0 y producir:

- `package.json`: `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`
- `package-lock.json`: `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`

No editar manualmente los archivos y no ejecutar `npm audit fix`.

## Gates obligatorios

En `workspace/frontend`:

```powershell
npm ci
npm audit --json
npm ls next postcss js-yaml uuid prismjs next-auth next-intl @mdxeditor/editor react-syntax-highlighter
npm run typecheck
npm run lint
npm run build
```

Criterios del árbol:

- audit total: 0;
- `next@16.2.10`;
- `postcss@8.5.16`, sin copia `next/node_modules/postcss@8.4.31`;
- `js-yaml@4.2.0`;
- `uuid@11.1.1`, sin copia `next-auth/node_modules/uuid@8.3.2`;
- `prismjs@1.30.0`, sin copia `refractor/node_modules/prismjs@1.27.0`.

Levantar backend y frontend reales en 11436 y 11437 y verificar HTTP 200.

Ejecutar regresión determinística completa, excluyendo únicamente el test remoto conocido de `APP-AI-UX-STABILITY-001`:

```powershell
npx playwright test --project=chromium --workers=1 --retries=0 --grep-invert "Asesor IA mantiene fingerprint"
```

Cero skips, retries y strict-mode violations. La exclusión debe aparecer explícita en evidencia y no puede ampliarse.

## Integridad y cleanup

- No debe existir cambio fuera de los dos archivos autorizados.
- Restaurar SQLite al backup inicial y comprobar el mismo SHA-256.
- Liberar procesos y puertos.
- No dejar `.tmp`, `node_modules`, `.next` ni logs nuevos dentro del inventario de producto como cambios persistentes.

## Política de fallo

Ante cualquier fallo de materialización, hash, audit, npm ci, typecheck, lint, build, health, Playwright o cleanup:

1. restaurar `package.json` y `package-lock.json` desde los backups locales;
2. comprobar los hashes iniciales;
3. dejar evidencia completa;
4. emitir `FINAL VERDICT: FAIL`;
5. no intentar otra versión ni aplicar `--force`.

## Evidencia requerida

Incluir como mínimo:

- `00-verdict.md`;
- preflight y versiones;
- hashes antes/después;
- salida del materializador;
- `npm ci`;
- audit JSON antes y después;
- `npm ls` focal;
- typecheck, lint y build;
- health;
- Playwright y artefactos;
- inventario de cambios;
- SQLite y cleanup.
