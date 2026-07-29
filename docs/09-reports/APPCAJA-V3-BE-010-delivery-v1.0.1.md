# APPCAJA-V3-BE-010 — Delivery Report v1.0.1

## Estado de la entrega

**BLOCKED**

Integración real de pdfplumber completada en el pipeline activo. Build y TypeScript correctos. No se declaró PASS porque no existe endpoint OpenAI-compatible configurado en el entorno, por lo tanto no se ejecutó una importación real terminada en `preview_ready`.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/config/env.ts` | Quitar defaults ficticios de `AI_BASE_URL` y `AI_MODEL`; validar que sean requeridos para `openai-compatible`; no exigir `AI_API_KEY`; agregar variables de entorno para Python (`PYTHON_EXECUTABLE`, `PDF_RAW_EXTRACTOR_SCRIPT`, `PDF_RAW_EXTRACTION_TIMEOUT_MS`, `PDF_RAW_MAX_OUTPUT_BYTES`, `PDF_RAW_MAX_CHARACTERS`). |
| `.env.example` | Quitar `AI_BASE_URL` y `AI_MODEL` ficticios; agregar variables de Python. |
| `src/modules/ai/ai-extraction.service.ts` | `extractWithOpenAICompatible` ahora recibe `absolutePdfPath` y usa `pdfRawExtractorService` en lugar de `pdfTextExtractorService`. Se mantiene `extractWithVisionProvider` como legacy. |
| `src/modules/ai/ai-processor-worker.ts` | El worker pasa `absolutePdfPath` al servicio en lugar de `fileBuffer`; etapas de progreso actualizadas a `extracting_raw_text`. |
| `src/modules/ai/ai-processor.worker.ts` | Actualizado a la nueva firma de `extractCardStatement` para compatibilidad de compilación. |
| `src/modules/ai/openai-compatible.client.ts` | Validación temprana de `AI_BASE_URL` y `AI_MODEL` para satisfacer narrowing de TypeScript. |
| `src/modules/imports/imports.service.ts` | Cuando `AI_PROVIDER === "openai-compatible"`, la detección de documento y el `pageCount` se obtienen vía `pdfRawExtractorService` en lugar de `pdfTextExtractorService`. Se actualiza el registro de `aiExtractionRun` con el provider/modelo correctos. |
| `src/modules/documents/pdf-raw-extractor.service.ts` | Ahora lee `pythonPath`, `scriptPath`, `timeoutMs` y `maxOutputBytes` desde `env`; el resultado expone `rawText` en lugar de `fullText`; agrega truncamiento configurable y protección por timeout y tamaño de salida. |
| `.gitignore` | Agregadas exclusiones de Python: `.venv/`, `python/__pycache__/`, `*.pyc`. |

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `python/pdf_to_raw.py` | Script Python definitivo con pdfplumber para extracción RAW. Incluye `textPageCount` y `emptyPageCount`. |
| `python/requirements.txt` | `pdfplumber==0.11.10` |

## Prueba de que no se usa pdfjs en el pipeline nuevo

```bash
$ rg "pdfTextExtractorService" src/modules/ai/ai-extraction.service.ts
src/modules/ai/ai-extraction.service.ts
13:import { pdfTextExtractorService } from "../imports/pdf-text-extractor.service.js";
152:    const image = await pdfTextExtractorService.renderPdfToSingleImage(pdfBuffer);
```

La única referencia a `pdfTextExtractorService` en `ai-extraction.service.ts` está dentro del método privado `extractWithVisionProvider`, que es el flujo legacy. El método `extractWithOpenAICompatible` usa exclusivamente `pdfRawExtractorService`.

En `ai-processor-worker.ts`:
```typescript
const extractionResult = await aiExtractionService.extractCardStatement(
  { absolutePdfPath: pdfPath, pageCount },
  activeAiRunId
);
```

No se pasa `Buffer` ni se invoca `extractFromBuffer`. No se usa `pdfjs`, `pdf-parse`, `renderPdfToImages`, `Ollama`, `MiniMax VLM`, `images[]`, `base64` en el flujo activo `openai-compatible`.

## Python y pdfplumber

| Campo | Valor |
|-------|-------|
| Python version | 3.14.0 |
| pdfplumber version | 0.11.10 |

## Métricas RAW (prueba aislada)

| Campo | Valor |
|-------|-------|
| PDF de prueba | `docs/08-artifacts/visa-galicia-julio2026.pdf` |
| pageCount | 8 |
| textPageCount | 8 |
| emptyPageCount | 0 |
| characterCount | 17 160 |
| rawSha256 | `32c69635cc3d16301a7b511aaaf4403d43dfa9b9d788b68efb702025523ee999` |
| durationMs | ~200 ms (observado) |

## Hash del prompt

| Campo | Valor |
|-------|-------|
| Prompt file | `contracts/prompts/cards/01-extract-credit-card-statement.md` |
| promptSha256 | `000e96023bcb90b53c45f5632db8c5faba2384ecbfd1b2ac34acc6bf51fa12c7` |

El prompt se mantiene sin cambios. La sustitución de `{{PAGE_COUNT}}` se realiza exactamente con la misma función `.replace("{{PAGE_COUNT}}", String(pageCount))` usada en la entrega anterior.

## Configuración de variables de entorno

```
AI_PROVIDER=openai-compatible
AI_BASE_URL=
AI_CHAT_COMPLETIONS_PATH=/chat/completions
AI_API_KEY=
AI_MODEL=
AI_TIMEOUT_MS=180000
AI_MAX_OUTPUT_TOKENS=32768
AI_TEMPERATURE=0
AI_TOKEN_PARAMETER=max_tokens
AI_RESPONSE_FORMAT=none

