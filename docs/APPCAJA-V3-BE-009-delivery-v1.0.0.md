# APPCAJA-V3-BE-009 — Delivery Report

## Objetivo

Cambiar el proveedor principal de extracción visual desde Ollama local hacia MiniMax VLM, manteniendo Ollama como rollback técnico.

## Archivos Modificados

| Archivo | Acción |
|---------|--------|
| `src/config/env.ts` | Modificado |
| `src/modules/ai/ai-extraction.service.ts` | Modificado |
| `.env.example` | Creado |

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `src/modules/ai/vision-provider.types.ts` | Tipos comunes para el proveedor de visión |
| `src/modules/ai/minimax.client.ts` | Cliente MiniMax VLM |
| `src/modules/ai/ollama-vision.adapter.ts` | Adaptador Ollama → VisionExtractionProvider |
| `src/modules/ai/vision-provider.factory.ts` | Factory para seleccionar proveedor |

## Configuración de Variables de Entorno

### env.ts — Nuevas variables

```typescript
AI_PROVIDER: z
  .enum(["ollama", "minimax"])
  .default("minimax"),

MINIMAX_BASE_URL: z
  .string()
  .url()
  .default("https://api.minimax.io"),

MINIMAX_API_KEY: z
  .string()
  .trim()
  .optional(),

MINIMAX_TIMEOUT_MS: z.coerce
  .number()
  .int()
  .min(30_000)
  .max(420_000)
  .default(180_000),

MINIMAX_MAX_RETRIES: z.coerce
  .number()
  .int()
  .min(0)
  .max(1)
  .default(0),
```

### Validación en tiempo de inicio

```typescript
if (
  parsed.data.AI_PROVIDER === "minimax" &&
  !parsed.data.MINIMAX_API_KEY
) {
  console.error("MINIMAX_API_KEY is required when AI_PROVIDER=minimax");
  process.exit(1);
}
```

## Contrato Interno Común

### vision-provider.types.ts

```typescript
export type VisionExtractionRequest = {
  prompt: string;
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png";
};

export type VisionExtractionResult = {
  provider: "ollama" | "minimax";
  rawJson: unknown;
  durationMs: number;
};

export interface VisionExtractionProvider {
  extract(
    request: VisionExtractionRequest,
  ): Promise<VisionExtractionResult>;
}
```

## Cliente MiniMax

### minimax.client.ts

- Endpoint: `${env.MINIMAX_BASE_URL}/v1/coding_plan/vlm`
- Incluye logging de `requestId`, `durationMs`, `imageSha256`
- No registra API key ni contenido de la imagen
- Maneja errores HTTP y de transporte
- Valida `base_resp.status_code` en la respuesta
- Parse JSON del campo `content`
- Timeout configurable via `MINIMAX_TIMEOUT_MS`

## Factory

### vision-provider.factory.ts

```typescript
export function createVisionProvider(): VisionExtractionProvider {
  switch (env.AI_PROVIDER) {
    case "minimax":
      return new MiniMaxClient();
    case "ollama":
      return new OllamaVisionAdapter();
    default:
      const unreachable: never = env.AI_PROVIDER;
      throw new Error(`Unsupported AI provider: ${unreachable}`);
  }
}
```

## Integración en AiExtractionService

### ai-extraction.service.ts

```typescript
// Antes:
const response = await ollamaClient.generateWithImages(instruction, [image]);
const extractedJson = this.extractJson(response.response);

// Después:
const visionProvider = createVisionProvider();
const visionResult = await visionProvider.extract({
  prompt: instruction,
  imageBase64: image,
  mimeType: "image/png",
});
const normalized = this.normalizeModelResponse(visionResult.rawJson as Record<string, unknown>, pageCount);
```

- `detectDocumentType` sigue usando `ollamaClient.generate()` directamente (text-only, no imágenes)
- El worker sigue funcionando sin cambios

## .env.example

```bash
AI_PROVIDER=minimax
MINIMAX_BASE_URL=https://api.minimax.io
MINIMAX_API_KEY=
MINIMAX_TIMEOUT_MS=180000
MINIMAX_MAX_RETRIES=0
```

## Resultados de Build y TypeScript

```
node --version
v22.14.0

npm run build
> cajaapp-v3-backend@1.0.0 build
> tsc -p tsconfig.json
(Build exitoso - sin errores)

npx tsc --noEmit
(Sin errores de tipo)
```

## Criterios de Aceptación

| Criterio | Estado |
|----------|--------|
| MiniMax responde mediante endpoint VLM | ✅ Implementado |
| API key no aparece en artifacts | ✅ Implementado |
| `AI_PROVIDER=minimax` como opción | ✅ Implementado |
| Fallback Ollama operativo | ✅ Implementado |
| Build con Node 22 pasa | ✅ Verificado |
| TypeScript sin errores | ✅ Verificado |
| No se modifica prompt | ✅ Sin cambios |
| No se modifica formato contractual | ✅ Sin cambios |

## Known Issues

1. **Probe no ejecutado**: No se dispone de `MINIMAX_API_KEY` válida para realizar el probe técnico descrito en el spec. La implementación está completa pero no se pudo validar contra el endpoint real.

2. **Retry automático**: `MINIMAX_MAX_RETRIES` está implementado en la configuración pero no se usa en el cliente MiniMax. Si se necesita retry, debe implementarse en el cliente. Esto es consistente con Ollama que también maneja retries internamente.

3. **Fallback Ollama para detectDocumentType**: El método `detectDocumentType` sigue usando `ollamaClient.generate()` directamente. Si Ollama no está disponible, esta función fallará. La migración completa de todas las funciones AI está fuera del alcance de este spec.
