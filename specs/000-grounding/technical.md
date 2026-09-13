# CajaApp V3 — Technical Map

Grounding snapshot of the codebase as found. Single repo, no git history
available at root. Living copies of these documents are maintained under
`docs/` (see `docs/technical.md`, `docs/domain.md`, `docs/design.md`).

## Tech Stack

Exact versions from manifests (`workspace/backend/package.json`,
`workspace/frontend/package.json`):

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js (both apps, `engines` exact) | 24.18.0 |
| Backend framework | Fastify (+ @fastify/cors, multipart, swagger, swagger-ui) | 5.2.1 |
| Backend ORM | Prisma (`@prisma/client`, `prisma` dev) | 6.5.0 |
| Backend DB | SQLite (`DATABASE_URL=file:./dev.db`) | file-based |
| Backend validation | Zod | 3.24.1 |
| Backend logging | Pino (+ pino-pretty) | 9.6.0 |
| Backend dev runner | tsx (watch) | 4.19.2 |
| Backend PDF libs | pdfjs-dist 4.10.38, pdf2pic 3.2.0, canvas 3.2.3 | as listed |
| Backend tests | Vitest (`tests/**/*.test.ts`, globals, node env) | 3.0.4 |
| Backend TS | TypeScript, `strict: true`, target ES2022, module NodeNext | 5.7.3 |
| RAW extractor | Python `pdf_to_raw.py`, `pdfplumber==0.11.10` | 0.11.10 |
| Frontend framework | Next.js (`output: standalone`, `reactStrictMode: false`) | 16.1.1 |
| Frontend UI | React + React DOM | 19.0.0 |
| Frontend CSS | Tailwind CSS (+ @tailwindcss/postcss, tw-animate-css) | 4.x |
| Frontend components | shadcn new-york, neutral, cssVariables, lucide icons | components.json |
| Frontend state/data | Zustand 5, TanStack Query 5.82 + Table 8.21, react-hook-form 7.60 | as listed |
| Frontend i18n/auth/theme | next-intl 4.3.4, next-auth 4.24.11, next-themes 0.4.6 | as listed |
| Frontend charts | Recharts 2.15.4, framer-motion 12, sonner 2 | as listed |
| Frontend E2E | Playwright (`tests/**/*.spec.ts`, workers 1, retries 0) | 1.61.1 |
| Frontend TS | TypeScript `strict: true`, bundler resolution, `@/*` → `./src/*` | 5.x |
| Frontend lint | ESLint 9 + eslint-config-next 16 (React Compiler rule off, several rules off) | as listed |
| AI providers | Ollama native / OpenAI-compatible (`AI_PROVIDER`), model `kimi-k2.7-code:cloud` | env-driven |

Backend scripts: `dev` (tsx watch), `build` (tsc), `start` (node dist),
`test`/`test:watch` (vitest), `check` (build + test), `prisma:generate`,
`prisma:migrate`, `prisma:studio`, `prisma:migrate:deploy`,
`prisma:migrate:status`.

Frontend scripts: `dev` (next dev), `build` (typecheck + next build + copy
static/public into standalone), `start` (node .next/standalone/server.js),
`lint` (eslint), `typecheck` (tsc --noEmit), `db:push/generate/migrate/reset`.

## Module Map

Backend (`workspace/backend/src/`, Fastify plugins registered in `app.ts`):

