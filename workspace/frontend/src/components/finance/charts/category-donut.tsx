"use client";

import { useMemo, useState } from "react";
import { ChartPie, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatFinancialAmount,
  parseFinancialAmount,
} from "@/lib/finance/financial-amount";
import type {
  CategoryDistributionDatum,
  FinanceChartCurrency,
} from "@/components/finance/charts/chart-contracts";
import { cn } from "@/lib/utils";

type CategoryView = "list" | "donut";

interface CategoryDonutProps {
  categories: CategoryDistributionDatum[];
  currency?: FinanceChartCurrency;
  testIdPrefix?: string;
  dataSource?: string;
  emptyMessage?: string;
}

interface CategorySlice {
  id: string;
  name: string;
  color: string;
  amount: string;
  share: number;
}

interface CategorySegment {
  slice: CategorySlice;
  dash: number;
  offset: number;
}

function categoryAmount(
  category: CategoryDistributionDatum,
  currency: FinanceChartCurrency,
): string {
  return currency === "ARS" ? category.amountArs : category.amountUsd;
}

function categoryShare(
  category: CategoryDistributionDatum,
  currency: FinanceChartCurrency,
): number {
  const raw = currency === "ARS" ? category.shareArs : category.shareUsd;
  const parsed = raw === null ? 0 : Number(raw);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0;
}

function slicesFor(
  categories: CategoryDistributionDatum[],
  currency: FinanceChartCurrency,
): CategorySlice[] {
  return categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      color: category.color,
      amount: categoryAmount(category, currency),
      share: categoryShare(category, currency),
    }))
    .filter(
      (category) =>
        (parseFinancialAmount(category.amount) ?? 0) !== 0 &&
        category.share > 0,
    );
}

function segmentsFor(
  slices: CategorySlice[],
  circumference: number,
): CategorySegment[] {
  return slices.reduce<{
    cumulativeShare: number;
    segments: CategorySegment[];
  }>(
    (state, slice) => ({
      cumulativeShare: state.cumulativeShare + slice.share,
      segments: [
        ...state.segments,
        {
          slice,
          dash: circumference * (slice.share / 100),
          offset: -circumference * (state.cumulativeShare / 100),
        },
      ],
    }),
    { cumulativeShare: 0, segments: [] },
  ).segments;
}

