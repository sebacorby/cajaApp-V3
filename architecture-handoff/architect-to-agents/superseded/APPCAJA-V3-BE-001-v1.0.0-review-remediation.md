# CAJAAPP-V3-BE-001 — Revisión v1.0.0 y remediación v1.0.1

## 0. Estado de la entrega

**Entrega revisada:** `APPCAJA-V3-BE-001-delivery-v1.0.0.zip`  
**Resultado:** **RECHAZADA / NO PASS**  
**Nueva versión requerida:** `APPCAJA-V3-BE-001-delivery-v1.0.1.zip`

La entrega tiene una buena intención de arquitectura y varios módulos están encaminados, pero no puede aceptarse todavía porque contiene problemas bloqueantes de empaquetado, persistencia, contrato de API, cálculo de cuotas futuras y fidelidad contra el PDF golden sample.

---

## 1. Regla operativa para este flujo

A partir de ahora, las instrucciones hacia el agente deben entregarse como **un único archivo Markdown detallado**.

No enviar instrucciones comprimidas en ZIP.

El ZIP sigue siendo válido como **artifact de entrega del agente**, pero las instrucciones/remediaciones deben ir en `.md` para evitar ambigüedad.

---

## 2. Acción obligatoria sobre el artifact rechazado

Mover físicamente el ZIP rechazado:

```txt
Desde:
I:\cajaApp-V3\architecture-handoff\agents-to-architect\pending-validation\APPCAJA-V3-BE-001-delivery-v1.0.0.zip

Hacia:
I:\cajaApp-V3\architecture-handoff\agents-to-architect\rejected\APPCAJA-V3-BE-001-delivery-v1.0.0.zip
```

Registrar en el reporte de `v1.0.1` que `v1.0.0` fue rechazada y movida a `rejected`.

---

## 3. Resumen de hallazgos

### Lo que está bien encaminado

- Se propone backend con Node.js 22.x, TypeScript, Fastify, Prisma, SQLite y Zod.
- Se crean módulos separados para importación, IA, tarjetas, proyecciones y compras manuales.
- Existen prompts auditables bajo `contracts/prompts/cards`.
- Existen schemas bajo `contracts/schemas/cards`.
- Existe `.env.example`.
- Hay tests iniciales para dinero, cuotas, detección de tipo y preservación de `displayOrder`.
- No se incluye el PDF real con datos personales.
- No se incluye `node_modules`, `.git`, `dist` ni `storage`.

### Pero la entrega no pasa por los bloqueantes detallados abajo.

---

## 4. Bloqueante 1 — El ZIP está empaquetado en la raíz incorrecta

El artifact contiene archivos como:

```txt
package.json
tsconfig.json
.env.example
vitest.config.ts
prisma/schema.prisma
src/main.ts
src/app.ts
```

Eso es incorrecto para CajaApp V3.

La estructura esperada es:

```txt
workspace/backend/package.json
workspace/backend/tsconfig.json
workspace/backend/.env.example
workspace/backend/vitest.config.ts
workspace/backend/prisma/schema.prisma
workspace/backend/src/main.ts
workspace/backend/src/app.ts
```

### Por qué bloquea

Si este ZIP se extrae en `I:\cajaApp-V3`, deja `package.json`, `src/` y `prisma/` en la raíz del repo, rompiendo la separación obligatoria:

```txt
workspace/     -> código real
contracts/     -> prompts, schemas, examples
docs/          -> documentación/evidencia
```

### Remediación requerida

Rearmar el ZIP `v1.0.1` con raíz portable:

```txt
workspace/backend/
contracts/
docs/
```

No debe existir `package.json` en la raíz del ZIP.

Validar antes de entregar:

