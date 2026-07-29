# CAJAAPP-V3-BE-001 — Backend completo de importación PDF de tarjeta + IA + persistencia + cálculo

## 0. Contexto obligatorio

Proyecto: **CajaApp V3**

Root esperado:

```txt
I:\cajaApp-V3
```

La etapa `CAJAAPP-V3-INIT-001` ya fue aceptada. La estructura base del repo ya existe y debe respetarse.

Esta tarea construye el **backend completo** para la importación de resúmenes de tarjeta en PDF, integración con IA vía Ollama Cloud/local configurado por `.env`, validación de salida IA, persistencia de datos aceptados y cálculo backend de consumos futuros.

La IA **no toma decisiones financieras** y **no calcula**. La IA sólo extrae información del documento y la devuelve en una estructura JSON normalizada. El backend valida, normaliza, persiste y calcula.

El frontend sólo renderiza y edita una vista previa. No interpreta PDF, no calcula cuotas, no calcula totales, no reordena filas.

---

## 1. Fuente de verdad funcional

El PDF Galicia/Visa provisto por arquitectura es el **golden sample** para esta feature.

Regla crítica:

> El PDF dicta el orden.  
> La app no debe ordenar las filas bajo ningún criterio propio.

Está prohibido reordenar por:

- fecha;
- tarjeta;
- titular;
- monto;
- comercio;
- cuota;
- comprobante;
- moneda;
- tipo de consumo;
- cualquier criterio derivado.

El backend debe preservar:

- orden de secciones;
- orden de grupos;
- orden de filas;
- número de página de origen;
- texto original de cada fila relevante;
- agrupamiento por tarjeta/persona;
- totales ubicados donde aparecen en el PDF;
- cargos/impuestos posteriores a consumos;
- bloque de cuotas a vencer.

---

## 2. Alcance de esta entrega

Implementar backend real en:

```txt
I:\cajaApp-V3\workspace\backend
```

También crear/actualizar contratos auditables en:

```txt
I:\cajaApp-V3\contracts
```

y documentación/evidencia en:

```txt
I:\cajaApp-V3\docs
```

### Incluye

- Proyecto backend Node.js 22 + TypeScript.
- API HTTP.
- Carga multipart de PDF.
- Extracción de texto de PDF.
- Detección de tipo de documento.
- Prompts en Markdown auditables.
- Cliente Ollama configurable por `.env`.
- Validación estricta con schemas.
- Reintento/repair controlado si la IA devuelve JSON inválido.
- Persistencia con Prisma.
- DB local de desarrollo con SQLite.
- Modelo preparado para migrar a PostgreSQL más adelante.
- Persistencia de documentos importados como borrador.
- Persistencia final sólo al aceptar datos.
- Cálculo backend de cuotas futuras.
- Endpoint para compra manual con tarjeta.
- Auditoría de extracción IA.
- Tests mínimos.
- Evidencias y reporte.

### No incluye

- Frontend real.
- Cambios en el prototipo frontend.
- Carga CSV.
- Carga PNG/JPG.
- OCR.
- Clasificación automática avanzada de categorías.
- Conversión de dólares a pesos.
- Decisiones financieras.
- Integración bancaria real.
- Deploy.

CSV e imagen deben quedar explícitamente como features futuras.

---

## 3. Stack técnico obligatorio

Backend:

```txt
Node.js 22.x
TypeScript
Fastify
Prisma
SQLite local dev
Zod
```

PDF:

```txt
pdf.js-extract o alternativa equivalente que preserve texto por página y, si es posible, coordenadas.
```

IA:

```txt
Ollama API compatible con base URL configurable.
```

Reglas:

- No exigir Node.js 24.
- Bloquear si Node no empieza con `v22.`.
- No usar secretos hardcodeados.
- No commitear `.env`.
- Crear `.env.example`.
- No copiar código de CajaApp V2.
- No crear frontend.
- No tocar `workspace/frontend` salvo lectura/compatibilidad documental.
- No meter dependencias innecesarias.

---

## 4. Estructura esperada

Crear esta estructura mínima:

```txt
workspace/backend/
  package.json
  tsconfig.json
  .env.example
  prisma/
    schema.prisma
    migrations/
  src/
    main.ts
    app.ts
    config/
      env.ts
    db/
      prisma.ts
    modules/
      health/
        health.routes.ts
      cards/
        cards.routes.ts
        cards.controller.ts
        cards.service.ts
        cards.schemas.ts
        cards.types.ts
      imports/
        imports.routes.ts
        imports.controller.ts
        imports.service.ts
        document-detector.service.ts
        pdf-text-extractor.service.ts
      ai/
        ollama.client.ts
        prompt-loader.ts
        ai-extraction.service.ts
        json-repair.service.ts
      projections/
        installment-projection.service.ts
      manual-purchases/
        manual-purchases.routes.ts
        manual-purchases.controller.ts
        manual-purchases.service.ts
    shared/
      money.ts
      dates.ts
      errors.ts
      logger.ts
      validation.ts
  tests/
    cards/
      card-statement.schema.test.ts
      installment-projection.service.test.ts
    imports/
      pdf-import-contract.test.ts
      display-order-preservation.test.ts

contracts/
  prompts/
    cards/
      00-detect-document-type.md
      01-extract-credit-card-statement.md
      02-repair-credit-card-json.md
  schemas/
    cards/
      card-statement-import.schema.json
      card-statement-preview.schema.json
      card-statement-accepted.schema.json
  examples/
    cards/
      visa-galicia-julio2026.sanitized.preview.json
      visa-galicia-julio2026.sanitized.accepted.json

docs/
  03-specs/
    CAJAAPP-V3-BE-001-card-pdf-ai-backend-spec.md
  05-evidence/
    CAJAAPP-V3-BE-001-test-output.txt
    CAJAAPP-V3-BE-001-build-output.txt
    CAJAAPP-V3-BE-001-api-smoke-output.txt
  06-reports/
    CAJAAPP-V3-BE-001-delivery-report.md
```

---

## 5. Configuración `.env`

Crear `.env.example`:

```env
NODE_ENV=development
PORT=4000
HOST=127.0.0.1

DATABASE_URL="file:./dev.db"

STORAGE_DIR="./storage"
MAX_UPLOAD_BYTES=10485760

OLLAMA_BASE_URL="https://ollama.com"
OLLAMA_API_KEY=""
OLLAMA_MODEL=""
OLLAMA_TIMEOUT_MS=120000
OLLAMA_MAX_RETRIES=2

CARD_STATEMENT_PROMPTS_DIR="../../contracts/prompts/cards"

AI_MOCK_MODE=false
```

Reglas:

- `.env` real no debe commitearse.
- `OLLAMA_API_KEY` nunca debe aparecer en logs.
- Si no existe API key o modelo, el backend debe iniciar igual y permitir healthcheck, pero el endpoint real de importación IA debe devolver error claro o usar `AI_MOCK_MODE=true` si está configurado.
- No pedirle al usuario que ejecute comandos manualmente.

---

## 6. Prompts auditables en Markdown

Los prompts viven fuera del código ejecutable para poder auditarse y modificarse.

### 6.1 `00-detect-document-type.md`

Debe pedir al modelo que detecte:

- `credit_card_statement_pdf`
- `bank_account_statement_pdf`
- `invoice_pdf`
- `receipt_pdf`
- `unknown`

Para esta entrega sólo se soporta:

```txt
credit_card_statement_pdf
```

Si detecta CSV/PNG/JPG o documento no soportado, backend debe responder `422 UNSUPPORTED_DOCUMENT_TYPE`.

### 6.2 `01-extract-credit-card-statement.md`

Debe exigir extracción con estas reglas:

- preservar orden visual;
- preservar páginas;
- preservar secciones;
- preservar grupos;
- preservar filas;
- no ordenar;
- no deducir datos inexistentes;
- no calcular totales nuevos;
- no convertir monedas;
- no sumar;
- no inferir categorías financieras;
- devolver importes como strings decimales;
- devolver `null` si el dato no existe;
- incluir `originalText`;
- incluir `displayOrder` incremental;
- incluir `sourcePage`.

### 6.3 `02-repair-credit-card-json.md`

