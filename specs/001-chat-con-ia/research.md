# Research: Agente IA Conversacional de CajaApp

## Decision 1 — Separar provider conversacional del provider documental

**Decision**: crear `AgentChatProvider` independiente de `TextExtractionProvider`.

**Rationale**: el provider actual sólo modela extracción JSON desde un documento. El agente necesita historial multi-turno, texto incremental, tool calls, mensajes `tool`, cancelación y métricas de ejecución. Reutilizar la interfaz documental introduciría parámetros irrelevantes y acoplaría dos contratos con invariantes diferentes.

**Alternatives considered**: extender `TextExtractionProvider`; crear un provider genérico único. Se rechazan porque debilitan el contract-first documental y aumentan el riesgo de regresión sobre imports existentes.

## Decision 2 — Backend dueño del loop agéntico

**Decision**: persistir mensaje/run y ejecutar el ciclo modelo → tool → resultado → modelo exclusivamente en backend.

**Rationale**: las reglas de riesgo, validación, idempotencia, auditoría y continuidad deben existir aunque el frontend se cierre o pierda conexión.

**Alternatives considered**: loop en React; ejecutar tools directamente desde frontend. Se rechazan porque permiten bypass de controles y pierden recuperación robusta.

## Decision 3 — Streaming con Server-Sent Events

**Decision**: usar SSE sobre Fastify para texto y actividad del run, con secuencia monótona y heartbeat de 5 s.

**Rationale**: el tráfico principal es servidor→cliente; SSE funciona con HTTP estándar, permite `Last-Event-ID`, no agrega dependencias y encaja con cancel/approve/reject por endpoints POST separados.

**Alternatives considered**: WebSocket; polling. WebSocket agrega complejidad bidireccional innecesaria y polling degrada latencia/UX.

## Decision 4 — Persistencia durable + buffer de eventos activo

**Decision**: persistir conversaciones, mensajes, runs, tool calls y approvals en SQLite. Mantener sólo un buffer acotado en memoria para eventos SSE recientes del run activo; el snapshot durable reconstruye estado tras reinicio.

**Rationale**: evita una tabla de eventos ilimitada y mantiene recovery suficiente: reconexión en el mismo proceso puede retomar eventos; tras reinicio se recupera el snapshot autoritativo.

**Alternatives considered**: persistir cada delta/token; sólo memoria. Persistir cada delta genera volumen innecesario y sólo memoria viola continuidad.

## Decision 5 — Tool registry cerrado y handlers sobre services

**Decision**: cada tool se registra estáticamente con nombre, schema, riesgo, paralelismo, explicit intent, handler, projector y referencias auditables.

**Rationale**: impide reflexión dinámica y acceso arbitrario a métodos internos. Los handlers llaman services reales para conservar reglas de negocio.

**Alternatives considered**: mapear automáticamente rutas HTTP; permitir nombre de método dinámico; Prisma directo. Se rechazan por seguridad, duplicación y bypass de dominio.

## Decision 6 — Fake provider determinístico antes de adapters reales

**Decision**: implementar primero un `FakeAgentChatProvider` inyectable para tests de contrato, runner y UI.

**Rationale**: desacopla la corrección del producto de la disponibilidad/créditos del provider externo y permite pruebas reproducibles de streaming, tool calls y errores.

**Alternatives considered**: testear exclusivamente contra Ollama real. Se rechaza porque ya existe deuda externa de créditos y los gates deben distinguir infraestructura de defectos de código.

## Decision 7 — JSON persistido como String validado

**Decision**: persistir contenido flexible, argumentos, resultados e impacto como texto JSON y validarlo al entrar/salir de cada boundary.

**Rationale**: el schema actual usa SQLite y el proyecto ya persiste varios blobs JSON como `String`; mantiene consistencia y evita introducir otra abstracción de storage.

**Alternatives considered**: normalizar cada campo variable en tablas; JSON nativo dependiente del provider de base. Se rechazan por complejidad y bajo valor en V1.

## Decision 8 — UI global montada en AppShell

**Decision**: montar una única instancia del launcher/panel a nivel `AppShell`; el estado global mínimo vive en Zustand.

**Rationale**: permite navegar entre secciones sin desmontar el chat ni convertirlo en `SectionId`. La conversación durable sigue siendo backend-first; Zustand sólo conserva estado visual y conversación activa.

**Alternatives considered**: nueva sección del router; modal creado por cada pantalla. Ambas rompen persistencia visual o el concepto de copiloto global.

## Decision 9 — Markdown y componentes estructurados existentes

**Decision**: usar `react-markdown` ya instalado para texto y componentes propios para Tool/Approval Cards; los importes estructurados pasan por `Amount`.

**Rationale**: evita una dependencia de chat adicional y conserva privacidad visual, accesibilidad y design tokens actuales.

**Alternatives considered**: HTML generado por modelo; librería completa de chatbot. Se rechazan por superficie de seguridad y peso innecesario.

## Decision 10 — Idempotencia a nivel tool call

**Decision**: toda mutación usa una clave estable derivada de run + tool call y el runtime persiste el resultado exitoso antes de volver al modelo.

**Rationale**: una reconexión o retry no debe duplicar movimientos, presupuestos, aportes ni otras escrituras.

**Alternatives considered**: confiar en que el modelo no repetirá llamadas; deduplicación heurística por payload. Se rechazan por no ser deterministas.

## Resultado de investigación

No quedan `NEEDS CLARIFICATION`. Las decisiones son compatibles con PRD v1.1.0, Constitution v1.0.0 y el stack ya instalado. No se requiere dependencia nueva para Foundation ni Chat Base.