- Existe `workspace/backend/package.json`.
- Existe `workspace/backend/src/main.ts`.
- Existe `workspace/backend/prisma/schema.prisma`.
- No existe `package.json` en la raíz.
- No existe `src/` en la raíz.
- No existe `prisma/` en la raíz.
- No existen rutas internas con `\`; usar `/`.

---

## 5. Bloqueante 2 — Falta `docs/03-specs`

La instrucción original pedía crear:

```txt
docs/03-specs/CAJAAPP-V3-BE-001-card-pdf-ai-backend-spec.md
```

No está presente en el artifact.

### Remediación requerida

Crear el spec técnico en:

```txt
docs/03-specs/CAJAAPP-V3-BE-001-card-pdf-ai-backend-spec.md
```

Debe explicar:

- propósito del backend;
- flujo PDF -> texto -> IA -> JSON -> draft -> aceptación -> persistencia -> proyecciones;
- endpoints;
- modelo de datos;
- contrato de preview;
- reglas de dinero;
- reglas de cuotas;
- restricciones de IA;
- seguridad/privacidad;
- relación con frontend.

---

## 6. Bloqueante 3 — Falta `prisma/migrations`

La instrucción original pedía:

```txt
workspace/backend/prisma/migrations/
```

El artifact sólo incluye:

```txt
prisma/schema.prisma
```

### Remediación requerida

Incluir una migración inicial real generada por Prisma:

```txt
workspace/backend/prisma/migrations/<timestamp>_init/migration.sql
```

También incluir evidencia de:

```txt
npx prisma generate
npx prisma migrate dev
```

Si por alguna razón no se puede ejecutar `migrate dev`, documentar el bloqueo exacto y dejar alternativa explícita. Pero la expectativa para `v1.0.1` es que exista migración.

---

## 7. Bloqueante 4 — Las relaciones Prisma están mal modeladas

El schema define relaciones donde `CardStatementDraftRow.sectionId` referencia `CardStatementDraftSection.id`.

Ejemplo conceptual del problema:

```prisma
sectionId String
section CardStatementDraftSection @relation(fields: [sectionId], references: [id])
```

Pero el servicio guarda:

```ts
sectionId: r.sectionId
```

donde `r.sectionId` es un ID lógico del contrato, por ejemplo:

```txt
consolidated
consumption-detail
charges
```

No es el UUID real de la tabla `CardStatementDraftSection`.

Lo mismo ocurre con `groupId`, donde se intenta relacionar `g-6792` contra el UUID real de `CardStatementDraftGroup.id`.

### Por qué bloquea

La creación de drafts y statements puede fallar en runtime por foreign keys inválidas o dejar relaciones inconsumibles.

### Remediación requerida

Elegir una de estas dos soluciones, preferentemente la opción A.

#### Opción A — Separar ID DB de key lógica

Ejemplo recomendado:

```prisma
model CardStatementDraftSection {
  id           String @id @default(uuid())
  draftId      String
  sectionKey   String
  label        String
  displayOrder Int

  @@unique([draftId, sectionKey])
}

model CardStatementDraftGroup {
  id           String @id @default(uuid())
  draftId      String
  groupKey     String
  sectionKey   String
  label        String
  displayOrder Int
  cardLast4    String?
  holderName   String?

  @@unique([draftId, groupKey])
}