function DonutCurrency({
  currency,
  slices,
  testIdPrefix,
  dataSource,
}: {
  currency: FinanceChartCurrency;
  slices: CategorySlice[];
  testIdPrefix: string;
  dataSource: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = slices.find((slice) => slice.id === activeId) ?? null;
  const size = 176;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const segments = segmentsFor(slices, circumference);

  if (slices.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground"
        data-testid={`${testIdPrefix}-category-donut-${currency.toLowerCase()}-empty`}
      >
        No hay egresos realizados en {currency} para representar.
      </div>
    );
  }

  return (
    <section
      className="rounded-xl border bg-muted/10 p-4"
      aria-labelledby={`${testIdPrefix}-category-donut-${currency}`}
      data-testid={`${testIdPrefix}-category-donut-${currency.toLowerCase()}`}
      data-source={dataSource}
      data-currency={currency}
    >
      <h3
        id={`${testIdPrefix}-category-donut-${currency}`}
        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Distribución {currency}
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-[176px_1fr] sm:items-center">
        <div className="relative mx-auto size-44 shrink-0" aria-hidden="true">
          <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-muted"
            />
            {segments.map(({ slice, dash, offset }) => (
              <circle
                key={slice.id}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={activeId === slice.id ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={`${dash} ${Math.max(0, circumference - dash)}`}
                strokeDashoffset={offset}
                opacity={activeId && activeId !== slice.id ? 0.3 : 1}
                className="transition-all duration-200"
              />
            ))}
          </svg>
          <div className="absolute inset-0 grid place-content-center px-5 text-center">
            <span className="truncate text-[11px] text-muted-foreground">
              {active?.name ?? currency}
            </span>
            <span className="mt-1 text-sm font-semibold tabular-nums">
              {active
                ? formatFinancialAmount(active.amount, currency)
                : `${slices.length} categorías`}
            </span>
            {active ? (
              <span className="mt-1 text-[11px] text-muted-foreground">
                {active.share.toLocaleString("es-AR", {
                  maximumFractionDigits: 2,
                })}
                %
              </span>
            ) : null}
          </div>
        </div>

        <ul
          className="space-y-1.5"
          aria-label={`Detalle de gastos por categoría en ${currency}`}
        >
          {slices.map((slice) => (
            <li key={slice.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  activeId === slice.id ? "bg-muted" : "hover:bg-muted/60",
                )}
                onMouseEnter={() => setActiveId(slice.id)}
                onMouseLeave={() => setActiveId(null)}
                onFocus={() => setActiveId(slice.id)}
                onBlur={() => setActiveId(null)}
                data-category-id={slice.id}
                data-amount-raw={slice.amount}
                data-share={slice.share}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="min-w-0 flex-1 truncate">{slice.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {slice.share.toLocaleString("es-AR", {
                    maximumFractionDigits: 2,
                  })}
                  %
                </span>
                <span className="w-24 text-right text-xs font-medium tabular-nums">
                  {formatFinancialAmount(slice.amount, currency)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CategoryList({
  categories,
  currency,
  testIdPrefix,
  dataSource,
}: {
  categories: CategoryDistributionDatum[];
  currency?: FinanceChartCurrency;
  testIdPrefix: string;
  dataSource: string;
}) {
  return (
    <div
      className="space-y-4"
      data-testid={`${testIdPrefix}-category-list`}
      data-source={dataSource}
      data-currency={currency ?? "ALL"}
    >
      {categories.slice(0, 8).map((category) => {
        const shareArs = categoryShare(category, "ARS");
        const shareUsd = categoryShare(category, "USD");
        const selectedShare = currency
          ? categoryShare(category, currency)
          : null;
        const selectedAmount = currency
          ? categoryAmount(category, currency)
          : null;
        return (
          <div
            key={category.id}
            className="space-y-2"
            data-testid={`${testIdPrefix}-category-${category.id}`}
            data-currency={currency ?? "ALL"}
            data-amount-raw={selectedAmount ?? undefined}
            data-share-raw={
              currency === "ARS"
                ? category.shareArs ?? undefined
                : currency === "USD"
                  ? category.shareUsd ?? undefined
                  : undefined
            }
          >
            <div className="flex items-start justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="mt-1 size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="truncate">{category.name}</span>
              </div>
              <span className="whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
                {currency && selectedAmount !== null && selectedShare !== null ? (
                  <span className="block">
                    {formatFinancialAmount(selectedAmount, currency)} ·{" "}
                    {selectedShare.toLocaleString("es-AR", {
                      maximumFractionDigits: 2,
                    })}
                    %
                  </span>
                ) : (
                  <>
                    <span className="block">
                      {formatFinancialAmount(category.amountArs, "ARS")} ·{" "}
                      {shareArs.toLocaleString("es-AR", {
                        maximumFractionDigits: 2,
                      })}
                      %
                    </span>
                    {(parseFinancialAmount(category.amountUsd) ?? 0) !== 0 ? (
                      <span className="block">
                        {formatFinancialAmount(category.amountUsd, "USD")} ·{" "}
                        {shareUsd.toLocaleString("es-AR", {
                          maximumFractionDigits: 2,
                        })}
                        %
                      </span>
                    ) : null}
                  </>
                )}
              </span>
            </div>
            <div className="space-y-1">
              {currency && selectedShare !== null ? (
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                  aria-label={`Participación ${currency} de ${category.name}: ${selectedShare}%`}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${selectedShare}%`,
                      backgroundColor: category.color,
                    }}
                  />
                </div>
              ) : (
                <>
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                    aria-label={`Participación ARS de ${category.name}: ${shareArs}%`}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${shareArs}%`,
                        backgroundColor: category.color,
                      }}
                    />
                  </div>
                  {shareUsd > 0 ? (
                    <div
                      className="h-1 overflow-hidden rounded-full bg-muted"
                      aria-label={`Participación USD de ${category.name}: ${shareUsd}%`}
                    >
                      <div
                        className="h-full rounded-full opacity-60"
                        style={{
                          width: `${shareUsd}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CategoryDonut({
  categories,
  currency,
  testIdPrefix = "dashboard",
  dataSource = "dashboard.categories",
  emptyMessage = "No hay egresos realizados para distribuir.",
}: CategoryDonutProps) {
  const [view, setView] = useState<CategoryView>("list");
  const arsSlices = useMemo(() => slicesFor(categories, "ARS"), [categories]);
  const usdSlices = useMemo(() => slicesFor(categories, "USD"), [categories]);

  if (categories.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      className="space-y-4"
      data-testid={`${testIdPrefix}-category-visualization`}
      data-currency={currency ?? "ALL"}
      data-source={dataSource}
    >
      <div
        className="flex justify-end gap-1"
        role="group"
        aria-label="Vista de gastos por categoría"
      >
        <Button
          type="button"
          variant={view === "list" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 gap-1.5"
          aria-pressed={view === "list"}
          onClick={() => setView("list")}
          data-testid={`${testIdPrefix}-category-mode-list`}
        >
          <List className="size-3.5" aria-hidden="true" />
          Lista
        </Button>
        <Button
          type="button"
          variant={view === "donut" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 gap-1.5"
          aria-pressed={view === "donut"}
          onClick={() => setView("donut")}
          data-testid={`${testIdPrefix}-category-mode-donut`}
        >
          <ChartPie className="size-3.5" aria-hidden="true" />
          Donut
        </Button>
      </div>

      {view === "list" ? (
        <CategoryList
          categories={categories}
          currency={currency}
          testIdPrefix={testIdPrefix}
          dataSource={dataSource}
        />
      ) : currency ? (
        <DonutCurrency
          currency={currency}
          slices={currency === "ARS" ? arsSlices : usdSlices}
          testIdPrefix={testIdPrefix}
          dataSource={dataSource}
        />
      ) : (
        <div className="grid gap-4 2xl:grid-cols-2">
          <DonutCurrency
            currency="ARS"
            slices={arsSlices}
            testIdPrefix={testIdPrefix}
            dataSource={dataSource}
          />
          <DonutCurrency
            currency="USD"
            slices={usdSlices}
            testIdPrefix={testIdPrefix}
            dataSource={dataSource}
          />
        </div>
      )}
    </div>
  );
}
