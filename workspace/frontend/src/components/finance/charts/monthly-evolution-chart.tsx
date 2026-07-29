"use client";

import { useMemo, useState } from "react";
import { AreaChart, ArrowRight, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatFinancialAmount,
  parseFinancialAmount,
} from "@/lib/finance/financial-amount";
import type {
  FinanceChartCurrency,
  MonthlyEvolutionDatum,
} from "@/components/finance/charts/chart-contracts";

type EvolutionView = "bars" | "area";
type MovementType = "income" | "expense";

interface MonthlyEvolutionChartProps {
  data: MonthlyEvolutionDatum[];
  currency?: FinanceChartCurrency;
  defaultCurrency?: FinanceChartCurrency;
  showCurrencySelector?: boolean;
  onCurrencyChange?: (currency: FinanceChartCurrency) => void;
  onOpen?: (row: MonthlyEvolutionDatum, type: MovementType) => void;
  testIdPrefix?: string;
  dataSource?: string;
  emptyMessage?: string;
}

interface MonthValues {
  source: MonthlyEvolutionDatum;
  monthKey: string;
  label: string;
  income: number;
  expense: number;
  projected: number;
  balance: number;
  incomeRaw: string;
  expenseRaw: string;
  projectedRaw: string;
  balanceRaw: string;
}

function valuesFor(
  month: MonthlyEvolutionDatum,
  currency: FinanceChartCurrency,
): MonthValues {
  const incomeRaw = currency === "ARS" ? month.incomeArs : month.incomeUsd;
  const expenseRaw = currency === "ARS" ? month.expenseArs : month.expenseUsd;
  const projectedRaw =
    currency === "ARS"
      ? month.projectedExpenseArs
      : month.projectedExpenseUsd;
  const balanceRaw = currency === "ARS" ? month.balanceArs : month.balanceUsd;
  return {
    source: month,
    monthKey: month.monthKey,
    label: month.label,
    income: parseFinancialAmount(incomeRaw) ?? 0,
    expense: parseFinancialAmount(expenseRaw) ?? 0,
    projected: parseFinancialAmount(projectedRaw) ?? 0,
    balance: parseFinancialAmount(balanceRaw) ?? 0,
    incomeRaw,
    expenseRaw,
    projectedRaw,
    balanceRaw,
  };
}

function MovementActions({
  row,
  onOpen,
}: {
  row: MonthValues;
  onOpen: (row: MonthlyEvolutionDatum, type: MovementType) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => onOpen(row.source, "income")}
        aria-label={`Abrir ingresos de ${row.label}`}
      >
        Ingresos
        <ArrowRight className="ml-1 size-3" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => onOpen(row.source, "expense")}
        aria-label={`Abrir egresos de ${row.label}`}
      >
        Egresos
        <ArrowRight className="ml-1 size-3" aria-hidden="true" />
      </Button>
    </div>
  );
}

