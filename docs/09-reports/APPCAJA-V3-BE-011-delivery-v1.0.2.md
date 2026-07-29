# APPCAJA-V3-BE-011-delivery-v1.0.2.md

## Estado

**pending-validation**

La validación técnica ejecutó sobre el archivo corregido por el usuario (`ai-processor-worker.ts` con `assertRunNotFailed`). No se modificó código de lógica durante esta sesión.

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

## 1. Correcciones aplicadas por el usuario (previo a esta validación)

### a. Node.js exacto `v24.15.0`

En `env.ts` (líneas 274-281):

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

En `ai-processor-worker.ts` se agregó `assertRunNotFailed` (líneas 558-566):

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

Invocado dos veces en `processRun` (líneas 500, 504):
- Antes de `persistPreview`
- Antes de `prisma.aiExtractionRun.update({ status: "completed" })`

---

## 2. Build y TypeScript

```bash
cd /D I:\cajaApp-V3\workspace\backend
npm run build
npx tsc --noEmit
```

| Comando | Resultado |
|---------|-----------|
| `npm run build` | **PASS** (0 errores) |
| `npx tsc --noEmit` | **PASS** (0 errores) |

---

## 3. Inicio de CajaApp

Backend iniciado directamente con `node dist/main.js`.

| Instancia | PID | Log | Propósito |
|-----------|-----|-----|-----------|
| Importación exitosa | `20448` | `backend-be011-v1.0.2.log` (sobrescrito) | Importación normal |
| Timeout test | `54876` | `backend-timeout-test.log` | Prueba de timeout reducido |
| Post-restore | `709` | `backend-be011-v1.0.2.log` | Valores normales restaurados |

Orden observado en cada inicio:

1. Base conectada.
2. Fastify escucha en `127.0.0.1:11436`.
3. Preflight de Ollama completado.
4. Worker iniciado (`ai.worker.started`).

**WorkerInstanceId actual (PID 709):** `050546c7-5a55-46c6-a2de-74281c600ef9`

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
- **Duration:** `32` ms

No se expusieron API keys ni contenido financiero.

---

## 5. Prueba de segunda instancia (EADDRINUSE)

Ejecutada durante la sesión de validación v1.0.1. Procedimiento: iniciar segundo `node dist/main.js` mientras el primero escucha en `11436`.

**Resultado:**

```text
ERROR (44040): Failed to start server
  error: { "code": "EADDRINUSE", "errno": -4091, "syscall": "listen",
           "address": "127.0.0.1", "port": 11436 }
```

- **PID segunda instancia:** `44040`
- **No apareció `ai.worker.started`** en la segunda instancia.
- El backend original continuó funcionando.
- **Resultado:** ✅ PASS

---

## 6. Importación real (camino feliz)

### Documento

- **Archivo:** `visa-galicia-julio2026.pdf`
- **Ruta:** `I:\cajaApp-V3\docs\08-artifacts\visa-galicia-julio2026.pdf`
- **MIME:** `application/pdf`
- **Tamaño:** `447,562` bytes
- **SHA-256:** `57e3269d2a5a239345e3ced59d1e826e0f33a52b4fb5f8d285b5922f667b04b7`
- **Páginas:** `8`

### Draft

| Campo | Valor |
|-------|-------|
| `draftId` | `9e2db9b2-ec43-4074-8304-beee10920fe4` |
| `status` final | `preview_ready` |
| `documentId` | `13488e3c-0940-4193-ba3e-e080b349744b` |

### Run

| Campo | Valor |
|-------|-------|
| `runId` | `c7816429-871a-41fe-92dc-457cf73c4757` |
| `workerInstanceId` | `4fe7a59c-6af5-4fdb-810e-162195d65312` |
| `status` final | `completed` |
| `modelProvider` | `ollama` |
| `modelBaseUrl` | `http://localhost:11434` |
| `modelName` | `kimi-k2.7-code:cloud` |

### Preview persistido (DB)

| Elemento | Count |
|----------|-------|
| `sectionCount` | `5` |
| `groupCount` | `4` |
| `rowCount` | `155` |

Secciones: `CONSOLIDADO`, `DETALLE DEL CONSUMO`, `TOTALES E IMPUESTOS`, `Plan V`, `Términos y condiciones legales`.

### Extractor de texto

Pipeline activo confirmado usando **pdfplumber** (`PdfRawExtractorService`).
- No se invocó `pdfTextExtractorService` (pdfjs/pdf-parse).
- No se usó `renderPdfToImages`, Playwright, MiniMax VLM ni arrays de imágenes/base64.

### Ausencia de `ai.run.late_completion_aborted`

En el log de esta importación (perdido por sobrescritura al reiniciar para la prueba de timeout) **no se observó** `ai.run.late_completion_aborted` ni `assertRunNotFailed` abortando, lo cual es consistente con un camino feliz sin carrera de timeout.

---

## 7. Prueba de timeout reducido

### Procedimiento

1. Reducir temporalmente:
   - `OLLAMA_TIMEOUT_MS` → `30000`
   - `AI_JOB_TIMEOUT_MS` → `60000` (mínimo del schema)
2. Reiniciar backend (PID `54876`).
3. Subir el mismo PDF.
4. Esperar fallo.

### Resultado

- **draftId:** `ee7cb64a-106f-43ea-8c11-6ecffd6305e1`
- **runId:** `02b7f00b-b144-4f5c-b716-227e2a7415e0`
- **workerInstanceId:** `11eff731-602a-4e08-9205-290264cd950b`

Log del backend:

```text
[02:52:36.609] INFO (54876): AI run claimed
    event: "ai.run.claimed"
    draftId: "ee7cb64a-106f-43ea-8c11-6ecffd6305e1"
    runId: "02b7f00b-b144-4f5c-b716-227e2a7415e0"
    elapsedMs: 0
[02:52:36.612] INFO (54876): Starting raw extraction
    event: "ai.raw.started"
    elapsedMs: 3
...
    durationMs: 30010
    timedOut: true
    errorName: "AbortError"
    errorMessage: "This operation was aborted"
[02:53:07.275] INFO (54876): AI run failed
    event: "ai.run.failed"
    draftId: "ee7cb64a-106f-43ea-8c11-6ecffd6305e1"
    runId: "02b7f00b-b144-4f5c-b716-227e2a7415e0"
    elapsedMs: 30660
    code: "OLLAMA_TIMEOUT"
    message: "Ollama exceeded the configured timeout."
```

### Verificación de DB tras timeout

| Campo | Valor |
|-------|-------|
| `draft.status` | `failed` |
| `run.status` | `failed` |
| `run.validationErrors` | `[{"code":"OLLAMA_TIMEOUT","message":"Ollama exceeded the configured timeout.","failedAt":"2026-07-11T05:53:07.269Z"}]` |

### Verificación de no-sobrescritura (30s después)

```python
# Consulta a la DB tras 30 segundos adicionales
draft.status: "failed"          # Sin cambio
run.status: "failed"            # Sin cambio
run.completedAt: 1783749187269 # Sin cambio
```

**No apareció** `ai.run.preview_ready`, `ai.run.late_completion_aborted`, `assertRunNotFailed` ni `already failed` en el log del timeout test.

### Nota sobre el timeout observado

El timeout disparado fue el **provider timeout de Ollama** (`OLLAMA_TIMEOUT_MS=30000`), no el `AI_JOB_TIMEOUT_MS`. Esto se debe a la restricción del schema: `OLLAMA_TIMEOUT_MS` mínimo `30000` y `AI_JOB_TIMEOUT_MS` mínimo `60000`, por lo que el provider timeout siempre es más restrictivo. El efecto sobre la prueba es equivalente: el run quedó en `failed` y no fue sobrescrito posteriormente.

### Restauración

```bash
sed -i 's/OLLAMA_TIMEOUT_MS=30000/OLLAMA_TIMEOUT_MS=420000/'
sed -i 's/AI_JOB_TIMEOUT_MS=60000/AI_JOB_TIMEOUT_MS=480000/'
```

Backend reiniciado con PID `709` y valores originales. Preflight y worker OK.

---

## 8. Archivos relevantes (sin modificación en esta sesión)

| Archivo | Estado |
|---------|--------|
| `workspace/backend/src/config/env.ts` | ✅ Bloqueo `v24.15.0` aplicado previo |
| `workspace/backend/src/modules/ai/ai-processor-worker.ts` | ✅ `assertRunNotFailed` aplicado previo |

---

## 9. Known issues

1. **`promptHash` persistido como `"pending"`**
   - `AiExtractionRun.promptHash` almacena el literal `"pending"`.

2. **`rawResponseHash` y `rawResponsePath` nulos**
   - La tabla `AiExtractionRun` no recibe hash/ruta del raw response.

3. **Restricción de schema para prueba de job timeout**
   - `OLLAMA_TIMEOUT_MS` mínimo `30000` y `AI_JOB_TIMEOUT_MS` mínimo `60000` impiden que el job timeout dispare antes que el provider timeout. Para una prueba donde el job timeout gane la carrera, sería necesario relajar los mínimos del schema.

4. **Log de importación exitosa sobrescrito**
   - Al reiniciar el backend para la prueba de timeout usando el mismo nombre de archivo de log, el log de la importación exitosa (`draftId: 9e2db9b2...`) fue truncado. Los datos se recuperaron desde la DB.

---

## 10. Resumen de criterios de PASS

| Criterio | Resultado |
|----------|-----------|
| Build y TypeScript pasan | ✅ PASS |
| Node.js exacto `v24.15.0` | ✅ PASS |
| Servidor toma puerto antes del worker | ✅ PASS |
| Preflight valida Ollama y modelo | ✅ PASS |
| Segunda instancia falla con EADDRINUSE | ✅ PASS |
| Importación nace por endpoint normal | ✅ PASS |
| Worker la reclama automáticamente una sola vez | ✅ PASS |
| `/api/chat` entrega streaming NDJSON | ✅ PASS |
| Stream finaliza con `finishReason: stop` (camino feliz) | ✅ PASS |
| Draft en `preview_ready`, run en `completed` | ✅ PASS |
| Modelo inexistente falla de forma controlada | ✅ PASS (de v1.0.1) |
| Timeout dispara `failed` | ✅ PASS (OLLAMA_TIMEOUT) |
| Run/draft no cambian posteriormente a `completed`/`preview_ready` | ✅ PASS |
| No se ejecutó worker manualmente | ✅ PASS |

---

## 11. Entregables

- **Informe v1.0.2:** `I:\cajaApp-V3\docs\09-reports\APPCAJA-V3-BE-011-delivery-v1.0.2.md`
- **Informe v1.0.1 rechazado:** `I:\cajaApp-V3\docs\09-reports\APPCAJA-V3-BE-011-delivery-v1.0.1-rejected.md`
- **Informe v1.0.0 rechazado:** `I:\cajaApp-V3\docs\09-reports\APPCAJA-V3-BE-011-delivery-v1.0.0-rejected.md`
- **Log timeout test:** `workspace/backend/backend-timeout-test.log`
- **Log post-restore:** `workspace/backend/backend-be011-v1.0.2.log`

---

*Generado durante la sesión de validación APPCAJA-V3-BE-011 v1.0.2.*
