# APPCAJA-V3-FULL-001 — Vertical real PDF + IA + Front Tarjetas

## Estado

**Nueva instrucción para agente.**

Esta tarea reemplaza cualquier interpretación anterior que proponga una prueba backend-only o mock-only.

## Objetivo real de esta iteración

Después de esta iteración, el usuario debe poder hacer una prueba real desde la app:

1. Abrir el frontend de AppCaja V3.
2. Entrar a la pestaña **Tarjetas**.
3. Cargar el PDF real de resumen Galicia/Visa.
4. El backend debe enviar el contenido del PDF al modelo IA configurado por `.env`.
5. El modelo debe interpretar el PDF como resumen de tarjeta.
6. El backend debe validar, normalizar y devolver un `CardStatementPreview`.
7. El frontend debe renderizar una grilla editable tipo Excel.
8. La grilla debe respetar el **orden y agrupamiento exactos del PDF**.
9. El usuario debe poder editar valores en la grilla.
10. El usuario debe poder presionar **Aceptar datos**.
11. El backend debe persistir la información y calcular cuotas/proyecciones futuras.
12. El frontend debe mostrar **Valores actualizados** con la respuesta del backend.

La entrega sólo puede considerarse válida si este flujo se puede probar en la PC del usuario de punta a punta.

---

# 1. Contexto del proyecto

Root esperado:

```txt
I:\cajaApp-V3
```

Estructura base ya aceptada:

```txt
I:\cajaApp-V3
├── architecture-handoff/
├── contracts/
├── docs/
└── workspace/
    ├── backend/
    ├── frontend/
    └── shared/
```

El usuario decidió construir CajaApp V3 desde cero.

Regla conceptual de CajaApp V3:

- La IA no es chat.
- La IA no toma decisiones financieras.
- La IA funciona como parser/extractor de documentos financieros hacia JSON normalizado.
- El backend gobierna validación, persistencia, cálculos y proyecciones.
- El frontend sólo renderiza, permite edición y envía acciones al backend.

---

# 2. Inputs obligatorios

## 2.1 Backend actual

Usar como base la última entrega backend disponible:

```txt
APPCAJA-V3-BE-001-delivery-v1.0.2.zip
```

Debe instalarse/adaptarse bajo:

```txt
I:\cajaApp-V3\workspace\backend
```

No debe quedar código backend en raíz.

## 2.2 Prototipo frontend obligatorio

El prototipo frontend obligatorio está en:

```txt
I:\cajaApp-V3\workspace\frontend\prototype\prototype-AppCaja-v3.tar
```

El agente debe descomprimirlo, configurarlo y adaptarlo.

Está prohibido reemplazarlo por una UI nueva.

El prototipo debe conservarse visual y estructuralmente.

## 2.3 PDF golden sample

El PDF Galicia/Visa julio 2026 es fuente de verdad para esta feature.

Debe existir como artifact auditable en el repo, preferentemente en:

```txt
I:\cajaApp-V3\docs\08-artifacts\golden-samples\cards\visa-galicia-julio2026.pdf
```

Si el archivo no existe en esa ruta, buscarlo dentro de `architecture-handoff/` o en el material entregado por arquitectura.

Si no existe en el workspace, detener la tarea y reportar bloqueante. No usar otro PDF.

---

# 3. Reglas no negociables

## 3.1 El PDF dicta el orden

La pantalla Tarjetas no debe ordenar datos bajo ningún criterio propio.

Prohibido ordenar por:

- fecha;
- tarjeta;
- titular;
- monto;
- moneda;
- cuota;
- comprobante;
- categoría;
- tipo de consumo;
- cualquier criterio derivado.

El backend debe preservar `displayOrder` según el orden visual de aparición del PDF.

El frontend debe iterar y renderizar secciones, grupos y filas exactamente en el orden recibido.

Prohibido usar `.sort()` sobre secciones, grupos o filas del resumen en el frontend.

Excepción: el backend puede ordenar proyecciones mensuales por `monthKey`, porque esa tabla ya no representa el orden visual del PDF sino valores actualizados/proyectados.

