# SSOT — APP-AI-UX-STABILITY-001

Estado: ACTIVO — REMEDIACIÓN v1.0.1.
Fecha de actualización: 19 de julio de 2026.
Vertical único activo: `APP-AI-UX-STABILITY-001`.
Repositorio canónico: Dropbox.
Root local canónico: `C:\Users\javie\Javier.s.corbella Dropbox\Javier Corbella\cajaApp-V3`.

## Resultado de campaña v1.0.0

Veredicto arquitectónico: **FAIL**.

Evidencia rechazada:
`architecture-handoff/agents-to-architect/rejected/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.0/`

Causas verificadas:

1. El proveedor remoto real de Ollama Cloud no quedó demostrado. La ejecución usó `OLLAMA_MODE=local-proxy`, `OLLAMA_API_KEY` vacío y un modelo con sufijo `:cloud`, lo cual no prueba identidad remota.
2. El segundo focal devolvió una respuesta no exitosa en `/api/ai-advisor/ask`, pero la evidencia no capturó status HTTP, body sanitizado ni logs backend correlacionados. La atribución a deadlock o DB contention no está técnicamente demostrada.
3. El tercer focal agotó 180 segundos esperando `ai-advisor-response`; la evidencia no demuestra si el backend terminó, si hubo error visible, request duplicada, respuesta tardía o estado frontend estancado.
4. No se ejecutaron ni demostraron API real 5/5, full Playwright, manifests comparativos ni ausencia de solicitudes duplicadas/huérfanas.
5. Backend/frontend gates, package hashes, cleanup, puertos libres y restauración SQLite sí quedaron informados como correctos, pero no compensan los gates obligatorios fallidos.

## Estado actual

`APP-FINAL-CLOSURE` continúa bloqueado.
No existe otro vertical activo.
La instrucción v1.0.0 fue movida a `superseded`.

## Instrucción activa

`architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-REMEDIATION-v1.0.1.md`

## Criterio de salida

El vertical sólo puede cerrarse con:

- identidad inequívoca de Ollama Cloud real y credenciales válidas sin exponer secretos;
- 5/5 consultas API HTTP 201, schema válido, fingerprint coincidente y fuentes/citas válidas;
- ninguna consulta mayor a 180 segundos;
- cero requests duplicadas o huérfanas;
- focal Playwright completo PASS dos veces consecutivas con `--workers=1 --retries=0`, incluyendo desktop y mobile;
- prueba de aislamiento respecto del orden de suite;
- full Playwright sin fallos nuevos y al menos 40/42, permitiendo únicamente los dos fallos conocidos de salary receipts salvo mejora;
- backend/frontend gates PASS;
- package hashes intactos;
- SQLite restaurada al hash inicial y puertos 11436/11437 libres.
