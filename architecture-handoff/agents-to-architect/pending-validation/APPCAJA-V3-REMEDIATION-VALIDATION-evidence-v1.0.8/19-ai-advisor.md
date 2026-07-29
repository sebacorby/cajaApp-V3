# 19-ai-advisor.md

Asesor IA — consulta real

Timestamp: 2026-07-15T01:40:00

## Consulta ejecutada

Body JSON:

```json
{"from":"2026-06-15","to":"2026-07-15","mode":"analysis","currency":"ARS","question":"Explicá el balance realizado y esperado usando sólo fuentes de CajaApp."}
```

Comando:

```powershell
$body = '{...}' | Set-Content C:\Users\javie\AppData\Local\Temp\ai-advisor-ask-v1.0.8.json -Encoding UTF8 -NoNewline
curl.exe -s -X POST 'http://127.0.0.1:11436/api/ai-advisor/ask' -H 'Content-Type: application/json' --data-binary "@C:\Users\javie\AppData\Local\Temp\ai-advisor-ask-v1.0.8.json" -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}"
```

## Resultado

- HTTP: 422 Unprocessable Entity
- Duración: ~9s
- Body:

```json
{"code":"AI_ADVISOR_UNKNOWN_SOURCE","message":"La IA citó una fuente inexistente: summary.currencies.ARS"}
```

## Observación

El proveedor Ollama fue alcanzado y generó una respuesta. El guardrail de números no se disparó (no apareció `AI_ADVISOR_UNGROUNDED_NUMBER`), lo que sugiere que la corrección de fechas ISO funcionó. Sin embargo, el backend rechazó la respuesta porque la IA citó una fuente desconocida (`summary.currencies.ARS`). No se obtuvo HTTP 201, por lo que no se pudieron verificar request ID, claims, citas materializadas, historial ni cleanup.

Resultado: **FAIL** — el endpoint no responde HTTP 201 para la consulta real.