## 3.2 Frontend sin cálculo financiero

El frontend no calcula:

- totales;
- cuotas;
- cuotas futuras;
- proyecciones;
- importes por mes;
- conversión de moneda;
- pago mínimo;
- impuestos;
- subtotales por tarjeta.

El frontend sólo:

- carga PDF;
- muestra estados;
- renderiza preview;
- permite editar celdas;
- envía preview editado al backend;
- muestra la respuesta del backend.

## 3.3 IA real para UAT

La próxima entrega debe permitir una prueba con IA real.

Para el gate principal debe usarse:

```env
AI_MOCK_MODE=false
```

El modo mock puede existir sólo para tests automatizados o fallback explícito de desarrollo, pero no puede ser la evidencia principal de esta tarea.

Está prohibido declarar PASS si el flujo demostrado usa mock golden en lugar del modelo real.

## 3.4 No inventar datos

Si el modelo no puede interpretar el PDF, el backend debe fallar con error claro.

Está prohibido:

- inventar filas;
- completar consumos ficticios;
- reemplazar consumos reales por mocks;
- mezclar datos de ejemplos anteriores;
- reordenar consumos para “mejor lectura”.

## 3.5 Prototipo obligatorio

El frontend debe respetar el prototipo actual.

Prohibido:

- borrar el shell;
- borrar sidebar;
- borrar header;
- borrar secciones existentes;
- quitar detalles visuales;
- reemplazar la app por una pantalla aislada;
- crear un frontend paralelo;
- modificar componentes compartidos sin necesidad real.

---

# 4. Resultado esperado al terminar

El usuario debe poder ejecutar la app y probar esto:

```txt
Frontend http://localhost:3000
Backend  http://localhost:3100
```

Flujo esperado:

```txt
Tarjetas
  ↓
Importar resumen PDF
  ↓
Seleccionar visa-galicia-julio2026.pdf
  ↓
Loading: leyendo PDF + interpretando con IA
  ↓
Preview editable tipo Excel
  ↓
Editar una celda cualquiera
  ↓
Aceptar datos
  ↓
Backend persiste + calcula
  ↓
Frontend muestra tabla Valores actualizados
```

---

# 5. Secuencia obligatoria de trabajo

## Paso 0 — Verificación inicial

Verificar:

```txt
I:\cajaApp-V3
I:\cajaApp-V3\workspace
I:\cajaApp-V3\workspace\backend
I:\cajaApp-V3\workspace\frontend
I:\cajaApp-V3\workspace\frontend\prototype\prototype-AppCaja-v3.tar
```

Verificar Node.js:

```txt
node --version
```

La versión debe ser exactamente Node.js `v24.18.0` usando la distribución `node-v24.18.0-win-x64`.

Si `node --version` no devuelve exactamente `v24.18.0`, reportar bloqueante.

No aceptar ninguna versión distinta de `v24.18.0`.

---

## Paso 1 — Instalar backend real

Tomar el contenido de:

```txt
APPCAJA-V3-BE-001-delivery-v1.0.2.zip
```

Instalarlo bajo:

```txt
I:\cajaApp-V3\workspace\backend
```

Asegurar que existan:

```txt
workspace/backend/package.json
workspace/backend/src/app.ts
workspace/backend/src/main.ts
workspace/backend/prisma/schema.prisma
workspace/backend/prisma/migrations/
workspace/backend/src/modules/imports/
workspace/backend/src/modules/cards/
workspace/backend/src/modules/ai/
workspace/backend/src/modules/projections/
workspace/backend/src/modules/manual-purchases/
```

Los contratos deben quedar bajo:

```txt
I:\cajaApp-V3\contracts\prompts\cards
I:\cajaApp-V3\contracts\schemas\cards
I:\cajaApp-V3\contracts\examples\cards
```

No duplicar contratos dentro de rutas no auditables.

---

## Paso 2 — Configurar backend para IA real

Crear o actualizar:

```txt
workspace/backend/.env
```

Debe incluir como mínimo:

```env
NODE_ENV=development
PORT=3100
DATABASE_URL=file:./dev.db
STORAGE_DIR=./storage
MAX_UPLOAD_BYTES=15728640
AI_MOCK_MODE=false
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_API_KEY=<valor_real_en_entorno_local>
OLLAMA_MODEL=<modelo_configurado_por_el_usuario>
CARD_STATEMENT_PROMPTS_DIR=../../contracts/prompts/cards
CARD_STATEMENT_SCHEMAS_DIR=../../contracts/schemas/cards
```

Reglas:

- No commitear `.env`.
- Mantener `.env.example` sin secretos.
- Si falta `OLLAMA_API_KEY`, detener y reportar bloqueante. No cambiar silenciosamente a mock.
- Si falta `OLLAMA_MODEL`, detener y reportar bloqueante.
- Si Ollama devuelve error, mostrar error claro en backend y frontend.

---

## Paso 3 — Endurecer backend para UAT real

Revisar y corregir si hace falta estos endpoints:

```txt
GET  /health
POST /api/card-statements/import
GET  /api/card-statements/drafts/:draftId
PUT  /api/card-statements/drafts/:draftId
POST /api/card-statements/drafts/:draftId/accept
GET  /api/card-statements/updated-values?from=YYYY-MM&to=YYYY-MM
POST /api/card-statements/manual-purchases
```

### 3.1 POST /api/card-statements/import

Debe aceptar `multipart/form-data` con campo de archivo.

Campo recomendado:

```txt
file
```

Debe:

1. Validar que sea PDF.
2. Guardar documento original en storage.
3. Extraer texto por página.
4. Detectar tipo de documento con IA.
5. Confirmar `credit_card_statement_pdf`.
6. Leer prompt Markdown desde `contracts/prompts/cards`.
7. Enviar texto del PDF al modelo Ollama real.
8. Recibir salida del modelo.
9. Reparar sólo si corresponde.
10. Validar contra schema backend.
11. Rechazar si hay errores bloqueantes.
12. Persistir draft.
13. Devolver `CardStatementPreview` listo para frontend.

### 3.2 GET /api/card-statements/drafts/:draftId

Debe devolver el mismo contrato de preview que espera el frontend.

No devolver forma Prisma cruda.

Debe incluir:

```txt
draftId
status
preview.source
preview.summary
preview.sections
preview.groups
preview.rows
preview.futureInstallmentsBlock
warnings
```

### 3.3 PUT /api/card-statements/drafts/:draftId

Debe recibir el preview editado desde el frontend.

Debe validar:

- schema;
- `displayOrder` sin duplicados;
- `originalText` preservado;
- referencias válidas a secciones y grupos;
- tipos de filas válidos;
- montos parseables cuando correspondan.

Debe persistir en transacción.

### 3.4 POST /api/card-statements/drafts/:draftId/accept

Debe:

1. Recibir preview editado.
2. Validarlo.
3. Persistir statement final en transacción.
4. Marcar draft como accepted.
5. Calcular proyecciones futuras en backend.
6. Mantener ARS y USD separados.
7. Devolver `updatedValues` para render.

No descartar consumos USD.

### 3.5 POST /api/card-statements/manual-purchases

Debe usarse desde el botón `+` del frontend.

El cálculo de cuotas de compra manual debe seguir en backend.

El frontend sólo envía:

```json
{
  "statementId": "...",
  "cardLast4": "4255",
  "holderName": "JAVIER SEB CORBELLA",
  "purchaseDate": "2026-07-09",
  "description": "COMPRA MANUAL TEST",
  "currency": "ARS",
  "amount": "120.000,00",
  "installments": 3,
  "notes": "UAT"
}
```

---

## Paso 4 — Preparar frontend desde prototipo tar

El frontend real debe quedar en:

```txt
I:\cajaApp-V3\workspace\frontend
```

El prototipo está en:

```txt
I:\cajaApp-V3\workspace\frontend\prototype\prototype-AppCaja-v3.tar
```

Procedimiento obligatorio:

1. Crear carpeta temporal:

