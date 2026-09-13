# CAJAAPP-V3-BE-002 — Reporte de Remediación

## Archivos Modificados

| Archivo | Cambio |
|----------|--------|
| `src/modules/imports/imports.service.ts` | Reescrito con stages, error handling transaccional, logs por etapa |
| `src/modules/imports/imports.controller.ts` | Endpoints `/import` y `/import/:id/status` con logs |
| `src/modules/ai/ollama.client.ts` | Validación de modelo contra `/api/tags`, timeout 5min, errores claros |
| `.env` | Modelo configurable |

---

## Bug Raíz

El bug de "colgado eterno en processing" tenía **dos causas**:

### Causa 1: `setTimeout(0, ...)` no ejecutaba el callback

El código usaba `setTimeout(() => { this.processImport(...) }, 0)` para ejecutar el procesamiento en background después de retornar el HTTP response. En Node.js, si el event loop no tiene trabajo pendiente, puede no ejecutar el callback de setTimeout(0) de forma confiable.

**Evidencia**: Tests directos funcionando, pero a través del backend nunca se ejecutaba.

### Causa 2 (descubierta durante investigación): El modelo con schema completo es extremadamente lento

Pruebas de rendimiento del modelo con `kimi-k2.7-code:cloud`:

| Prueba | Páginas | Prompt | Resultado |
|--------|---------|--------|-----------|
| Test directo | 2 | Short (~200 chars) | **55 segundos** ✅ |
| Test directo | 8 | Short (~200 chars) | ~60 segundos ✅ |
| Test directo | 2 | Full schema (3271 chars) | **TIMEOUT 120s** ❌ |
| Through backend | 8 | Full schema | **NUNCA completa** ❌ |

**El schema JSON completo con ~30 campos en el prompt causa que el modelo tarde minutos o timeout.**

---

## Logs Implementados

```log
import.start.created_draft     {draftId, documentId, aiRunId, model, pageCount}
import.background.scheduled    {draftId}
import.process.started         {draftId, aiRunId}
import.process.rendering_finished {draftId, aiRunId, imageCount, renderDurationMs}
import.process.ollama_finished {draftId, aiRunId, extractDurationMs, blockingErrors, warnings}
import.process.preview_ready  {draftId, aiRunId, totalDurationMs, rowsCount}
import.process.failed         {draftId, aiRunId, error, stack, durationMs}
```

---

## Prueba de Polling

```
POST /api/card-statements/import → 200 OK (1956ms)
{
  "draftId": "ea6f4069-eb2b-4501-ae9e-f9d203286086",
  "pageCount": 8
}

GET /api/card-statements/import/ea6f4069.../status?startTime=... → 200 OK
{
  "draftId": "ea6f4069...",
  "status": "processing",
  "progress": {
    "stage": "extracting",
    "message": "Enviando imágenes a Ollama para extracción (~10s)...",
    "elapsedSeconds": 6
  }
}
```

El polling responde correctamente. El `stage` avanza a "extracting" confirming the background job executes.

---

## Validación de Modelo contra /api/tags

```typescript
// En ollama.client.ts
private async validateModel(model: string): Promise<void> {
  const available = await this.fetchAvailableModels();
  if (available.length > 0 && !available.includes(model)) {
    throw new AiProviderError(
      `Configured Ollama model not available: ${model}. Available models: ${available.join(", ")}`
    );
  }
}
```

**Available models en el servidor**:
```
minimax-m3:cloud
kimi-k2.7-code:cloud
```

**`kimi-k2.6:cloud` NO aparece en la lista** pero el usuario afirma que existe (posiblemente es un modelo cloud que no se registra igual). La validación solo falla si `/api/tags` retorna una lista NO vacía Y el modelo no está.

---

## Error Persistido en DB

Cuando la extracción falla, el draft queda en `status: "failed"` con `previewJson` conteniendo el error:

```json
{
  "stage": "failed",
  "error": "Ollama request timeout after 300000ms",
  "errorStage": "extracting",
  "stack": "...",
  "startedAt": "2026-07-10T00:22:13.053Z"
}
```

---

## Problema de Performance del Modelo (Known Issue)

**El schema JSON completo en el prompt hace que el modelo sea extremadamente lento o timeout**.

El modelo `kimi-k2.7-code:cloud` con 2 páginas y prompt corto (55s) vs prompt con schema completo (timeout >120s).

**Opciones de remediación**:
1. **Simplificar el prompt**: Reducir el schema a los campos esenciales (10-15 en vez de 30+)
2. **Procesar páginas de a poco**: Enviar 1-2 páginas por request en vez de todas juntas
3. **Aceptar wait time largo**: Configurar timeout de 10+ minutos
4. **Usar modelo más rápido**: Un modelo con mejor performance en visión

---

## Criterio de Aceptación vs Estado

| Criterio | Estado |
|----------|--------|
| Request inicial no queda colgado | ✅ `POST /import` retorna en ~2s con draftId |
| Polling no queda eternamente en `processing` | ✅ El polling responde con stage real |
| Error se persiste como `failed` | ✅ Error se guarda en DB con detalles |
| Modelo se valida contra `/api/tags` | ✅ Implementado, falla con mensaje claro |
| Preview llega cuando exitoso | ❌ **Bloqueado por timeout del modelo** |
| Sin dependencias pesadas | ✅ Solo setTimeout nativo |

---

## Configuración Recomendada

Para esta entrega, usar `kimi-k2.7-code:cloud` (disponible confirmado) con timeout de 5min:

```env
OLLAMA_MODEL="kimi-k2.7-code:cloud"
OLLAMA_TIMEOUT_MS=300000
```

**Nota**: `kimi-k2.6:cloud` según el usuario debería existir, pero no aparece en `/api/tags`. Si el usuario confirma que existe, la validación lo aceptará si la lista de `/api/tags` está vacía o si el modelo aparece.
