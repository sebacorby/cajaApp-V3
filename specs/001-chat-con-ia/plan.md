# Implementation Plan: Agente IA Conversacional de CajaApp

**Branch**: `feat/agent-chat` | **Date**: 2026-09-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-chat-con-ia/spec.md`, derived from PRD v1.1.0.

## Summary

Implementar un agente conversacional global, persistente y orientado a acción, separado de `ai-advisor`. El backend será dueño del loop agéntico y expondrá conversaciones, runs recuperables, streaming de eventos, approvals y un catálogo cerrado de tools que delega en los services de dominio existentes. El frontend montará un launcher persistente en `AppShell` y un panel de chat adaptable sin convertir al agente en una sección de navegación.

La entrega será incremental: foundation/persistencia/provider → chat base → reads → writes R2 → approvals R3/R4 → imports → operaciones avanzadas → convergencia.

## Technical Context

**Language/Version**: TypeScript 5.7 backend y TypeScript 5.x frontend; Node.js exacto `v24.18.0` desde `I:\Tools\node-v24.18.0-win-x64`.

**Primary Dependencies**: Fastify 5.2.1, Prisma 6.5.0, Zod 3.24, Pino 9; Next.js 16.1.1, React 19, Tailwind 4, shadcn/Radix, Zustand 5, TanStack Query, react-markdown 10, Playwright 1.61.

**Storage**: SQLite local vía Prisma en `workspace/backend/prisma/dev.db`; adjuntos bajo storage local controlado por CajaApp.

**Testing**: Vitest 3 backend; TypeScript build/typecheck; ESLint; Playwright con `workers:1`, `retries:0`; smoke API e integridad SQLite.

**Target Platform**: Windows x64 local; backend `127.0.0.1:11436`, frontend `11437`, Ollama `11434`.

**Project Type**: Aplicación web local con backend Fastify y frontend Next.js.

**Performance Goals**: primer evento de run inmediato; heartbeat cada 5 s durante esperas; panel interactivo sin bloquear navegación; historial extenso paginado/compactado; no enviar al modelo conversaciones completas cuando excedan presupuesto.

**Constraints**: local-first; cero secretos en prompts/eventos/logs; sin Prisma/SQL/filesystem/shell accesible al modelo; una ejecución activa por conversación; reads paralelizables sólo si el registry lo declara; writes serializados; máximo 10 MB por adjunto.

**Scale/Scope**: un usuario local; hasta 10.000 mensajes por conversación; catálogo inicial cubre capacidades actuales de CajaApp; 6 historias funcionales y AC del PRD hasta AC-19.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Reconstrucción limpia brownfield — PASS**: todo código nuevo vive en `workspace/`; no se copia V2 ni se crean wrappers. La feature reutiliza services actuales en vez de duplicar dominio.
- **II. Contract-first / draft-first — PASS**: el agente no modifica el pipeline documental; importaciones siguen draft → review → accept y la aceptación queda clasificada R3. `ai-advisor` permanece separado y explain-only.
- **III. Local-first / privacidad — PASS**: conversaciones y auditoría viven en SQLite local; adjuntos en storage local; secretos quedan fuera de prompt/eventos/logs; `hideAmounts` se reutiliza en UI estructurada.
- **IV. Gates no negociables — PASS**: el plan conserva Prisma/build/Vitest, frontend typecheck/lint/build, Playwright sin skips/retries, smoke e integridad/restauración exacta de `dev.db`.
- **V. Simplicidad Windows — PASS**: no se agrega runtime ni daemon; se reutilizan Node exacto, Fastify, Next y providers vigentes; no se agregan dependencias obligatorias para SSE/tool calling.

**Pre-design verdict**: PASS. No hay violaciones que requieran Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-chat-con-ia/
├── PRD.md
├── spec.md
├── checklists/requirements.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── http-api.md
│   ├── sse-events.md
│   └── tool-registry.md
└── tasks.md
```

### Source Code (repository root)

