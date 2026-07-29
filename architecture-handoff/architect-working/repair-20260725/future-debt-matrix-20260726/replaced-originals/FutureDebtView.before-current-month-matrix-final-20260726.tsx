"use client";

import { useEffect, useRef } from "react";
import { FutureDebtView as FutureDebtViewCore } from "./FutureDebtViewBase";

const FUTURE_DEBT_TONE_CSS = `
  .future-debt-tone [data-testid="future-debt-pending-section"] {
    background-color: var(--card) !important;
    border-color: var(--border) !important;
    color: var(--card-foreground) !important;
    box-shadow: none !important;
  }

  .future-debt-tone [data-testid="future-debt-pending-section"] > :first-child {
    background-color: color-mix(in oklab, var(--muted) 45%, var(--card)) !important;
    border-color: var(--border) !important;
    color: var(--foreground) !important;
  }

  .future-debt-tone [data-testid="future-debt-pending-row"] {
    background-color: var(--card) !important;
    border-color: color-mix(in oklab, var(--border) 85%, var(--foreground) 15%) !important;
    color: var(--foreground) !important;
  }

  .future-debt-tone [data-testid="future-debt-pending-row"]:hover {
    background-color: color-mix(in oklab, var(--muted) 55%, var(--card)) !important;
  }

  .future-debt-tone [data-testid="future-debt-pending-row"] [class*="text-slate-600"],
  .future-debt-tone [data-testid="future-debt-pending-row"] [class*="text-slate-700"],
  .future-debt-tone [data-testid="future-debt-pending-row"] [class*="text-slate-800"] {
    color: color-mix(in oklab, var(--foreground) 72%, var(--muted-foreground)) !important;
  }

  .future-debt-tone [data-testid="future-debt-pending-row"] [class*="font-semibold"],
  .future-debt-tone [data-testid="future-debt-pending-row"] [class*="font-medium"] {
    color: var(--foreground) !important;
  }

  .future-debt-tone [data-testid="future-debt-pending-section"] [class*="bg-amber-"],
  .future-debt-tone [data-testid="future-debt-pending-section"] [class*="bg-yellow-"] {
    background-color: color-mix(in oklab, var(--muted) 65%, var(--card)) !important;
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
    color: color-mix(in oklab, var(--foreground) 70%, var(--muted-foreground)) !important;
  }

  .future-debt-tone [data-testid="future-debt-diagnostics"] [class*="border-blue-"],
  .future-debt-tone [data-testid="future-debt-diagnostics"] [class*="border-slate-"] {
    border-color: var(--border) !important;
  }
`;

function ownText(element: HTMLElement): string {
  return Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? "")
    .join("")
    .trim();
}

function sanitizeTechnicalDiagnostics(root: HTMLElement): void {
  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const element of elements) {
    const text = ownText(element);
    if (!text) continue;

    if (/^missing_card_reference\s*:/i.test(text)) {
      element.style.display = "none";
      continue;
    }

    if (/^missing_card_reference$/i.test(text)) {
      if (element.closest('[data-testid="future-debt-diagnostics"]')) {
        element.style.display = "none";
      } else {
        element.textContent = "Tarjeta sin identificar";
      }
    }
  }
}

export function FutureDebtView() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    sanitizeTechnicalDiagnostics(root);
    const observer = new MutationObserver(() => sanitizeTechnicalDiagnostics(root));
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="future-debt-tone">
      <style>{FUTURE_DEBT_TONE_CSS}</style>
      <FutureDebtViewCore />
    </div>
  );
}
