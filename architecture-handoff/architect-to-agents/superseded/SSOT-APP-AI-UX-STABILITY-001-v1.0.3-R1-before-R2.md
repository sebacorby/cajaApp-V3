# SSOT — APP-AI-UX-STABILITY-001

Estado: `v1.0.3` archivada como BLOCKED por interpretación incorrecta. `v1.0.3-R1` ACTIVA. Único vertical activo. `APP-FINAL-CLOSURE` bloqueado.

## Decisión

`workspace/backend/tests/ai-advisor/ai-advisor.service.test.ts` está autorizado. Los tests antiguos que fijan dos llamadas deben migrarse al contrato vigente.

Contrato vigente:
- máximo 3 llamadas totales al proveedor por request lógica;
- sólo retry de `AI_ADVISOR_UNGROUNDED_NUMBER`;
- si el segundo intento es válido: exactamente 2 llamadas;
- si los tres son inválidos: 422 estructurado y ningún cuarto intento;
- mismo contexto, fuentes y fingerprint;
- una correlationId, attempt IDs distintos y una sola interacción válida persistida;
- error no recuperable: una sola llamada;
- frontend sin retry oculto, error visible y retry manual.

No filtrar ni omitir tests. No reducir el contrato a dos intentos.

## v1.0.3 archivada

Evidencia:
`architecture-handoff/agents-to-architect/rejected/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-BLOCKED-TEST-CONTRACT-MISREAD/`

Canonical intacto:
- service `AD7F34B0A72CAFCC5447633E699639708125BD37F3D77637C6ABF36B24FB692C`
- test `854151E6DB9FD0836FFE8A7F7CCAE0C14A68E08F650C666F2D3BF3E6A3850B21`
- SQLite `E05FDF545F51085038A9BB5FD8A7E7C5E5CB5CEA424886F1CEE27D8D0869252C`
- package.json `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`
- package-lock.json `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`

## Campaña activa

Instrucción única:
`architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-BACKEND-CONTRACT-v1.0.3-R1.md`

Evidencia esperada:
`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3-R1/`

PASS exige tests backend completos, API real 5/5, focales UI, candidate Playwright completo, `candidateNewFailures=0`, `baselinePassedCandidateFailed=0`, cero skips/retries, hashes intactos y promoción atómica sólo tras PASS.