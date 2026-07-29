"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import {
  fetchCardPayments,
  type CardPaymentsResponse,
} from "@/lib/finance/card-payments-api";
import { CardPaymentsView as BaseCardPaymentsView } from "./CardPaymentsView.base";

type MoneyLike = {
  ars?: string | null;
  usd?: string | null;
};

type PaymentSummary = {
  monthKey: string;
  cardCount: number;
  ars: number;
  usd: number;
  exchangeRate: number;
};

function parseNumber(value: string | null | undefined): number {
  const raw = (value ?? "").trim().replace(/\s/g, "");
  if (!raw) return 0;
  if (raw.includes(",")) {
    const parsed = Number(raw.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractMoney(value: unknown): MoneyLike {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;

  if ("ars" in record || "usd" in record) {
    return {
      ars: typeof record.ars === "string" ? record.ars : null,
      usd: typeof record.usd === "string" ? record.usd : null,
    };
  }

  for (const key of ["total", "totals", "amount", "money"]) {
    const nested = record[key];
    if (nested && typeof nested === "object") return extractMoney(nested);
  }

  return {};
}

function monthLabel(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return monthKey.toUpperCase();
  const year = Number(match[1]);
  const month = Number(match[2]);
  return new Intl.DateTimeFormat("es-AR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(".", "")
    .toUpperCase();
}

function buildSummary(data: CardPaymentsResponse): PaymentSummary | null {
  const nextMonth = data.baseline
    ? data.months.find((month) => month.monthKey > data.baseline!.periodKey) ?? data.months[0]
    : data.months[0];

  if (!nextMonth) return null;

  let ars = 0;
  let usd = 0;

  for (const card of data.cards) {
    const monthly = card.totalsByMonth.find((item) => item.monthKey === nextMonth.monthKey);
    const money = extractMoney(monthly);
    ars += parseNumber(money.ars);
    usd += parseNumber(money.usd);
  }

  return {
    monthKey: nextMonth.monthKey,
    cardCount: data.cards.length,
    ars,
    usd,
    exchangeRate: parseNumber(data.exchangeRate?.rate),
  };
}

function TotalToPay({ summary }: { summary: PaymentSummary | null }) {
  if (!summary) {
    return (
      <div className="w-full rounded-xl border bg-card/70 px-5 py-3 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total a pagar</p>
        <p className="mt-1 text-sm text-muted-foreground">Sin próximo vencimiento disponible</p>
      </div>
    );
  }

  const hasUsdWithoutRate = summary.usd !== 0 && summary.exchangeRate <= 0;
  const totalArs = summary.ars + summary.usd * summary.exchangeRate;

  return (
    <div className="flex w-full items-center justify-between gap-6 rounded-xl border bg-card/70 px-5 py-2.5 shadow-sm">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total a pagar</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {monthLabel(summary.monthKey)} · {summary.cardCount} {summary.cardCount === 1 ? "tarjeta" : "tarjetas"}
        </p>
      </div>
      <div className="shrink-0 text-right tabular-nums">
        {hasUsdWithoutRate ? (
          <>
            <p className="text-lg font-bold text-foreground">{formatFinancialAmount(summary.ars.toFixed(2), "ARS")}</p>
            <p className="text-[10px] text-amber-500">Falta cotización para sumar {formatFinancialAmount(summary.usd.toFixed(2), "USD")}</p>
          </>
        ) : (
          <p className="text-xl font-bold text-foreground">{formatFinancialAmount(totalArs.toFixed(2), "ARS")}</p>
        )}
      </div>
    </div>
  );
}

export function CardPaymentsView() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const response = await fetchCardPayments(2);
      setSummary(buildSummary(response));
    } catch {
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const normalizeView = () => {
      const section = host.querySelector<HTMLElement>("[data-testid='card-payments-view']");
      if (!section) return;

      const toolbar = section.firstElementChild;
      if (toolbar) {
        const applyButton = Array.from(toolbar.querySelectorAll("button")).find(
          (button) => button.textContent?.trim() === "Aplicar",
        );
        if (applyButton instanceof HTMLButtonElement) {
          applyButton.style.height = "2.5rem";
        }
      }

      for (const child of Array.from(section.children)) {
        const button = child.firstElementChild;
        if (!(button instanceof HTMLButtonElement)) continue;
        if (button.dataset.defaultCollapsed === "true") continue;

        button.dataset.defaultCollapsed = "true";
        if (child.children.length > 1) button.click();
      }
    };

    normalizeView();
    const observer = new MutationObserver(normalizeView);
    observer.observe(host, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const onClickCapture = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button");
      if (button?.textContent?.trim() === "Aplicar") {
        window.setTimeout(() => void loadSummary(), 250);
      }
    },
    [loadSummary],
  );

  const desktopSummary = useMemo(
    () => (
      <div className="pointer-events-none absolute left-0 right-[380px] top-0 z-10 hidden min-h-[58px] items-end lg:flex">
        <TotalToPay summary={summary} />
      </div>
    ),
    [summary],
  );

  return (
    <div ref={hostRef} className="relative" onClickCapture={onClickCapture}>
      <div className="mb-3 lg:hidden">
        <TotalToPay summary={summary} />
      </div>
      {desktopSummary}
      <BaseCardPaymentsView />
    </div>
  );
}