```txt
I:\cajaApp-V3\workspace\frontend\_prototype_extract
```

2. Extraer el tar allí.

3. No extraer el `.tar` directamente sobre el repo raíz.

4. No copiar `.git/` del prototipo.

5. No borrar el tar original.

6. Copiar/adaptar archivos útiles del prototipo hacia:

```txt
I:\cajaApp-V3\workspace\frontend
```

7. Excluir:

```txt
.git/
node_modules/
.next/
dev.log
server.log
```

8. Preservar:

```txt
workspace/frontend/prototype/prototype-AppCaja-v3.tar
```

---

## Paso 5 — Configurar frontend para hablar con backend

Crear o actualizar:

```txt
workspace/frontend/.env.local
```

Debe incluir:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3100
```

Regla:

- No poner secretos en variables `NEXT_PUBLIC_*`.
- El frontend sólo debe conocer la URL pública/local del backend.
- La API key de Ollama vive únicamente en backend.

Crear un cliente API mínimo, por ejemplo:

```txt
workspace/frontend/src/lib/finance/card-statements-api.ts
```

Funciones esperadas:

```ts
importCardStatementPdf(file: File)
getCardStatementDraft(draftId: string)
updateCardStatementDraft(draftId: string, preview: CardStatementPreview)
acceptCardStatementDraft(draftId: string, preview: CardStatementPreview)
getUpdatedValues(from: string, to: string)
createManualPurchase(payload: ManualPurchasePayload)
```

El cliente debe usar `fetch` y manejar:

- loading;
- errores HTTP;
- errores de validación;
- errores de IA;
- backend caído;
- timeouts razonables si se implementan.

---

## Paso 6 — Integrar pestaña Tarjetas en el prototipo

Agregar sección:

```txt
tarjetas
```

Archivos esperados del prototipo a revisar:

```txt
src/lib/finance/ui-store.ts
src/lib/finance/nav.ts
src/components/finance/sections/section-router.tsx
src/components/finance/layout/sidebar.tsx
src/components/finance/layout/header.tsx
src/lib/finance/types.ts
src/lib/finance/format.ts
```

Crear o completar:

```txt
src/components/finance/sections/tarjetas-section.tsx
```

También pueden crearse subcomponentes si ayudan a mantener claridad:

```txt
src/components/finance/cards/card-statement-upload.tsx
src/components/finance/cards/card-statement-preview-grid.tsx
src/components/finance/cards/card-statement-summary.tsx
src/components/finance/cards/card-statement-manual-purchase-dialog.tsx
src/components/finance/cards/card-statement-updated-values.tsx
```

No tocar componentes globales salvo necesidad justificada.

---

## Paso 7 — UX obligatoria de Tarjetas

## 7.1 Estado inicial

Mostrar:

- título `Tarjetas`;
- subtítulo: `Importá un resumen, revisá los datos extraídos y aceptalos antes de guardarlos.`;
- card de importación;
- texto: `En esta etapa se soporta PDF de resumen de tarjeta. CSV e imágenes quedan para próximas features.`;
- botón `Importar resumen PDF`;
- input de archivo oculto o zona de carga.

## 7.2 Estado loading

Al seleccionar PDF:

- mostrar estado visible de carga;
- indicar etapas:
  - subiendo PDF;
  - extrayendo texto;
  - interpretando con IA;
  - validando datos;
  - preparando grilla.

No bloquear la UI sin mensaje.

## 7.3 Estado error

Si falla:

- mostrar error claro;
- no inventar datos;
- permitir reintentar;
- mostrar mensaje técnico expandible si existe.

Ejemplos:

```txt
No se pudo interpretar el resumen con IA.
El backend rechazó la salida porque no cumple el schema esperado.
```

## 7.4 Estado preview editable

Renderizar:

### A. Resumen superior

Mostrar datos desde backend:

- total en pesos;
- total en dólares;
- pago mínimo;
- vencimiento actual;
- próximo cierre;
- próximo vencimiento.

### B. Ciclo de facturación

Mostrar fechas en el mismo orden del PDF:

1. cierre anterior;
2. vencimiento anterior;
3. cierre actual;
4. vencimiento actual;
5. próximo cierre;
6. próximo vencimiento.

### C. Grilla tipo Excel

Columnas mínimas:

```txt
Fecha | Referencia | Cuota | Comprobante | Pesos | Dólares
```

Reglas visuales:

- tabla densa;
- header sticky;
- scroll horizontal;
- scroll vertical;
- bordes sutiles;
- `tabular-nums` para montos;
- grupos visualmente separados;
- totales destacados;
- secciones no editables diferenciadas;
- filas editables con input controlado;
- sin paginación que rompa auditoría rápida;
- sin filtros que cambien orden;
- sin ordenamiento por columnas.

Tipos de fila esperados:

```txt
section_header
group_header
transaction
group_total
consolidated_row
tax
charge
statement_total
future_installment_reference
legal_text
unknown
```

Las filas `transaction`, `tax` y `charge` pueden ser editables si backend marca `editable=true`.

Las filas de totales, headers, legal text y referencias informativas deben ser no editables salvo indicación del backend.

### D. Acciones al pie

Mostrar siempre al pie del preview:

- botón primario `Aceptar datos`;
- botón secundario `Descartar cambios`;
- botón `+` para compra manual.

## 7.5 Botón + compra manual

Debe abrir modal/drawer.

Campos:

- descripción/comercio;
- fecha;
- monto;
- moneda `ARS` / `USD`;
- cantidad de cuotas;
- tarjeta;
- observación opcional.

Regla:

- Si todavía no hay statement aceptado, la compra manual puede quedar deshabilitada o marcada como pendiente.
- Si ya hay statement aceptado, debe llamar a:

```txt
POST /api/card-statements/manual-purchases
```

No calcular cuotas en frontend.

## 7.6 Estado accepted

Al presionar `Aceptar datos`:

1. Enviar preview editado al backend.
2. Esperar respuesta.
3. Mostrar mensaje de éxito.
4. Mostrar tabla `Valores actualizados`.

Tabla mínima:

```txt
Mes | Pesos | Dólares
```

Los valores deben venir de `updatedValues` backend.

---

# 8. Datos reales esperados del PDF golden

La grilla debe demostrar que el PDF fue interpretado preservando orden.

El resumen Galicia/Visa contiene, entre otros, estos bloques en este orden:

1. Encabezado del resumen.
2. Total a pagar.
3. Ciclo de facturación.
4. Pago mínimo, límites y tasas.
5. Consolidado.
6. Detalle del consumo.
7. Grupos por tarjeta/persona.
8. Cargos e impuestos.
9. Total a pagar final.
10. Plan V / cuotas a vencer / texto legal.

Grupos esperados en el detalle de consumo:

```txt
TARJETA 6792 Total Consumos de JAVIER SEB CORBELLA
TARJETA 5884 Total Consumos de EMILSE RITA JIMENEZ
TARJETA 4255 Total Consumos de JAVIER SEB CORBELLA
TARJETA 0015 Total Consumos de LUCAS SALVA JIMENEZ
```

Ejemplos de consumos reales que deben aparecer si el modelo interpreta bien:

```txt
DLO*AMAZON MUSIC
JUANITA JO
GRANDES TIENDAS SAN JU
M Y S
WWW.FRAVEGA.COM
VISA PLAN V 9-12
NANONOBLE PTE. LTD.
OPENAI *CHATGPT
OLLAMA
METROPOLITANA SA
SISTEMA INDEPENDENCIA MET
```

Cargos/impuestos reales esperados al final:

```txt
DB IVA $ PLAN V
IMPUESTO DE SELLOS $
IMPUESTO DE SELLOS P $
IVA RG 4240
DB.RG 5617 30%
TOTAL A PAGAR
```

No deben aparecer consumos inventados como:

```txt
UBER TRIP
BOOKING.COM
SPOTIFY
AMAZON PRIME
MERCADOLIBRE
COTO
```

Salvo que realmente estén en otro PDF importado por el usuario.

---

# 9. Contratos frontend/backend

El frontend debe trabajar con el contrato backend `CardStatementPreview`.

Forma conceptual:

```ts
interface CardStatementPreview {
  statementId: string | null;
  source: {
    bankName: string | null;
    brand: string | null;
    statementNumber: string | null;
    pageCount: number;
  };
  summary: {
    totalPesos: string | null;
    totalDollars: string | null;
    minimumPaymentPesos: string | null;
    currentDueDate: string | null;
    nextClosingDate: string | null;
    nextDueDate: string | null;
  };
  sections: CardStatementSection[];
  groups: CardStatementGroup[];
  rows: CardStatementRow[];
  futureInstallmentsBlock: CardStatementRow[];
}
```

Cada fila debe incluir:

```ts
interface CardStatementRow {
  id: string;
  displayOrder: number;
  sourcePage: number | null;
  sectionId: string;
  sectionLabel: string;
  groupId: string | null;
  groupLabel: string | null;
  groupOrder: number | null;
  rowType: CardStatementRowType;
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
}
```

No normalizar visualmente de forma destructiva.

Ejemplo:

- Si el PDF dice `03/06`, mostrar `03/06`.
- Si el comprobante dice `000455`, mostrar `000455`.
- Si el movimiento trae `K` o `*`, preservar el marcador en `markerRaw` o en la referencia visible.

---

# 10. Validaciones obligatorias

## 10.1 Backend

Ejecutar:

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run build
npm test
```