Sólo debe reparar JSON inválido contra el schema.

Está prohibido que este prompt:

- agregue filas nuevas;
- modifique importes;
- reordene;
- complete campos inventados;
- haga cálculos.

---

## 7. Integración Ollama

Crear `src/modules/ai/ollama.client.ts`.

Debe soportar:

```txt
POST {OLLAMA_BASE_URL}/api/generate
```

Payload conceptual:

```json
{
  "model": "valor de OLLAMA_MODEL",
  "prompt": "prompt final",
  "stream": false
}
```

Reglas:

- `OLLAMA_BASE_URL` debe venir de `.env`.
- `OLLAMA_API_KEY` debe venir de `.env`.
- Si hay API key, enviar header `Authorization: Bearer <key>`.
- No loguear prompt completo si contiene datos sensibles, salvo modo debug explícito y sanitizado.
- Registrar:
  - modelo;
  - duración;
  - status;
  - hash del prompt;
  - hash de respuesta;
  - cantidad de reintentos;
  - errores de validación.

Importante:
Ollama Cloud actualmente no debe asumirse compatible con structured outputs. Por eso el backend debe tratar la respuesta IA como no confiable, extraer JSON, validarlo con Zod/JSON Schema y hacer repair controlado si corresponde.

---

## 8. Extracción de PDF

Crear `pdf-text-extractor.service.ts`.

Debe devolver una estructura interna así:

```ts
type ExtractedPdfText = {
  pageCount: number;
  pages: Array<{
    pageNumber: number;
    text: string;
    items?: Array<{
      text: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    }>;
  }>;
  fullTextWithPageMarkers: string;
};
```

Reglas:

- preservar número de página;
- no mezclar páginas sin marcador;
- rechazar PDF vacío;
- rechazar PDF sin texto suficiente;
- no implementar OCR en esta entrega;
- si parece escaneado, devolver error claro:
  `SCANNED_PDF_NOT_SUPPORTED_YET`.

El texto enviado al modelo debe incluir marcadores explícitos:

```txt
--- PAGE 1 / 8 ---
...
--- PAGE 2 / 8 ---
...
```

---

## 9. Contrato de preview para frontend

El endpoint de importación debe devolver una vista previa lista para renderizar.

### Endpoint

```http
POST /api/card-statements/import
Content-Type: multipart/form-data
field: file
```

Respuesta `200`:

```json
{
  "draftId": "uuid",
  "document": {
    "id": "uuid",
    "fileName": "visa-galicia-julio2026.pdf",
    "mimeType": "application/pdf",
    "sha256": "...",
    "pageCount": 8
  },
  "status": "preview_ready",
  "warnings": [],
  "preview": {
    "statementId": null,
    "source": {
      "bankName": "Banco Galicia",
      "brand": "VISA",
      "statementNumber": "VI00000000000839532",
      "pageCount": 8
    },
    "summary": {
      "totalPesos": "3118842.50",
      "totalDollars": "161.84",
      "minimumPaymentPesos": "508000.00",
      "currentDueDate": "2026-07-13",
      "nextClosingDate": "2026-07-30",
      "nextDueDate": "2026-08-07"
    },
    "sections": [],
    "groups": [],
    "rows": [],
    "futureInstallmentsBlock": []
  }
}
```

Reglas:

- `rows`, `groups` y `sections` deben venir en orden de aparición.
- No aplicar `.sort()` para alterar orden.
- Cada fila debe tener `displayOrder`.
- Cada grupo debe tener `groupOrder`.
- Cada sección debe tener `sectionOrder`.
- Los importes deben viajar como string decimal o `null`, nunca como float calculado.
- El frontend no debe necesitar reconstruir lógica financiera.

---

## 10. Modelo de fila normalizada

Cada fila del preview debe cumplir:

