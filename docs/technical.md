# CajaApp V3 — Technical Mapping

## Tech Stack

| Layer | Technology | Version / Notes |
|-------|------------|-----------------|
| **Frontend runtime** | Next.js | 16.1.1 (React 19.0.0) |
| **Frontend language** | TypeScript | 5 (strict mode) |
| **Frontend UI primitives** | shadcn/ui + Radix UI | Latest |
| **Frontend styling** | Tailwind CSS | 4 (CSS-variable-based) |
| **Frontend state** | Zustand + TanStack Query | 5.0.6 / 5.82.0 |
| **Frontend forms** | React Hook Form + Zod | 7.60 / 4.0 |
| **Frontend charts** | Recharts | 2.15.4 |
| **Backend runtime** | Node.js | 24.18.0 |
| **Backend framework** | Fastify | 5.2.1 |
| **Backend language** | TypeScript | 5.7.3 |
| **ORM** | Prisma | 6.5.0 (backend), 6.11.1 (frontend) |
| **Database** | SQLite | via Prisma (`file:./dev.db`) |
| **AI provider** | Ollama (local) | `gemma4:31b-cloud`; also supports OpenAI-compatible API |
| **PDF text extraction** | Python | 3.11+ via `pdfplumber` |
| **PDF to image** | pdf2pic + canvas | 3.2.0 / 3.2.3 |
| **AI PDF vision** | pdfjs-dist | 4.10.38 |
| **Backend testing** | Vitest | 3.0.4 |
| **Frontend E2E testing** | Playwright | 1.61.1 (Chromium only) |
| **Build tooling** | tsx (dev), tsc (prod) | — |

---

## Module Map

### `workspace/backend/src/` — Fastify Application

```
src/
├── main.ts                  # Entry point: preflight AI, connect DB, listen, start worker
├── app.ts                   # Fastify app builder: registers all 19 route modules
├── config/env.ts            # Zod schema validation for 40+ env vars; checks Node v24.18.0
├── db/prisma.ts             # Prisma client singleton (connect/disconnect)
├── modules/
│   ├── ai/                  # AI extraction pipeline
│   │   ├── ai-processor-worker.ts       # Background polling worker (poll interval: 2 s)
│   │   ├── ai-extraction.service.ts     # Orchestrates AI extraction per document
│   │   ├── ollama.client.ts             # Ollama LLM client (local proxy mode)
│   │   ├── ollama-native.client.ts     # Ollama native mode (no OpenAI compat)
│   │   ├── openai-compatible.client.ts # OpenAI-compatible client (local proxy)
│   │   ├── minimax.client.ts           # MiniMax client (Cloudflare AI gateway)
│   │   ├── ollama-vision.adapter.ts    # Vision model adapter for PDF pages
│   │   ├── text-extraction-provider.factory.ts  # Factory: selects provider at startup
│   │   ├── text-extraction-provider.ts # Interface / base class for providers
│   │   ├── prompt-loader.ts            # Loads prompt files from contracts/prompts/
│   │   ├── json-repair.service.ts     # Re-prompt on schema validation failure
│   │   ├── ai-provider-context.ts     # Provider selection logic
│   │   └── vision-provider.types.ts   # Shared types for vision providers
│   ├── ai-advisor/           # AI-powered financial advisor chat
│   │   ├── ai-advisor.service.ts
│   │   ├── ai-advisor.controller.ts
│   │   ├── ai-advisor.routes.ts
│   │   └── ai-advisor.schemas.ts
│   ├── cards/                # Credit card statement management; includes DELETE /statements/:statementId (hard-delete accepted statements) and data-fixup script fix-stale-projection-rowids.ts
│   ├── imports/              # Raw PDF upload and job dispatch
│   ├── import-center/        # Central import dashboard
│   ├── reconciliation/        # Auto-matching of transactions
│   ├── manual-purchases/      # Manual credit card purchase entry
│   ├── incomes/              # Income sources and events
│   ├── salary-receipts/       # Salary receipt PDF processing
│   ├── movements/            # Financial movements CRUD
│   ├── debit-imports/        # CSV debit import
│   ├── dashboard/            # Aggregated dashboard data
│   ├── future/               # Read-only Future Debt query module and rules
│   ├── reports/              # Report generation
│   ├── settings/             # App settings
│   ├── goals/                # Savings goals
│   ├── budgets/              # Category budgets
│   ├── global-search/        # Cross-entity search
│   ├── financial-health/      # Financial health snapshots
│   ├── month-close/          # Monthly closing
│   ├── backup-restore/        # DB backup/restore
│   ├── health/               # Health check endpoint
│   ├── documents/            # Uploaded document management
│   ├── projections/          # Projection service (shared)
│   └── [shared utilities]    # dates, errors, logger, money, validation
├── scripts/                  # Standalone operational scripts
└── shared/                   # Reusable utilities
    ├── dates.ts              # Date helpers
    ├── errors.ts             # AppError class hierarchy
    ├── logger.ts             # Pino logger
    ├── money.ts              # Money formatting helpers
    └── validation.ts         # Zod validation helpers
```

