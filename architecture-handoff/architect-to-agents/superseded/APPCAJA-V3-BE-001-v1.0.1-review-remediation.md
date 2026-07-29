# APPCAJA-V3-BE-001 — Revisión v1.0.1 y remediación para v1.0.2

## Veredicto de arquitectura

**Estado:** RECHAZADA / NO PASS  
**Entrega revisada:** `APPCAJA-V3-BE-001-delivery-v1.0.1.zip`  
**Nueva entrega requerida:** `APPCAJA-V3-BE-001-delivery-v1.0.2.zip`

La entrega v1.0.1 mejora la estructura del ZIP respecto de v1.0.0 y agrega backend, Prisma, prompts, schemas, specs y tests. Sin embargo, todavía no puede aceptarse porque el flujo runtime no respeta de forma confiable la regla central de CajaApp V3:

> El PDF Galicia/Visa es la fuente de verdad. El backend debe preservar orden, agrupamiento, filas y valores reales del PDF. La IA extrae; el backend valida, normaliza, persiste y calcula. El frontend no calcula.

## Acción obligatoria de traspaso

Mover físicamente el artifact rechazado:

Desde:

```txt
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-BE-001-delivery-v1.0.1.zip
```

Hacia:

```txt
I:\cajaApp-V3\architecture-handoff\agents-to-architect\rejected\APPCAJA-V3-BE-001-delivery-v1.0.1.zip
```

Registrar en el reporte v1.0.2 que:

- `APPCAJA-V3-BE-001-delivery-v1.0.0.zip` fue rechazado y movido a `rejected`.
- `APPCAJA-V3-BE-001-delivery-v1.0.1.zip` fue rechazado y movido a `rejected`.
- `APPCAJA-V3-BE-001-delivery-v1.0.2.zip` es la nueva entrega pendiente de validación.

---

# Bloqueantes

## B1 — El runtime en `AI_MOCK_MODE=true` devuelve datos inventados

### Problema

`.env.example` deja:

```env
AI_MOCK_MODE=true
```

Pero el mock real implementado en:

```txt
workspace/backend/src/modules/ai/ollama.client.ts
```

devuelve datos ficticios que no pertenecen al PDF golden:

- `AMAZON.COM`
- `UBER TRIP`
- `BOOKING.COM`
- secciones viejas incompletas;
- filas bajo `sectionId: "consolidated"` aunque son consumos;
- totales ficticios;
- sólo 4 secciones en vez de las 11 secciones esperadas.

Esto es bloqueante porque, en la configuración default del backend, importar un PDF no devuelve el golden sample real ni respeta el PDF fuente.

### Corrección requerida

Eliminar el mock hardcodeado dentro de `OllamaClient`.

Implementar un servicio explícito de mock/fixture, por ejemplo:

```txt
workspace/backend/src/modules/ai/mock-ai-extraction.service.ts
```

Debe leer el fixture desde:

```txt
contracts/examples/cards/visa-galicia-julio2026.sanitized.preview.json
```

Regla:

- `OllamaClient` sólo debe ser cliente HTTP.
- El modo mock no debe vivir como JSON hardcodeado dentro del cliente de Ollama.
- En `AI_MOCK_MODE=true`, `AiExtractionService` debe devolver el fixture golden validado.
- El fixture debe ser la misma estructura que el backend enviará al frontend.

---

## B2 — La detección de tipo de documento no usa IA en el flujo de importación

### Problema

`DocumentDetectorService` implementa:

```ts
detectDocumentTypeWithAI(text, pageCount)
```

pero `ImportsService.importPdf()` llama a:

```ts
documentDetectorService.detectDocumentType(...)
```

Esto incumple la regla funcional definida:

> Luego de que el modelo lea el PDF, CSV o imagen debe interpretar primero qué se está enviando y, en base a eso, realizar la tarea correspondiente.

### Corrección requerida

En:

```txt
workspace/backend/src/modules/imports/imports.service.ts
```

reemplazar la detección keyword-only por detección híbrida con IA:

```ts
const documentType = await documentDetectorService.detectDocumentTypeWithAI(
  pdfExtraction.fullTextWithPageMarkers,
  pdfExtraction.pageCount
);
```

Comportamiento esperado:

- Si `AI_MOCK_MODE=true`, puede usar keyword fallback.
- Si `AI_MOCK_MODE=false`, debe consultar Ollama.
- Si Ollama falla, puede caer a keyword detection, pero debe registrar warning/evidencia.
- Si el documento no es `credit_card_statement_pdf`, debe responder `UnsupportedDocumentTypeError`.

---

## B3 — El fixture golden sigue teniendo filas inventadas y valores incorrectos

