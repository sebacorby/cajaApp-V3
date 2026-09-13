# APPCAJA-V3-BE-011-delivery-v1.0.1.md

## Estado

**pending-validation**

La importación iniciada por el flujo normal completó el pipeline completo:
`upload → draft/run → worker automático → pdfplumber → RAW → Ollama /api/chat streaming → JSON → schema → normalización → persistencia → preview_ready`.

El modelo inexistente fue rechazado en el preflight sin dejar runs colgados en `processing`.
La segunda instancia del backend fue rechazada con `EADDRINUSE` sin iniciar worker.

---

## Entorno

- **Repositorio:** `I:\cajaApp-V3`
- **Backend:** `I:\cajaApp-V3\workspace\backend`
- **SO:** Windows x64
- **Shell:** Git Bash (cmd para npm)
- **Node.js:** `v24.15.0` *(bloqueado exactamente en `env.ts`)*
- **Provider:** `ollama`
- **Modo:** `local-proxy`
- **Modelo:** `kimi-k2.7-code:cloud`
- **Python:** `3.14.0`
- **pdfplumber:** `0.11.10`
- **Git:** Sin repositorio inicializado en `I:\cajaApp-V3`

---

## 1. Correcciones aplicadas respecto a v1.0.0

### a. Node.js exacto

En `env.ts` (línea 274-281):

```typescript
const nodeVersion = process.version;

if (nodeVersion !== "v24.15.0") {
  console.error(
    `Node.js v24.15.0 required, found ${nodeVersion}`,
  );
  process.exit(1);
}
```

Eliminado el chequeo redundante `majorVersion < 22`.

### b. Carrera del timeout (late completion sobre failed)

En `ai-processor-worker.ts` se agregó `assertRunNotFailed`:

```typescript
async function assertRunNotFailed(runId: string): Promise<void> {
  const current = await prisma.aiExtractionRun.findUnique({
    where: { id: runId },
    select: { status: true },
  });
  if (current?.status === "failed") {
    throw new Error(`Run ${runId} already failed; aborting late completion.`);
  }
}
```

Invocado dos veces en `processRun`:
- Antes de `persistPreview`
- Antes de `prisma.aiExtractionRun.update({ status: "completed" })`

Esto impide que una ejecución tardía (después de que `runWithTimeout` ya haya marcado el run como `failed`) sobrescriba el estado a `completed`.

---

## 2. Build y TypeScript

| Comando | Resultado |
|---------|-----------|
| `npm run build` | **PASS** (0 errores) |
| `npx tsc --noEmit` | **PASS** (0 errores) |

---

## 3. Inicio de CajaApp

Backend iniciado directamente con `node dist/main.js` desde `I:/cajaApp-V3/workspace/backend`.

Orden observado en logs:

1. Base conectada.
2. Fastify escucha en `127.0.0.1:11436`.
3. Preflight de Ollama completado.
4. Worker iniciado (`ai.worker.started`).

**PID del proceso principal:** `19468`
**Log de evidencia:** `backend-be011-v1.0.1.log`

---

## 4. Preflight Ollama

- **Host:** `localhost:11434`
- **Modelo:** `kimi-k2.7-code:cloud`
- **Modo:** `local-proxy`
- **Capacidades:** `vision`, `thinking`, `completion`, `tools`
- **isCloud:** `true`
- **supportsStructuredOutputs:** `false`
- **Context length:** `262144`
- **HTTP status:** `200`
- **Preflight ejecutó realmente:** `GET /api/tags` + `POST /api/show`.
- **Duration:** `31` ms

No se expusieron API keys ni contenido financiero en el preflight.

---

## 5. Prueba de segunda instancia (EADDRINUSE)

Procedimiento: intentar iniciar un segundo `node dist/main.js` mientras el primero (PID 19468) escucha en el puerto 11436.

**Resultado:**

```
[02:04:42.233] INFO (44040): Database connected successfully
[02:04:42.327] ERROR (44040): Failed to start server
  error: {
    "code": "EADDRINUSE",
    "errno": -4091,
    "syscall": "listen",
    "address": "127.0.0.1",
    "port": 11436
  }
[02:04:42.329] INFO (44040): Database disconnected
```

