# Problema: Extracción de PDF a JSON via Ollama Vision

## Resumen

La extracción de resúmenes de tarjetas de crédito desde PDFs usando visión de Ollama funciona correctamente en tests directos pero se cuelga cuando se ejecuta a través del backend.

---

## Arquitectura Implementada

### Flujo Actual
```
Frontend → POST /api/card-statements/import → Backend
                                                    ↓
                                              setTimeout(0)
                                                    ↓
                                         processImport() async
                                                    ↓
                                         renderAllPagesToImages()
                                                    ↓
                                         ollamaClient.generateWithImages()
                                                    ↓
                                         Ollama (kimi-k2.6:cloud)
```

### Archivos Modificados

**Backend:**
- `src/modules/imports/pdf-text-extractor.service.ts` — Render PDF pages a JPEG base64
- `src/modules/imports/imports.service.ts` — Split en `startImport()` + `processImport()` + `getImportStatus()`
- `src/modules/imports/imports.controller.ts` — Endpoints `/import` y `/import/:id/status`
- `src/modules/ai/ollama.client.ts` — Usa `/api/chat` con formato `messages[].images`
- `src/modules/ai/ai-extraction.service.ts` — `normalizeModelResponse()` para transformar respuesta del modelo

---

## Pruebas Realizadas

### Test 1: Renderizado de PDF a Imagen

**Archivo:** `test-render.js`

```javascript
const canvasMod = await import("@napi-rs/canvas");
global.ImageData = canvasMod.ImageData;

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
// render page to JPEG base64
```

**Resultado:** ✅ OK — `canvas.toDataURL('image/jpeg', 0.70)` funciona correctamente con `@napi-rs/canvas`

**Detalles:**
- Puerto usado: `@napi-rs/canvas` (no `canvas` npm package)
- Formato: JPEG calidad 0.70, maxWidth 1024
- Tamaño típico por página: ~60-70KB base64

---

### Test 2: Ollama Directo con kimi-k2.7-code:cloud (2 páginas)

**Archivo:** `test-kimi.js`

```javascript
// Envía 2 páginas JPEG a Ollama
fetch('http://localhost:11434/api/chat', {
  model: 'kimi-k2.7-code:cloud',
  messages: [{ role: 'user', content: prompt, images: [base64Images] }],
  format: 'json'
})
```

**Resultado:** ✅ 19.5 segundos — El modelo devolvió JSON con summary y transactions

**Respuesta observada:**
```json
{
  "source": {"bankName":"Galicia","brand":"VISA","statementNumber":"V000000000000839532","pageCount":6},
  "summary": {"totalPesos":"3.118.842,50","totalDollars":"161,84"...},
  "rows": [{"date":"09-06-26","reference":"DLO*AMAZON MUSIC","pesos":"8.303,49"...}]
}
```

---

### Test 3: Ollama Directo con kimi-k2.6:cloud (2 páginas)

**Archivo:** `test-kimi26.js`

**Resultado:** ✅ 6.8 segundos — kimi-k2.6:cloud es ~3x más rápido

---

### Test 4: Ollama Directo con kimi-k2.6:cloud (8 páginas)

**Archivo:** `test-8pages-kimi26.js`

**Resultado:** ✅ 7.5 segundos — El modelo escala muy bien, 8 páginas casi igual que 2

---

### Test 5: Backend Completo (POST /import)

**Observación:** Se cuelga después de varios minutos. El request nunca retorna.

**Análisis:**
- El `setImmediate(() => processImport())` en `imports.service.ts` aparentemente no ejecuta `processImport()`
- O si ejecuta, el resultado nunca se persiste correctamente
- Polling a `/import/:id/status` siempre devuelve `status: "processing"`

---

## Modelos Disponibles en Ollama

```
GET http://localhost:11434/api/tags
```

```json
[
  {"name": "minimax-m3:cloud", "capabilities": ["completion","tools","thinking","vision"]},
  {"name": "kimi-k2.7-code:cloud", "capabilities": ["vision","thinking","completion","tools"]}
]
```

**Nota:** `kimi-k2.6:cloud` aparece en los logs de la conversación pero NO está en la lista de modelos disponibles. El usuario afirma que existe.

---

## Problemas Descubiertos y Soluciones

| Problema | Solución |
|----------|----------|
| `canvas` npm package no tiene `ImageData` | Usar `@napi-rs/canvas` |
| PNG escala 2 = payloads muy grandes | JPEG 0.70, maxWidth 1024 |
| `/api/generate` no soporta imágenes | Cambiar a `/api/chat` con `messages[].images` |
| Respuesta del modelo no matchea schema | `normalizeModelResponse()` transforma campos |
| `setImmediate` no ejecuta en background | ¿? |

---

## Código Clave

### ollama.client.ts — doImageRequest()

```typescript
private async doImageRequest(prompt: string, images: string[], model: string): Promise<OllamaResponse> {
  const response = await fetch(`${this.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{
        role: "user",
        content: prompt,
        images,  // array de base64
      }],
      stream: false,
      format: "json",
    }),
  });

  const data = await response.json() as { message?: { content?: string } };
  return { model, response: data.message?.content ?? "", done: true };
}
```

### imports.service.ts — startImport()

```typescript
async startImport(file) {
  // ... validación y guardar archivo ...

  const draft = await prisma.cardStatementDraft.create({
    data: { documentId, aiRunId, status: "processing", previewJson: "{}" }
  });

  // Background processing
  setTimeout(() => {
    this.processImport(draft.id, fileBuffer, pageCount).catch(err => {
      logger.error({ draftId: draft.id, error: err.message }, "Background import failed");
    });
  }, 0);

  return { draftId: draft.id, pageCount };
}
```

### getImportStatus()

```typescript
async getImportStatus(draftId: string, startTime: number): Promise<ImportStatus> {
  const draft = await prisma.cardStatementDraft.findUnique({ where: { id: draftId } });

  if (draft.status === "processing") {
    return { draftId, status: "processing", progress: { stage: "extracting", message: "...", elapsedSeconds } };
  }

  if (draft.status === "preview_ready") {
    return { draftId, status: "preview_ready", preview: JSON.parse(draft.previewJson) };
  }
  // ...
}
```

---

## Hipótesis del Bug

1. **`setTimeout(0, ...)` no funciona** en el contexto de Fastify para iniciar procesamiento async largo
2. **El callback de `setTimeout` muere** cuando el request HTTP inicial termina (posiblemente por el event loop)
3. **El proceso hijo de Node.js** no está habilitado para ejecutar tareas en background después del return

## Verificación Requerida

1. Agregar logs dentro de `processImport()` para confirmar si se ejecuta
2. Verificar si `setTimeout` con delay pequeño (ej: 100ms) cambia el comportamiento
3. Considerar usar un worker thread o un job queue (Bull/BullMQ) para el procesamiento pesado
4. Verificar que el modelo `kimi-k2.6:cloud` esté correctamente registrado en Ollama

---

## Tiempos de Referencia (kimi-k2.6:cloud)

| Escena | Tiempo |
|--------|--------|
| 2 páginas + prompt simple | 6.8s |
| 8 páginas + prompt simple | 7.5s |
| Extracción completa (8 páginas + schema complejo) | ¿? |
|through backend | SE CUELGA |

El modelo es rápido. El problema es 100% de integración con el backend.
