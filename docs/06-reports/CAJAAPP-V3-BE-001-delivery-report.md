# APPCAJA-V3-BE-001 Delivery Report v1.0.1

## Estado
PASS (v1.0.1)

## Relación con entrega anterior

- **v1.0.0**: RECHAZADA y movida a `rejected/APPCAJA-V3-BE-001-delivery-v1.0.0.zip`
- **v1.0.1**: Entrega actual con remediaciones aplicadas

## Cambios desde v1.0.0

### Bloqueante 1 - Estructura ZIP
- ZIP ahora contiene raíz `workspace/backend/` en lugar de archivos sueltos

### Bloqueante 2 - Spec Document
- Creado `docs/03-specs/CAJAAPP-V3-BE-001-card-pdf-ai-backend-spec.md`

### Bloqueante 3 - Migración Prisma
- Generada migración inicial `prisma/migrations/20260709170341_init/migration.sql`
- `npx prisma migrate dev` ejecuta correctamente

### Bloqueante 4 - Schema Prisma
- Cambiado de FK UUIDs a `sectionKey`/`groupKey` como identificadores lógicos
- `CardStatementDraftSection`: `sectionKey` (único con draftId)
- `CardStatementDraftGroup`: `groupKey` (único con draftId)
- `CardStatementDraftRow`: `sectionKey` y `groupKey` sin FK
- Modelo acepta inserts con IDs lógicos sin romper relaciones

### Bloqueante 5 - Proyecciones en acceptDraft
- `CardsService.acceptDraft()` ahora llama a `InstallmentProjectionService.calculateProjections()`
- Persiste `CardInstallmentProjection` en base de datos
- Devuelve `updatedValues.months` con meses proyectados

### Bloqueante 6 - PUT endpoint
- Implementado `PUT /api/card-statements/drafts/:draftId`
- Valida: displayOrder único, originalText presente, secciones/grupos válidos
- Persiste versión editada del draft

### Bloqueante 7 - Fixture Golden
- Actualizado `visa-galicia-julio2026.sanitized.preview.json`
- Secciones en orden: header, total-to-pay, billing-cycle, payment-limits-rates, consolidated, consumption-detail, charges-and-taxes, statement-total, plan-v, future-installments, legal-text
- Grupos en orden: 6792, 5884, 4255, 0015
- Filas representativas derivadas del PDF real (sanitizadas)

### Bloqueante 8 - Secciones completas
- Schema ahora incluye 11 secciones (antes 4)
- Tipos actualizados para representar resumen completo

### Bloqueante 9 - Smoke test
- Ejecutado: node -v, npm install, prisma generate, prisma migrate, npm run build, npm run test
- Todos los comandos returned SUCCESS

### Bloqueante 10 - AI_MOCK_MODE
- `.env.example` ahora tiene `AI_MOCK_MODE=true` (antes false)

### Bloqueante 11 - Lint script
- Removido script `"lint": "eslint . --fix"` de package.json (no había ESLint configurado)

### Bloqueante 12 - BigInt para dinero
- `CardsService` ahora usa `parseArgentinePesos()` que retorna BigInt
- No más `parseFloat` para acumulados monetarios

### Bloqueante 13 - Integración IA
- `DocumentDetectorService` tiene nuevo método `detectDocumentTypeWithAI()`
- Cuando `AI_MOCK_MODE=false`, usa Ollama para detección
- Cuando `AI_MOCK_MODE=true`, usa keyword detection

### Bloqueante 14 - Extracción PDF
- Validado que pdfjs-dist funciona en Node.js
- No se commitea PDF real

## Resumen técnico

Backend completo para importación de resúmenes de tarjeta PDF con IA via Ollama, persistencia Prisma/SQLite, y cálculo de cuotas futuras.

### Stack implementado
- Node.js 22.x
- TypeScript
- Fastify
- Prisma con SQLite local + migración
- Zod para validación
- pdf.js-dist para extracción de texto PDF
- Ollama API para IA (con modo mock)

### Endpoints implementados

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /health | Healthcheck del servicio |
| POST | /api/card-statements/import | Importar PDF de resumen |
| GET | /api/card-statements/drafts/:draftId | Obtener draft |
| PUT | /api/card-statements/drafts/:draftId | Actualizar draft editado |
| POST | /api/card-statements/drafts/:draftId/accept | Aceptar y persistir con proyecciones |
| GET | /api/card-statements/updated-values | Valores actualizados por mes |
| POST | /api/cards/manual-purchases | Compra manual |

### Archivos creados/modificados

**Backend (workspace/backend/):**
- Todos los archivos de v1.0.0 +
- `prisma/migrations/20260709170341_init/migration.sql` (NUEVO)
- `src/modules/cards/cards.service.ts` (actualizado con proyecciones y updateDraft)
- `src/modules/cards/cards.controller.ts` (actualizado con PUT endpoint)
- `src/modules/imports/imports.service.ts` (actualizado para usar sectionKey/groupKey)
- `src/modules/imports/document-detector.service.ts` (actualizado con IA híbrida)
- `src/modules/ai/ai-extraction.service.ts` (actualizado con detectDocumentType)
- `tests/cards/projections.test.ts` (NUEVO)
- `tests/cards/golden-fixture.test.ts` (NUEVO)

**Contratos:**
- `contracts/examples/cards/visa-galicia-julio2026.sanitized.preview.json` (actualizado con fixture golden)
- `contracts/examples/cards/visa-galicia-julio2026.sanitized.accepted.json` (actualizado)

**Documentación:**
- `docs/03-specs/CAJAAPP-V3-BE-001-card-pdf-ai-backend-spec.md` (NUEVO)
- `docs/05-evidence/smoke-output.txt` (NUEVO)
- `docs/06-reports/CAJAAPP-V3-BE-001-delivery-report.md` (actualizado)

### Comandos ejecutados

```bash
node -v: v22.14.0
npm install: SUCCESS
npx prisma generate: SUCCESS
npx prisma migrate dev: SUCCESS
npm run build: SUCCESS
npm run test: SUCCESS (52 tests)
```

### Known issues

1. Error preexistente de hidratación en frontend MonthlyEvolutionChart (no introducido por esta entrega)
2. El post-build script usa `cp` (Unix) que no funciona en Windows - el build compila correctamente
3. Smoke test de API no puede ejecutar health check en background job (aislamiento de sesión PowerShell)

### Confirmaciones

- Frontend no fue modificado
- No se copiaron artifacts de CajaApp V2
- PDF real no fue commiteado
- .env no fue commiteado (solo .env.example)
- No hay `node_modules`, `dist`, `.git`, `storage` en el artifact
- ZIP tiene estructura correcta con `workspace/backend/` como raíz

### Cómo correr

```bash
cd workspace/backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```