```text
contracts/prompts/agent/
└── 01-agent-system.md

workspace/backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/<timestamp>_add_agent_chat/
├── src/modules/agent-chat/
│   ├── agent-chat.routes.ts
│   ├── agent-chat.controller.ts
│   ├── agent-chat.schemas.ts
│   ├── agent-chat.service.ts
│   ├── agent-runner.service.ts
│   ├── agent-context.service.ts
│   ├── agent-memory.service.ts
│   ├── agent-tool-registry.ts
│   ├── agent-tool-executor.ts
│   ├── agent-approval.service.ts
│   ├── agent-events.service.ts
│   └── agent-types.ts
```
```text
workspace/backend/src/modules/ai/agent/
├── agent-chat-provider.ts
├── agent-chat-provider.factory.ts
├── fake-agent-chat-provider.ts
├── ollama-agent-chat.client.ts
└── openai-compatible-agent-chat.client.ts

workspace/backend/tests/agent-chat/
├── conversations.test.ts
├── provider.test.ts
├── tool-registry.test.ts
├── approvals.test.ts
├── runner.test.ts
└── events.test.ts

workspace/frontend/src/components/finance/agent/
├── agent-launcher.tsx
├── agent-chat-panel.tsx
├── conversation-drawer.tsx
├── conversation-header.tsx
├── message-list.tsx
├── message-content.tsx
├── agent-composer.tsx
├── tool-call-card.tsx
├── approval-card.tsx
├── activity-panel.tsx
├── attachment-chip.tsx
└── agent-empty-state.tsx

workspace/frontend/src/lib/finance/
└── agent-api.ts

workspace/frontend/tests/
└── agent-chat.spec.ts
```

**Structure Decision**: mantener la separación actual backend/frontend y crear un vertical `agent-chat` autocontenido. Sólo se modifican puntos de integración existentes (`app.ts`, `env.ts`, `app-shell.tsx`, `ui-store.ts`) cuando una fase los necesita. `nav.ts` y `section-router.tsx` no incorporan un `SectionId` para el agente.

## Design Decisions

1. `AgentChatProvider` es una interfaz nueva; `TextExtractionProvider` no se reutiliza porque su contrato es documental/JSON y no representa chat multi-turno ni tool calling.
2. Fastify expone el stream de runs con Server-Sent Events sin dependencia adicional; el estado durable vive en SQLite y un buffer acotado de eventos activos permite reanudar por secuencia mientras el proceso siga vivo.
3. El tool registry es código backend estático y testeado; no existe reflexión dinámica. Cada handler delega a un service de dominio y proyecta sólo los campos necesarios para el modelo.
4. Los payloads flexibles persistidos (`contentJson`, argumentos, resultados, impacto) usan strings JSON validados en los bordes, consistente con el schema SQLite actual.
5. La UI reutiliza `react-markdown`, shadcn/Radix, `Amount`, Zustand y los tokens vigentes; no se agrega librería de chat ni store paralelo.
6. La primera fase usa `FakeAgentChatProvider` determinístico para poder probar conversación/persistencia sin infraestructura externa. Los adapters Ollama/OpenAI se habilitan después de fijar el contrato.
7. La implementación sigue TDD para contratos del runner, registry, approvals y persistencia porque el PRD exige pruebas explícitas y el riesgo de mutación es alto.

## Phase Strategy

- **Fase A — Foundation**: modelos Agent*, prompt, provider contract/fake, API de conversaciones, tests y migración.
- **Fase B — Chat base**: launcher/panel, envío de mensajes, runs, SSE, cancelación, historial y recovery.
- **Fase C — Read tools**: búsquedas/consultas/navegación.
- **Fase D — R2 writes**: mutaciones normales con explicit-intent gate e idempotencia.
- **Fase E — Approvals R3/R4**: Approval Card, continuación del mismo run, rechazo y auditoría.
- **Fase F — Attachments/imports**: staging PDF/CSV y pipelines draft-first.
- **Fase G — Advanced tools**: conciliación, cierres, snapshots y backup/restore.
- **Fase H — Convergence**: AC-01..19, gates completos, documentación y SSOT.

## Post-Design Constitution Check

PASS en principios I–V. El diseño no requiere excepciones constitucionales ni dependencias nuevas. Toda mutación permanece detrás de services de dominio y la restauración/campaña final conservará hash exacto de `dev.db`.

## Complexity Tracking

No aplica: no hay violaciones constitucionales que justificar.