```ts
type CardStatementRow = {
  id: string;
  displayOrder: number;
  sourcePage: number | null;

  sectionId: string;
  sectionLabel: string;

  groupId: string | null;
  groupLabel: string | null;
  groupOrder: number | null;

  rowType:
    | "section_header"
    | "group_header"
    | "transaction"
    | "group_total"
    | "consolidated_row"
    | "tax"
    | "charge"
    | "statement_total"
    | "future_installment_reference"
    | "legal_text"
    | "unknown";

  editable: boolean;

  dateRaw: string | null;
  dateIso: string | null;

  markerRaw: string | null;
  referenceRaw: string | null;
  installmentRaw: string | null;
  installmentCurrent: number | null;
  installmentTotal: number | null;

  receiptRaw: string | null;

  amountPesos: string | null;
  amountDollars: string | null;

  currencyOriginal: "ARS" | "USD" | "MIXED" | "UNKNOWN";
  originalText: string;
  confidence: number | null;
  warnings: string[];
};
```

Reglas:

- `transaction`, `tax` y `charge` pueden ser editables.
- `group_total`, `statement_total`, `section_header`, `legal_text` no deben ser editables.
- No borrar `originalText`.
- Preservar comprobantes con ceros a la izquierda.
- Preservar marcas `*`, `K` o equivalentes en `markerRaw`.

---

## 11. Persistencia

Implementar Prisma con SQLite local.

### Modelos mínimos

Definir modelos equivalentes a:

```txt
UploadedDocument
AiExtractionRun
CardStatementDraft
CardStatementDraftSection
CardStatementDraftGroup
CardStatementDraftRow
CardStatement
CardStatementSection
CardStatementGroup
CardStatementRow
CardInstallmentProjection
ManualCardPurchase
```

### Reglas de persistencia

Importación:

- guarda documento subido en storage local ignorado por git;
- guarda metadata del documento;
- guarda corrida IA;
- guarda draft/preview;
- NO impacta la data final;
- NO calcula cuotas definitivas todavía.

Aceptación:

- recibe el draft editado/aprobado;
- valida todo nuevamente;
- persiste `CardStatement`;
- copia secciones/grupos/filas aceptadas;
- calcula cuotas futuras;
- persiste `CardInstallmentProjection`;
- marca draft como accepted;
- devuelve tabla actualizada.

Manual purchase:

- persiste compra manual;
- calcula impacto actual/futuro;
- devuelve datos actualizados.

---

## 12. Endpoints obligatorios

### Health

```http
GET /health
```

Respuesta:

```json
{
  "status": "ok",
  "service": "cajaapp-v3-backend",
  "node": "v22.x.x"
}
```

### Importar resumen PDF

```http
POST /api/card-statements/import
```

Multipart:

```txt
file: PDF
```

Errores:

- `400 FILE_REQUIRED`
- `413 FILE_TOO_LARGE`
- `415 UNSUPPORTED_MEDIA_TYPE`
- `422 UNSUPPORTED_DOCUMENT_TYPE`
- `422 SCANNED_PDF_NOT_SUPPORTED_YET`
- `502 AI_PROVIDER_ERROR`
- `422 AI_OUTPUT_SCHEMA_INVALID`

### Obtener draft

```http
GET /api/card-statements/drafts/:draftId
```

### Actualizar draft editado

```http
PUT /api/card-statements/drafts/:draftId
```

Debe recibir el preview editado por frontend.

Regla:
El backend debe validar que no se hayan perdido `displayOrder`, `sectionId`, `groupId`, `rowType`, `originalText`.

### Aceptar datos

```http
POST /api/card-statements/drafts/:draftId/accept
```

Respuesta:

```json
{
  "statementId": "uuid",
  "status": "accepted",
  "updatedValues": {
    "months": [
      {
        "monthKey": "2026-07",
        "label": "Julio-2026",
        "totalPesos": "..."
      }
    ],
    "rows": []
  },
  "warnings": []
}
```

### Compra manual

```http
POST /api/cards/manual-purchases
```

Body:

```json
{
  "cardLast4": "4255",
  "holderName": "JAVIER SEB CORBELLA",
  "purchaseDate": "2026-07-10",
  "description": "Compra manual",
  "currency": "ARS",
  "amount": "120000.00",
  "installments": 3,
  "notes": ""
}
```

Reglas:

- No calcular en frontend.
- Backend calcula distribución de cuotas.
- Preservar centavos.
- Si no divide exacto, distribuir diferencia de centavos de forma determinística en la primera o última cuota y documentarlo.