### Problema

El fixture:

```txt
contracts/examples/cards/visa-galicia-julio2026.sanitized.preview.json
```

todavía contiene filas que no existen en el PDF fuente:

- `DLO*SPOTIFY`
- `DLO*AMAZON PRIME`
- `MERCADOLIBRE`
- `COTO`

También tiene `sourcePage` incorrectos, cargos/impuestos en `0.00` y varios valores que no reflejan el PDF.

### Corrección requerida

Regenerar el fixture golden con datos reales derivados del PDF Galicia/Visa, manteniendo sanitización sólo donde sea necesario, pero sin inventar consumos.

Debe respetar como mínimo este orden:

```txt
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
```

Y estos grupos en este orden:

```txt
1. TARJETA 6792 Total Consumos de JAVIER SEB CORBELLA
2. TARJETA 5884 Total Consumos de EMILSE RITA JIMENEZ
3. TARJETA 4255 Total Consumos de JAVIER SEB CORBELLA
4. TARJETA 0015 Total Consumos de LUCAS SALVA JIMENEZ
```

### Filas mínimas obligatorias del fixture

No hace falta incluir absolutamente todas las líneas del PDF en v1.0.2, pero toda fila incluida debe existir en el PDF y debe respetar su orden relativo.

#### Grupo 6792

```txt
09-06-26 * DLO*AMAZON MUSIC 003611 8.303,49
TARJETA 6792 Total Consumos de JAVIER SEB CORBELLA 8.303,49 0,00
```

#### Grupo 5884

```txt
15-11-25 * JUANITA JO 08/09 000563 58.055,55
23-03-26 * GRANDES TIENDAS SAN JU 03/03 003731 33.922,66
09-05-26 * M Y S 02/03 008078 9.500,00
16-05-26 * M Y S 02/03 008229 18.333,33
26-05-26 * DEL PUEBLO BARRIO NORTE 02/03 005079 6.545,26
TARJETA 5884 Total Consumos de EMILSE RITA JIMENEZ 126.356,80 0,00
```

#### Grupo 4255

Debe comenzar con las primeras filas reales del PDF, en este orden:

```txt
25-08-25 * WWW.FRAVEGA.COM 11/12 008224 200.416,50
16-10-25 VISA PLAN V 9-12 (TNA 83,81) 040997 87.118,23
06-12-25 * RIIING 07/12 035808 14.999,91
22-12-25 * TM TUCUMAN 8 06/06 420313 10.966,66
23-12-25 * MERPAGO*CASTILLOSACIF 07/12 816506 8.325,90
```

También debe incluir al menos un caso USD real del PDF, por ejemplo:

```txt
28-05-26 K NANONOBLE PTE. LTD. USD 10,00 371072 10,00
08-06-26 K OPENAI *CHATGPT in1Tg1MPCUSD 20,00 711825 20,00
22-06-26 K OLLAMA USD 20,00 033213 20,00
```

El total del grupo debe ser:

```txt
TARJETA 4255 Total Consumos de JAVIER SEB CORBELLA 2.763.455,64 161,84
```

#### Grupo 0015

Debe comenzar con filas reales del PDF en este orden:

```txt
28-05-26 K SISTEMA INDEPENDENCIA MET 002708 2.696,50
29-05-26 K SISTEMA INDEPENDENCIA MET 009862 1.348,25
01-06-26 K SISTEMA INDEPENDENCIA MET 005813 1.348,25
02-06-26 K SISTEMA INDEPENDENCIA MET 003577 5.393,00
02-06-26 K SISTEMA INDEPENDENCIA MET 006344 1.250,00
```

Y cerrar con:

```txt
TARJETA 0015 Total Consumos de LUCAS SALVA JIMENEZ 140.813,70 0,00
```

#### Cargos e impuestos reales

Reemplazar los `0.00` por valores reales:

```txt
28-05-26 DB IVA $ PLAN V 040997 20378,50 4.279,48
02-07-26 IMPUESTO DE SELLOS $ 31.308,65
02-07-26 IMPUESTO DE SELLOS P $ 2.412,18
02-07-26 IVA RG 4240 21%( 73154,57) 15.362,45
02-07-26 DB.RG 5617 30% ( 240979,76 ) 72.293,92
TOTAL A PAGAR 3.118.842,50 161,84
```

#### Cuotas a vencer

Corregir `sourcePage`: el bloque está en página 5, no en página 8.

```txt
Julio/26 $1.689.732,93
Agosto/26 $721.063,35
Setiembre/26 $473.420,82
Octubre/26 $302.891,43
Noviembre/26 $223.224,77
Diciembre/26 $131.066,33
A partir de Enero/27 $81.066,66
```

