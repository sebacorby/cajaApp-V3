# 19-ai-advisor.md

Asesor IA — ejecución de consulta real

Timestamp: 2026-07-14T19:34:00

## Configuración verificada

- Proveedor: `ollama`
- Modelo: `kimi-k2.7-code:cloud`
- AI_MOCK_MODE: `false`
- Prompt version: `advisor-prompt-v1.0.0`
- Response schema version: `advisor-response-v1.0.0`
- Context version esperado: `advisor-context-v1.0.0` (declarado en servicio)
- Fórmula esperada: `fh-v1.0.0` (declarada en servicio)

## Consulta real ejecutada

Comando:

```powershell
$body = @{ question = '¿Cómo está mi salud financiera?' } | ConvertTo-Json -Compress
Invoke-WebRequest -Uri 'http://127.0.0.1:11436/api/ai-advisor/ask' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
```

Resultado:

- HTTP 500
- Duración: ~0.05s
- Error: `Request body size did not match Content-Length` (registrado en backend.log)

Nota: aunque el request tuvo un problema de Content-Length, el gate está bloqueado de todos modos porque el modelo configurado (`kimi-k2.7-code:cloud`) no existe en Ollama local (ver `ollama list`: 0 modelos).

## Verificaciones pendientes por bloqueo externo

No se pudieron comprobar porque no se obtuvo una respuesta real HTTP 201:

- request ID real
- contexto `advisor-context-v1.0.0`
- fórmula `fh-v1.0.0` en claims
- claims con `sourceIds` existentes
- citas materializadas
- historial creado y luego eliminado
- ausencia de documentos originales enviados
- ausencia de modificación de registros financieros

## Resultado

**BLOCKED** — dependencia externa (modelo Ollama `kimi-k2.7-code:cloud`) no disponible localmente.
