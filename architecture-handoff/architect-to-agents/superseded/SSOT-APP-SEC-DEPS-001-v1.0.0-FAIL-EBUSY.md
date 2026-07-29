# SSOT — APP-SEC-DEPS-001

Estado: IMPLEMENTACIÓN + VALIDACIÓN v1.0.0 EMITIDA / MATERIALIZACIÓN LOCAL PENDIENTE.
Fecha: 18 de julio de 2026.

APP-UX-STATE-CONSISTENCY-001 permanece CERRADO / PASS.

## Alcance

Campaña exclusiva de dependencias frontend. Los únicos archivos de producto autorizados son:

- `workspace/frontend/package.json`
- `workspace/frontend/package-lock.json`

No se autorizan cambios en código fuente, tests, backend, configuración, `.env`, Prisma ni SQLite.

## Diagnóstico actualizado

El backlog registraba nueve vulnerabilidades moderadas. El audit reproducido contra los archivos canónicos detectó diez moderadas, agrupadas en cuatro cadenas:

- `@mdxeditor/editor -> js-yaml`;
- `next -> postcss`, con efectos sobre `next-auth` y `next-intl`;
- `react-syntax-highlighter -> refractor -> prismjs`;
- `next-auth -> uuid`.

## Remediación autorizada

El candidato agrega overrides explícitos:

- `postcss 8.5.16`;
- `js-yaml 4.2.0`;
- `uuid` alineado con la dependencia directa `uuid@11.1.1`;
- `prismjs 1.30.0`.

El lockfile elimina sólo tres copias transitivas vulnerables y actualiza `js-yaml`. Se conserva `next@16.2.10`; no se ejecuta `npm audit fix`, no hay downgrade y no se introduce ningún major funcional.

El audit reproducido sobre el candidato devuelve cero vulnerabilidades.

## Integridad vinculante

Baseline:

- package.json: `7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B`;
- package-lock.json: `DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED`.

Candidato:

- package.json: `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`;
- package-lock.json: `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`.

## Gobernanza

Los originales permanecen intactos en el workspace hasta que el agente local ejecute el materializador atómico. Esta decisión evita dejar `package.json` y lockfile desincronizados: el conector de Dropbox puede escribir texto, pero no ejecutar npm ni aplicar el lockfile generado desde el entorno local.

Instrucciones activas en `issued`:

- `APPCAJA-V3-APP-SEC-DEPS-001-REMEDIATE-v1.0.0.mjs`;
- `APPCAJA-V3-APP-SEC-DEPS-001-IMPLEMENTATION-AND-VALIDATION-v1.0.0.md`;
- `APPCAJA-V3-APP-SEC-DEPS-001-IMPLEMENTATION-AND-VALIDATION-v1.0.0-CHECKLIST.md`.

Backups y análisis:

`architecture-handoff/architect-to-agents/superseded/APP-SEC-DEPS-001-inspection/`

Evidencia esperada:

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-SEC-DEPS-001-evidence-v1.0.0/`

`APP-AI-UX-STABILITY-001` permanece bloqueado hasta el veredicto arquitectónico de esta campaña.