---

## B4 — El endpoint `GET /api/card-statements/drafts/:draftId` devuelve forma Prisma, no contrato frontend

### Problema

`cardsService.getDraft()` devuelve el objeto Prisma con:

- `sections.sectionKey`
- `groups.groupKey`
- `rows.sectionKey`
- `rows.groupKey`
- `amountPesosRaw`
- `amountDollarsRaw`

Pero el frontend espera el contrato `CardStatementPreview`:

- `sections.id`
- `groups.id`
- `rows.sectionId`
- `rows.groupId`
- `rows.amountPesos`
- `rows.amountDollars`

Esto rompe el contrato de integración frontend/backend.

### Corrección requerida

Agregar un mapper backend:

```txt
workspace/backend/src/modules/cards/card-statement.mapper.ts
```

Debe convertir:

- Draft Prisma → `CardStatementPreview`
- Statement Prisma → response frontend aceptada
- Projection Prisma → `updatedValues`

`GET /drafts/:draftId` debe devolver:

```json
{
  "draftId": "...",
  "status": "preview_ready",
  "preview": { "...": "CardStatementPreview" },
  "warnings": []
}
```

No devolver el objeto Prisma crudo.

---

## B5 — `acceptDraft()` no usa transacción

### Problema

`acceptDraft()` crea statement, secciones, grupos, filas, proyecciones y luego actualiza el draft, pero no lo hace dentro de una transacción.

Si algo falla a mitad del proceso, puede quedar:

- statement creado sin proyecciones;
- draft sin pasar a accepted;
- proyecciones parciales;
- datos inconsistentes.

### Corrección requerida

Encapsular aceptación completa en:

```ts
await prisma.$transaction(async (tx) => {
  ...
});
```

La transacción debe incluir:

- creación de `CardStatement`;
- creación de secciones/grupos/filas;
- cálculo y persistencia de proyecciones;
- update de `CardStatementDraft.status = "accepted"`;
- update de `acceptedAt` si se agrega campo;
- retorno de datos aceptados.

Aplicar el mismo criterio a `updateDraft()` porque hoy borra y recrea secciones/grupos/filas fuera de transacción.

---

## B6 — Las proyecciones USD se descartan

### Problema

`InstallmentProjectionService.calculateProjections()` contiene:

```ts
if (row.currencyOriginal === "USD") {
  continue;
}
```

Pero la regla de CajaApp V3 no es ignorar dólares. La regla es:

- no convertir USD a ARS;
- mantener moneda extranjera separada;
- proyectar USD como USD cuando corresponda.

### Corrección requerida

No descartar USD.

Actualizar `MonthlyProjection` para soportar al menos:

```ts
{
  monthKey: string;
  label: string;
  totalPesos: string;
  totalDollars: string;
}
```

Y en proyecciones:

- si `currencyOriginal === "ARS"`, acumular `amountPesos`;
- si `currencyOriginal === "USD"`, acumular `amountDollars`;
- si `currencyOriginal === "MIXED"`, preservar ambos campos sin conversión.

---

## B7 — El smoke de API no demuestra servidor funcionando

### Problema

La evidencia declara:

```txt
Server runs in isolated background session - health check could not connect
```

Eso significa que no hay smoke runtime real del servidor.

### Corrección requerida

Agregar evidencia real de API smoke en:

```txt
docs/05-evidence/CAJAAPP-V3-BE-001-api-smoke-output.txt
```

Debe incluir como mínimo:

```txt
node -v
npm install
npx prisma generate
npx prisma migrate dev
npm run build
npm run test
npm run dev o npm start
GET /health => 200
```

Además, agregar un smoke interno con Fastify `app.inject()` para no depender de background jobs PowerShell:

```txt
tests/smoke/api-smoke.test.ts
```

Debe validar:

- `GET /health`;
- `GET /api/card-statements/updated-values?from=2026-07&to=2027-01`;
- `POST /api/card-statements/import` al menos con mock controlado o extracción PDF stubbeada;
- `PUT /api/card-statements/drafts/:draftId`;
- `POST /api/card-statements/drafts/:draftId/accept`.

---

## B8 — La salida de validación IA permite preview con errores bloqueantes

### Problema

`AiExtractionService.extractCardStatement()` acumula errores en `errors`, pero `ImportsService` crea igualmente el draft en estado `preview_ready`.

Eso puede generar un preview visual aunque:

- falten totales;
- falten filas;
- no haya transacciones;
- existan errores de validación.

### Corrección requerida

Separar errores en:

```ts
blockingErrors: string[]
warnings: string[]
```