Luego levantar backend:

```bash
npm run dev
```

Probar:

```txt
GET http://localhost:3100/health
```

Debe responder OK.

## 10.2 Frontend

Ejecutar:

```bash
npm install
npm run lint
npm run build
npm run dev
```

Si el prototipo requiere `bun` y está disponible, puede usarse, pero no exigirlo si npm funciona.

Levantar:

```txt
http://localhost:3000
```

## 10.3 Smoke real end-to-end

Con backend y frontend levantados:

1. Abrir frontend.
2. Ir a Tarjetas.
3. Importar `visa-galicia-julio2026.pdf`.
4. Confirmar que backend loguea `AI_MOCK_MODE=false`.
5. Confirmar llamada real a Ollama.
6. Confirmar preview renderizado.
7. Confirmar que aparecen los grupos reales:

```txt
6792
5884
4255
0015
```

8. Confirmar que aparecen consumos reales:

```txt
DLO*AMAZON MUSIC
OPENAI *CHATGPT
OLLAMA
METROPOLITANA SA
```

9. Confirmar que no aparecen filas inventadas.
10. Editar una celda de monto ARS.
11. Aceptar datos.
12. Confirmar que se muestra `Valores actualizados`.
13. Confirmar que DB contiene statement accepted.

---

# 11. Evidencia requerida

