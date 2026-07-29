# 22-playwright-ai.md

Spec del Asesor IA — Playwright

Timestamp: 2026-07-15T01:51:00

## Comando

Ejecutado como parte de la suite completa de Playwright (sin filtros):

```powershell
& "I:\Tools\node-v24.18.0-win-x64\npx.cmd" playwright test --project=chromium --workers=1 --retries=0 --trace=on
```

## Resultado

- Spec: `tests\ai-advisor.spec.ts:19:5` — Asesor IA usa contexto estructurado, cita fuentes y limpia su historial
- Estado: **FAILED**
- Error: `askResponse.ok()` devolvió `false` (HTTP 422 en el POST `/api/ai-advisor/ask`).

## Detalle del fallo

La solicitud POST se realizó con:

```json
{"from":"2026-06-15","to":"2026-07-15","mode":"analysis","currency":"ARS","question":"Explicá el balance realizado y esperado usando sólo fuentes de CajaApp."}
```

El backend respondió con:

```json
{"code":"AI_ADVISOR_UNKNOWN_SOURCE","message":"La IA citó una fuente inexistente: summary.currencies.ARS"}
```

## Observación

El proveedor Ollama fue alcanzado y generó una respuesta. El guardrail numérico de fechas ISO no se disparó, pero la validación de fuentes rechazó la respuesta. No se pudieron verificar request ID, fingerprint, claims, citas materializadas, historial ni cleanup.

Resultado: **FAIL**
