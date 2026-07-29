# APP-SEC-DEPS-001 v1.0.1 — CHECKLIST

## Preflight
- [ ] Root canónico exacto.
- [ ] Node v24.18.0 y npm 10.9.2.
- [ ] Puertos 11436/11437 libres.
- [ ] Hashes baseline de package.json y lockfile.
- [ ] Backup y SHA-256 inicial de SQLite.

## Staging fuera de Dropbox
- [ ] Ejecutar `APPCAJA-V3-APP-SEC-DEPS-001-STAGE-v1.0.1.ps1`.
- [ ] Staging: `%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.1\frontend`.
- [ ] Canónico permanece intacto.
- [ ] Hash candidato package.json: `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`.
- [ ] Hash candidato lockfile: `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`.

## Dependencias
- [ ] `npm ci` exit 0 y sin EBUSY.
- [ ] `npm audit --json`: total 0.
- [ ] `npm ls` focal sin invalid/extraneous.
- [ ] next 16.2.10.
- [ ] postcss 8.5.16.
- [ ] js-yaml 4.2.0.
- [ ] uuid seguro.
- [ ] prismjs 1.30.0.

## Gates
- [ ] Typecheck PASS.
- [ ] Lint PASS; warnings preexistentes no crecen.
- [ ] Build PASS.
- [ ] Backend HTTP 200 en 11436.
- [ ] Frontend staging HTTP 200 en 11437.
- [ ] Playwright: todos los `*.spec.ts` excepto `ai-advisor.spec.ts`.
- [ ] Cero failed, skipped, retries y strict-mode violations.
- [ ] Artefactos completos.

## Cleanup previo
- [ ] PIDs detenidos.
- [ ] Puertos libres.
- [ ] SQLite restaurada al SHA-256 inicial.
- [ ] `GATES-PASS.json` completo con conteos reales.

## Promoción
- [ ] Ejecutar `APPCAJA-V3-APP-SEC-DEPS-001-PROMOTE-v1.0.1.ps1`.
- [ ] Copias pre-promoción en evidencia.
- [ ] Sólo package.json y package-lock.json cambiaron.
- [ ] Hashes canónicos finales iguales al candidato.
- [ ] No ejecutar `npm ci` dentro de Dropbox.

## Veredicto
- [ ] Evidencia en `pending-validation/APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.1/`.
- [ ] `00-verdict.md` con PASS o FAIL técnico.
- [ ] Si falla antes de promoción, canónico intacto.
- [ ] Si falla promoción, rollback automático verificado.