La entrega debe incluir evidencia en:

```txt
docs/05-evidence/
docs/06-reports/
```

Archivos mínimos:

```txt
docs/05-evidence/APPCAJA-V3-FULL-001-backend-install-output.txt
docs/05-evidence/APPCAJA-V3-FULL-001-backend-build-output.txt
docs/05-evidence/APPCAJA-V3-FULL-001-backend-test-output.txt
docs/05-evidence/APPCAJA-V3-FULL-001-backend-runtime-health.txt
docs/05-evidence/APPCAJA-V3-FULL-001-frontend-install-output.txt
docs/05-evidence/APPCAJA-V3-FULL-001-frontend-build-output.txt
docs/05-evidence/APPCAJA-V3-FULL-001-e2e-real-pdf-ai-output.txt
docs/05-evidence/APPCAJA-V3-FULL-001-api-import-response.sanitized.json
docs/05-evidence/APPCAJA-V3-FULL-001-api-accept-response.sanitized.json
docs/06-reports/APPCAJA-V3-FULL-001-delivery-report.md
```

Capturas o evidencia visual obligatoria:

```txt
docs/05-evidence/screenshots/01-tarjetas-inicial.png
docs/05-evidence/screenshots/02-tarjetas-loading-ia.png
docs/05-evidence/screenshots/03-tarjetas-preview-grilla.png
docs/05-evidence/screenshots/04-tarjetas-edit-cell.png
docs/05-evidence/screenshots/05-tarjetas-accepted-updated-values.png
docs/05-evidence/screenshots/06-tarjetas-manual-purchase-dialog.png
```