### Valores actualizados

```http
GET /api/cards/updated-values?from=2026-07&to=2027-01
```

Devuelve tabla mensual lista para render.

---

## 13. Reglas de dinero

Obligatorio:

- No usar `number` float para cálculos monetarios.
- Parsear importes argentinos:
  - `3.118.842,50` -> cents `311884250`
  - `161,84` -> cents `16184`
- En API devolver string decimal:
  - `"3118842.50"`
  - `"161.84"`
- En DB guardar:
  - `amountCents BigInt`
  - `currency`
  - `amountOriginalRaw`
- No convertir USD a ARS.
- No pesificar consumos en dólares.
- No inferir tipo de cambio.

---

## 14. Reglas de cálculo de cuotas futuras

El cálculo se ejecuta sólo en backend y sólo después de aceptar datos o cargar compra manual.

Para filas importadas:

- Si `installmentRaw` es `02/03`:
  - cuota actual impacta en mes del resumen;
  - resta proyectar `03/03` en el mes siguiente.
- Si `installmentRaw` es `01/06`:
  - cuota actual impacta en mes del resumen;
  - proyectar cuotas 02/06 a 06/06 en meses siguientes.
- Si no hay cuota:
  - impacta sólo en el mes actual.
- Si `installmentTotal <= installmentCurrent`:
  - no proyectar futuro.
- Si moneda es USD:
  - proyectar en USD, no convertir.
- Si fila es impuesto/cargo:
  - no proyectar como cuota futura salvo que tenga cuota explícita y rowType lo permita.
- Si la fila está marcada como `group_total` o `statement_total`:
  - no proyectar.

El backend debe generar `monthKey`:

```txt
YYYY-MM
```

y label:

```txt
Julio-2026
Agosto-2026
Setiembre-2026
...
```

---

## 15. Validaciones críticas

Al importar:

- Debe existir total a pagar.
- Debe existir detalle de consumo.
- Deben existir columnas equivalentes a:
  - Fecha
  - Referencia
  - Cuota
  - Comprobante
  - Pesos
  - Dólares
- Debe existir al menos un grupo `TARJETA`.
- Debe existir al menos una fila transaction.
- `displayOrder` debe ser incremental y único.
- No puede haber filas aceptadas sin `originalText`.
- No se puede aceptar un draft con schema inválido.

Al aceptar:

- Revalidar todo.
- Rechazar si cambió estructura crítica:
  - secciones sin orden;
  - filas sin `displayOrder`;
  - grupos sin `groupOrder`;
  - totales convertidos en transacciones;
  - comprobantes numéricos perdiendo ceros iniciales.
- Permitir edición de valores, descripción y fecha en filas editables.
- Registrar diferencias entre original y editado.

---

## 16. Auditoría

Guardar por cada importación:

- documento original:
  - filename;
  - mime;
  - size;
  - sha256;
  - storage path;
- texto extraído:
  - hash;
  - page count;
- prompt:
  - prompt file path;
  - prompt hash;
  - prompt version si existe;
- modelo:
  - provider;
  - base URL sanitizada;
  - model;
- respuesta IA:
  - raw response path o hash;
  - JSON extraído;
  - errores de validación;
  - retries;
- estado:
  - imported;
  - preview_ready;
  - rejected;
  - accepted;
  - failed.

No guardar API keys ni secretos.

---

## 17. Seguridad y privacidad

- No commitear PDF real con datos personales.
- No commitear storage local.
- No commitear `.env`.
- Fixtures en `contracts/examples/cards` deben estar sanitizados.
- Si se usa el PDF real para test local, debe quedar fuera del ZIP o documentado como muestra privada no versionada.
- Logs deben evitar datos sensibles completos.
- Se permite guardar `last4` de tarjeta, no números completos.
- Hashear archivos con SHA256.

---

## 18. Tests mínimos

Crear tests para:

1. Healthcheck.
2. Parseo de dinero argentino.
3. Parseo de cuotas:
   - `01/03`
   - `02/03`
   - `11/12`
   - vacío.
