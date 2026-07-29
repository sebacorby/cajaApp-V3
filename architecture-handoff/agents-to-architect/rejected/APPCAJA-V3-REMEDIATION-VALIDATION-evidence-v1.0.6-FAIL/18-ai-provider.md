# 18-ai-provider.md

Proveedor IA — verificación de configuración (sin secretos)

Timestamp: 2026-07-14T19:33:00

## Configuración (extraída de `.env`)

| Variable | Valor |
|----------|-------|
| AI_PROVIDER | ollama |
| AI_MODEL | kimi-k2.7-code:cloud |
| AI_BASE_URL | http://localhost:11434/v1 |
| AI_MOCK_MODE | false |
| OLLAMA_MODE | local-proxy |
| OLLAMA_BASE_URL | http://localhost:11434 |
| OLLAMA_MODEL | kimi-k2.7-code:cloud |

- API keys: vacías (no hay secretos que ocultar).
- Proveedor y modelo configurados: **SÍ**
- AI_MOCK_MODE: **false** (modo real)

## Prompt y schema versiones

| Constante | Valor |
|-----------|-------|
| AI_ADVISOR_PROMPT_VERSION | advisor-prompt-v1.0.0 |
| AI_ADVISOR_RESPONSE_VERSION | advisor-response-v1.0.0 |

- Ubicación: `workspace\backend\src\modules\ai-advisor\ai-advisor.service.ts:38-39`
- prompt `advisor-prompt-v1.0.0`: presente ✅
- schema `advisor-response-v1.0.0`: presente ✅

## Disponibilidad del modelo

Comando ejecutado:

```powershell
ollama list
```

Resultado: 0 modelos disponibles localmente.

El modelo configurado `kimi-k2.7-code:cloud` no está presente en Ollama. Esto bloquea la ejecución de una consulta real al Asesor IA.

Resultado proveedor: **PASS** (configuración correcta)
Bloqueo externo: modelo Ollama no disponible
