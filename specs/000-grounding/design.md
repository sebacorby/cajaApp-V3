# CajaApp V3 — Design Inventory

Presentation layer detected (Next.js + Tailwind v4 + shadcn). Token source of
truth: `workspace/frontend/src/app/globals.css` (`:root` / `.dark` CSS
variables + `@theme inline` Tailwind mapping). shadcn config:
`workspace/frontend/components.json` (style `new-york`, baseColor `neutral`,
cssVariables, icon `lucide`, aliases `@/components @/lib @/hooks`).
Technical reference: `docs/technical.md`.

## Tokens

Light (`:root`) / dark (`.dark`) — oklch, emerald identity ("papel premium"
warm background, deep-esmeralda primary):

- `--background`: `oklch(0.985 0.008 150)` / `oklch(0.16 0.015 165)`
- `--foreground`: `oklch(0.21 0.02 160)` / `oklch(0.96 0.008 150)`
- `--card`: `oklch(1 0 0)` / `oklch(0.21 0.02 160)`
- `--card-foreground`: `oklch(0.21 0.02 160)` / `oklch(0.96 0.008 150)`
- `--popover`: `oklch(1 0 0)` / `oklch(0.21 0.02 160)`
- `--popover-foreground`: `oklch(0.21 0.02 160)` / `oklch(0.96 0.008 150)`
- `--primary`: `oklch(0.45 0.09 165)` / `oklch(0.72 0.12 165)`
- `--primary-foreground`: `oklch(0.99 0.01 150)` / `oklch(0.18 0.03 165)`
- `--secondary`: `oklch(0.96 0.015 155)` / `oklch(0.27 0.02 162)`
- `--secondary-foreground`: `oklch(0.3 0.03 160)` / `oklch(0.96 0.008 150)`
- `--muted`: `oklch(0.96 0.01 155)` / `oklch(0.27 0.02 162)`
- `--muted-foreground`: `oklch(0.52 0.02 160)` / `oklch(0.7 0.02 160)`
- `--accent`: `oklch(0.95 0.03 160)` / `oklch(0.32 0.04 165)`
- `--accent-foreground`: `oklch(0.3 0.05 165)` / `oklch(0.96 0.008 150)`
- `--destructive`: `oklch(0.58 0.22 25)` / `oklch(0.7 0.19 22)`
- `--border`: `oklch(0.92 0.01 155)` / `oklch(1 0 0 / 10%)`
- `--input`: `oklch(0.93 0.01 155)` / `oklch(1 0 0 / 15%)`
- `--ring`: `oklch(0.45 0.09 165)` / `oklch(0.72 0.12 165)`
- `--chart-1`: `oklch(0.5 0.1 165)` / `oklch(0.7 0.12 165)`
- `--chart-2`: `oklch(0.62 0.11 185)` / `oklch(0.75 0.12 185)`
- `--chart-3`: `oklch(0.72 0.15 75)` / `oklch(0.8 0.15 75)`
- `--chart-4`: `oklch(0.66 0.18 350)` / `oklch(0.72 0.17 350)`
- `--chart-5`: `oklch(0.58 0.13 290)` / `oklch(0.7 0.14 290)`
- `--sidebar`: `oklch(0.99 0.006 150)` / `oklch(0.19 0.018 165)`
- `--sidebar-foreground`: `oklch(0.21 0.02 160)` / `oklch(0.96 0.008 150)`
- `--sidebar-primary`: `oklch(0.45 0.09 165)` / `oklch(0.72 0.12 165)`
- `--sidebar-primary-foreground`: `oklch(0.99 0.01 150)` / `oklch(0.18 0.03 165)`
- `--sidebar-accent`: `oklch(0.95 0.02 160)` / `oklch(0.27 0.02 162)`
- `--sidebar-accent-foreground`: `oklch(0.3 0.03 160)` / `oklch(0.96 0.008 150)`
- `--sidebar-border`: `oklch(0.92 0.01 155)` / `oklch(1 0 0 / 10%)`
- `--sidebar-ring`: `oklch(0.45 0.09 165)` / `oklch(0.72 0.12 165)`

Typography: `--font-sans: var(--font-geist-sans)`,
`--font-mono: var(--font-geist-mono)` (Geist vars, no explicit
sizes/weights/line-heights in code — Tailwind defaults apply).

Radii (`--radius: 0.875rem` base): `--radius-sm: calc(var(--radius) - 4px)`,
`--radius-md: calc(var(--radius) - 2px)`, `--radius-lg: var(--radius)`,
`--radius-xl: calc(var(--radius) + 4px)`. Shadows: none custom (Tailwind
defaults). Spacing: no custom scale (Tailwind defaults).

## Token file paths

- `workspace/frontend/src/app/globals.css` — all CSS variables, `@theme
  inline` color/radius mapping, `@custom-variant dark`, base layer
  (`border-border`, `outline-ring/50`).
- `workspace/frontend/components.json` — shadcn wiring (css file path,
  aliases, icon library).
- `workspace/frontend/tailwind.config.ts` + `postcss.config.mjs` — Tailwind
  v4 build wiring.

## Components

shadcn primitives (`workspace/frontend/src/components/ui/`, 48 files):
accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb,
button, calendar, card, carousel, chart, checkbox, collapsible, command,
context-menu, dialog, drawer, dropdown-menu, form, hover-card, input,
input-otp, label, menubar, navigation-menu, pagination, popover, progress,
radio-group, resizable, scroll-area, select, separator, sheet, sidebar,
skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster,
toggle, toggle-group, tooltip. Variants follow shadcn/new-york defaults
(e.g. button variants/sizes via cva); no custom variant system in code.

Reusable finance components (`workspace/frontend/src/components/finance/`):
layout (`app-shell`, `brand`, `header`, `sidebar`, `sidebar-data-quality`),
`shared/amount.tsx` (money display + `hideAmounts` masking),
`shared/summary-cards.tsx`, sections (16: dashboard, tarjetas, ingresos,
movimientos, importaciones, conciliacion, cierres, respaldo, presupuestos,
objetivos, reportes, salud-financiera, asesor-ia, deuda-futura,
configuracion + router), charts (category-donut, monthly-evolution,
sparkline), card-statements (import-state, preview-state, accepted-state,
history-panel, overview, statement-document, exchange-rate-card,
manual-purchase-sheet, helpers, types), imports (debit-csv-import-sheet,
salary-receipts-panel), categories, goals-grid, financial-health-summary,
alerts (alert-center), preferences (app-preferences-provider), search
(global-search-dialog, search-target-banner), transactions.

## Visual Conventions

- Tokens map 1:1 to Tailwind utilities via `@theme inline`
  (`bg-background`, `text-foreground`, `bg-primary`, `border-border`, ...);
  dark mode via `.dark` class variant.
- Privacy masking is transversal: every money display goes through the
  shared `Amount` component honoring `hideAmounts`.
- Feedback via `sonner` Toaster + dialog/sheet patterns for editors
  (purchase sheet, category sheet, import sheets).
- Data display via TanStack Table + shadcn table/tabs/cards; charts use the
  `--chart-1..5` palette (esmeralda, teal, ámbar, rosa, violeta).
- Section navigation through `SectionRouter` inside `AppShell` (sidebar +
  header + brand), single-route app.

## Register

`"product"` — interactive personal-finance tool: forms, editable previews,
state management (zustand + query), user workflows (import → review →
accept → close), dashboards. No marketing/content surface.

---
grounding-version: 2
generated-by: IADEV-grounding
source-commit: n/a-no-git-repo