4. Preservación de `displayOrder`.
5. Rechazo si una fila pierde `originalText`.
6. Cálculo de cuotas futuras.
7. No conversión USD -> ARS.
8. Rechazo CSV/PNG/JPG en esta etapa.
9. Validación de JSON schema.
10. Modo mock IA.

El test de golden sample puede usar fixture sanitizado, no el PDF real.

---

## 19. Scripts esperados

`workspace/backend/package.json` debe incluir:

```json
{
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/main.js",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "check": "npm run build && npm run test"
  }
}
```

Si se decide no configurar ESLint en esta entrega, documentar el motivo. Preferencia: configurarlo mínimo.

---

## 20. Smoke manual obligatorio

El agente debe ejecutar o dejar evidencia de:

```txt
node -v
npm install
npm run build
npm run test
npm run dev
GET /health
POST /api/card-statements/import con fixture/mock
POST /api/card-statements/drafts/:draftId/accept
POST /api/cards/manual-purchases
GET /api/cards/updated-values
```

Si Ollama Cloud no está configurado con API key/modelo, usar `AI_MOCK_MODE=true` para smoke y dejar documentado que la integración real queda implementada pero no ejecutada por falta de credenciales.

---

## 21. Entrega esperada

Generar artifact:

```txt
CAJAAPP-V3-BE-001-card-pdf-ai-backend-delivery-v1.0.0.zip
```

Ubicación:

```txt
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\
```

El ZIP debe incluir:

- backend completo;
- contratos;
- prompts;
- schemas;
- fixtures sanitizados;
- migraciones;
- tests;
- evidencia;
- reporte.

No debe incluir:

- `.env`;
- `node_modules`;
- `.git`;
- `dist`;
- `.next`;
- `storage`;
- PDFs reales con datos personales;
- logs con secretos;
- archivos temporales.

---

## 22. Reporte obligatorio

Crear:

```txt
docs/06-reports/CAJAAPP-V3-BE-001-delivery-report.md
```

Debe incluir:

- resumen técnico;
- comandos ejecutados;
- resultado de cada comando;
- endpoints implementados;
- archivos creados/modificados;
- decisiones técnicas;
- uso de IA;
- cómo configurar `.env`;
- cómo correr backend;
- cómo correr migraciones;
- cómo probar en modo mock;
- known issues honestos;
- confirmación de que frontend no fue modificado;
- confirmación de que no se copiaron artifacts de V2;
- confirmación de que el PDF real no fue commiteado.

---

## 23. Definition of Done

La entrega sólo puede considerarse PASS si:

- `workspace/backend` existe y es ejecutable.
- Node.js 22.x fue validado.
- Existe API HTTP funcionando.
- Existe healthcheck.
- Existe importación PDF.
- Existe integración Ollama configurable por `.env`.
- Los prompts viven en Markdown bajo `contracts/prompts/cards`.
- Existen schemas bajo `contracts/schemas/cards`.
- El backend valida salida IA.
- El backend preserva orden del PDF mediante `displayOrder`.
- El backend no reordena filas.
- El backend guarda drafts.
- El backend acepta datos y recién ahí persiste statement final.
- El backend calcula cuotas futuras.
- Existe endpoint de compra manual.
- No hay cálculos financieros en frontend.
- No se commitean secretos.
- No se commitea PDF real con datos personales.
- Tests mínimos pasan o se documentan bloqueos reales.
- Build pasa.
- Artifact queda en `pending-validation`.

---

## 24. Criterio de rechazo inmediato

Rechazar la entrega si ocurre cualquiera de estos puntos:

- Se implementa lógica de cálculo en frontend.
- Se modifica el prototipo frontend sin autorización.
- Se ordenan filas del resumen por fecha/monto/tarjeta.
- Se pierde el agrupamiento del PDF.
- Se pierden comprobantes con ceros a la izquierda.
- La IA persiste datos finales sin aceptación del usuario.
- El backend acepta JSON inválido.
- Se usa float para cálculos monetarios.
- Se convierte USD a ARS.
- Se commitea `.env`.
- Se commitea un PDF real con datos personales.
- Se exige Node.js 24.
- Se copia código de CajaApp V2.