model CardStatementDraftRow {
  id            String @id @default(uuid())
  draftId       String

  sectionKey    String
  groupKey      String?

  displayOrder  Int
  sourcePage    Int?
  rowType       String
  editable      Boolean

  originalText  String
}
```

En este diseño, `sectionKey` y `groupKey` son claves lógicas para preservar el contrato del frontend y del PDF. Las relaciones DB pueden mantenerse mediante IDs internos o reconstruirse por `draftId + key`.

#### Opción B — Relaciones compuestas

Usar `@@unique([draftId, sectionId])` y relaciones compuestas. Es válido, pero más frágil y más incómodo para esta etapa.

### Regla

No usar el mismo campo para dos conceptos distintos:

- `id` de DB;
- `sectionId/groupId` lógico del contrato.

---

## 8. Bloqueante 5 — El endpoint de aceptación no calcula ni persiste cuotas futuras

`CardsService.acceptDraft()` crea el `CardStatement`, pero no invoca el servicio de proyecciones ni crea registros `CardInstallmentProjection`.

El servicio `InstallmentProjectionService` existe, pero no queda integrado en el flujo real de aceptación.

### Por qué bloquea

La feature principal exige:

> recién al tocar “Aceptar datos” se guarda en BD y el backend calcula consumos futuros.

En la entrega actual, al aceptar se crea el statement, pero `statement.projections` queda vacío.

### Remediación requerida

En `acceptDraft`:

1. Revalidar el preview aceptado.
2. Persistir `CardStatement`.
3. Persistir secciones, grupos y filas aceptadas.
4. Calcular proyecciones desde las filas aceptadas.
5. Persistir `CardInstallmentProjection`.
6. Devolver `updatedValues` con meses y filas actualizadas.

El mes base para el resumen debe salir de:

```txt
summary.currentDueDate
```

Ejemplo:

```txt
currentDueDate = 2026-07-13
statementMonthKey = 2026-07
```

Reglas de proyección:

- `02/03` impacta la cuota actual en `2026-07` y proyecta `03/03` en `2026-08`.
- `01/06` impacta la cuota actual en `2026-07` y proyecta `02/06` a `06/06` en meses siguientes.
- Si no hay cuota, impacta sólo el mes actual.
- Si `current >= total`, no proyecta meses futuros.
- USD se proyecta como USD, sin conversión a ARS.
- `group_total`, `statement_total`, `legal_text` no proyectan.
- Impuestos/cargos no proyectan salvo que tengan cuota explícita y `rowType` lo permita.

---

## 9. Bloqueante 6 — Falta endpoint para actualizar draft editado

La instrucción pedía:

```http
PUT /api/card-statements/drafts/:draftId
```

No está implementado.

### Por qué bloquea

El frontend necesita poder enviar las ediciones del usuario antes de aceptar.

La secuencia correcta es:

```txt
Importar PDF
  -> crear draft
  -> frontend edita celdas
  -> PUT draft editado
  -> POST accept
  -> persistencia final + proyecciones
```

### Remediación requerida

Implementar:

```http
PUT /api/card-statements/drafts/:draftId
```

Body:

```json
{
  "preview": { "...": "CardStatementPreview editado" }
}
```

Debe validar:

- `displayOrder` sigue presente;
- `displayOrder` no se duplica;
- no faltan filas críticas;
- no se pierde `originalText`;
- no se pierden `sectionId`, `groupId`, `rowType`;
- no se convierten `group_total` o `statement_total` en transacciones;
- comprobantes con ceros a la izquierda siguen como string;
- sólo se editan campos permitidos en filas `editable = true`.

Debe persistir la versión editada como draft actual.

---

## 10. Bloqueante 7 — Fixture/mock no respeta el golden sample

El fixture/mock actual usa datos ficticios como:

```txt
AMAZON.COM
UBER TRIP
BOOKING.COM
NETFLIX.COM
```

y ubica filas en páginas que no corresponden.

Eso no representa el PDF Galicia/Visa usado como fuente de verdad.

### Por qué bloquea

El golden sample no es decorativo. Define el orden, agrupamiento y forma esperada de la pantalla de tarjetas.

El resumen real empieza con encabezado, total a pagar, ciclo, pago mínimo/límites/tasas, consolidado y luego `DETALLE DEL CONSUMO`, preservando grupos por tarjeta.

### Remediación requerida

Reemplazar los fixtures sanitizados por datos derivados del PDF real, manteniendo orden relativo.

Debe incluir, como mínimo:

#### Secciones esperadas

```txt
header
total-to-pay
billing-cycle
payment-limits-rates
consolidated
consumption-detail
charges-and-taxes
statement-total
plan-v
future-installments
legal-text
```

#### Grupos de tarjeta en este orden

```txt
TARJETA 6792 Total Consumos de JAVIER SEB CORBELLA
TARJETA 5884 Total Consumos de EMILSE RITA JIMENEZ
TARJETA 4255 Total Consumos de JAVIER SEB CORBELLA
TARJETA 0015 Total Consumos de LUCAS SALVA JIMENEZ
```

#### Filas representativas obligatorias

Incluir filas reales/sanitizadas, respetando orden:

```txt
09-06-26 * DLO*AMAZON MUSIC 003611 8.303,49
TARJETA 6792 Total Consumos de JAVIER SEB CORBELLA 8.303,49 0,00

