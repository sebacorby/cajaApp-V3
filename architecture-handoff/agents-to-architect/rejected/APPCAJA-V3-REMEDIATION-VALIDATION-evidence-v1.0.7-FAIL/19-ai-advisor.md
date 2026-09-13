# 19-ai-advisor.md

Asesor IA — consulta real

Timestamp: 2026-07-14T21:12:00

## Consulta ejecutada

Body JSON:

```json
{"from":"2026-06-14","to":"2026-08-14","mode":"analysis","currency":"ARS","question":"Explicá el balance realizado y esperado usando sólo fuentes de CajaApp."}
```

Comando:

```powershell
$json = '{...}' | Set-Content C:\Users\javie\AppData\Local\Temp\ai-advisor-ask.json -Encoding UTF8 -NoNewline
curl.exe -X POST 'http://127.0.0.1:11436/api/ai-advisor/ask' -H 'Content-Type: application/json' --data-binary "@C:\Users\javie\AppData\Local\Temp\ai-advisor-ask.json"
```

## Resultado

- HTTP: 422 Unprocessable Entity
- Duración: ~11s
- Body:

```json
{"code":"AI_ADVISOR_UNGROUNDED_NUMBER","message":"La síntesis general contiene valores no presentes en sus fuentes citadas: 14"}
```

## Observación

El proveedor Ollama fue alcanzado y generó una respuesta (el backend validó la respuesta y la rechazó por contener valores no sustentados en las fuentes citadas). No es un error de autenticación, red o disponibilidad del modelo; es una validación de negocio del backend que devuelve 422.

No se obtuvo HTTP 201, por lo que no se pudieron verificar request ID, claims, citas materializadas, historial ni cleanup de la interacción.

Resultado: **FAIL** — el endpoint no responde HTTP 201 para la consulta real.