function BarsView({
  rows,
  currency,
  onOpen,
  testIdPrefix,
  dataSource,
}: {
  rows: MonthValues[];
  currency: FinanceChartCurrency;
  onOpen?: (row: MonthlyEvolutionDatum, type: MovementType) => void;
  testIdPrefix: string;
  dataSource: string;
}) {
  const maximum = Math.max(
    1,
    ...rows.flatMap((row) => [row.income, row.expense, row.projected]),
  );

  return (
    <div
      className="space-y-4"
      data-testid={`${testIdPrefix}-evolution-bars`}
      data-source={dataSource}
      data-currency={currency}
    >
      {rows.map((row) => (
        <div
          key={row.monthKey}
          className={`grid gap-2 ${
            onOpen
              ? "sm:grid-cols-[90px_1fr_150px_auto]"
              : "sm:grid-cols-[90px_1fr_150px]"
          } sm:items-center`}
          data-testid={`${testIdPrefix}-month-${row.monthKey}`}
          data-currency={currency}
          data-income-raw={row.incomeRaw}
          data-expense-raw={row.expenseRaw}
          data-projected-raw={row.projectedRaw}
          data-balance-raw={row.balanceRaw}
        >
          <p className="text-xs font-medium capitalize text-muted-foreground">
            {row.label}
          </p>
          <div className="space-y-1.5" aria-hidden="true">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.min(100, (row.income / maximum) * 100)}%` }}
              />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-rose-500"
                style={{ width: `${Math.min(100, (row.expense / maximum) * 100)}%` }}
              />
            </div>
            {row.projected > 0 ? (
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{
                    width: `${Math.min(100, (row.projected / maximum) * 100)}%`,
                  }}
                />
              </div>
            ) : null}
          </div>
          <div className="text-right text-xs tabular-nums">
            <p className="text-emerald-700">
              + {formatFinancialAmount(row.incomeRaw, currency)}
            </p>
            <p className="text-rose-700">
              − {formatFinancialAmount(row.expenseRaw, currency)}
            </p>
            {row.projected > 0 ? (
              <p className="text-amber-700">
                Proy. {formatFinancialAmount(row.projectedRaw, currency)}
              </p>
            ) : null}
          </div>
          {onOpen ? <MovementActions row={row} onOpen={onOpen} /> : null}
        </div>
      ))}
    </div>
  );
}

function buildPath(
  values: number[],
  width: number,
  height: number,
  max: number,
): string {
  if (values.length === 0) return "";
  return values
    .map((value, index) => {
      const x =
        values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - (value / max) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildArea(
  values: number[],
  width: number,
  height: number,
  max: number,
): string {
  const line = buildPath(values, width, height, max);
  if (!line) return "";
  return `${line} L ${width} ${height} L 0 ${height} Z`;
}

function AreaView({
  rows,
  currency,
  testIdPrefix,
  dataSource,
}: {
  rows: MonthValues[];
  currency: FinanceChartCurrency;
  testIdPrefix: string;
  dataSource: string;
}) {
  const width = 720;
  const height = 250;
  const chartHeight = 190;
  const maximum = Math.max(
    1,
    ...rows.flatMap((row) => [row.income, row.expense, row.projected]),
  );
  const incomeValues = rows.map((row) => row.income);
  const expenseValues = rows.map((row) => row.expense);
  const projectedValues = rows.map((row) => row.projected);
  const incomePath = buildPath(incomeValues, width, chartHeight, maximum);
  const expensePath = buildPath(expenseValues, width, chartHeight, maximum);
  const projectedPath = buildPath(projectedValues, width, chartHeight, maximum);

  return (
    <div
      data-testid={`${testIdPrefix}-evolution-area`}
      data-source={dataSource}
      data-currency={currency}
    >
      {rows.length < 2 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Se necesitan al menos dos meses reales para mostrar el modo área.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="min-w-[620px] w-full"
            role="img"
            aria-label={`Evolución mensual de ingresos, egresos y compromisos proyectados en ${currency}`}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
              const y = chartHeight - fraction * chartHeight;
              return (
                <line
                  key={fraction}
                  x1="0"
                  y1={y}
                  x2={width}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray={fraction === 0 ? undefined : "4 5"}
                  className="text-border"
                />
              );
            })}
            <path
              d={buildArea(incomeValues, width, chartHeight, maximum)}
              fill="#10b981"
              opacity="0.12"
            />
            <path
              d={buildArea(expenseValues, width, chartHeight, maximum)}
              fill="#f43f5e"
              opacity="0.1"
            />
            <path
              d={incomePath}
              fill="none"
              stroke="#059669"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={expensePath}
              fill="none"
              stroke="#e11d48"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={projectedPath}
              fill="none"
              stroke="#d97706"
              strokeWidth="2"
              strokeDasharray="7 5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {rows.map((row, index) => {
              const x =
                rows.length === 1
                  ? width / 2
                  : (index / (rows.length - 1)) * width;
              return (
                <g key={row.monthKey}>
                  <text
                    x={x}
                    y={chartHeight + 28}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[11px] capitalize"
                  >
                    {row.label}
                  </text>
                  <circle
                    cx={x}
                    cy={chartHeight - (row.income / maximum) * chartHeight}
                    r="4"
                    fill="#059669"
                  />
                  <circle
                    cx={x}
                    cy={chartHeight - (row.expense / maximum) * chartHeight}
                    r="4"
                    fill="#e11d48"
                  />
                  {row.projected > 0 ? (
                    <circle
                      cx={x}
                      cy={chartHeight - (row.projected / maximum) * chartHeight}
                      r="3"
                      fill="#d97706"
                    />
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      )}
      <div
        className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground"
        aria-hidden="true"
      >
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-600" />Ingresos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-rose-600" />Egresos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amber-600" />Proyectado
        </span>
      </div>
    </div>
  );
}

function DataTable({
  rows,
  currency,
  onOpen,
  testIdPrefix,
}: {
  rows: MonthValues[];
  currency: FinanceChartCurrency;
  onOpen?: (row: MonthlyEvolutionDatum, type: MovementType) => void;
  testIdPrefix: string;
}) {
  return (
    <details
      className="rounded-xl border bg-muted/10 p-3"
      data-testid={`${testIdPrefix}-evolution-data-table`}
    >
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
        Ver datos mensuales equivalentes
      </summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-xs">
          <caption className="sr-only">
            Datos mensuales de evolución en {currency}
          </caption>
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th scope="col" className="px-2 py-2 font-medium">
                Mes
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                Ingresos
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                Egresos
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                Proyectado
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                Balance
              </th>
              {onOpen ? (
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  Detalle
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.monthKey}
                className="border-b last:border-0"
                data-testid={`${testIdPrefix}-table-month-${row.monthKey}`}
                data-currency={currency}
                data-income-raw={row.incomeRaw}
                data-expense-raw={row.expenseRaw}
                data-projected-raw={row.projectedRaw}
                data-balance-raw={row.balanceRaw}
              >
                <td className="px-2 py-2 capitalize">{row.label}</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {formatFinancialAmount(row.incomeRaw, currency)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {formatFinancialAmount(row.expenseRaw, currency)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {formatFinancialAmount(row.projectedRaw, currency)}
                </td>
                <td className="px-2 py-2 text-right font-medium tabular-nums">
                  {formatFinancialAmount(row.balanceRaw, currency)}
                </td>
                {onOpen ? (
                  <td className="px-2 py-2 text-right">
                    <MovementActions row={row} onOpen={onOpen} />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function MonthlyEvolutionChart({
  data,
  currency: controlledCurrency,
  defaultCurrency = "ARS",
  showCurrencySelector = true,
  onCurrencyChange,
  onOpen,
  testIdPrefix = "dashboard",
  dataSource = "dashboard.monthlyEvolution",
  emptyMessage = "Todavía no existe evolución mensual para representar.",
}: MonthlyEvolutionChartProps) {
  const [view, setView] = useState<EvolutionView>("bars");
  const [internalCurrency, setInternalCurrency] =
    useState<FinanceChartCurrency>(defaultCurrency);
  const currency = controlledCurrency ?? internalCurrency;
  const rows = useMemo(
    () => data.map((month) => valuesFor(month, currency)),
    [currency, data],
  );

  function selectCurrency(next: FinanceChartCurrency) {
    if (controlledCurrency === undefined) setInternalCurrency(next);
    onCurrencyChange?.(next);
  }

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      className="space-y-4"
      data-testid={`${testIdPrefix}-evolution-visualization`}
      data-currency={currency}
      data-source={dataSource}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {showCurrencySelector ? (
          <div
            className="flex gap-1"
            role="group"
            aria-label="Moneda del gráfico de evolución"
          >
            {(["ARS", "USD"] as const).map((item) => (
              <Button
                key={item}
                type="button"
                variant={currency === item ? "secondary" : "ghost"}
                size="sm"
                className="h-8"
                aria-pressed={currency === item}
                onClick={() => selectCurrency(item)}
                data-testid={`${testIdPrefix}-evolution-currency-${item.toLowerCase()}`}
              >
                {item}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-xs font-medium text-muted-foreground">
            Moneda seleccionada: {currency}
          </p>
        )}
        <div
          className="flex gap-1"
          role="group"
          aria-label="Vista de evolución mensual"
        >
          <Button
            type="button"
            variant={view === "bars" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5"
            aria-pressed={view === "bars"}
            onClick={() => setView("bars")}
            data-testid={`${testIdPrefix}-evolution-mode-bars`}
          >
            <BarChart3 className="size-3.5" aria-hidden="true" />
            Barras
          </Button>
          <Button
            type="button"
            variant={view === "area" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5"
            aria-pressed={view === "area"}
            onClick={() => setView("area")}
            data-testid={`${testIdPrefix}-evolution-mode-area`}
          >
            <AreaChart className="size-3.5" aria-hidden="true" />
            Área
          </Button>
        </div>
      </div>

      {view === "bars" ? (
        <BarsView
          rows={rows}
          currency={currency}
          onOpen={onOpen}
          testIdPrefix={testIdPrefix}
          dataSource={dataSource}
        />
      ) : (
        <AreaView
          rows={rows}
          currency={currency}
          testIdPrefix={testIdPrefix}
          dataSource={dataSource}
        />
      )}
      <DataTable
        rows={rows}
        currency={currency}
        onOpen={onOpen}
        testIdPrefix={testIdPrefix}
      />
    </div>
  );
}