15-11-25 * JUANITA JO 08/09 000563 58.055,55
23-03-26 * GRANDES TIENDAS SAN JU 03/03 003731 33.922,66
...
TARJETA 5884 Total Consumos de EMILSE RITA JIMENEZ 126.356,80 0,00

25-08-25 * WWW.FRAVEGA.COM 11/12 008224 200.416,50
16-10-25 VISA PLAN V 9-12 (TNA 83,81) 040997 87.118,23
...
TARJETA 4255 Total Consumos de JAVIER SEB CORBELLA 2.763.455,64 161,84

28-05-26 K SISTEMA INDEPENDENCIA MET 002708 2.696,50
...
TARJETA 0015 Total Consumos de LUCAS SALVA JIMENEZ 140.813,70 0,00
```

Después de los grupos deben venir cargos/impuestos, en el orden del PDF:

```txt
DB IVA $ PLAN V
IMPUESTO DE SELLOS $
IMPUESTO DE SELLOS P $
IVA RG 4240
DB.RG 5617 30%
TOTAL A PAGAR
```

También debe existir el bloque `Cuotas a vencer` con:

```txt
Julio/26
Agosto/26
Setiembre/26
Octubre/26
Noviembre/26
Diciembre/26
A partir de Enero/27
```

### Regla

El fixture puede estar sanitizado, pero no puede inventar comercios ni alterar el orden.

---

## 11. Bloqueante 8 — El contrato de secciones está incompleto

El preview actual contiene sólo:

```txt
consolidated
charges
plan-v
future-installments
```

Faltan bloques relevantes del PDF:

- encabezado;
- total a pagar;
- ciclo de facturación;
- pago mínimo;
- límites;
- tasas;
- detalle del consumo;
- total final;
- texto legal.

### Remediación requerida

Extender schema/tipos/fixture para representar el resumen completo de forma auditable.

No hace falta que todo sea editable, pero sí debe estar modelado como bloques/filas ordenadas.

---

## 12. Bloqueante 9 — Evidencia de smoke incompleta

El archivo de smoke dice:

```txt
Note: Full API test requires running server with `npm run dev`
```

Eso significa que el smoke no fue realmente ejecutado de punta a punta.

### Remediación requerida

Ejecutar y evidenciar:

```txt
node -v
npm install
npx prisma generate
npx prisma migrate dev
npm run build
npm run test
npm run dev
GET /health
POST /api/card-statements/import con AI_MOCK_MODE=true
GET /api/card-statements/drafts/:draftId
PUT /api/card-statements/drafts/:draftId
POST /api/card-statements/drafts/:draftId/accept
POST /api/cards/manual-purchases
GET /api/cards/updated-values?from=2026-07&to=2027-01
```

Si el servidor se levanta en background, detenerlo al final y documentar el PID/comando usado.

No pedirle comandos al usuario.

---

## 13. Bloqueante 10 — Inconsistencia de `AI_MOCK_MODE`

El reporte dice:

```txt
AI_MOCK_MODE=true por defecto
```

Pero `.env.example` trae:

```env
AI_MOCK_MODE=false
```

y `src/config/env.ts` default también es false.

### Remediación requerida

Definir una regla clara.

Recomendación para desarrollo:

```env
AI_MOCK_MODE=true
```

en `.env.example`, con comentario claro:

```txt
Para smoke local sin credenciales Ollama usar true.
Para integración real con Ollama usar false y configurar OLLAMA_API_KEY + OLLAMA_MODEL.
```

El código puede mantener default `false`, pero el `.env.example` y el reporte no deben contradecirse.

---

## 14. Bloqueante 11 — `lint` está mal declarado

`package.json` contiene:

```json
"lint": "eslint . --fix"
```

Pero no hay configuración ni dependencia de ESLint incluida.

### Remediación requerida

Elegir una opción:

#### Opción A — Configurar lint mínimo

Agregar dependencias/config correspondientes y usar:

```json
"lint": "eslint ."
```

No usar `--fix` como gate.

#### Opción B — Sacar lint de esta entrega

Si no se configura ESLint todavía, eliminar el script o documentar explícitamente que lint no aplica en BE-001.

No dejar un script roto.

---

## 15. Bloqueante 12 — Dinero exacto no está completo en DB

La instrucción pedía no usar floats para cálculos monetarios y guardar montos de forma exacta.

La implementación usa strings en DB para importes, y en algunos agregados usa `parseFloat`.

### Remediación requerida

Para cálculos:

- usar BigInt en centavos;
- no usar `parseFloat` para acumulados;
- guardar en DB, como mínimo:
  - `amountOriginalRaw`;
  - `amountCents` o `amountCentsRaw`;
  - `currency`.

Si SQLite/Prisma complica `BigInt`, se puede guardar centavos como `String`, pero el cálculo en TypeScript debe usar `BigInt`.

Ejemplo:

```ts
const total = rows.reduce((acc, row) => acc + parseMoneyToCents(row.amountPesos), 0n)
```

---

## 16. Bloqueante 13 — Falta integración real del detector IA

Existe prompt:

```txt
00-detect-document-type.md
```

pero la detección real se hace sólo por keywords en backend.

Eso puede estar bien como primera barrera, pero la instrucción decía que luego de leer el documento el modelo debía interpretar qué se está enviando y actuar según tipo.

### Remediación requerida

Implementar flujo híbrido:

1. Detectar tipo de archivo por MIME/extensión.
2. Para PDF, extraer texto.
3. Hacer detección backend rápida por keywords.
4. Si es PDF candidato, usar prompt `00-detect-document-type.md` vía IA cuando `AI_MOCK_MODE=false`.
5. Para esta entrega sólo continuar si el resultado es `credit_card_statement_pdf`.
6. CSV/PNG/JPG deben devolver no soportado en esta etapa.

En modo mock, documentar respuesta simulada.

---

## 17. Bloqueante 14 — Posible fragilidad de extracción PDF

El extractor usa `pdfjs-dist` con:

```ts
await import("pdfjs-dist")
```

y concatena los items de texto con espacios. Esto puede perder estructura tabular y columnas.

### Remediación requerida

Validar extracción con el PDF Galicia/Visa real de forma local, sin commitear el PDF.

Evidencia requerida:

```txt
pageCount = 8
se detecta "DETALLE DEL CONSUMO"
se detecta "TARJETA 6792"
se detecta "TARJETA 5884"
se detecta "TARJETA 4255"
se detecta "TARJETA 0015"
se detecta "TOTAL A PAGAR"
se detecta "Cuotas a vencer"
```

Si `pdfjs-dist` falla en Node, usar import compatible Node/legacy o cambiar a librería equivalente, documentando la decisión.

---

## 18. Reglas de no regresión

La `v1.0.1` debe conservar:

- Node.js 22.x obligatorio.
- No frontend.
- No `.env`.
- No PDF real.
- No `node_modules`.
- No `dist`.
- No `.git`.
- No copia de CajaApp V2.
- Prompts en Markdown.
- Schemas bajo `contracts/schemas/cards`.
- Tests.
- Evidencias.
- Reporte.

---

## 19. Estructura esperada del ZIP v1.0.1

El ZIP debe contener, como mínimo:

```txt
workspace/backend/package.json
workspace/backend/tsconfig.json
workspace/backend/.env.example
workspace/backend/vitest.config.ts
workspace/backend/prisma/schema.prisma
workspace/backend/prisma/migrations/<timestamp>_init/migration.sql
workspace/backend/src/main.ts
workspace/backend/src/app.ts
workspace/backend/src/config/env.ts
workspace/backend/src/db/prisma.ts
workspace/backend/src/modules/health/health.routes.ts
workspace/backend/src/modules/cards/cards.routes.ts
workspace/backend/src/modules/cards/cards.controller.ts
workspace/backend/src/modules/cards/cards.service.ts
workspace/backend/src/modules/cards/cards.schemas.ts
workspace/backend/src/modules/cards/cards.types.ts
workspace/backend/src/modules/imports/imports.routes.ts
workspace/backend/src/modules/imports/imports.controller.ts
workspace/backend/src/modules/imports/imports.service.ts
workspace/backend/src/modules/imports/document-detector.service.ts
workspace/backend/src/modules/imports/pdf-text-extractor.service.ts
workspace/backend/src/modules/ai/ollama.client.ts
workspace/backend/src/modules/ai/prompt-loader.ts
workspace/backend/src/modules/ai/ai-extraction.service.ts
workspace/backend/src/modules/ai/json-repair.service.ts
workspace/backend/src/modules/projections/installment-projection.service.ts
workspace/backend/src/modules/manual-purchases/manual-purchases.routes.ts
workspace/backend/src/modules/manual-purchases/manual-purchases.controller.ts
workspace/backend/src/modules/manual-purchases/manual-purchases.service.ts
workspace/backend/tests/cards/card-statement.schema.test.ts
workspace/backend/tests/cards/installment-projection.service.test.ts
workspace/backend/tests/imports/pdf-import-contract.test.ts
workspace/backend/tests/imports/display-order-preservation.test.ts
contracts/prompts/cards/00-detect-document-type.md
contracts/prompts/cards/01-extract-credit-card-statement.md
contracts/prompts/cards/02-repair-credit-card-json.md
contracts/schemas/cards/card-statement-import.schema.json
contracts/schemas/cards/card-statement-preview.schema.json
contracts/schemas/cards/card-statement-accepted.schema.json
contracts/examples/cards/visa-galicia-julio2026.sanitized.preview.json
contracts/examples/cards/visa-galicia-julio2026.sanitized.accepted.json
docs/03-specs/CAJAAPP-V3-BE-001-card-pdf-ai-backend-spec.md
docs/05-evidence/CAJAAPP-V3-BE-001-build-output.txt
docs/05-evidence/CAJAAPP-V3-BE-001-test-output.txt
docs/05-evidence/CAJAAPP-V3-BE-001-api-smoke-output.txt
docs/06-reports/CAJAAPP-V3-BE-001-delivery-report.md
```

---

## 20. Validación obligatoria del ZIP antes de entregar

El agente debe validar el ZIP generado.

Criterios:

```txt
PASS: no hay rutas con backslash \
PASS: no hay package.json en raíz
PASS: existe workspace/backend/package.json
PASS: existe workspace/backend/src/main.ts
PASS: existe workspace/backend/prisma/schema.prisma
PASS: existe workspace/backend/prisma/migrations/
PASS: existe docs/03-specs/CAJAAPP-V3-BE-001-card-pdf-ai-backend-spec.md
PASS: existe contracts/prompts/cards/00-detect-document-type.md
PASS: existe contracts/prompts/cards/01-extract-credit-card-statement.md
PASS: existe contracts/prompts/cards/02-repair-credit-card-json.md
PASS: no existe .env
PASS: no existe node_modules/
PASS: no existe dist/
PASS: no existe .git/
PASS: no existe storage/
PASS: no existe PDF real con datos personales
```

Si genera el ZIP con Python, usar:

```py
arcname = relative_path.as_posix()
```

No usar `str(path)` como `arcname` en Windows.

---

## 21. Tests mínimos nuevos/reparados para v1.0.1

Agregar o corregir tests para cubrir:

1. El fixture golden sanitizado contiene grupos en orden:
   - 6792
   - 5884
   - 4255
   - 0015

2. El fixture golden sanitizado contiene cargos/impuestos después de consumos.

3. `acceptDraft` crea `CardInstallmentProjection`.

4. `acceptDraft` devuelve `updatedValues.months` no vacío cuando hay cuotas pendientes.

5. `PUT /api/card-statements/drafts/:draftId` valida y persiste edición.

6. No se acepta un draft si se pierde `originalText`.

7. No se acepta un draft si hay `displayOrder` duplicado.

8. No se usa `parseFloat` para sumar dinero.

9. La compra manual en 3 cuotas preserva centavos y genera 3 proyecciones.

10. Las compras USD se proyectan en USD sin conversión a ARS.

11. CSV/PNG/JPG siguen rechazados como features futuras.

12. En modo mock, la importación produce preview válido.

---

## 22. Smoke obligatorio para v1.0.1

El reporte debe incluir evidencia real de ejecución.

Ejemplo esperado:

```txt
node -v
v22.x.x