| Path | Responsibility | Communication |
|---|---|---|
| `main.ts` | Process entry: connects DB, listens, starts AI worker, handles SIGTERM/SIGINT | calls `buildApp()`, `db/prisma.ts`, `ai-processor-worker` |
| `app.ts` | App factory: CORS, multipart (10MB), error handler, registers all route modules | imports every `modules/*/*.routes.ts` |
| `config/env.ts` | Zod-validated env (ports, AI provider, timeouts, python paths) | imported by all server code |
| `db/prisma.ts` | Prisma client singleton + connect/disconnect | imported by services |
| `shared/` | Cross-cutting: `errors.ts` (AppError code/message), `logger.ts` (pino), `money.ts`, `dates`, `validation.ts` | imported by modules |
| `modules/health` | Liveness/readiness endpoints | HTTP |
| `modules/documents` | PDF RAW extraction via `python/pdf_to_raw.py`, document type detection | called by `ai`/`imports` |
| `modules/ai` | Extraction pipeline: prompt loader, Ollama-native + OpenAI-compatible + Minimax clients, `ai-processor-worker` (internal worker, poll 2s) | called by `imports`, `salary-receipts`; records `AiExtractionRun` |
| `modules/imports` | Card PDF import jobs: `POST /api/card-statements/import`, status polling, draft lifecycle (`processing`/`preview_ready`/`failed`) | HTTP; uses `documents` + `ai` |
| `modules/cards` | Accepted statements: drafts edit/accept, history, archive/activate, traceability, exchange rate, manual purchases share prefix | HTTP `/api/card-statements/*` |
| `modules/manual-purchases` | Manual card purchases under `/api/card-statements` prefix | HTTP |
| `modules/salary-receipts` | Receipt PDF import mirror flow | HTTP `/api/salary-receipts/*` |
| `modules/debit-imports` | Debit CSV parsing/import | HTTP `/api/debit-imports/*` |
| `modules/import-center` | Aggregated inbox across cards/receipts/CSV imports | HTTP `/api/import-center/*` |
| `modules/incomes` | Income sources/events, salary calculations | HTTP `/api/incomes/*` |
| `modules/movements` | Unified ledger, manual movements, category rules, export | HTTP `/api/movements/*` |
| `modules/dashboard` | Balance trend, alerts (deterministic) | HTTP `/api/dashboard/*` |
| `modules/future` | Future commitments / debt projection | HTTP `/api/future-commitments/*` |
| `modules/projections` | Installment projections attached to accepted statements | via `cards` |
| `modules/reports` | Reports + exports | HTTP `/api/reports/*` |
| `modules/reconciliation` | Reversible duplicate/relationship detector between sources | HTTP `/api/reconciliation/*` |
| `modules/month-close` | Monthly close + activities | HTTP `/api/month-close/*` |
| `modules/backup-restore` | Backup archives + restore | HTTP `/api/backup-restore/*` |
| `modules/budgets` | Category budgets | HTTP `/api/budgets/*` |
| `modules/goals` | Savings goals, contributions, activities | HTTP `/api/goals/*` |
| `modules/financial-health` | Health snapshots | HTTP `/api/financial-health/*` |
| `modules/ai-advisor` | Explain-only financial advisor with citations + isolated simulations | HTTP `/api/ai-advisor/*` |
| `modules/global-search` | Cross-entity search | HTTP `/api/search/*` |
| `modules/settings` | Local settings incl. `hideAmounts`, theme persistence | HTTP `/api/settings/*` |

Frontend (`workspace/frontend/src/`, Next.js App Router, single `page.tsx`):

| Path | Responsibility | Communication |
|---|---|---|
| `app/layout.tsx` | Root layout (`lang="es"`), metadata, `AppPreferencesProvider`, `Toaster` | wraps `page.tsx` |
| `app/page.tsx` | Home: `AppShell` + `SectionRouter` (client component, section navigation) | renders finance sections |
| `components/finance/sections/` | 16 sections: asesor-ia, cierres, conciliacion, configuracion, dashboard, deuda-futura, importaciones, ingresos, movimientos, objetivos, presupuestos, reportes, respaldo, salud-financiera, tarjetas + `section-router.tsx` | call `lib/finance/*-api.ts` |
| `components/finance/` | Domain widgets: alerts, card-statements (11 files: import/preview/accepted/history/sheets), categories, charts (donut/evolution/sparkline), dashboard, goals, imports sheets, layout (app-shell/brand/header/sidebar), preferences, search, transactions | composed by sections |
| `components/ui/` | 48 shadcn primitives (button, dialog, sheet, table, tabs, chart, sidebar, sonner, etc.) | composed by finance components |
| `lib/finance/` | 24 modules: `*-api.ts` client per domain + `money.ts`, `financial-amount.ts`, `nav.ts`, `ui-store.ts`, `icons.ts` | fetch backend REST |
| `lib/` | `db.ts`, `utils.ts`, `error-message.ts` | shared helpers |
| `hooks/` | `use-mobile`, `use-toast` | UI state |

Other root areas: `contracts/` (schemas/prompts/examples — AI authority),
`docs/` (live docs + SSOT + evidence), `architecture-handoff/`
(agents↔architect evidence flow), `workspace/shared/` (`.gitkeep` only, empty),
`prueba-hola-mundo-js/` (sandbox: hello-world + skill-fixture files, NOT part
of the product — out of grounding scope).

## Conventions

- Backend module layout: `*.controller.ts` + `*.routes.ts` (prefix
  `/api/<domain>`) + `*.schemas.ts` (zod) + `*.service.ts` (+ `*.mapper.ts`,
  `*.types.ts` where needed). ESM imports with `.js` suffix. Errors via
  `AppError` (`code` + `message`); validation errors → 400
  `VALIDATION_ERROR`; otherwise 500 `INTERNAL_ERROR` (message hidden outside
  development).
