# CajaApp V3 — CHANGELOG

## 2026-09-13 — 001-chat-con-ia / US6 recovery-continuity

- Verdict: PASS, Round 2 (authorized T068–T076 / FEAT-025 delivery)
- Added versioned compacted conversation memory and bounded context assembly with local settings and closed tool metadata.
- Added durable run snapshot/recovery state, one-active-run invariant, max-step guard, sanitized provider failures, persistent event sequence and `cancelled_after_tool`.
- Added reload/minimized recovery UI, launcher activity badge, recovered-result amount masking and SSE reconnect/dedupe by `(runId, sequence)`.
- Fixed a real reconnect race where server snapshot sequence could incorrectly skip fast events not yet consumed by the browser.
- Gates: backend 257/257, frontend typecheck/lint/build PASS, agent browser regression 13/13, real draft E2E 1/1, temporary SQLite integrity PASS, real `dev.db` hash unchanged.
- Deprecated: none. T077+ remains pending.

## 2026-09-13 — 001-chat-con-ia / US5 document imports

- Verdict: PASS, 1 round (authorized T060-T067 / FEAT-024 delivery)
- Features added (features/): FEAT-020-global-agent-conversation, FEAT-021-real-data-and-navigation, FEAT-022-normal-actions, FEAT-023-critical-approvals, FEAT-024-document-imports-from-chat
- Docs updated: `docs/technical.md` (agent module and tests), `docs/domain.md` (agent entities and governed document-import flow), `docs/design.md` (global agent components and presentation conventions)
- Commits: none recorded
- Deprecated: none

## 2026-09-12 — Grounding approved (design remediation + canvas reflow)

- Ground snapshot: specs/000-grounding/ (technical.md, domain.md, design.md, 19 features)
- Figma build via local relay (cajaapp-v3): Foundations (111 nodos) + Components
  (61 especímenes verificados) + Dark smoke; ledger figma-sync.json en done (99%)
- Ajustes post-revisión: interiores spec-* reconstruidos, headers vacíos eliminados,
  canvas reordenado (61/61 dentro de Components), key sidebar-ui agregada
- Limitación conocida: panel Assets vacío (el relay no crea Componentes/Estilos/
  Variables reales); librería vive como frames en canvas

## 2026-09-11 — Grounding created

- source-commit: n/a-no-git-repo
- Documents seeded into docs/: technical.md, domain.md, design.md
- Features seeded into features/: FEAT-001 … FEAT-019 (19 features)
