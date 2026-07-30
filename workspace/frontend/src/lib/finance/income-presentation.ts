import type {
  IncomeMonthProjection,
  IncomeOverview,
  IncomeSourceRecord,
} from "./incomes-api";

function amount(value: string | null | undefined): number {
  const compact = String(value ?? "0").replace(/\s/g, "").replace(/[^\d,.-]/g, "");
  if (!compact) return 0;
  const comma = compact.lastIndexOf(",");
  const dot = compact.lastIndexOf(".");
  const decimalIndex = Math.max(comma, dot);
  let normalized: string;
  if (decimalIndex >= 0 && compact.length - decimalIndex - 1 <= 2) {
    normalized = `${compact.slice(0, decimalIndex).replace(/[.,]/g, "")}.${compact
      .slice(decimalIndex + 1)
      .replace(/[.,]/g, "")}`;
  } else {
    normalized = compact.replace(/[.,]/g, "");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface IncomeSourcePresentation {
  id: string;
  name: string;
  employer: string;
  currency: "ARS" | "USD";
  active: boolean;
  lastRealAmount: string | null;
  lastRealMonthKey: string | null;
  nextEstimatedAmount: string | null;
  hasAutomaticIncrease: boolean;
}

export interface IncomeExtraPresentation {
  id: string;
  kind: string;
  label: string;
  amount: string;
  currency: "ARS" | "USD";
  status: "actual" | "projected";
  notes: string | null;
}

export interface IncomeMonthPresentation {
  monthKey: string;
  label: string;
  totalArs: string;
  totalUsd: string;
  realArs: string;
  estimatedArs: string;
  sourceCount: number;
  extras: IncomeExtraPresentation[];
}

export interface IncomeDashboardPresentation {
  currentMonthKey: string;
  currentRealArs: string;
  nextEstimatedArs: string;
  activeSources: number;
  sources: IncomeSourcePresentation[];
  months: IncomeMonthPresentation[];
}

function latestActual(source: IncomeSourceRecord) {
  return [...source.events]
    .filter(
      (event) =>
        event.kind === "monthly_override" &&
        event.status === "actual" &&
        amount(event.amount) > 0,
    )
    .sort((left, right) => right.monthKey.localeCompare(left.monthKey))[0] ?? null;
}

function sourcePresentation(
  source: IncomeSourceRecord,
  overview: IncomeOverview,
): IncomeSourcePresentation {
  const actual = latestActual(source);
  const nextMonth = overview.months.find(
    (month) => month.monthKey > overview.currentMonthKey,
  );
  const nextItem = nextMonth?.recurring.find((item) => item.sourceId === source.id);

  return {
    id: source.id,
    name: source.name,
    employer: source.employer ?? "Sin empleador informado",
    currency: source.currency,
    active: source.active,
    lastRealAmount: actual?.amount ?? null,
    lastRealMonthKey: actual?.monthKey ?? null,
    nextEstimatedAmount:
      nextItem && amount(nextItem.amount) > 0 ? nextItem.amount : null,
    hasAutomaticIncrease: amount(source.increasePercent) !== 0,
  };
}

function monthPresentation(month: IncomeMonthProjection): IncomeMonthPresentation | null {
  const actualRecurring = month.recurring.filter(
    (item) => item.status === "actual" && amount(item.amount) > 0,
  );
  const projectedRecurring = month.recurring.filter(
    (item) => item.status !== "actual" && amount(item.amount) > 0,
  );
  const actualOneOffs = month.oneOffs.filter(
    (item) => item.status === "actual" && amount(item.amount) > 0,
  );
  const projectedOneOffs = month.oneOffs.filter(
    (item) => item.status !== "actual" && amount(item.amount) > 0,
  );

  const realArs = [...actualRecurring, ...actualOneOffs]
    .filter((item) => item.currency === "ARS")
    .reduce((total, item) => total + amount(item.amount), 0);
  const estimatedArs = [...projectedRecurring, ...projectedOneOffs]
    .filter((item) => item.currency === "ARS")
    .reduce((total, item) => total + amount(item.amount), 0);

  if (
    realArs === 0 &&
    estimatedArs === 0 &&
    amount(month.totalUsd) === 0
  ) {
    return null;
  }

  return {
    monthKey: month.monthKey,
    label: month.label,
    totalArs: month.totalArs,
    totalUsd: month.totalUsd,
    realArs: realArs.toFixed(2),
    estimatedArs: estimatedArs.toFixed(2),
    sourceCount:
      month.recurring.filter((item) => amount(item.amount) > 0).length +
      month.oneOffs.filter((item) => amount(item.amount) > 0).length,
    extras: month.oneOffs
      .filter((item) => amount(item.amount) > 0)
      .map((item) => ({
        id: item.id,
        kind: item.kind,
        label: item.label,
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        notes: item.notes,
      })),
  };
}

export function buildIncomeDashboardPresentation(
  overview: IncomeOverview,
): IncomeDashboardPresentation {
  const currentMonth = overview.months.find(
    (month) => month.monthKey === overview.currentMonthKey,
  );
  const nextMonth = overview.months.find(
    (month) => month.monthKey > overview.currentMonthKey,
  );

  const currentRealArs = currentMonth
    ? [
        ...currentMonth.recurring.filter((item) => item.status === "actual"),
        ...currentMonth.oneOffs.filter((item) => item.status === "actual"),
      ]
        .filter((item) => item.currency === "ARS")
        .reduce((total, item) => total + amount(item.amount), 0)
        .toFixed(2)
    : "0.00";
  const nextEstimatedArs = nextMonth
    ? [
        ...nextMonth.recurring.filter((item) => item.status !== "actual"),
        ...nextMonth.oneOffs.filter((item) => item.status !== "actual"),
      ]
        .filter((item) => item.currency === "ARS")
        .reduce((total, item) => total + amount(item.amount), 0)
        .toFixed(2)
    : "0.00";

  return {
    currentMonthKey: overview.currentMonthKey,
    currentRealArs,
    nextEstimatedArs,
    activeSources: overview.sources.filter((source) => source.active).length,
    sources: overview.sources
      .map((source) => sourcePresentation(source, overview))
      .sort((left, right) => {
        const leftMonth = left.lastRealMonthKey ?? "";
        const rightMonth = right.lastRealMonthKey ?? "";
        return rightMonth.localeCompare(leftMonth) || left.name.localeCompare(right.name);
      }),
    months: overview.months
      .map(monthPresentation)
      .filter((month): month is IncomeMonthPresentation => Boolean(month)),
  };
}