npm install
SUCCESS

npx prisma generate
SUCCESS

npx prisma migrate dev
SUCCESS

npm run build
SUCCESS

npm run test
SUCCESS

npm run dev
SUCCESS

GET /health
200 OK

POST /api/card-statements/import
200 OK preview_ready

GET /api/card-statements/drafts/:draftId
200 OK

PUT /api/card-statements/drafts/:draftId
200 OK

POST /api/card-statements/drafts/:draftId/accept
200 OK accepted, updatedValues.months.length > 0

POST /api/cards/manual-purchases
200 OK, projections.length = installments

GET /api/cards/updated-values?from=2026-07&to=2027-01
200 OK
```

No alcanza con describir que el smoke “requiere correr el servidor”.

---

## 23. Reporte obligatorio v1.0.1

Actualizar:

```txt
docs/06-reports/CAJAAPP-V3-BE-001-delivery-report.md
```

Debe incluir:

- v1.0.0 rechazada y movida a `rejected`;
- cambios hechos en v1.0.1;
- estructura corregida del ZIP;
- migración Prisma generada;
- endpoints implementados;
- endpoints testeados;
- validación real de ZIP;
- resultados build/test/smoke;
- known issues honestos;
- confirmación de que no se modificó frontend;
- confirmación de que no se incluyó PDF real;
- confirmación de que no se copiaron artifacts de CajaApp V2.

---

## 24. Definition of Done v1.0.1

La remediación sólo puede considerarse PASS si:

- El ZIP respeta la estructura `workspace/backend`.
- No hay archivos backend en la raíz del repo.
- Existe spec en `docs/03-specs`.
- Existe migración Prisma inicial.
- El modelo Prisma no mezcla IDs lógicos con UUIDs de DB.
- Importación PDF crea draft funcional.
- Existe update de draft editado.
- Aceptación persiste statement final.
- Aceptación calcula y persiste cuotas futuras.
- `updatedValues` devuelve meses reales.
- Compra manual genera proyecciones.
- Fixture golden sanitizado respeta el orden del PDF Galicia/Visa.
- Prompts siguen en Markdown.
- Schemas siguen en `contracts`.
- Tests pasan.
- Build pasa.
- Smoke real fue ejecutado y evidenciado.
- No hay frontend modificado.
- No hay `.env`, secretos, PDF real, `node_modules`, `.git`, `dist` ni `storage`.

---

## 25. Criterio de rechazo inmediato v1.0.1

Rechazar si ocurre cualquiera de estos puntos:

- El ZIP vuelve a traer `package.json` en raíz.
- No hay `workspace/backend/package.json`.
- No hay migración Prisma.
- `acceptDraft` no crea proyecciones.
- No existe `PUT /api/card-statements/drafts/:draftId`.
- El fixture usa datos ficticios no derivados del PDF.
- Se pierde el orden de grupos del PDF.
- Se usa float/`parseFloat` para acumulados monetarios.
- Se acepta un draft con estructura inválida.
- Se modifica frontend.
- Se incluye PDF real con datos personales.
- Se omite el movimiento físico del ZIP rechazado.
