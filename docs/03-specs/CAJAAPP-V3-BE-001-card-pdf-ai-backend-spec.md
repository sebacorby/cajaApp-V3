# APPCAJA-V3-BE-001 — Card PDF AI Backend Spec

## 1. Propósito

Backend para CajaApp V3: importar resúmenes de tarjeta de crédito en PDF, extraer datos usando IA (Ollama), persistir en SQLite via Prisma, y calcular proyecciones de cuotas futures.

## 2. Stack

- Node.js exacto `v24.18.0` (`node-v24.18.0-win-x64`)
- TypeScript
- Fastify
- Prisma 6.x con SQLite
- Zod para validación
- pdfjs-dist para extracción de texto PDF
- Ollama API para IA (con modo mock para desarrollo)

## 3. Flujo PDF → Persistencia

```
1. PDF uploaded → multipart upload
2. pdf-text-extractor.service.ts → extrae texto con marcadores de página
3. document-detector.service.ts → valida que es PDF de extracto tarjeta
4. ai-extraction.service.ts → llama Ollama (o mock) con prompts de contracts/
5. Preview JSON generado → se guarda en draft
6. Frontend puede editar el preview
7. PUT /drafts/:id → persiste edición
8. POST /drafts/:id/accept → calcula proyecciones, persiste statement
9. Proyecciones disponibles via GET /updated-values
```

## 4. Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /health | Healthcheck |
| POST | /api/card-statements/import | Importar PDF, retorna draft |
| GET | /api/card-statements/drafts/:draftId | Obtener draft |
| PUT | /api/card-statements/drafts/:draftId | Actualizar draft editado |
| POST | /api/card-statements/drafts/:draftId/accept | Aceptar, persistir, calcular proyecciones |
| GET | /api/card-statements/updated-values | Valores agregados por mes |
| POST | /api/cards/manual-purchases | Compra manual con proyecciones |

## 5. Modelo de Datos (Prisma)

### UploadedDocument
Archivo PDF importado.

### AiExtractionRun
Registro de cada llamada a IA.

### CardStatementDraft
Draft temporal del preview antes de aceptación. Estado: `imported` → `preview_ready` → `accepted`.

### CardStatementDraftSection / CardStatementDraftGroup / CardStatementDraftRow
Secciones y grupos lógicos (ej: "consumption-detail", "g-6792"). Se usan `sectionKey` y `groupKey` como identificadores lógicos, no FK a UUID.

### CardStatement
Resumen aceptado. Persistente.

### CardStatementSection / CardStatementGroup / CardStatementRow
Versión persistida de los datos del resumen.

### CardInstallmentProjection
Cuota future proyectada. Incluye `monthKey`, `rowId`, `installmentCurrent`, `installmentTotal`, `amountPesosRaw`.

### ManualCardPurchase
Compra manual con proyecciones.

## 6. Contrato de Preview

El preview sigue el schema `CardStatementPreview` con:

- `sections[]`: id, label, displayOrder
- `groups[]`: id, label, cardLast4, holderName, displayOrder
- `rows[]`: id, sectionId, groupId, rowType, editable, dateRaw, dateIso, referenceRaw, installmentRaw, amountPesos, amountDollars, currencyOriginal, originalText, confidence
- `futureInstallmentsBlock[]`: filas de referencia para UI

Secciones esperadas (en orden):
1. header
2. total-to-pay
3. billing-cycle
4. payment-limits-rates
5. consolidated
6. consumption-detail
7. charges-and-taxes
8. statement-total
9. plan-v
10. future-installments
11. legal-text

Grupos (en orden):
1. TARJETA 6792 (JAVIER SEB CORBELLA)
2. TARJETA 5884 (EMILSE RITA JIMENEZ)
3. TARJETA 4255 (JAVIER SEB CORBELLA)
4. TARJETA 0015 (LUCAS SALVA JIMENEZ)

## 7. Reglas de Dinero

- No usar floats para cálculos
- Usar BigInt para centavos
- `parseArgentinePesos(value)` → bigint en centavos
- `centsToString(cents, currency)` → string formateado
- Guardar strings en DB para compatibilidad Prisma/SQLite

## 8. Reglas de Proyecciones de Cuotas

Se calculan al aceptar el draft (`acceptDraft`):

- `rowType === "transaction"` con `installmentRaw` activa proyecciones
- `02/03` → proyecta 1 cuota en siguiente mes
- `01/06` → proyecta 5 cuotas en meses siguientes
- Si `current >= total` → no proyecta
- USD no se convierte a ARS, se proyecta como USD
- `group_total`, `statement_total`, `legal_text`, `future_installment_reference` no proyectan
- El mes base sale de `summary.currentDueDate` (formato YYYY-MM-DD)

## 9. Restricciones de IA

- AI_MOCK_MODE=true por defecto para desarrollo local
- Para producción real: AI_MOCK_MODE=false + OLLAMA_API_KEY + OLLAMA_MODEL
- Prompts en Markdown bajo `contracts/prompts/cards/`
- Schemas JSON bajo `contracts/schemas/cards/`

## 10. Seguridad / Privacidad

- No commitlear PDF real con datos personales
- No commitlear .env (sólo .env.example)
- No incluir node_modules, dist, .git en artifact
- Validación de tipo MIME en upload

## 11. Relación con Frontend

El frontend:
1. Sube PDF → recibe draftId + preview
2. Muestra preview editable
3. El usuario puede editar celdas
4. PUT /drafts/:id con preview editado
5. POST /drafts/:id/accept
6. Consulta updated-values para gráfico de evolución

## 12. Tests

- tests/cards/card-statement.schema.test.ts
- tests/cards/installment-projection.service.test.ts
- tests/imports/pdf-import-contract.test.ts
- tests/imports/display-order-preservation.test.ts

## 13. Cómo correr

```bash
cd workspace/backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

## 14. Decisiones Técnicas

1. **SQLite** para simplicidad en desarrollo local
2. **sectionKey/groupKey** como identificadores lógicos (no FK UUID) para mantener compatibilidad con contrato frontend
3. **BigInt en TypeScript** para cálculos monetarios, strings en DB
4. **Modo mock IA** por defecto para no depender de Ollama Cloud en desarrollo
5. **Prompts externalizados** para auditabilidad y versionado independiente del código
