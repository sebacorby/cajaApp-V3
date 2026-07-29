"use client";

import { FutureDebtView as FutureDebtViewCore } from "./FutureDebtViewBase";

const FUTURE_DEBT_TONE_CSS = `
  .future-debt-tone [data-testid="future-debt-pending-section"] {
    background-color: var(--card) !important;
    border-color: var(--border) !important;
    color: var(--card-foreground) !important;
    box-shadow: none !important;
  }

  .future-debt-tone [data-testid="future-debt-pending-section"] > :first-child {
    background-color: color-mix(in oklab, var(--muted) 72%, var(--card)) !important;
    border-color: var(--border) !important;
  }

  .future-debt-tone [data-testid="future-debt-pending-row"] {
    background-color: var(--card) !important;
    border-color: var(--border) !important;
    color: var(--card-foreground) !important;
  }

  .future-debt-tone [data-testid="future-debt-pending-row"]:hover {
    background-color: var(--muted) !important;
  }

  .future-debt-tone [data-testid="future-debt-pending-section"] [class*="bg-amber-"],
  .future-debt-tone [data-testid="future-debt-pending-section"] [class*="bg-yellow-"] {
    background-color: color-mix(in oklab, var(--muted) 78%, var(--card)) !important;
  }

  .future-debt-tone [data-testid="future-debt-pending-section"] [class*="text-amber-"],
  .future-debt-tone [data-testid="future-debt-pending-section"] [class*="text-yellow-"] {
    color: var(--muted-foreground) !important;
  }

  .future-debt-tone [data-testid="future-debt-pending-section"] [class*="border-amber-"],
  .future-debt-tone [data-testid="future-debt-pending-section"] [class*="border-yellow-"] {
    border-color: var(--border) !important;
  }

  .future-debt-tone [data-testid="future-debt-pending-section"] [class*="bg-slate-50"],
  .future-debt-tone [data-testid="future-debt-pending-section"] [class*="bg-slate-100"],
  .future-debt-tone [data-testid="future-debt-pending-section"] [class*="bg-slate-200"] {
    background-color: var(--card) !important;
  }

  .future-debt-tone [data-testid="future-debt-pending-section"] [class*="text-slate-600"],
  .future-debt-tone [data-testid="future-debt-pending-section"] [class*="text-slate-700"],
  .future-debt-tone [data-testid="future-debt-pending-section"] [class*="text-slate-800"] {
    color: var(--muted-foreground) !important;
  }

  .future-debt-tone [data-testid="future-debt-diagnostics"] {
    background-color: var(--card) !important;
    border-color: var(--border) !important;
    color: var(--card-foreground) !important;
    box-shadow: none !important;
  }

  .future-debt-tone [data-testid="future-debt-diagnostics"] [class*="bg-blue-"],
  .future-debt-tone [data-testid="future-debt-diagnostics"] [class*="bg-slate-"] {
    background-color: transparent !important;
  }

  .future-debt-tone [data-testid="future-debt-diagnostics"] [class*="text-blue-"],
  .future-debt-tone [data-testid="future-debt-diagnostics"] [class*="text-slate-"] {
    color: var(--muted-foreground) !important;
  }

  .future-debt-tone [data-testid="future-debt-diagnostics"] [class*="border-blue-"],
  .future-debt-tone [data-testid="future-debt-diagnostics"] [class*="border-slate-"] {
    border-color: var(--border) !important;
  }
`;

export function FutureDebtView() {
  return (
    <div className="future-debt-tone">
      <style>{FUTURE_DEBT_TONE_CSS}</style>
      <FutureDebtViewCore />
    </div>
  );
}
