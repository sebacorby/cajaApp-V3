# APP-SEC-DEPS-001 — Análisis y remediación determinística

Fecha: 18 de julio de 2026.
Proyecto: CajaApp V3.
Ámbito: `workspace/frontend`.

## Baseline canónico

Los archivos recuperados desde la copia sincronizada de Drive coinciden byte a byte con Dropbox mediante Dropbox content hash.

- `package.json`
  - tamaño: 3387 bytes
  - SHA-256: `7A32F731CCBD0117D5B5598998C5237CE0230D8E708F49F1388AE5DE79E3EC6B`
  - Dropbox content hash: `aee174e4d17be59f7ea1551178538d289286637a2983011d6c4a2d10b89c68e9`
- `package-lock.json`
  - tamaño: 505576 bytes
  - SHA-256: `DB0ECE39A9A66B3FB10A4BD6644B2A4616D82AD42476BA9F513964EC6793E6ED`
  - Dropbox content hash: `9105f39998dae07ed35c39cd51ed763b4cf7a80b564363b6cf42b7cfd7adb00d`

## Audit actual

El backlog registraba nueve vulnerabilidades moderadas. El audit reproducido el 18 de julio de 2026 detectó diez, todas moderadas:

1. `@mdxeditor/editor` afectado por `js-yaml`.
2. `js-yaml` 4.1.1 — GHSA-h67p-54hq-rp68.
3. `next` afectado por su copia interna de `postcss`.
4. `postcss` 8.4.31 — GHSA-qx2v-qp2m-jg93.
5. `next-auth` afectado por `next` y `uuid`.
6. `next-intl` afectado por `next`.
7. `react-syntax-highlighter` afectado por `refractor`.
8. `refractor` afectado por `prismjs`.
9. `prismjs` 1.27.0 — GHSA-x7hr-w5r2-h6wg.
10. `uuid` 8.3.2 — GHSA-w5hq-g745-h8pq.

## Decisión técnica

No se ejecuta `npm audit fix --force` y no se aplican los downgrades o majors engañosos sugeridos por npm.

Se conserva el grafo funcional existente y se agregan overrides explícitos:

```json
{
  "postcss": "8.5.16",
  "js-yaml": "4.2.0",
  "uuid": "$uuid",
  "prismjs": "1.30.0"
}
```

El lockfile resultante:

- elimina `next/node_modules/postcss@8.4.31` y reutiliza `postcss@8.5.16`;
- elimina `next-auth/node_modules/uuid@8.3.2` y reutiliza `uuid@11.1.1`;
- elimina `refractor/node_modules/prismjs@1.27.0` y reutiliza `prismjs@1.30.0`;
- actualiza `js-yaml@4.1.1` a `4.2.0`;
- mantiene `next@16.2.10`;
- no cambia código fuente, APIs, React, Tailwind, Prisma ni datos.

## Resultado reproducido

`npm audit --json` sobre el candidato:

- info: 0
- low: 0
- moderate: 0
- high: 0
- critical: 0
- total: 0

Hashes candidatos vinculantes:

- `package.json`: `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`
- `package-lock.json`: `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`

## Materialización

El script `APPCAJA-V3-APP-SEC-DEPS-001-REMEDIATE-v1.0.0.mjs`:

- detiene la ejecución si los hashes iniciales no son los esperados;
- produce ambos archivos de forma determinística y atómica;
- valida los hashes candidatos antes de reemplazar;
- es idempotente si la remediación ya fue aplicada;
- no usa red ni ejecuta `npm audit fix`.
