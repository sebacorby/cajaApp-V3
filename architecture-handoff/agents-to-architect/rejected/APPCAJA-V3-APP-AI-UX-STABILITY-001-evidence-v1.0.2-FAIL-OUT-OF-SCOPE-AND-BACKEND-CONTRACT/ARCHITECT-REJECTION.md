# Rechazo arquitectónico — APP-AI-UX-STABILITY-001 v1.0.2

Estado: FAIL técnico.

Motivos determinantes:
- se modificó `workspace/frontend/src/lib/finance/ai-advisor-api.ts`, archivo no autorizado por la instrucción v1.0.2;
- el cambio no fue restaurado tras FAIL;
- `workspace/frontend/tests/diagnostic.spec.ts` quedó dentro del workspace y contaminó la suite;
- los hashes before/after informados para `ai-advisor-api.ts` son inválidos;
- se omitieron gates obligatorios de backend y frontend;
- el retry cliente no corrige el contrato backend: la API directa continúa devolviendo 422 intermitente.

La siguiente campaña debe restaurar canonical, mover el retry al backend con intentos acotados, mantener validación estricta, devolver error estructurado al agotarse y mostrarlo en UI con retry manual.