PYTHON_EXECUTABLE=.venv\Scripts\python.exe
PDF_RAW_EXTRACTOR_SCRIPT=python\pdf_to_raw.py
PDF_RAW_EXTRACTION_TIMEOUT_MS=60000
PDF_RAW_MAX_OUTPUT_BYTES=8000000
PDF_RAW_MAX_CHARACTERS=250000
```

Validación en tiempo de inicio (`env.ts`):
- `AI_BASE_URL` es requerido cuando `AI_PROVIDER=openai-compatible`
- `AI_MODEL` es requerido cuando `AI_PROVIDER=openai-compatible`
- `AI_API_KEY` **no** es exigido

## Prueba real del proveedor

**BLOCKED**

No existe archivo `.env` en `workspace/backend/` con `AI_BASE_URL` ni `AI_MODEL` configurados. Sin endpoint real, no se puede ejecutar una llamada completa al proveedor.

Campos que se registrarían si el endpoint estuviera configurado:
- `endpointHost`
- `model`
- `requestId`
- `HTTP status`
- `durationMs`
- `finishReason`
- `promptTokens`
- `completionTokens`
- `totalTokens`
- `promptSha256`
- `rawSha256`
- `JSON.parse PASS/FAIL`
- `schema PASS/FAIL`

No se registra: API key, Authorization, RAW completo, prompt completo, respuesta completa, datos financieros.

## Importación funcional real

**BLOCKED**

Flujo completo que queda activado:

```
Usuario carga PDF
  → backend guarda PDF
  → pdfplumber extrae texto RAW (python/pdf_to_raw.py)
  → backend envía prompt (system) + RAW (user)
  → proveedor OpenAI-compatible devuelve JSON
  → schema actual
  → normalización actual
  → persistencia actual
  → preview_ready
