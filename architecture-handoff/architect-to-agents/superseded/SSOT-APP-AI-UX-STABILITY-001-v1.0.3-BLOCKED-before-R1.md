# SSOT — APP-AI-UX-STABILITY-001

## Estado vigente

`v1.0.2` cerrada como **FAIL técnico**. `v1.0.3` ACTIVA.

Único vertical activo: `APP-AI-UX-STABILITY-001`.
`APP-FINAL-CLOSURE` permanece bloqueado.

## Historial inmediato

### v1.0.1
- proveedor remoto y API 5/5 demostrados;
- focales consecutivos PASS;
- UI flaky ante respuesta no terminal;
- cerrada FAIL.

### v1.0.2
Hallazgos útiles:
- backend puede devolver `422 AI_ADVISOR_UNGROUNDED_NUMBER` cuando el modelo produce valores no presentes en las fuentes;
- UI no mostraba el error;
- focales AI pasaron con retry cliente.

Rechazo arquitectónico:
- se modificó `ai-advisor-api.ts` fuera del alcance autorizado;
- el cambio no fue restaurado tras FAIL;
- `diagnostic.spec.ts` quedó dentro de la suite canónica;
- hashes before/after inválidos;
- gates backend/frontend omitidos;
- retry cliente no estabilizó la API directa.

Evidencia rechazada:
`architecture-handoff/agents-to-architect/rejected/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.2-FAIL-OUT-OF-SCOPE-AND-BACKEND-CONTRACT/`

## Canonical restaurado

- `workspace/frontend/src/lib/finance/ai-advisor-api.ts` restaurado al content hash Dropbox `fa5efc9ee54eb6dbcad82d88517b8c06142ca44744acc3d51264ee26a1c4cfff`.
- `workspace/frontend/tests/diagnostic.spec.ts` retirado del workspace y conservado dentro de la evidencia rechazada.
- package.json SHA-256: `5F46BAFE79C08DB4F6D59074602EB8AE59522B1B2C5FDA68488F38DFBD049B61`.
- package-lock.json SHA-256: `5AD527E78C65A005054D6078A90EB6A2BF19C0712BA0B846937BA0F6DAEE8D8B`.

## Campaña activa v1.0.3

Instrucción única:
`architecture-handoff/architect-to-agents/issued/APPCAJA-V3-APP-AI-UX-STABILITY-001-BACKEND-CONTRACT-v1.0.3.md`

Objetivo:
- una request lógica por submit;
- máximo 3 intentos internos backend sólo para `AI_ADVISOR_UNGROUNDED_NUMBER`;
- mismo contexto y fingerprint en todos los intentos;
- validación estricta sin eliminar ni inventar valores;
- persistencia única sólo al obtener respuesta válida;
- 422 estructurado al agotarse;
- error visible y retry manual en UI;
- baseline/candidate separados y promoción únicamente tras PASS.

## Gates de aceptación

- tests backend determinísticos de retry y persistencia PASS;
- API real 5/5 HTTP 201, <=120 s, fingerprint/citas válidos;
- focal UI Run 1 y Run 2 PASS;
- month-close seguido del focal PASS;
- backend y frontend gates completos PASS;
- Playwright baseline/candidate completos y parseables;
- `candidateNewFailures=0`;
- `baselinePassedCandidateFailed=0`;
- test API directo de AI Advisor PASS en candidate;
- package hashes intactos;
- SQLite restaurada;
- promoción atómica sólo de archivos autorizados.

Los fallos comunes baseline/candidate se registran como deuda preexistente y no bloquean si son idénticos, no pertenecen al contrato AI y no impiden calcular la comparación.

## Evidencia esperada

`architecture-handoff/agents-to-architect/pending-validation/APPCAJA-V3-APP-AI-UX-STABILITY-001-evidence-v1.0.3/`

No abrir otro vertical hasta aceptación arquitectónica.