# 18-ai-provider.md

Proveedor IA — verificación de configuración (sin secretos)

Timestamp: 2026-07-14T21:10:00

## Configuración (`.env`)

| Variable | Valor |
|----------|-------|
| AI_PROVIDER | ollama |
| AI_MODEL | kimi-k2.7-code:cloud |
| AI_BASE_URL | http://localhost:11434/v1 |
| AI_MOCK_MODE | false |
| OLLAMA_MODE | local-proxy |
| OLLAMA_BASE_URL | http://localhost:11434 |
| OLLAMA_MODEL | kimi-k2.7-code:cloud |

- API keys: vacías (no hay secretos).
- Proveedor y modelo configurados: SÍ.
- AI_MOCK_MODE: false (modo real).

## Versiones de prompt y schema

| Constante | Valor | Ubicación |
|-----------|-------|-----------|
| AI_ADVISOR_PROMPT_VERSION | advisor-prompt-v1.0.0 | backend\src\modules\ai-advisor\ai-advisor.service.ts:38 |
| AI_ADVISOR_RESPONSE_VERSION | advisor-response-v1.0.0 | backend\src\modules\ai-advisor\ai-advisor.service.ts:39 |

## Inventario Ollama local

Comando:

```powershell
ollama list
```

Resultado: 0 modelos locales.

## Validación de contexto

Comando:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:11436/api/ai-advisor/context?from=2026-06-14&to=2026-08-14'
```

Resultado: HTTP 200

- provider: ollama
- model: kimi-k2.7-code:cloud
- promptVersion: advisor-prompt-v1.0.0
- context.sourceFingerprint: 536c79f1d60cea80c6085d8a64ee5d6e0d19db38729fc99002a5c443e8958c94

Resultado: **PASS** — configuración correcta y contexto responde.