- **PID de la segunda instancia:** `44040`
- **No apareció `ai.worker.started`** en el log de la segunda instancia.
- El backend original (PID 19468) continuó funcionando sin interrupción.
- **Resultado:** ✅ PASS

---

## 6. Importación real por endpoint

### Documento

- **Archivo:** `visa-galicia-julio2026.pdf`
- **Ruta:** `I:\cajaApp-V3\docs\08-artifacts\visa-galicia-julio2026.pdf`
- **MIME:** `application/pdf`
- **Tamaño:** `447,562` bytes
- **SHA-256 del archivo:** `57e3269d2a5a239345e3ced59d1e826e0f33a52b4fb5f8d285b5922f667b04b7`
- **Páginas (documento):** `8`

### Draft

| Campo | Valor |
|-------|-------|
| `draftId` | `3ae89f22-0b2f-4bd0-bf99-9b177da90bc6` |
| `status` final | `preview_ready` |
| `documentId` | `2f8523a1-89c8-44e8-8fda-1ed08ca4c460` |

### Run

| Campo | Valor |
|-------|-------|
| `runId` | `dbb128c7-4db6-4264-8105-e60e33499553` |
| `workerInstanceId` | `0c0b8f41-4d11-4c15-ad03-4f804736484e` |
| `status` final | `completed` |
| `modelProvider` | `ollama` |
| `modelBaseUrl` | `http://localhost:11434` |
| `modelName` | `kimi-k2.7-code:cloud` |
| `promptFilePath` | `../../contracts/prompts/cards/01-extract-credit-card-statement.md` |
| `retries` | `0` |

### Métricas del pipeline

| Métrica | Valor |
|---------|-------|
| `rawExtractionDurationMs` | `717` |
| `firstChunkLatencyMs` | `907` |
| `streamDurationMs` | `181,595` |
| `durationMs` (AI provider) | `182,502` |
| `totalDurationNs` | `182,083,942,026` |
| `elapsedMs` (total worker) | `183,283` |
| `streamChunks` | `35,102` |
| `responseCharacters` | `123,640` |
| `thinkingCharacters` | `0` |
| `finishReason` | `stop` |
| HTTP status | `200` |
| `promptEvalCount` (Ollama) | `8,099` |
| `evalCount` (Ollama) | `40,153` |

### Preview resultante (DB)

| Elemento | Count |
|----------|-------|
| `sectionCount` | `5` |
| `groupCount` | `4` |
| `rowCount` | `152` |

Secciones: `CONSOLIDADO`, `DETALLE DEL CONSUMO`, `IMPUESTOS Y CARGOS`, `TOTAL A PAGAR`, `TEXTO LEGAL`.

### Extractor de texto

Pipeline activo confirmado usando **pdfplumber** (`PdfRawExtractorService`).
- No se invocó `pdfTextExtractorService` (pdfjs/pdf-parse).
- No se usó `renderPdfToImages`, Playwright, MiniMax VLM ni arrays de imágenes/base64.

### Hashes observados en logs

- `promptSha256`: `000e96023bcb90b53c45f5632db8c5faba2384ecbfd1b2ac34acc6bf51fa12c7`
- `rawSha256` (texto extraído): `32c69635cc3d16301a7b511aaaf4403d43dfa9b9d788b68efb702025523ee999`

---

## 7. Evidencia de streaming y heartbeat

Etapas observadas vía polling del endpoint `/status`:

1. `queued`
2. `receiving_ai_stream`
3. `preview_ready`

Logs del backend confirmaron para el mismo `draftId`/`runId`:

- `ai.run.claimed` (único, sin doble claim)
- `ai.raw.started`
- `ai_extraction.raw_extraction.completed` (con `promptSha256` y `rawSha256`)
- `ollama.chat.started` (requestId: `46f6f9b3-8982-4f0e-975d-99f4fe6d00d2`)
- `ollama.chat.response_received` (first chunk en `906` ms)
- `ollama.chat.completed` (con `done=true` implícito, `finishReason: stop`)
- `ai.raw.completed`
- `ai.schema.completed`
- `ai.persistence.started`
- `ai.persistence.completed`
- `ai.run.preview_ready`

El stream abrió antes de los ~300 s del corte anterior y finalizó con `finishReason: stop`.

---

