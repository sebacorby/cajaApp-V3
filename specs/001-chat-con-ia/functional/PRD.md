# PRD — Agente IA conversacional para CajaApp V3

**Feature:** `001-chat-con-ia`
**Producto:** CajaApp V3
**Estado:** Propuesto para especificación e implementación
**Versión:** 1.1.0
**Fecha:** 2026-09-12
**Owner:** Javi
**Plataforma:** Windows x64, uso local personal
**Runtime obligatorio:** `I:\Tools\node-v24.18.0-win-x64` / Node.js `v24.18.0`

## 1. Decisión de producto

CajaApp incorporará un **Agente IA nuevo y separado del Asesor IA existente**. Será una experiencia de chatbot general, persistente y orientada a acción. Podrá conversar libremente sobre cualquier tema y, cuando la conversación involucre CajaApp, podrá consultar y operar las funciones reales de la aplicación mediante herramientas explícitas.

El Agente IA NO reemplaza ni modifica `ai-advisor`. `FEAT-017-ai-advisor` conserva su contrato explain-only, sus citas, simulaciones aisladas y la prohibición de mutar registros. El nuevo vertical tendrá arquitectura, persistencia, API, prompts y tests propios.

La regla central es:

> **LLM conversacional → catálogo de tools CajaApp → services de dominio → Prisma/SQLite.**

Nunca se permitirá:

> **LLM → Prisma/SQL directo**, acceso arbitrario al filesystem, bypass de validaciones o llamadas internas improvisadas a endpoints HTTP de la propia aplicación.
## 2. Qué significa “sin restricciones” en este producto

“Sin restricciones” significa que CajaApp no impondrá un modo temático estrecho ni limitará el chat a finanzas, a preguntas predefinidas o a respuestas estructuradas como el Asesor IA. El usuario podrá mantener conversación general, pedir explicaciones, análisis, planificación, redacción o acciones sobre CajaApp dentro de la misma conversación.

Para datos propios de CajaApp rigen cuatro invariantes:

1. El agente debe consultar tools antes de afirmar el estado actual de CajaApp; no puede inventar saldos, movimientos, IDs, cierres, presupuestos ni registros.
2. Toda mutación debe pasar por el service de dominio correspondiente y su schema Zod vigente.
3. Ninguna instrucción conversacional puede saltar integridad, deduplicación, reglas de negocio, trazabilidad, backup o validaciones existentes.
4. Las acciones críticas requieren confirmación explícita aunque el modelo las proponga correctamente.

Estas invariantes son controles de ejecución, no restricciones de conversación.

## 3. Problema a resolver

CajaApp ya concentra el dato financiero, pero para usarlo el usuario debe conocer en qué sección vive cada función, navegar entre pantallas y traducir una intención humana a filtros, formularios y operaciones concretas.

El Agente IA debe convertir una intención expresada en lenguaje natural en una combinación de:

- conversación normal;
- lectura de datos reales de CajaApp;
- razonamiento sobre resultados obtenidos mediante tools;
- navegación hacia una sección o registro;
- creación, modificación o reversión de datos cuando corresponda;
- importación de documentos ya soportados por CajaApp;
- explicación final de qué encontró y qué hizo.
## 4. Usuario y trabajos principales

Usuario primario: dueño de CajaApp, usuario diario, único decisor y administrador local de sus datos.

Trabajos que el agente debe resolver de punta a punta:

- “¿Cuánto gasté en supermercado este mes y cómo viene contra el presupuesto?”
- “Mostrame los movimientos de Galicia de más de $100.000 y llevame al que dice seguro.”
- “Anotá un gasto en efectivo de $18.500 en farmacia hoy.”
- “Cambiá ese movimiento a Salud.”
- “Creame un presupuesto de $250.000 para Supermercado este mes.”
- “¿Qué cuotas tengo los próximos tres meses?”
- “Revisá si tengo movimientos duplicados y proponé cómo conciliarlos.”
- “Adjunto este resumen de tarjeta: importalo y avisame cuando esté listo para revisar.”
- “Cerrá agosto.” → debe mostrar impacto y pedir confirmación crítica antes de ejecutar.
- “Restaurá este backup.” → debe validar primero y pedir confirmación crítica.
- “Explicame este dato” o conversación general sin tocar CajaApp → responde normalmente sin forzar tools.

## 5. Objetivos medibles

1. El usuario puede resolver desde el chat cualquier operación ya soportada por los services de CajaApp sin navegar manualmente a su sección.
2. El 100% de las afirmaciones sobre estado actual de CajaApp provienen de una tool ejecutada en el run actual o de un resultado persistido todavía válido dentro de la conversación.
3. El 100% de las mutaciones queda auditado con tool, argumentos, resultado, usuario-intent, run y timestamp.
4. El 100% de las acciones críticas requiere aprobación explícita y queda registrada.
5. Una conversación puede retomarse después de reiniciar CajaApp conservando mensajes, resumen y acciones.
6. El usuario ve texto de la respuesta mientras se genera y puede cancelar un run activo.
7. El agente nunca escribe directamente en Prisma fuera de los services de dominio registrados como tools.
## 6. Entrada y navegación exacta

El acceso principal al Agente IA es un **launcher flotante circular persistente** ubicado en la esquina inferior derecha de CajaApp. No se agrega como item primario del sidebar ni requiere cambiar de sección para conversar.

El launcher está montado a nivel de `AppShell`, por encima del contenido de cualquier sección, y permanece disponible mientras el usuario navega por Dashboard, Movimientos, Tarjetas, Presupuestos o cualquier otra pantalla.

Especificación visual del launcher:

- posición fija: esquina inferior derecha, equivalente a `bottom-6 right-6` en desktop;
- forma: círculo perfecto;
- tamaño desktop: 60 px; tamaño mobile: 54 px;
- icono: `MessageCircle` o `Bot`, centrado y sin texto permanente;
- color: `bg-primary` + `text-primary-foreground` usando tokens existentes;
- borde/ring/focus: tokens existentes, con focus visible por teclado;
- sombra: elevación clara pero consistente con CajaApp;
- `z-index` suficiente para quedar sobre el contenido normal sin superar dialogs/approval modals;
- tooltip desktop: `Abrir Agente IA`;
- `aria-label`: `Abrir Agente IA` cuando está cerrado y `Cerrar Agente IA` cuando está abierto.

`Asesor IA` permanece visible y funcional en su sección actual. No se fusionan ambos accesos.

El estado abierto/minimizado del widget no cambia `SectionId`; el usuario puede seguir viendo la sección actual detrás del chat. Si una tool ejecuta `ui.navigate`, el contenido principal navega al destino solicitado y el panel del agente permanece abierto salvo que el usuario lo cierre.

## 7. Layout y comportamiento visual exactos

### Desktop

Al presionar el launcher se abre un panel flotante anclado a la esquina inferior derecha, por encima del `AppShell`:

- ancho objetivo: 460 px, con rango adaptable 420–520 px;
- alto objetivo: 76vh, con mínimo 560 px y máximo que preserve margen superior/inferior;
- posición: separado visualmente del launcher y de los bordes del viewport;
- fondo `bg-card`, borde `border-border`, radios y sombra del design system vigente;
- header fijo arriba, historial scrolleable en el centro y composer fijo abajo;
- no desplaza ni redimensiona el contenido principal de CajaApp.

El panel contiene tres superficies internas accesibles sin abandonar el chat: conversación activa, selector/historial de conversaciones y actividad técnica. Historial y actividad se muestran como `Sheet`/drawer internos cuando se solicitan, evitando un panel permanentemente ancho de tres columnas.

### Mobile

En viewport mobile, tocar el launcher abre el Agente IA como `Sheet` o dialog full-screen. Ocupa el viewport utilizable completo, conserva header y composer sticky y ofrece botones para volver/cerrar sin perder el hilo activo.

### Minimizado, cerrado y reanudación

Cerrar o minimizar el panel devuelve la UI al launcher circular. La conversación activa, sus mensajes, el run y cualquier approval pendiente permanecen persistidos. Reabrir recupera el mismo hilo salvo que el usuario elija explícitamente `+ Nuevo chat`.

Si existe un run activo mientras el panel está minimizado, el launcher muestra un indicador visual discreto de actividad. Si termina una respuesta o queda una Approval Card pendiente, puede mostrar un punto/badge de estado sin revelar datos financieros ni montos.

El launcher debe evitar superponer controles críticos de la sección actual. Cuando una vista tenga una acción fija en la misma esquina, el layout debe reservar o desplazar el launcher manteniendo siempre un área táctil mínima de 44×44 px.

## 8. Estado vacío

Un chat nuevo muestra el título `¿Qué querés hacer?` y seis accesos que sólo precargan texto, nunca ejecutan acciones automáticamente:

`Revisar mis gastos` · `Registrar un movimiento` · `Ver deuda futura` · `Revisar presupuestos` · `Importar un documento` · `Buscar algo en CajaApp`.

Debajo se muestra: `También podés hablar conmigo de cualquier otra cosa.`
## 9. Mensajes y composer

Mensajes del usuario: alineación derecha, ancho máximo 78%, texto + adjuntos. Mensajes del agente: alineación izquierda, sin burbuja pesada, Markdown completo, tablas, listas, código y bloques estructurados cuando el resultado venga de CajaApp.

Cada respuesta del agente puede intercalar **Tool Cards**. Una Tool Card muestra: icono de dominio, acción humana (`Buscando movimientos`), estado (`Ejecutando / Completada / Requiere aprobación / Falló`), resumen del input y resumen del resultado. Los argumentos técnicos completos viven en `Actividad`, no ensucian la conversación.

El composer incluye:

- textarea autoexpandible hasta 8 líneas;
- `Enter` envía y `Shift+Enter` inserta salto;
- botón `+` para adjuntar PDF o CSV de hasta 10 MB;
- botón `Enviar`;
- durante un run, `Enviar` cambia por `Detener`;
- indicador de archivos adjuntos con quitar antes del envío.

PDF/CSV adjuntos quedan en staging local y sólo pueden ser consumidos por tools de importación. El archivo completo no se inyecta al LLM salvo que un contrato futuro lo autorice explícitamente.

## 10. Header del chat

El header muestra título, provider/model actual y un badge `Acceso CajaApp: completo`. Un menú contiene `Renombrar`, `Archivar`, `Eliminar conversación` y `Ver actividad`.

No habrá selector “modo análisis / modo acción”. El agente decide si necesita tools según la intención. La ausencia de modos es deliberada: la experiencia debe sentirse como un agente y no como un formulario de IA.

## 11. Comportamiento conversacional

El agente mantiene contexto multi-turno, entiende referencias como `ese movimiento`, `el presupuesto anterior`, `la tarjeta que vimos recién` y puede continuar un trabajo iniciado en mensajes previos.

Para hechos de CajaApp debe preferir recuperar el registro por ID persistido en contexto; si el estado puede haber cambiado, vuelve a consultar la tool antes de afirmarlo o mutarlo.

La conversación general no requiere tools. Una pregunta que mezcle conversación y datos de CajaApp puede combinar respuesta libre con tools en el mismo run.
## 12. Memoria de conversación

Cada conversación persiste localmente. El contexto enviado al modelo se compone de:

1. system prompt versionado del agente;
2. resumen acumulado de la conversación anterior;
3. últimos mensajes no resumidos;
4. referencias a entidades de CajaApp todavía relevantes;
5. catálogo de tools disponible;
6. mensaje actual y adjuntos referenciados.

Cuando el historial supera el presupuesto configurado se crea un resumen local versionado. El resumen nunca sustituye IDs relevantes: los identificadores de entidades, acciones pendientes y resultados críticos se conservan estructurados.

Defaults propuestos:

- `AGENT_MAX_CONTEXT_CHARACTERS=200000`
- `AGENT_MAX_TOOL_RESULT_CHARACTERS=50000`
- `AGENT_RECENT_MESSAGES=40`
- `AGENT_MAX_STEPS_PER_RUN=32`
- `AGENT_STREAM_HEARTBEAT_MS=5000`

Al alcanzar 32 pasos, el run termina de forma controlada con lo realizado y permite continuar desde la misma conversación. No se reinicia ni se pierde estado.

## 13. Loop agéntico

Flujo de cada turno:

`user message → persist → assemble context → provider stream → tool call(s) → validate → authorize → execute service → persist result → return tool result to model → repeat → final answer → persist`.

Las tools read-only independientes pueden ejecutarse en paralelo. Las tools que mutan estado se ejecutan serialmente en el orden decidido por el agente.

Cada mutación recibe `idempotencyKey = runId + toolCallId`. Un retry técnico no puede duplicar una operación ya aplicada.

El backend es dueño del loop. El frontend nunca ejecuta directamente una mutación solicitada por el modelo.
## 14. Catálogo de tools — búsqueda, navegación y lectura

Las tools exponen schemas propios y llaman directamente a services existentes. No hacen fetch loopback a `127.0.0.1:11436`.

| Tool | Service/capacidad | Riesgo |
|---|---|---|
| `app.search` | búsqueda global cross-entity | read |
| `ui.navigate` | cambia `SectionId`/destino en frontend mediante evento | read |
| `dashboard.get_overview` | dashboard y alertas determinísticas | read |
| `movements.list` | ledger filtrado/paginado | read |
| `movements.export_csv` | export actual del ledger | artifact |
| `categories.list` | categorías activas/inactivas | read |
| `categories.suggest` | sugerencia determinística existente | read |
| `cards.list_statements` | historial/listado de resúmenes | read |
| `cards.get_latest` | resumen activo más reciente | read |
| `cards.get_statement` | detalle de resumen | read |
| `cards.get_traceability` | draft/run/documento origen | read |
| `cards.get_exchange_rate` | cotización actual | read |
| `cards.get_updated_values` | valores/proyecciones actualizados | read |
| `card_import.get_status` | estado de procesamiento | read |
| `card_import.get_draft` | preview del draft | read |
| `import_center.list` / `import_center.get` | bandeja agregada y detalle | read |
| `debit_import.list` / `debit_import.get` | imports CSV | read |
| `salary_receipt.list` / `salary_receipt.get` / `salary_receipt.get_draft` | recibos y drafts | read |
| `incomes.get_overview` | fuentes/eventos y proyección | read |
| `budgets.get_overview` / `budgets.list` | presupuesto agregado y detalle | read |
| `goals.get_overview` / `goals.list` / `goals.get` | objetivos | read |
| `future.get_overview` | deuda/compromisos futuros | read |
| `reports.get` | reportes reales | read |
| Tool | Service/capacidad | Riesgo |
|---|---|---|
| `reports.export_csv` | export de reporte | artifact |
| `reconciliation.list` / `reconciliation.get` | casos de conciliación | read |
| `financial_health.get` / `financial_health.history` | evaluación e historial | read |
| `month_close.list` / `month_close.get` | cierres | read |
| `backup.list` / `backup.download` | backups locales | read/artifact |
| `settings.get` / `settings.get_system` | preferencias y estado del sistema | read |

## 15. Catálogo de tools — escritura normal

Estas acciones se ejecutan sin diálogo extra cuando la intención de realizarlas es explícita en el mensaje actual y todos los argumentos son inequívocos. Si el agente infiere la acción como paso auxiliar, pide confirmación antes de mutar.

| Tool | Acción |
|---|---|
| `movements.create_manual` | crear movimiento manual |
| `movements.update_manual` | editar movimiento manual |
| `categories.create` | crear categoría/reglas |
| `categories.update` | editar categoría/reglas |
| `categories.assign` | asignar categoría a movimiento soportado |
| `incomes.create_source` | crear fuente de ingreso |
| `incomes.update_source` | editar fuente de ingreso |
| `incomes.create_event` | registrar evento de ingreso |
| `budgets.create` | crear presupuesto |
| `budgets.update` | editar presupuesto |
| `budgets.set_status` | cambiar estado del presupuesto |
| `goals.create` | crear objetivo |
| `goals.update` | editar objetivo |
| `goals.set_status` | cambiar estado del objetivo |
| `goals.add_contribution` | registrar aporte |
| `cards.set_exchange_rate` | actualizar USD/ARS |
| `cards.create_manual_purchase` | registrar compra manual de tarjeta |
| `backup.create` | crear backup manual validado |
| `settings.update` | cambiar preferencias locales |
## 16. Catálogo de tools — importación y revisión

Las tools de upload sólo aceptan `attachmentId` perteneciente al mensaje actual o a la conversación. Nunca aceptan rutas arbitrarias del filesystem.

| Tool | Acción |
|---|---|
| `card_import.upload_attachment` | iniciar importación PDF de tarjeta |
| `card_import.update_draft` | editar preview |
| `debit_import.preview_attachment` | crear preview desde CSV |
| `debit_import.update_row` | corregir fila del preview |
| `salary_receipt.import_attachment` | iniciar importación de recibo PDF |
| `salary_receipt.update_draft` | editar draft de recibo |
| `backup.validate` | validar backup existente antes de restaurar |
| `reconciliation.scan` | ejecutar detector determinístico |
| `financial_health.create_snapshot` | persistir snapshot calculado |

Importar un archivo y generar un draft/preview no equivale a aceptarlo en el ledger. El agente puede iniciar el procesamiento sin confirmación adicional cuando el usuario adjuntó el archivo y pidió importarlo.

## 17. Catálogo de tools — acciones críticas

Siempre requieren una Approval Card explícita antes de ejecutar:

- `card_import.accept_draft`
- `cards.archive_statement` / `cards.activate_statement`
- `debit_import.accept` / `debit_import.delete` / `debit_import.reverse`
- `salary_receipt.accept_draft` / `salary_receipt.reverse`
- `movements.void_manual`
- `cards.delete_manual_purchase`
- `categories.archive` / `categories.restore`
- `incomes.delete_source` / `incomes.delete_event`
- `budgets.delete`
- `goals.delete` / `goals.delete_contribution`
- `reconciliation.resolve` / `reconciliation.reopen`
- `month_close.create` / `month_close.reopen`
- `financial_health.delete_snapshot`
- `backup.restore`
## 18. Approval Card exacta

Cuando una tool crítica queda pendiente, el stream se pausa y aparece una tarjeta dentro del chat con:

- acción propuesta en lenguaje humano;
- entidad afectada e identificador;
- valores actuales relevantes;
- cambio que se realizará;
- consecuencias conocidas;
- reversibilidad (`Reversible`, `Reapertura disponible`, `Sin undo automático`, etc.);
- botones `Confirmar` y `Cancelar`.

La aprobación corresponde a un `toolCallId` inmutable. Si los argumentos cambian, la aprobación anterior deja de ser válida.

Al confirmar, el mismo run continúa desde esa tool; no se genera un nuevo mensaje de usuario artificial. Al cancelar, el resultado `user_rejected` vuelve al modelo y éste continúa conversando sin ejecutar la acción.

`backup.restore` debe mostrar además: archivo, hash, fecha del manifiesto, resultado de validación y confirmación de que CajaApp creará el backup pre-restore existente en el service.

## 19. Política de ejecución

| Clase | Ejemplo | Ejecución |
|---|---|---|
| R0 lectura | buscar, listar, dashboard, reportes | automática |
| R1 artefacto | exportar CSV, descargar backup | automática tras pedido explícito |
| R2 escritura normal | crear gasto, editar presupuesto | automática si el pedido actual es explícito; confirmación si fue inferida |
| R3 materialización/reversión/borrado/cierre | aceptar draft, anular, borrar, conciliar, cerrar mes | aprobación siempre |
| R4 restauración | restaurar SQLite | validación + aprobación siempre |

Una tool no puede cambiar de clase dinámicamente. La clasificación vive en un registro backend versionado y testeado.

## 20. Resolución de ambigüedad

El agente no pide confirmación por rutina. Pregunta sólo cuando falta un dato necesario que no puede obtener con tools o cuando existen varios candidatos razonables.

Ejemplo: `cambiá ese gasto a Salud` con un único movimiento referenciado → ejecuta. Con tres movimientos posibles sin referencia suficiente → lista candidatos y pregunta cuál.

Nunca completa montos, fechas, moneda, IDs o decisiones financieras faltantes por imaginación cuando el dato determina una mutación.
## 21. Persistencia nueva

Agregar modelos Prisma separados del `AiAdvisorInteraction`:

### `AgentConversation`
`id`, `title`, `status(active|archived)`, `summaryText`, `summaryVersion`, `summaryThroughSequence`, `lastProvider`, `lastModel`, `createdAt`, `updatedAt`, `archivedAt`.

### `AgentMessage`
`id`, `conversationId`, `sequence`, `role(user|assistant|tool)`, `contentJson`, `createdAt`. Unique `(conversationId, sequence)`.

### `AgentAttachment`
`id`, `conversationId`, `messageId`, `fileName`, `mimeType`, `sizeBytes`, `sha256`, `storagePath`, `status(staged|consumed|failed)`, `createdAt`.

### `AgentRun`
`id`, `conversationId`, `userMessageId`, `status(running|awaiting_approval|completed|cancelled|failed)`, `provider`, `model`, `systemPromptVersion`, `startedAt`, `completedAt`, `inputTokens`, `outputTokens`, `toolCallCount`, `errorCode`, `errorMessage`.

### `AgentToolCall`
`id`, `runId`, `ordinal`, `toolName`, `riskClass`, `argumentsJson`, `idempotencyKey`, `status(proposed|awaiting_approval|running|succeeded|failed|rejected|cancelled)`, `resultJson`, `errorCode`, `errorMessage`, `createdAt`, `completedAt`.

### `AgentApproval`
`id`, `toolCallId` unique, `status(pending|approved|rejected|expired)`, `impactSummaryJson`, `requestedAt`, `resolvedAt`.

Todos los deletes de conversaciones deben definir explícitamente cascades sólo sobre estas tablas y adjuntos staged; nunca sobre entidades financieras referenciadas por tool calls.
## 22. API backend del Agente IA

Nuevo módulo: `workspace/backend/src/modules/agent-chat/`.