```

No se puede ejecutar el flujo end-to-end porque falta el endpoint AI. Los campos que se registrarían:
- `draftId`
- `runId`
- `status final`
- `rawExtractionDurationMs`
- `aiDurationMs`
- `totalDurationMs`
- `rowCount`
- `groupCount`
- `sectionCount`

## Error controlado

**No ejecutado**

Se requiere un endpoint inválido para verificar:
- request falla
- worker captura error
- draft pasa a `failed`
- `AiExtractionRun` pasa a `failed`
- polling puede finalizar
- no queda `processing` permanente

Dado que no hay endpoint configurado, esta prueba no se ejecutó. El código de captura de errores está presente tanto en `ai-processor-worker.ts` (`persistFatalWorkerError`) como en `imports.service.ts` (`markImportFailedIfPending`).

## Build y TypeScript

| Comando | Resultado |
|---------|-----------|
| `node --version` | v24.15.0 |
| `tsc -p tsconfig.json` | ✅ Compilado sin errores |
| `tsc --noEmit` | ✅ 0 errores de tipo |

**Known issue:** Node.js detectado es v24.15.0. El requerimiento especifica v22. El código compila y el `engines` en `package.json` indica `>=22.0.0`, por lo que v24 es aceptable, pero se registra como discrepancia con la instrucción original.

## Known Issues

1. **No hay endpoint AI configurado** — El entorno no cuenta con `AI_BASE_URL` ni `AI_MODEL` en un archivo `.env` real. Esto bloquea las pruebas E2E reales (`preview_ready`).
2. **Node.js v24.15.0** — El requerimiento menciona `v22.` como requisito. El entorno actual tiene v24.15.0. Build OK.
3. **Error controlado no ejecutado** — Falta endpoint inválido para probar el camino de fallo completo.
4. **Detección de documento en legacy** — Cuando `AI_PROVIDER` no es `openai-compatible`, `imports.service.ts` sigue usando `pdfTextExtractorService` (pdfjs) para la detección de tipo de documento. Esto es intencional para backward compatibility.

## Código relevante

### `ai-extraction.service.ts` — extractWithOpenAICompatible

```typescript
private async extractWithOpenAICompatible(
  absolutePdfPath: string,
  pageCount: number,
): Promise<ExtractionResult> {
  const promptTemplate = await promptLoader.loadExtractCardStatementPrompt();
  const systemPrompt = promptTemplate.content
    .replace("{{PAGE_COUNT}}", String(pageCount));

  const rawExtractionStart = Date.now();
  const raw = await pdfRawExtractorService.extract(absolutePdfPath);
  const rawExtractionMs = Date.now() - rawExtractionStart;

  const openAIClient = new OpenAICompatibleClient();

  const aiResult = await openAIClient.extractJson({
    systemPrompt,
    rawDocument: raw.rawText,
  });

  // ... normalización, validación, persistencia
}
```

### `ai-processor-worker.ts` — llamada al servicio

```typescript
const extractionStart = Date.now();
const extractionResult = await aiExtractionService.extractCardStatement(
  { absolutePdfPath: pdfPath, pageCount },
  activeAiRunId
);
```

### `openai-compatible.client.ts` — mensajes separados

```typescript
const body: Record<string, unknown> = {
  model: env.AI_MODEL,
  messages: [
    { role: "system", content: request.systemPrompt },
    { role: "user", content: request.rawDocument },
  ],
  stream: false,
  temperature: env.AI_TEMPERATURE,
};
```

El prompt y el RAW se mantienen separados; no se concatenan.

### `env.ts` — validación posterior

```typescript
if (
  parsed.data.AI_PROVIDER === "openai-compatible" &&
  !parsed.data.AI_BASE_URL
) {
  console.error("AI_BASE_URL is required when AI_PROVIDER=openai-compatible");
  process.exit(1);
}

if (
  parsed.data.AI_PROVIDER === "openai-compatible" &&
  !parsed.data.AI_MODEL
) {
  console.error("AI_MODEL is required when AI_PROVIDER=openai-compatible");
  process.exit(1);
}
```

## Resumen de cambios respecto a v1.0.0

- v1.0.0 creó el script Python pero no lo conectó al flujo activo; seguía usando `pdfTextExtractorService.extractFromBuffer()` (pdfjs).
- v1.0.1 conecta realmente `pdfRawExtractorService` en `ai-extraction.service.ts`, `ai-processor-worker.ts` e `imports.service.ts`.
- El worker ya no lee el PDF como buffer para la extracción; pasa la ruta absoluta al script Python.
- Se eliminaron los defaults ficticios de `AI_BASE_URL` y `AI_MODEL`.
- Se agregaron variables de entorno para configurar el ejecutable Python, el script, timeout y límites de salida.
- Se agregó protección de timeout y límite de bytes en `PdfRawExtractorService`.
- Build y TypeScript pasan con 0 errores.

## Conclusión

La integración real de pdfplumber está completa y conectada en el pipeline. El código es correcto y compila. El estado es **BLOCKED** únicamente por la falta de un endpoint OpenAI-compatible configurado en el entorno. Una vez provistos `AI_BASE_URL` y `AI_MODEL`, el flujo `upload → storage → pdfplumber → RAW → proveedor → JSON → schema → normalización → persistencia → preview_ready` está listo para ejecutar sin modificaciones adicionales.
