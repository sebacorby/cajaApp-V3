# APP-SEC-DEPS-001 v1.0.0 — CHECKLIST

## Preflight
- [ ] Root canónico y Node v24.18.0.
- [ ] Sólo pueden cambiar `workspace/frontend/package.json` y `package-lock.json`.
- [ ] SQLite respaldada; puertos 11436/11437 libres.
- [ ] SHA inicial package.json: `7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B`.
- [ ] SHA inicial lock: `DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED`.

## Materialización
- [ ] Ejecutado el script v1.0.0 con salida 0.
- [ ] SHA final package.json: `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`.
- [ ] SHA final lock: `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`.
- [ ] No quedaron temporales.

## Dependencias
- [ ] `npm ci` PASS.
- [ ] `npm audit --json`: total 0.
- [ ] Next 16.2.10; PostCSS 8.5.16; js-yaml 4.2.0; uuid 11.1.1; PrismJS 1.30.0.
- [ ] No existen las copias vulnerables internas registradas en la instrucción.
- [ ] No se usó `npm audit fix` ni `--force`.

## Regresión
- [ ] Typecheck, lint y build PASS.
- [ ] Backend/frontend HTTP 200.
- [ ] Playwright determinístico completo PASS con un worker y cero retries.
- [ ] Única exclusión: prueba remota de fingerprint del Asesor IA.
- [ ] Cero skips y strict-mode violations.

## Cierre
- [ ] Ningún otro archivo de producto cambió.
- [ ] SQLite restaurada con el hash inicial.
- [ ] Puertos y procesos liberados.
- [ ] Evidencia y `00-verdict.md` en `pending-validation/APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.0/`.

Si falla cualquier gate, restaurar ambos archivos a sus hashes iniciales y emitir FAIL.
