# APPCAJA-V3-BE-010-delivery-v1.0.1

## Estado final

FAIL (la llamada real al provider configurado falló de forma intermitente en las importaciones lanzadas por API; la integración de código es correcta y se verificó un draft en `preview_ready` mediante re-ejecución manual del worker).

## Archivos modificados

- `workspace/backend/python/pdf_to_raw.py` (creado/sobrescrito desde `src/scripts/pdf-raw-extractor.py`)
- `workspace/backend/python/requirements.txt` (creado)
- `workspace/backend/src/modules/documents/pdf-raw-extractor.service.ts`
- `workspace/backend/src/modules/ai/ai-extraction.service.ts`
- `workspace/backend/src/modules/ai/openai-compatible.client.ts` (log de errorMessage agregado para diagnóstico)
- `workspace/backend/src/config/env.ts`
- `workspace/backend/.env.example`
- `workspace/backend/.env` (`AI_MAX_OUTPUT_TOKENS` ajustado a `32768`; `AI_MODEL` restaurado a `kimi-k2.7-code:cloud`)
- `workspace/backend/src/modules/imports/imports.service.ts` (actualizado por cambio de interfaz `ExtractionInput`)
- `workspace/backend/src/modules/ai/ai-processor-worker.ts` (importe sin uso removido)

## Archivos eliminados

- `workspace/backend/src/scripts/pdf-raw-extractor.py`
- `workspace/backend/src/modules/ai/ai-processor.worker.ts` (código muerto)
- `workspace/backend/src/modules/ai/vision-provider.factory.ts` (código muerto tras forzar `openai-compatible`)

## Confirmación de que pdfjs no se ejecuta

- `AI_PROVIDER` ahora es `z.literal("openai-compatible")` en `src/config/env.ts`.
- El flujo activo de `AiExtractionService.extractCardStatement` solo usa `pdfRawExtractorService.extract(absolutePdfPath)` y `OpenAICompatibleClient.extractJson`.
- Se eliminaron del flujo activo `pdfTextExtractorService`, `createVisionProvider` y el método `extractWithVisionProvider`.
- No hay fallback automático a `ollama`, `minimax`, `pdfjs` ni a imágenes.

## Versiones

- Node.js: `v22.14.0`
- Python: `3.14.0`
- pdfplumber: `0.11.10`

## Métricas RAW (visa-galicia-julio2026.pdf)

- `ok`: `true`
- `engine`: `pdfplumber`
- `engineVersion`: `0.11.10`
- `pageCount`: `8`
- `textPageCount`: `8`
- `emptyPageCount`: `0`
- `characterCount`: `17160`
- `rawSha256`: `32c69635cc3d16301a7b511aaaf4403d43dfa9b9d788b68efb702025523ee999`

## Endpoint y modelo

- Host del endpoint: `localhost:11434`
- Base URL: `http://localhost:11434/v1`
- Modelo: `kimi-k2.7-code:cloud`
- Provider: `openai-compatible`

## Hashes

- `promptSha256`: `000e96023bcb90b53c45f5632db8c5faba2384ecbfd1b2ac34acc6bf51fa12c7`
- `rawSha256`: `32c69635cc3d16301a7b511aaaf4403d43dfa9b9d788b68efb702025523ee999`

## Resultado de llamada real

- Un worker ejecutado manualmente completó la extracción:
  - `rawExtractionDurationMs`: `537`
  - `aiDurationMs`: `289390`
  - `totalDurationMs`: `290195`
- Las importaciones lanzadas automáticamente por API fallaron con errores del provider:
  - `TypeError: fetch failed` después de ~307s
  - HTTP 500 del provider
  - Respuesta que no es JSON válido

## Draft / Run verificado

- `draftId`: `4a8ca990-93c4-4e9d-96d2-746f2f2910bc`
- `runId`: `f7c401f3-bf53-4a70-94d3-9ee18c949303`
- Estado final persistido: `preview_ready`
- Estado del run: `completed`
- Filas (`rowCount`): `119`
- Grupos (`groupCount`): `4`
- Secciones (`sectionCount`): `2`

## Prueba de error (modelo inexistente)

- `draftId`: `fd571d9a-0cf0-42bf-a2b4-8ca5307d6c2b`
- Estado final: `failed`
- Mensaje: `model 'modelo-inexistente' not found`
- El polling terminó y no quedó en `processing`.
- Modelo correcto restaurado y servicios reiniciados.

## Build / TypeScript

- `npm run build`: PASS
- `npx tsc --noEmit`: PASS

## Known issues

- El provider remoto configurado (`kimi-k2.7-code:cloud` vía Ollama localhost -> ollama.com) es inestable para este PDF/prompt:
  - Puede devolver `TypeError: fetch failed` tras ~5 minutos.
  - Puede responder HTTP 500.
  - Puede devolver contenido que no es JSON válido.
- Reduciendo `AI_MAX_OUTPUT_TOKENS` a `32768` se logró una llamada manual exitosa en ~4 minutos, pero las importaciones por API siguieron fallando intermitentemente.
- Recomendación: usar un endpoint OpenAI-compatible más estable o un modelo local/localmente cacheado.