**Communication pattern:** All modules register Fastify routes via their `routes.ts` file. Services are called directly from route handlers. The AI worker runs as an independent polling loop that reads from the database (`AiExtractionRun` queue) and calls the extraction service.

### Future Debt module

`workspace/backend/src/modules/future/` reads persisted `CardInstallmentProjection` rows and joins accepted statement rows/groups and `ManualCardPurchase` records for source traceability; it applies the RN-001…RN-016 rules. The module exposes:

- `GET /api/future-debt?from=YYYY-MM&months=6&includeCurrentPeriod=false` — read-only query
- `DELETE /api/future-debt/rows/:id` — deletes a single projection row; for `isManual = true` rows, cascades to the related `ManualCardPurchase` in a Prisma transaction; returns `204 No Content` on success, `404` if not found, `400` for malformed ID
- `future.schemas.ts`, which validates the query and the response envelope with Zod (`from` as a calendar month, `months` from 1 to 24, and strict boolean parsing)

The response groups rows by month and card, keeps ARS and USD totals separate, reports `pendientes` and diagnostics for unsafe data, and uses stable ordering and decimal-string money values for deterministic reads. The old `/api/future-commitments` route is no longer registered.

### `workspace/frontend/src/` — Next.js Application

```
src/
├── app/
│   ├── page.tsx              # Root page: renders AppShell + SectionRouter
│   ├── layout.tsx            # Root layout with metadata
│   └── globals.css           # Tailwind + CSS variables
├── components/
│   ├── ui/                   # shadcn/ui primitives (no custom design tokens)
│   └── finance/             # Finance-specific components (13 subdirs)
│       ├── alerts/           # Alert/notification components
│       ├── categories/      # Category management UI
│       ├── charts/           # Chart components (Recharts wrappers)
│       ├── dashboard/       # Dashboard widgets
│       ├── financial-health/ # Financial health UI
│       ├── goals/            # Savings goals UI
│       ├── imports/          # Import workflow UI (cards, salary)
│       ├── layout/           # AppShell, Sidebar, Header
│       ├── preferences/      # User preferences
│       ├── search/           # Global search UI
│       ├── sections/         # Section router and navigation
│       ├── states/           # Empty/loading/error states
│       └── transactions/     # Transaction list, FutureDebtView, and detail
└── lib/
    ├── finance/             # One API client per backend module
     │   ├── card-statements-api.ts
     │   ├── salary-receipts-api.ts
     │   ├── import-center-api.ts
     │   ├── ai-advisor-api.ts
     │   ├── incomes-api.ts
     │   ├── movements-api.ts
     │   ├── goals-api.ts
     │   ├── budgets-api.ts
     │   ├── dashboard-api.ts
     │   ├── financial-health-api.ts
     │   ├── future-debt-api.ts         # GET /api/future-debt client and contract types
     │   └── ...


    ├── db.ts                # Frontend Prisma client
    ├── error-message.ts     # Error formatting
    └── utils.ts             # General utilities (clsx, etc.)
```

**Communication pattern:** Frontend calls backend REST API directly (Next.js server-side + client-side). TanStack Query handles caching and background refetching.

### `contracts/` — AI Processing Contracts

```
contracts/
├── prompts/
│   ├── cards/
│   │   ├── 00-detect-document-type.md       # Document classifier
│   │   ├── 01-extract-credit-card-statement.md  # Main extraction
│   │   └── 02-repair-credit-card-json.md   # JSON repair on failure
│   ├── salary-receipts/
│   │   └── 01-extract-salary-receipt.md     # Salary receipt extraction
│   └── advisor/
│       └── 01-explain-financial-context.md  # AI advisor prompt
├── schemas/
│   ├── cards/
│   │   ├── card-statement-import.schema.json   # Full AI output schema
│   │   ├── card-statement-preview.schema.json  # Frontend review schema
│   │   └── card-statement-accepted.schema.json
│   ├── salary-receipts/
│   │   └── salary-receipt.schema.json
│   └── advisor/
│       └── ai-advisor-response.schema.json
└── examples/
    ├── cards/
    └── salary-receipts/
```