Si no puede tomar screenshots automáticas, documentar el motivo y dejar evidencia textual verificable.

---

# 12. Reporte obligatorio

El reporte debe indicar:

```txt
docs/06-reports/APPCAJA-V3-FULL-001-delivery-report.md
```

Debe contener:

1. Resumen de cambios.
2. Archivos modificados/creados.
3. Cómo quedó configurado backend.
4. Cómo quedó configurado frontend.
5. Endpoints probados.
6. Confirmación explícita de `AI_MOCK_MODE=false` para el smoke real.
7. Modelo Ollama usado, sin exponer API key.
8. Resultado de importación real del PDF.
9. Resultado de aceptación de datos.
10. Resultado de valores actualizados.
11. Known issues honestos.
12. Instrucciones para ejecutar la prueba manual en la PC del usuario.

No incluir secretos.

---

# 13. Definition of Done

Esta entrega sólo es PASS si se cumple todo esto:

- El backend está instalado bajo `workspace/backend`.
- El frontend está instalado bajo `workspace/frontend` desde el prototipo `.tar`.
- El prototipo conserva layout, sidebar, header, estilos y secciones existentes.
- Existe pestaña `Tarjetas`.
- El usuario puede cargar el PDF desde el frontend.
- El backend procesa el PDF con `AI_MOCK_MODE=false`.
- El backend llama al modelo Ollama configurado en `.env`.
- El modelo interpreta el PDF.
- El backend valida la salida contra schema.
- El frontend renderiza preview editable tipo Excel.
- La grilla respeta orden y agrupamiento del PDF.
- No hay ordenamiento frontend por columnas o criterios propios.
- No hay cálculos financieros en frontend.
- El usuario puede editar una celda.
- El usuario puede presionar `Aceptar datos`.
- El backend persiste statement accepted.
- El backend calcula cuotas/proyecciones futuras.
- El frontend muestra `Valores actualizados`.
- El botón `+` existe y abre carga manual.
- La compra manual no calcula cuotas en frontend.
- Existe evidencia real de smoke con PDF + IA.
- No se usan datos inventados para declarar PASS.

---

# 14. Condiciones de rechazo automático

Rechazar la entrega si ocurre cualquiera de estos casos:

- Sólo funciona con `AI_MOCK_MODE=true`.
- El frontend usa fixture local para simular importación.
- El PDF no se carga desde la UI.
- El modelo no es llamado realmente.
- La grilla no aparece en frontend.
- La grilla reordena filas.
- El frontend calcula cuotas o totales.
- Se pierde el formato visual del prototipo.
- El backend devuelve filas inventadas.
- No hay evidencia de runtime real.
- No se puede aceptar datos.
- No se muestran valores actualizados.
- El ZIP queda mal empaquetado o fuera de estructura.

---

# 15. Entrega esperada

Generar artifact:

```txt
APPCAJA-V3-FULL-001-delivery-v1.0.0.zip
```

Debe contener sólo los archivos del repo necesarios para auditar la implementación.

No incluir:

```txt
node_modules/
.next/
dist/
build/
coverage/
.env
storage/
dev.db
.git/
```

Sí incluir:

```txt
workspace/backend/
workspace/frontend/
contracts/
docs/05-evidence/
docs/06-reports/
```

El ZIP debe usar rutas internas POSIX con `/`.

Antes de entregar, validar que ningún path interno tenga `\`.

---

# 16. Nota final para el agente

No entregar una solución “casi lista”.

El objetivo de esta iteración es que el usuario pueda hacer una prueba real desde el frontend:

```txt
Subo PDF → Ollama interpreta → veo grilla editable → acepto datos → veo valores actualizados.
```

Cualquier alternativa mock-only, backend-only o frontend-only no cumple esta tarea.
