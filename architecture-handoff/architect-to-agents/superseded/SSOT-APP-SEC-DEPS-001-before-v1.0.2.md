# SSOT — APP-SEC-DEPS-001

Estado: v1.0.0 RECHAZADA / FAIL AMBIENTAL; v1.0.1 ACTIVA.
Fecha: 18 de julio de 2026.

APP-UX-STATE-CONSISTENCY-001 permanece CERRADO / PASS.
APP-AI-UX-STABILITY-001 permanece bloqueado.

## Resultado v1.0.0

La remediación candidata fue materializada correctamente y produjo los hashes esperados, pero `npm ci` dentro del workspace sincronizado falló cinco veces con `EBUSY` sobre directorios diferentes.

La causa se clasifica como bloqueo ambiental de filesystem Windows, compatible con Dropbox, antivirus o watchers; no como defecto de un paquete concreto ni del materializador.

La política FAIL fue correcta:

- no se utilizó `npm audit fix`, `--force` ni otra versión;
- gates posteriores quedaron bloqueados;
- package.json y package-lock.json volvieron a sus hashes baseline;
- SQLite volvió a su SHA-256 inicial;
- no quedaron procesos, puertos ni temporales residuales.

Evidencia rechazada:

`architecture-handoff/agents-to-architect/rejected/APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.0-FAIL-EBUSY/`

Incluye `ARCHITECT-REJECTION.md`.

## Estrategia v1.0.1

Toda instalación y validación frontend se ejecutará fuera de Dropbox en:

`%LOCALAPPDATA%\CajaApp\validation\APP-SEC-DEPS-001-v1.0.1\frontend`

Flujo obligatorio:

1. verificar hashes baseline del canónico;
2. copiar el frontend a staging excluyendo `node_modules`, `.next`, test-results, prototipo y logs;
3. aplicar en staging el mismo candidato v1.0.0;
4. ejecutar `npm ci`, audit, npm ls, typecheck, lint y build fuera de Dropbox;
5. levantar backend canónico y frontend staging;
6. ejecutar todos los Playwright determinísticos, excluyendo únicamente `ai-advisor.spec.ts`;
7. detener procesos, liberar puertos y restaurar SQLite;
8. crear `GATES-PASS.json` con conteos reales;
9. promover atómicamente al canónico únicamente package.json y package-lock.json;
10. verificar hashes finales exactos.

## Integridad

Baseline canónico:

- package.json: `7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B`;
- package-lock.json: `DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED`.

Candidato:

- package.json: `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`;
- package-lock.json: `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`.

Hasta recibir PASS v1.0.1, los archivos canónicos permanecen en baseline.

## Artefactos activos

En `architecture-handoff/architect-to-agents/issued/`:

- `APPCAJA-V3-APP-SEC-DEPS-001-REMEDIATE-STAGING-v1.0.1.mjs`;
- `APPCAJA-V3-APP-SEC-DEPS-001-STAGE-v1.0.1.ps1`;
- `APPCAJA-V3-APP-SEC-DEPS-001-PROMOTE-v1.0.1.ps1`;
- `APPCAJA-V3-APP-SEC-DEPS-001-IMPLEMENTATION-AND-VALIDATION-v1.0.1.md`;
- `APPCAJA-V3-APP-SEC-DEPS-001-IMPLEMENTATION-AND-VALIDATION-v1.0.1-CHECKLIST.md`.

La campaña v1.0.0 y los SSOT previos están archivados en `superseded`.

## Evidencia esperada

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.1/`

El vertical no puede cerrarse ni habilitar APP-AI-UX-STABILITY-001 hasta auditar un PASS completo de v1.0.1.