---

## Conventions

### File naming

| Item | Convention | Example |
|------|-----------|---------|
| Route modules | `*.routes.ts` | `cards.routes.ts` |
| Service layer | `*.service.ts` | `cards.service.ts` |
| Controller/handler | `*.controller.ts` | `cards.controller.ts` |
| Schema (Fastify) | `*.schemas.ts` | `cards.schemas.ts` |
| DTO/validation | Zod schemas inline in `*.schemas.ts` | — |
| Feature folders | `kebab-case` | `card-statements/` |
| API client files | `kebab-case-api.ts` | `card-statements-api.ts` |

### Internal module structure

Each backend module follows a consistent pattern:

```
module/
├── module.routes.ts    # Registers routes, delegates to controller
├── module.controller.ts  # Request handling, calls service
├── module.service.ts    # Business logic
└── module.schemas.ts    # Fastify/Zod route schemas
```

### Error handling

- Custom `AppError` class hierarchy in `src/shared/errors.ts`
- Caught by Fastify error handler in `app.ts`
- Frontend uses `error-message.ts` for display formatting

### Async / worker flow

AI extraction runs as a **background job**:

1. Upload PDF → `POST /api/imports` → creates `UploadedDocument` + `AiExtractionRun` (status: `pending`)
2. `ai-processor-worker` polls DB every 2 s for `pending` jobs
3. Worker calls Python pdfplumber → base64 images → Ollama vision → JSON extraction
4. On success: `AiExtractionRun.status = completed`, results stored
5. On failure: `status = failed`, retry logic via `json-repair.service.ts`

### Environment configuration

All env vars validated via Zod in `src/config/env.ts` at startup. No env vars = process exits with validation errors.

---

## Test Setup

### Backend — Vitest

```bash
cd workspace/backend
npm run test          # vitest run (single shot)
npm run test:watch    # vitest (watch mode)
```

- Test files live in `tests/` — one directory per module
- 21 test directories covering all major modules
- Coverage: v8 provider (text, json, html)
- Key fixtures: `golden-fixture.test.ts` uses real JSON examples from `contracts/examples/`

### Frontend — Playwright E2E

```bash
cd workspace/frontend
npx playwright test           # All specs
npx playwright test ai-advisor.spec.ts  # Single spec
```

- 24 `.spec.ts` files in `tests/`
- Chromium only, headless, 12-minute timeout per test
- Base URL: `http://127.0.0.1:11437`
- Trace, screenshot, video on failure

### Smoke test

`workspace/backend/tests/smoke/api-smoke.test.ts` — hits all major endpoints to verify the system is up.

---

## Entry Points

| File | Role |
|------|------|
| `workspace/backend/src/main.ts` | Backend bootstrap: DB connect → Fastify listen → AI worker start |
| `workspace/backend/src/app.ts` | Fastify app builder — registers all route modules |
| `workspace/frontend/src/app/page.tsx` | Root page — renders `AppShell` + `SectionRouter` |
| `start-cajaapp.ps1` | Full-stack startup orchestrator (Node, Python, Prisma, backend, frontend) |
| `runtime/cajaapp-production.ps1` | Production launcher with log rotation |

---

## External Integrations

| Service | Integration | Config |
|---------|-------------|--------|
| **Ollama** (local LLM) | REST (local-proxy mode) or native | `OLLAMA_MODE`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL` |
| **OpenAI-compatible API** | REST | `AI_BASE_URL`, `AI_MODEL` (used when `AI_PROVIDER=openai`) |
| **MiniMax** (Cloudflare AI gateway) | REST | `MINIMAX_API_KEY` (via `minimax.client.ts`) |
| **Python runtime** | Subprocess | `PYTHON_EXECUTABLE` — runs `python/pdf_to_raw.py` for text extraction |

---

## Known Constraints

- **Node version pinned**: Requires exactly `24.18.0` (enforced in `env.ts`)
- **SQLite only**: No migration path to other databases; file-based (`dev.db`)
- **Ollama must be running**: AI features fail gracefully if Ollama is unreachable, but worker logs errors
- **Python required for text extraction**: PDF raw text uses `pdfplumber` via subprocess; `.venv` included in repo
- **No auth layer**: Application has no authentication — single-user personal tool
- **No git history**: This repo was created fresh without carrying V2 history (per repo rule)
- **No code from V2**: Explicit rule — everything rewritten from scratch

---
grounding-version: 2
generated-by: IADEV-grounding
source-commit: no-git