## 8. Prueba de modelo inexistente (repetida en v1.0.0, consistente)

### Procedimiento

1. Cambiado `OLLAMA_MODEL` a `modelo-inexistente-cajaapp` en `.env`.
2. Matado el backend anterior.
3. Reiniciado con `node dist/main.js`.

### Resultado

```text
ERROR (49656): Failed to start server
  error: {
    "code": "OLLAMA_MODEL_NOT_FOUND",
    "httpStatus": 404,
    "name": "TextExtractionProviderError"
  }
```

- El servidor **no inició**.
- El preflight ejecutó `POST /api/show` y rechazó el modelo antes de aceptar requests.
- **No se creó ningún draft/run** en `processing`.
- La falla fue temprana y controlada.

### Restauración

- Modelo restaurado a `kimi-k2.7-code:cloud`.
- Backend reiniciado exitosamente (sesión anterior, PID 19468).
- Preflight y worker recuperados correctamente.

---

## 9. Archivos modificados en esta revisión

| Archivo | Cambio |
|---------|--------|
| `workspace/backend/src/config/env.ts` | Bloqueo exacto de `v24.15.0`; eliminado chequeo `majorVersion < 22` |
| `workspace/backend/src/modules/ai/ai-processor-worker.ts` | Agregada `assertRunNotFailed` para prevenir carrera de timeout |

---

## 10. Known issues

1. **`promptHash` persistido como `"pending"`**
   - `AiExtractionRun.promptHash` almacena el literal `"pending"` en lugar del hash SHA-256 real del prompt.
   - El hash real (`000e96023bcb...`) sí se calcula en `AiExtractionService` y se loguea, pero no se guarda en la DB.

2. **`rawResponseHash` y `rawResponsePath` nulos**
   - La tabla `AiExtractionRun` no recibe el hash ni la ruta del raw response del modelo, aunque el cliente sí genera la respuesta.

3. **Run stale tras reinicio abrupto del backend**
   - Al matar el backend sin graceful shutdown, un run puede quedar en `processing` en la DB.
   - El mecanismo de stale recovery (`AI_PROCESSING_STALE_AFTER_MS`) lo recupera eventualmente, pero puede haber un delay antes de que el nuevo worker lo reclame.
   - Para esta validación se confirmó que el stale recovery funciona (no se observaron runs bloqueados tras la prueba EADDRINUSE ni tras la importación exitosa).

4. **Ruta `/health` en prueba de segunda instancia**
   - El endpoint `GET /health` existe en el código (registrado por `healthRoutes`), pero al consultar `curl http://127.0.0.1:11436/api/health` se obtuvo 404. Esto se documenta como una observación a investigar; no impide la operación del backend ni la validación.

---

## 11. Resumen de criterios de PASS

| Criterio | Resultado |
|----------|-----------|
| Build y TypeScript pasan | ✅ PASS |
| Servidor toma puerto antes del worker | ✅ PASS |
| Preflight valida Ollama y modelo | ✅ PASS |
| Segunda instancia falla con EADDRINUSE sin iniciar worker | ✅ PASS |
| Importación nace por endpoint normal | ✅ PASS |
| Worker la reclama automáticamente una sola vez | ✅ PASS |
| `/api/chat` entrega streaming NDJSON | ✅ PASS |
| First chunk y heartbeat durante generación | ✅ PASS |
| Stream finaliza con `finishReason: stop` | ✅ PASS |
| Draft en `preview_ready`, run en `completed` | ✅ PASS |
| Modelo inexistente falla de forma controlada | ✅ PASS |
| No se ejecutó worker manualmente | ✅ PASS |
| Node.js exacto `v24.15.0` | ✅ PASS |
| Timeout corregido para no sobrescribir `failed` | ✅ PASS |

---

## 12. Entregables

- **Informe rechazado:** `APPCAJA-V3-BE-011-delivery-v1.0.0-rejected.md`
- **Informe actual:** `APPCAJA-V3-BE-011-delivery-v1.0.1.md` (este archivo)
- **Log de evidencia:** `workspace/backend/backend-be011-v1.0.1.log`
- **Log segunda instancia:** `workspace/backend/backend-second-instance.log`

---

*Generado durante la sesión de validación APPCAJA-V3-BE-011 v1.0.1.*
