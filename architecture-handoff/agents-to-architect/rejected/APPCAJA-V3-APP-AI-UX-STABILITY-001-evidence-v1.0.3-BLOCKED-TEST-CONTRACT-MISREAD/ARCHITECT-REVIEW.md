# Revisión arquitectónica — APP-AI-UX-STABILITY-001 v1.0.3

Estado: BLOCKED no aceptado como bloqueo técnico.

La instrucción v1.0.3 incluye `workspace/backend/tests/ai-advisor/ai-advisor.service.test.ts` entre los archivos autorizados y ordena extender ese archivo para el nuevo contrato. Por lo tanto, los tests antiguos que fijan exactamente dos intentos no son inmutables: deben actualizarse cuando cambia deliberadamente el contrato a máximo tres intentos totales.

Corrección requerida:
- conservar los escenarios donde el segundo intento es válido y, por ello, hay exactamente dos llamadas;
- cambiar el escenario de agotamiento para devolver 422 después de tres respuestas recuperables inválidas;
- reemplazar `nunca existe tercer intento` por `nunca existe cuarto intento`;
- verificar máximo tres intentos, una correlationId lógica, attempt IDs distintos, mismo fingerprint/fuentes y cero persistencia válida de intentos rechazados;
- un error no recuperable mantiene una sola llamada.

No corresponde filtrar tests ni reducir el contrato a dos intentos. Canonical permanece intacto y el candidato debe reconstruirse desde baseline limpio.