Regla:

- si hay `blockingErrors`, no crear draft `preview_ready`;
- guardar `AiExtractionRun.status = "failed"`;
- devolver error controlado;
- sólo warnings no bloqueantes pueden permitir preview.

Errores bloqueantes mínimos:

- sin `summary.totalPesos`;
- sin `rows`;
- sin transacciones;
- displayOrder duplicado;
- row sin `originalText`;
- row con `sectionId` inexistente;
- row con `groupId` inexistente;
- grupo esperado ausente en golden sample.

---

## B9 — Falta validación fuerte de contrato

### Problema

El schema JSON en:

```txt
contracts/schemas/cards/card-statement-preview.schema.json
```

tiene `rows.items.type = object`, pero no define todos los campos obligatorios de cada fila.

La validación Zod sí define más campos, pero tampoco valida:

- unicidad de `displayOrder`;
- orden esperado de secciones;
- referencias válidas a secciones/grupos;
- patrón de montos;
- patrón de cuotas;
- que no existan filas inventadas en fixture golden;
- que no se use `.sort()` sobre rows de auditoría.

### Corrección requerida

Fortalecer ambos contratos:

1. `contracts/schemas/cards/card-statement-preview.schema.json`
2. `src/modules/cards/cards.schemas.ts`

Agregar validación de negocio en servicio separado:

```txt
workspace/backend/src/modules/cards/card-statement-validator.service.ts
```

Debe validar:

- `displayOrder` único;
- filas en el orden recibido;
- no `.sort()` sobre filas para preview;
- secciones requeridas;
- grupos requeridos para Galicia/Visa;
- cada row con `originalText`;
- cada `sectionId` existe;
- cada `groupId` existe si no es null;
- montos como string decimal;
- cuotas `NN/NN` cuando aplica;
- `sourcePage` entre `1` y `pageCount`.

---

# Requisitos de implementación para v1.0.2

## Mantener

La entrega v1.0.2 debe mantener:

- estructura ZIP bajo `workspace/backend/`;
- `contracts/prompts/cards/`;
- `contracts/schemas/cards/`;
- `contracts/examples/cards/`;
- `docs/03-specs/`;
- `docs/05-evidence/`;
- `docs/06-reports/`;
- Node.js 22.x;
- Prisma + SQLite local dev;
- Fastify;
- Zod;
- pdfjs-dist;
- prompts Markdown auditables.

## No hacer

No implementar todavía:

- frontend;
- PNG/JPG real;
- CSV real;
- categorización de gastos;
- recomendaciones financieras;
- cálculo en frontend;
- copia de CajaApp V2;
- persistencia de `.env`;
- inclusión de `node_modules`;
- inclusión de `dist`;
- inclusión de `.git`;
- inclusión del PDF real completo con datos sensibles.

## Entrega esperada

Generar:

```txt
APPCAJA-V3-BE-001-delivery-v1.0.2.zip
```

Debe contener:

```txt
workspace/backend/
contracts/prompts/cards/
contracts/schemas/cards/
contracts/examples/cards/
docs/03-specs/
docs/05-evidence/
docs/06-reports/
```

Debe actualizar:

```txt
docs/06-reports/APPCAJA-V3-BE-001-delivery-report.md
docs/05-evidence/APPCAJA-V3-BE-001-build-output.txt
docs/05-evidence/APPCAJA-V3-BE-001-test-output.txt
docs/05-evidence/APPCAJA-V3-BE-001-api-smoke-output.txt
```

---

# Definition of Done v1.0.2

La entrega sólo puede considerarse PASS si se cumple todo esto:

- El artifact v1.0.1 fue movido físicamente a `rejected`.
- El ZIP v1.0.2 mantiene rutas internas estándar con `/`.
- El backend vive bajo `workspace/backend/`.
- El modo mock usa el fixture golden real, no datos hardcodeados inventados.
- El fixture golden no contiene consumos inexistentes en el PDF.
- `sourcePage`, valores y grupos del fixture respetan el PDF.
- `ImportsService` usa `detectDocumentTypeWithAI()` en el flujo real.
- `GET /drafts/:draftId` devuelve contrato frontend, no Prisma crudo.
- `PUT /drafts/:draftId` valida y persiste en transacción.
- `POST /drafts/:draftId/accept` acepta en transacción.
- Las proyecciones USD no se descartan.
- `updatedValues.months` contempla pesos y dólares por separado.
- Hay validación fuerte de `displayOrder`, secciones, grupos, montos y `originalText`.
- Hay smoke real de API con `GET /health => 200`.
- Los tests pasan.
- El build pasa.
- El reporte incluye known issues honestos.