Rutas canónicas bajo `/api/agent`:

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/conversations` | listar conversaciones |
| `POST` | `/conversations` | crear conversación |
| `GET` | `/conversations/:id` | detalle + mensajes paginados |
| `PUT` | `/conversations/:id` | renombrar/archivar/reactivar |
| `DELETE` | `/conversations/:id` | eliminar historial de chat |
| `POST` | `/conversations/:id/attachments` | stage PDF/CSV |
| `POST` | `/conversations/:id/messages` | persistir mensaje y crear run; responde `202 {runId}` |
| `GET` | `/runs/:runId/events` | stream SSE del run |
| `POST` | `/runs/:runId/cancel` | cancelar generación/tool pendiente no iniciada |
| `POST` | `/tool-calls/:toolCallId/approve` | aprobar acción crítica |
| `POST` | `/tool-calls/:toolCallId/reject` | rechazar acción crítica |
| `GET` | `/runs/:runId` | snapshot recuperable si se cortó SSE |
| `GET` | `/tools` | catálogo/version/risk para diagnóstico |

Todas las rutas usan Zod y `AppError` como el resto del backend.

## 23. Protocolo SSE

Eventos mínimos: `run.started`, `assistant.delta`, `tool.proposed`, `tool.started`, `tool.completed`, `tool.failed`, `approval.required`, `approval.resolved`, `ui.navigate`, `assistant.completed`, `run.completed`, `run.cancelled`, `run.failed`, `heartbeat`.

Cada evento incluye `runId`, `sequence`, `timestamp` y payload tipado. El frontend deduplica por `(runId, sequence)` al reconectar.

Si la conexión SSE cae, el run continúa en backend. Al reconectar, `GET /runs/:runId` recupera el snapshot y `/events` retoma desde `Last-Event-ID`.
## 24. Provider architecture

No se reutiliza `TextExtractionProvider` como interfaz del agente porque su contrato exige `extractJson(systemPrompt, rawDocument)` y está diseñado para extracción documental estructurada.

Se crea una interfaz nueva `AgentChatProvider` con capacidades:

- chat multi-turno;
- streaming de texto;
- function/tool calling;
- mensajes `user`, `assistant` y `tool`;
- cancelación por `AbortSignal`;
- métricas de tokens/duración;
- identificación de provider/model/request.

Implementaciones iniciales:

1. `OllamaAgentChatClient`: usa `/api/chat`, historial `messages`, `tools` y `stream:true`.
2. `OpenAICompatibleAgentChatClient`: usa el endpoint configurado y sólo se habilita si el provider declara tool calling compatible.

La documentación oficial de Ollama confirma que `/api/chat` acepta historial, lista de tools, devuelve `tool_calls`, soporta tool calling paralelo y tiene streaming habilitado por defecto. Esto permite implementar el loop sin introducir otro runtime ni SDK obligatorio.

El provider documental y el provider agéntico pueden compartir configuración de modelo/URL/credentials, pero sus interfaces y validaciones permanecen separadas.

## 25. Registro de tools

Nuevo `agent-tool-registry.ts` como única fuente de verdad. Cada entrada define:

`name`, `description`, `inputSchema`, `riskClass`, `parallelSafe`, `requiresExplicitIntent`, `handler`, `resultProjector`, `auditEntityRefs`.

El `handler` llama a un service importado del módulo real. Está prohibido poner Prisma dentro del handler salvo que la operación no exista aún en ningún service y se cree primero un service de dominio canónico.
## 26. Prompt del agente

Nuevo contrato bajo `contracts/prompts/agent/01-agent-system.md`, versionado y hasheado en cada run.

El prompt debe imponer comportamiento, no respuestas rígidas:

- Sos el agente conversacional de CajaApp y podés hablar de cualquier tema.
- Cuando una afirmación dependa del estado de CajaApp, usá tools antes de responder.
- No inventes registros, resultados de tools ni ejecuciones.
- Usá IDs y referencias obtenidas de tools para continuar trabajos multi-turno.
- Si el usuario pide explícitamente una acción R2 y los argumentos son suficientes, ejecutala sin volver a pedir permiso.
- Para R3/R4, proponé la tool y esperá aprobación del runtime.
- Nunca intentes sortear una tool rechazada, una validación Zod ni una regla del service.
- Si una tool falla, explicá el error real y decidí si otra tool legítima puede resolverlo.
- No llames al Asesor IA como subagente; para datos financieros usá directamente las tools de dominio.
- No expongas chain-of-thought; entregá conclusiones, acciones y evidencia útil.

El prompt no contiene credenciales, rutas físicas de secretos ni contenido financiero precargado.

## 27. Contexto temporal y preferencias

El runtime agrega metadatos no confiados al modelo: fecha/hora local, timezone de `LocalAppSettings`, moneda por defecto y estado de `hideAmounts`.

`hideAmounts=true` afecta la presentación UI de resultados estructurados. No debe impedir que services devuelvan valores necesarios al agente para operar correctamente; sí debe impedir que tool cards muestren montos sin máscara en pantalla.

Si el usuario pide verbalmente un monto mientras `hideAmounts=true`, el agente puede usarlo como argumento de una acción solicitada, pero la UI continúa respetando el masking global.
## 28. Frontend propuesto

Nuevos archivos bajo `workspace/frontend/src/components/finance/agent/`:

- `agent-launcher.tsx`: botón circular flotante global, estado/badge y accesibilidad.
- `agent-chat-panel.tsx`: orquestador del widget abierto/minimizado.
- `conversation-drawer.tsx`: listado/búsqueda/acciones de chats.
- `conversation-header.tsx`: título, provider/model y menú cerrar/minimizar.
- `message-list.tsx`: virtualización/scroll y render de mensajes.
- `message-content.tsx`: Markdown y contenido estructurado.
- `agent-composer.tsx`: textarea, adjuntos, enviar/detener.
- `tool-call-card.tsx`: estados de tool.
- `approval-card.tsx`: confirmación R3/R4.
- `activity-panel.tsx`: run, tools y errores como drawer/sheet.
- `attachment-chip.tsx`: staging de PDF/CSV.
- `agent-empty-state.tsx`: accesos iniciales.

Nuevo API client: `workspace/frontend/src/lib/finance/agent-api.ts`.

Cambios mínimos fuera del vertical:

- `app-shell.tsx`: montar una única instancia persistente de `AgentLauncher` + `AgentChatPanel` sobre todas las secciones.
- `ui-store.ts`: agregar únicamente el estado UI global necesario (`agentOpen`, conversación activa y señales de navegación), sin convertir `agent` en `SectionId`.
- `icons.ts` sólo si la convención actual lo requiere.
- `nav.ts` y `section-router.tsx` no agregan una sección primaria `Agente IA`.

El widget debe sobrevivir a cambios de `SectionId` sin desmontar la conversación activa. `ui.navigate` puede cambiar la sección principal detrás del panel mientras el agente continúa visible.

No se modifica `asesor-ia-section.tsx` salvo que un refactor compartido estrictamente visual sea necesario y esté cubierto por tests.

## 29. Rendering de resultados CajaApp

Cuando una tool devuelve dinero, fechas o entidades, el agente puede responder en Markdown, pero la Tool Card debe usar componentes estructurados. Los montos visibles pasan por `Amount`; fechas usan locale `es-AR`; acciones navegables emiten targets compatibles con `useFinanceUI`.

Las respuestas nunca renderizan HTML crudo proveniente del modelo. Markdown se sanitiza y links externos no reciben privilegios especiales.
## 30. Backend propuesto

Nuevos archivos principales bajo `workspace/backend/src/modules/agent-chat/`:

- `agent-chat.routes.ts`
- `agent-chat.controller.ts`
- `agent-chat.schemas.ts`
- `agent-chat.service.ts`
- `agent-runner.service.ts`
- `agent-context.service.ts`
- `agent-memory.service.ts`
- `agent-tool-registry.ts`
- `agent-tool-executor.ts`
- `agent-approval.service.ts`
- `agent-events.service.ts`
- `agent-types.ts`

Provider layer nueva bajo `workspace/backend/src/modules/ai/agent/`:

- `agent-chat-provider.ts`
- `agent-chat-provider.factory.ts`
- `ollama-agent-chat.client.ts`
- `openai-compatible-agent-chat.client.ts`

Prompt contractual:

- `contracts/prompts/agent/01-agent-system.md`

Prisma:

- una migración nueva que agrega únicamente las tablas Agent*;
- no altera columnas ni semántica de entidades financieras existentes.

`app.ts` registra `agentChatRoutes`. `env.ts` agrega sólo configuración del agente y sigue validando Node exacto `v24.18.0`.
## 31. Privacidad y seguridad local-first

- Conversaciones, mensajes, tool calls y approvals viven en SQLite local.
- Adjuntos se guardan bajo storage local controlado por CajaApp, nunca en paths suministrados por el modelo.
- `.env`, API keys y secretos jamás entran al prompt, eventos SSE, activity panel o `resultJson`.
- Los result projectors eliminan campos internos innecesarios antes de devolver datos al modelo.
- Tool inputs se validan de nuevo en backend aunque hayan sido generados por un modelo.
- Los handlers no aceptan nombres de tablas, SQL, rutas, comandos shell ni nombres de métodos arbitrarios.
- Un tool name desconocido se rechaza; no existe reflexión dinámica sobre services.
- La restore de backup mantiene todas las validaciones de integridad, schema y migraciones ya implementadas.

## 32. Cancelación y concurrencia

Sólo puede existir un run activo por conversación. Distintas conversaciones pueden tener runs simultáneos mientras el provider lo permita.

`Detener` aborta el request al provider. Una tool ya confirmada y comenzada no se interrumpe a mitad de transacción. El run espera su resultado y termina como `cancelled_after_tool` si la cancelación llegó durante esa operación.

Las operaciones de backup/restore respetan la serialización ya existente en `BackupRestoreService`; el agente no introduce una cola paralela alternativa.

Un mensaje nuevo enviado mientras existe `awaiting_approval` no ejecuta automáticamente la approval pendiente. El agente recibe el mensaje nuevo y puede cancelar/reformular la acción; una aprobación sólo ocurre mediante el endpoint específico de aprobación.

## 33. Manejo de fallos

Provider caído → el mensaje del usuario queda persistido, el run queda `failed`, la UI muestra `Reintentar` y nunca duplica tool calls ya exitosas.

Tool validation error → se devuelve al modelo como resultado estructurado; el agente puede corregir argumentos una vez que tenga datos suficientes.

Tool business error → no se oculta ni se transforma en éxito. Se conserva `AppError.code/message` sanitizado y la respuesta explica qué regla lo impidió.
## 34. Requisitos funcionales

- **FR-001:** existir como widget global `Agente IA` separado de `Asesor IA`, accesible desde un launcher flotante persistente y sin requerir un `SectionId` propio.
- **FR-002:** crear, listar, renombrar, archivar, reabrir y eliminar conversaciones.
- **FR-003:** persistir historial multi-turno y retomarlo tras reinicio.
- **FR-004:** responder conversación general sin exigir tools.
- **FR-005:** usar tools para cualquier hecho que dependa del estado actual de CajaApp.
- **FR-006:** soportar streaming visible y cancelación.
- **FR-007:** ejecutar múltiples tools dentro de un mismo turno.
- **FR-008:** soportar tool calling paralelo únicamente para reads `parallelSafe`.
- **FR-009:** ejecutar escrituras R2 explícitamente pedidas sin confirmación redundante.
- **FR-010:** exigir Approval Card para toda tool R3/R4.
- **FR-011:** persistir tool calls, inputs, resultados, risk class y errores.
- **FR-012:** garantizar idempotencia de mutaciones ante retry/reconexión.
- **FR-013:** permitir adjuntar PDF/CSV y usarlos sólo mediante import tools.
- **FR-014:** mantener draft/review/accept actual en documentos; el chat no salta el draft.
- **FR-015:** navegar desde respuestas hacia secciones/registros de CajaApp.
- **FR-016:** respetar `hideAmounts` en toda presentación estructurada.
- **FR-017:** conservar referencias de entidades entre turnos.
- **FR-018:** compactar conversaciones largas sin perder IDs/acciones pendientes.
- **FR-019:** exponer provider/model y actividad del run sin secretos.
- **FR-020:** soportar el catálogo completo de capacidades actualmente disponibles en services.
- **FR-021:** nunca llamar Prisma/SQL directamente desde una tool de agente.
- **FR-022:** nunca usar `ai-advisor` como subagente.
- **FR-023:** rechazar tool names o argumentos fuera del registry/schema.
- **FR-024:** continuar el run después de una aprobación o rechazo.
- **FR-025:** mantener `Asesor IA` sin cambios funcionales.
- **FR-026:** mostrar el launcher circular abajo a la derecha en todas las secciones del `AppShell`.
- **FR-027:** abrir el chat como panel flotante en desktop y como superficie full-screen/Sheet en mobile.
- **FR-028:** cerrar o minimizar el chat sin perder conversación activa, run, tool cards ni approvals pendientes.
- **FR-029:** mantener el widget montado y operativo durante cambios de `SectionId` y navegación disparada por tools.
- **FR-030:** mostrar en el launcher un estado discreto de actividad/respuesta pendiente sin revelar montos ni datos sensibles.
## 35. Requisitos no funcionales

- **NFR-001:** Node.js exacto `v24.18.0` en backend/frontend.
- **NFR-002:** Windows x64 como plataforma soportada.
- **NFR-003:** SQLite local como persistencia; sin servicio de memoria externo obligatorio.
- **NFR-004:** primer evento SSE debe emitirse inmediatamente al crear el run; el tiempo del modelo no bloquea la UI silenciosamente.
- **NFR-005:** heartbeat cada 5 s durante esperas largas de provider/tool.
- **NFR-006:** ningún secreto puede persistirse en mensajes, tool results, logs ni SSE.
- **NFR-007:** una conversación con 10.000 mensajes sigue siendo abrible mediante paginación + summary; no se envía completa al modelo.
- **NFR-008:** tool calls read-only paralelos no deben alterar orden de mutaciones.
- **NFR-009:** todo run/tool/approval tiene timestamps y estado terminal recuperable.
- **NFR-010:** accesibilidad por teclado completa en composer, listas, Tool Cards y Approval Cards.
- **NFR-011:** responsive funcional en 390×844 y desktop.
- **NFR-012:** dark/light mode y tokens existentes, sin paleta paralela.
- **NFR-013:** no agregar dependencia pesada si una primitive actual de shadcn/React cubre el caso.
- **NFR-014:** launcher y controles del widget deben mantener área táctil mínima de 44×44 px y focus visible.
- **NFR-015:** el panel flotante no debe desplazar ni redimensionar el contenido principal en desktop.
- **NFR-016:** el z-index del launcher/panel debe quedar sobre el contenido normal y debajo de dialogs/approval modals críticos.

## 36. Escenarios de aceptación principales

### AC-01 — conversación general
Dado un chat nuevo, cuando el usuario pregunta algo no relacionado con CajaApp, el agente responde normalmente, no ejecuta tools innecesarias y persiste el intercambio.

### AC-02 — consulta financiera real
Cuando el usuario pregunta `¿cuánto gasté este mes?`, el agente consulta los services mediante tools, muestra al menos una Tool Card completada y responde usando esos resultados, sin inventar cifras.

### AC-03 — escritura explícita R2
Cuando el usuario dice `registrá un gasto de ARS 18500 en farmacia hoy`, el agente resuelve/crea la categoría según reglas disponibles, llama `movements.create_manual`, no pide una confirmación redundante y confirma el ID/resultado real devuelto.

### AC-04 — ambigüedad
Cuando la petición `cambiá ese movimiento` no identifica un único registro, el agente busca candidatos y pide selección antes de mutar.
### AC-05 — acción crítica
Cuando el usuario pide aceptar un draft, cerrar un mes o restaurar backup, aparece Approval Card con impacto. Sin `Confirmar`, no existe mutación.

### AC-06 — rechazo
Cuando el usuario cancela una Approval Card, `AgentToolCall.status=rejected`, el dominio permanece intacto y el agente continúa sin intentar la misma mutación por otra vía.

### AC-07 — documento
Cuando se adjunta un PDF de tarjeta y se pide importarlo, el agente usa el attachment como input de la import tool, crea/procesa el draft vigente y puede informar su estado; aceptar el draft sigue siendo R3.

### AC-08 — multi-tool
Cuando el usuario pregunta `¿cómo voy contra presupuesto y qué gastos explican el desvío?`, el agente puede consultar presupuesto + movimientos en paralelo, combinar resultados y navegar al detalle.

### AC-09 — persistencia
Después de reiniciar backend/frontend, abrir la conversación recupera mensajes, tool cards y referencias; el usuario puede decir `seguí con eso` y el agente reconstruye contexto sin inventarlo.

### AC-10 — reconexión
Si el navegador pierde SSE durante una respuesta, reconecta, deduplica eventos y no repite una tool ya ejecutada.

### AC-11 — masking
Con `hideAmounts=true`, los componentes estructurados del chat ocultan montos igual que el resto de CajaApp y no aparece una segunda implementación de masking.

### AC-12 — Asesor IA intacto
Los E2E existentes de `ai-advisor` continúan verdes y mantienen su garantía de no mutación.

### AC-13 — navegación
`llevame a ese resumen` ejecuta `ui.navigate` y abre Tarjetas sobre el target identificado, sin necesidad de búsqueda manual.

### AC-14 — tool inválida
Si el modelo emite una tool inexistente o argumentos fuera del schema, el runtime la rechaza, no ejecuta código dinámico y registra el fallo.

### AC-15 — launcher global
En cualquier sección de CajaApp, el launcher circular del Agente IA está visible abajo a la derecha, es accesible por teclado y abre el chat sin cambiar el `SectionId` actual.

### AC-16 — panel desktop
En desktop, al abrir el agente aparece un panel flotante anclado a la derecha que no desplaza ni redimensiona el contenido principal y conserva header/composer visibles mientras sólo scrollea el historial.

### AC-17 — mobile
En viewport 390×844, el launcher abre una superficie full-screen/Sheet utilizable, con cerrar/volver, historial scrolleable y composer sticky.

### AC-18 — minimizar y reanudar
Con una conversación activa, cerrar o minimizar devuelve al launcher; al reabrir se recuperan el mismo hilo, tool cards, run y approval pendiente sin crear una conversación nueva.

### AC-19 — navegación con chat abierto
Con el panel abierto, cuando `ui.navigate` cambia la sección principal a un target de CajaApp, el chat permanece montado y operativo sobre la nueva sección.
## 37. Estrategia de tests

### Backend Vitest

Crear suite `tests/agent-chat/` con cobertura mínima de:

- registry enumera tools conocidas y risk classes congeladas;
- tool desconocida/args inválidos no ejecutan handlers;
- R2 explícita ejecuta; R2 inferida solicita approval;
- R3/R4 jamás ejecutan sin approval válida;
- approval no sirve si cambian argumentos/toolCallId;
- idempotency impide doble create/update en retry;
- reads parallel-safe pueden correr en paralelo; writes quedan seriales;
- cancelación aborta provider y no corrompe estados;
- summary preserva entity refs;
- tool result projector no filtra secretos;
- conversación delete no elimina entidades financieras;
- SSE sequence es monótona y recuperable;
- provider adapter parsea content + tool calls + final response;
- Asesor IA mantiene test de no mutación existente.

### Frontend Playwright

Crear `tests/agent-chat.spec.ts` y flujos E2E específicos para AC-01..19. Los tests live-provider que dependan de infraestructura externa se distinguen de los contract tests determinísticos, pero el gate sigue las reglas vigentes del SSOT.

Todos los nuevos selectors de E2E deben usar roles/labels o `data-testid` estables del vertical `agent-*`.

## 38. Gates de aceptación

Backend: `prisma generate` + `migrate deploy/status` + integrity check + `build` + suite Vitest completa + smoke API.

Frontend: `typecheck` + `lint` + `build` standalone + Playwright `workers:1`, `retries:0`, sin skips/filtros.

La campaña debe restaurar `dev.db` al hash exacto pre-campaña según la constitución vigente. Veredicto únicamente PASS / FAIL / BLOCKED.
## 39. No objetivos de V1

- No reemplazar el Asesor IA.
- No darle shell, PowerShell, filesystem general, SQL o Prisma al modelo.
- No agregar browsing web como tool de CajaApp en V1.
- No crear tareas autónomas/background/scheduled agent runs.
- No permitir que el modelo instale dependencias, edite código o cambie configuración de runtime.
- No soportar audio/voz en esta primera versión.
- No soportar imágenes arbitrarias como adjunto; V1 acepta PDF/CSV porque ya existen flujos de dominio.
- No transformar el agente en una autoridad contable: las cifras de CajaApp siguen siendo producidas por services determinísticos.

## 40. Secuencia recomendada de implementación

1. **Foundation:** modelos Prisma Agent*, prompt, `AgentChatProvider`, provider fake determinístico y API de conversaciones.
2. **Chat base:** UI, persistencia, streaming SSE, cancelación, historial y recovery.
3. **Read tools:** search/dashboard/movements/cards/incomes/budgets/goals/future/reports/health/settings + `ui.navigate`.
4. **R2 writes:** movimiento, categoría, ingreso, presupuesto, objetivo, exchange rate y settings con explicit-intent gate.
5. **Approval engine:** R3/R4, Approval Card, idempotencia y auditoría.
6. **Imports:** attachments + cards/salary/debit manteniendo draft/review/accept.
7. **Operaciones avanzadas:** conciliación, cierres, snapshots, backup/restore.
8. **Convergencia:** E2E completo, gates, documentación, grounding/feature file y actualización del SSOT por el arquitecto.

Cada etapa debe dejar el vertical utilizable y testeable; no se habilita una tool en producción hasta que tenga schema, risk class, handler, auditoría y tests.

## 41. Compatibilidad con la constitución

Este diseño preserva el principio II porque no modifica el contrato del Asesor IA ni el pipeline documental. Las importaciones siguen siendo draft-first y trazables. El agente es una capacidad separada que orquesta services existentes.

Preserva local-first/privacidad, los gates actuales, Node `v24.18.0`, Windows x64, SQLite y los patrones existentes de backup/reversibilidad.
## 42. Decisiones cerradas por este PRD

No quedan como preguntas abiertas para especificación inicial:

- El chat es un vertical nuevo, no una evolución del Asesor IA.
- Vive como widget global del `AppShell`: launcher circular persistente abajo a la derecha, panel flotante en desktop y full-screen/Sheet en mobile; no requiere `SectionId` propio.
- Conversación abierta; tools sólo cuando hacen falta.
- Puede leer y escribir sobre CajaApp con el catálogo completo de capacidades existentes.
- Escritura R2 explícita no vuelve a pedir permiso.
- R3/R4 siempre requieren Approval Card.
- No hay acceso directo a Prisma/SQL/filesystem/shell.
- El backend gobierna el loop agéntico y el frontend consume SSE.
- La memoria es local y persistente en SQLite.
- Los adjuntos V1 son PDF/CSV y usan los pipelines actuales.
- Ollama y OpenAI-compatible siguen siendo providers soportados, con interfaz agéntica separada.
- `hideAmounts` sigue siendo transversal.
- Node válido único: `v24.18.0` desde `I:\Tools\node-v24.18.0-win-x64`.

## 43. Base técnica externa verificada

A 2026-09-12 se verificó en documentación oficial de Ollama que `POST /api/chat` recibe historial `messages`, permite una lista `tools`, devuelve `message.tool_calls`, admite llamadas paralelas a herramientas y ofrece `stream` con default `true`. Esa capacidad es la base técnica del `OllamaAgentChatClient` propuesto.

Referencias oficiales:

- `https://docs.ollama.com/capabilities/tool-calling`
- `https://docs.ollama.com/api/chat`

## 44. Definition of Ready para pasar a Spec Kit

Este PRD está listo para convertirse en `spec.md` cuando la especificación conserve: separación absoluta de `ai-advisor`, launcher global persistente en `AppShell`, panel flotante desktop/full-screen mobile, continuidad al minimizar/navegar, tool registry cerrado, risk classes R0–R4, approval semantics, persistencia Agent*, SSE recuperable, full tool coverage de CajaApp, contratos de privacidad y los AC-01..19.

Cualquier `spec.md` que reduzca el producto a un chatbot explain-only, permita acceso directo a Prisma o elimine la capacidad de actuar mediante tools contradice este PRD.