- Frontend: kebab-case files, `@/` alias, client sections per domain,
  one `*-api.ts` client per backend domain, shared `Amount` component for
  money + privacy masking, `ui-store.ts` (zustand) for UI state.
- Naming: Spanish domain language in UI (`tarjetas`, `ingresos`,
  `movimientos`, `cierres`, `respaldo`); English identifiers in code.
- Formatting/lint: ESLint next config with many rules relaxed
  (`no-explicit-any` off, `exhaustive-deps` off, React Compiler off with
  comment); TS `strict: true` both apps; `noUnusedLocals/Parameters` false in
  backend; banned: wrappers, `(1)`/`copy` suffixed files, `import.meta.url`
  in backend, `getByDisplayValue`, `npm audit fix` inside gates.
- Async flow: REST + polling for AI jobs (`GET /import/:draftId/status`,
  worker poll 2s); Playwright `workers: 1`, `retries: 0`, Desktop Chrome,
  trace/screenshot/video on.

## Test Setup

- Backend: Vitest 3 (`vitest run` via `npm test`, `npm run check` = build +
  test). 30 specs under `workspace/backend/tests/` mirroring modules
  (`imports/`, `cards/`, `salary-receipts/`, `movements/`, `reconciliation/`,
  `month-close/`, `backup-restore/`, `ai-advisor/`, `quality/`, ...).
  Fixture pattern: golden fixtures (`cards/card-statement.golden-fixture`),
  contract tests (`pdf-import-contract`, `frontend-runtime-contract`),
  sanitized example PDFs/JSON in `contracts/examples/`.
- Frontend: Playwright 1.61 (`npx playwright test`), config
  `testDir ./tests`, `testMatch **/*.spec.ts`, ignore `* (1).spec.ts` /
  `* copy.spec.ts`, `fullyParallel: false`, `workers: 1`, `retries: 0`,
  timeout 12min, baseURL `http://127.0.0.1:11437` (override via
  `CAJAAPP_FRONTEND_BASE_URL`/`PLAYWRIGHT_BASE_URL`). 29 specs: domain specs
  at `tests/` root + `tests/e2e/` flows. Full evidence chain (list/html/json
  reporters, `test-results/`, `playwright-report/`).
- Helpers: `run-playwright.ps1` (root), `cajaapp-headless-up.ps1` (headless
  bring-up + gates), `detect-env.sh`.

## Entry Points

- Backend: `workspace/backend/src/main.ts` (bootstrap) →
  `workspace/backend/src/app.ts` (`buildApp()` factory).
- Frontend: `workspace/frontend/src/app/layout.tsx` →
  `workspace/frontend/src/app/page.tsx` (`AppShell` + `SectionRouter`).
- Ops: `cajaapp-headless-up.ps1`, `start-cajaapp.ps1`,
  `run-playwright.ps1` (root); `workspace/frontend/start-dev.bat`,
  `Caddyfile`.

## External Integrations

- Ollama at `http://localhost:11434` (default `local-proxy` mode), model
  `kimi-k2.7-code:cloud`; alternative OpenAI-compatible endpoint via
  `AI_BASE_URL` + `AI_API_KEY` + `AI_MODEL`. No other third-party APIs in
  code. Databases: local SQLite per app
  (`workspace/backend/prisma/dev.db`,
  `workspace/frontend/prisma/prisma/dev.db`).

## Known Constraints

- Node.js exactly `v24.18.0` (both `engines`), Windows x64 only.
- Ports: backend `127.0.0.1:11436` (schema default 4000), frontend dev
  `11437`, frontend `.env` `PORT=33333`, Ollama `11434`,
  `NEXT_PUBLIC_API_BASE_URL=http://localhost:11436`.
- Timeouts: provider 420s < job 480s < stale 600s, worker poll 2s,
  RAW extraction 60s / 8MB / 250k chars; uploads 10MB.
- Python runtime outside repo:
  `%LOCALAPPDATA%\CajaAppV3\runtime\python\.venv`, hash-validated.
- Zero TODO/FIXME markers in `src/` of either app (clean).
- Live-AI specs BLOCKED without Ollama subscription/credits (infra debt, not
  a code defect): advisor spec, real-preview import sub-test,
  salary-receipts real spec.

---
grounding-version: 2
generated-by: IADEV-grounding
source-commit: n/a-no-git-repo
