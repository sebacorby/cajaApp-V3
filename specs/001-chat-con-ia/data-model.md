# Data Model: Agente IA Conversacional de CajaApp

## AgentConversation

Representa un hilo persistente del agente.

Fields:
- `id: String` UUID, PK.
- `title: String` requerido, 1..120 caracteres.
- `status: String` enum lógico `active|archived`.
- `summaryText: String?` resumen acumulado.
- `summaryVersion: String?` versión del algoritmo/prompt de summary.
- `summaryThroughSequence: Int?` último mensaje incluido en el resumen.
- `lastProvider: String?` último provider usado.
- `lastModel: String?` último modelo usado.
- `createdAt: DateTime`.
- `updatedAt: DateTime`.
- `archivedAt: DateTime?`.

Relationships:
- 1:N con `AgentMessage`, `AgentAttachment`, `AgentRun`.
- Borrado de conversación hace cascade únicamente sobre tablas Agent* relacionadas.

Indexes:
- `(status, updatedAt)` para listado reciente.

State transitions:
- `active -> archived -> active`.

## AgentMessage

Representa un mensaje ordenado dentro de una conversación.

Fields:
- `id: String` UUID, PK.
- `conversationId: String` FK requerida.
- `sequence: Int` secuencia monótona por conversación.
- `role: String` enum lógico `user|assistant|tool`.
- `contentJson: String` JSON validado; nunca contiene secretos.
- `createdAt: DateTime`.

Constraints:
- Unique `(conversationId, sequence)`.
- `sequence >= 1` validado en service.

Indexes:
- `(conversationId, sequence)`.

## AgentAttachment

Representa un PDF/CSV staged por el usuario.

Fields:
- `id: String` UUID, PK.
- `conversationId: String` FK requerida.
- `messageId: String?` FK opcional hasta asociar el adjunto al mensaje.
- `fileName: String` requerido.
- `mimeType: String` permitido sólo PDF/CSV.
- `sizeBytes: Int` rango `1..10485760`.
- `sha256: String` hash hexadecimal.
- `storagePath: String` path generado por CajaApp, nunca suministrado por modelo.
- `status: String` enum lógico `staged|consumed|failed`.
- `createdAt: DateTime`.

Indexes:
- `(conversationId, createdAt)`.
- `sha256` para trazabilidad, no dedupe global obligatorio en V1.

## AgentRun

Representa una ejecución de un turno del usuario.

Fields:
- `id: String` UUID, PK.
- `conversationId: String` FK requerida.
- `userMessageId: String` FK requerida al mensaje que originó el run.
- `status: String` enum lógico `running|awaiting_approval|completed|cancelled|cancelled_after_tool|failed`.
- `provider: String` requerido.
- `model: String` requerido.
- `systemPromptVersion: String` requerido.
- `startedAt: DateTime`.
- `completedAt: DateTime?`.
- `inputTokens: Int?`.
- `outputTokens: Int?`.
- `toolCallCount: Int` default 0.
- `lastEventSequence: Int` default 0.
- `errorCode: String?`.
- `errorMessage: String?` sanitizado.

Constraints:
- Sólo un run no terminal por conversación, aplicado en service/transacción.
- `userMessageId` debe pertenecer a la misma conversación.

Indexes:
- `(conversationId, startedAt)`.
- `(status, startedAt)`.

State transitions:
- `running -> awaiting_approval -> running -> completed`.
- `running -> cancelled`.
- `running -> cancelled_after_tool` cuando llega cancel durante una tool ya iniciada.
- `running|awaiting_approval -> failed` ante error terminal.

## AgentToolCall

Representa una propuesta/ejecución de tool dentro de un run.

Fields:
- `id: String` UUID, PK.
- `runId: String` FK requerida.
- `ordinal: Int` orden dentro del run.
- `toolName: String` nombre exacto del registry.
- `riskClass: String` enum lógico `R0|R1|R2|R3|R4`.
- `argumentsJson: String` argumentos validados y canónicos.
- `idempotencyKey: String` unique; derivado de `runId + toolCallId`.
- `status: String` enum lógico `proposed|awaiting_approval|running|succeeded|failed|rejected|cancelled`.
- `resultJson: String?` resultado proyectado/sanitizado.
- `errorCode: String?`.
- `errorMessage: String?` sanitizado.
- `createdAt: DateTime`.
- `completedAt: DateTime?`.

Constraints:
- Unique `(runId, ordinal)`.
- Unique `idempotencyKey`.
- `riskClass` se copia desde el registry; nunca llega confiado desde el modelo.

Indexes:
- `(runId, ordinal)`.
- `(toolName, createdAt)`.
- `(status, createdAt)`.

State transitions:
- R0/R1 y R2 explícita: `proposed -> running -> succeeded|failed`.
- R2 inferida y R3/R4: `proposed -> awaiting_approval -> running -> succeeded|failed`.
- Rechazo: `awaiting_approval -> rejected`.

## AgentApproval

Representa la autorización del usuario para una acción que requiere confirmación.

Fields:
- `id: String` UUID, PK.
- `toolCallId: String` FK unique requerida.
- `status: String` enum lógico `pending|approved|rejected|expired`.
- `impactSummaryJson: String` snapshot humano/estructurado del impacto mostrado.
- `argumentsHash: String` hash de `toolName + argumentos canónicos`; evita reutilizar approval si cambian argumentos.
- `requestedAt: DateTime`.
- `resolvedAt: DateTime?`.

State transitions:
- `pending -> approved|rejected|expired`.
- Un estado terminal no vuelve a `pending`.

## Cross-Entity Invariants

1. `AgentConversation` nunca tiene relaciones FK hacia entidades financieras con cascade.
2. Las referencias a movimientos, presupuestos, tarjetas u otras entidades se guardan dentro de JSON auditado; borrar el chat no borra dominio.
3. Un `AgentToolCall` exitoso se persiste antes de reenviar su resultado al provider.
4. Una mutación nunca se repite si existe `AgentToolCall.status=succeeded` para su `idempotencyKey`.
5. `AgentApproval.argumentsHash` debe coincidir con la tool call vigente antes de ejecutar.
6. Los strings JSON se parsean con schemas específicos; JSON inválido en DB se considera error de integridad de la feature y no se entrega crudo al modelo.
7. Campos `errorMessage`, `resultJson`, `contentJson` e `impactSummaryJson` no almacenan `.env`, API keys, tokens ni rutas secretas.
8. `AgentAttachment.storagePath` sólo se genera desde backend bajo el storage local configurado.
9. El máximo de un run activo por conversación se verifica en transacción antes de crear uno nuevo.
10. El sequence de mensajes y el sequence de eventos son monotónicos e independientes.

## Retention / Delete Semantics

- `DELETE conversation` elimina mensajes, attachments staged, runs, tool calls y approvals por cascade.
- Si un attachment ya fue consumido por un pipeline documental existente, la limpieza del chat no borra el documento/import de dominio creado por ese pipeline.
- No se agrega política automática de purga en V1.
