import {
  formatMovementAmount,
  movementsService,
  parseMovementAmount,
  type NormalizedMovement,
} from "../movements/movements.service.js";
import type { ReportsQueryInput } from "./reports.schemas.js";

type Currency = "ARS" | "USD";
type MovementState = "actual" | "pending" | "projected";

type MoneyTotals = {
  incomeArs: bigint;
  expenseArs: bigint;
  incomeUsd: bigint;
  expenseUsd: bigint;
  records: number;
};

type CategoryAccumulator = {
  id: string | null;
  name: string;
  amountArs: bigint;
  amountUsd: bigint;
  records: number;
};

type SourceAccumulator = {
  sourceType: string;
  label: string;
  amountArs: bigint;
  amountUsd: bigint;
  records: number;
};

const DAY_MS = 86_400_000;

function emptyTotals(): MoneyTotals {
  return { incomeArs: 0n, expenseArs: 0n, incomeUsd: 0n, expenseUsd: 0n, records: 0 };
}

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  const date = toDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

function previousEquivalentRange(query: ReportsQueryInput): ReportsQueryInput {
  const fromDate = toDate(query.from);
  const toDateValue = toDate(query.to);
  const lastDay = new Date(Date.UTC(
    toDateValue.getUTCFullYear(),
    toDateValue.getUTCMonth() + 1,
    0,
  )).getUTCDate();

  if (fromDate.getUTCDate() === 1 && toDateValue.getUTCDate() === lastDay) {
    const monthSpan =
      (toDateValue.getUTCFullYear() - fromDate.getUTCFullYear()) * 12 +
      (toDateValue.getUTCMonth() - fromDate.getUTCMonth()) +
      1;
    const previousFrom = new Date(Date.UTC(
      fromDate.getUTCFullYear(),
      fromDate.getUTCMonth() - monthSpan,
      1,
    ));
    return { from: toIsoDate(previousFrom), to: addDays(query.from, -1) };
  }

  const days = Math.round((toDateValue.getTime() - fromDate.getTime()) / DAY_MS) + 1;
  const to = addDays(query.from, -1);
  return { from: addDays(to, -(days - 1)), to };
}

function monthKeys(from: string, to: string): string[] {
  const cursor = toDate(`${from.slice(0, 7)}-01`);
  const end = toDate(`${to.slice(0, 7)}-01`);
  const result: string[] = [];
  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}

function monthRange(monthKey: string, query: ReportsQueryInput): ReportsQueryInput {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const from = `${monthKey}-01` < query.from ? query.from : `${monthKey}-01`;
  const monthEnd = `${monthKey}-${String(lastDay).padStart(2, "0")}`;
  const to = monthEnd > query.to ? query.to : monthEnd;
  return { from, to };
}

function formatMonth(monthKey: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${monthKey}-01T00:00:00Z`));
}

function addMovement(total: MoneyTotals, movement: NormalizedMovement): void {
  const cents = parseMovementAmount(movement.amount, movement.currency, false);
  total.records += 1;
  if (movement.currency === "ARS") {
    if (movement.type === "income") total.incomeArs += cents;
    else total.expenseArs += cents;
  } else if (movement.type === "income") total.incomeUsd += cents;
  else total.expenseUsd += cents;
}

function inRange(movement: NormalizedMovement, range: ReportsQueryInput): boolean {
  return movement.occurredOn >= range.from && movement.occurredOn <= range.to;
}

function totalFor(
  movements: NormalizedMovement[],
  range: ReportsQueryInput,
  statuses: MovementState[],
): MoneyTotals {
  const statusSet = new Set(statuses);
  const total = emptyTotals();
  for (const movement of movements) {
    if (!inRange(movement, range)) continue;
    if (!statusSet.has(movement.status as MovementState)) continue;
    addMovement(total, movement);
  }
  return total;
}

function divideRoundHalfUp(value: bigint, divisor: bigint): bigint {
  if (divisor <= 0n) return 0n;
  if (value < 0n) return -divideRoundHalfUp(-value, divisor);
  return (value + divisor / 2n) / divisor;
}

function percentage(numerator: bigint, denominator: bigint): string | null {
  if (denominator === 0n) return null;
  const scaled = (numerator * 10_000n) / (denominator < 0n ? -denominator : denominator);
  return formatScaledPercent(scaled);
}

function percentChange(current: bigint, previous: bigint): string | null {
  if (previous === 0n) return current === 0n ? "0.00" : null;
  const scaled = ((current - previous) * 10_000n) / (previous < 0n ? -previous : previous);
  return formatScaledPercent(scaled);
}

function formatScaledPercent(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  return `${negative ? "-" : ""}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, "0")}`;
}

function serializeTotals(total: MoneyTotals) {
  return {
    incomeArs: formatMovementAmount(total.incomeArs, "ARS"),
    expenseArs: formatMovementAmount(total.expenseArs, "ARS"),
    resultArs: formatMovementAmount(total.incomeArs - total.expenseArs, "ARS"),
    incomeUsd: formatMovementAmount(total.incomeUsd, "USD"),
    expenseUsd: formatMovementAmount(total.expenseUsd, "USD"),
    resultUsd: formatMovementAmount(total.incomeUsd - total.expenseUsd, "USD"),
    savingsRateArs: percentage(total.incomeArs - total.expenseArs, total.incomeArs),
    savingsRateUsd: percentage(total.incomeUsd - total.expenseUsd, total.incomeUsd),
    records: total.records,
  };
}

function serializeAverage(total: MoneyTotals, months: number) {
  const divisor = BigInt(Math.max(months, 1));
  return serializeTotals({
    incomeArs: divideRoundHalfUp(total.incomeArs, divisor),
    expenseArs: divideRoundHalfUp(total.expenseArs, divisor),
    incomeUsd: divideRoundHalfUp(total.incomeUsd, divisor),
    expenseUsd: divideRoundHalfUp(total.expenseUsd, divisor),
    records: Math.round(total.records / Math.max(months, 1)),
  });
}

function sourceLabel(movement: NormalizedMovement): string {
  const labels: Record<string, string> = {
    card_statement: "Resúmenes de tarjeta",
    card_manual_purchase: "Compras manuales de tarjeta",
    card_installment: "Cuotas de tarjeta",
    debit_csv: "Débito importado",
    manual_cash: "Efectivo",
    manual_income: "Cobros manuales",
    manual_unexpected: "Imprevistos",
    manual_transfer: "Transferencias",
    manual_adjustment: "Ajustes",
    income_recurring: "Ingresos recurrentes",
    income_one_off: "Bonos y extras",
  };
  return labels[movement.sourceType] ?? movement.trace.sourceLabel ?? movement.sourceType;
}

function isCardMovement(movement: NormalizedMovement): boolean {
  return movement.sourceType === "card_statement"
    || movement.sourceType === "card_manual_purchase"
    || movement.sourceType === "card_installment";
}

function sortByAmount<T extends { amountArs: bigint; amountUsd: bigint; label?: string; name?: string }>(items: T[]): T[] {
  return items.sort((left, right) => {
    if (left.amountArs !== right.amountArs) return left.amountArs > right.amountArs ? -1 : 1;
    if (left.amountUsd !== right.amountUsd) return left.amountUsd > right.amountUsd ? -1 : 1;
    return (left.label ?? left.name ?? "").localeCompare(right.label ?? right.name ?? "", "es");
  });
}

export function buildReportsOverview(
  movements: NormalizedMovement[],
  query: ReportsQueryInput,
) {
  const previousRange = previousEquivalentRange(query);
  const months = monthKeys(query.from, query.to);
  const actual = totalFor(movements, query, ["actual"]);
  const pending = totalFor(movements, query, ["pending"]);
  const projected = totalFor(movements, query, ["projected"]);
  const previousActual = totalFor(movements, previousRange, ["actual"]);

  const categoryMap = new Map<string, CategoryAccumulator>();
  const sourceMap = new Map<string, SourceAccumulator>();

  for (const movement of movements) {
    if (!inRange(movement, query) || movement.status !== "actual" || movement.type !== "expense") continue;
    const cents = parseMovementAmount(movement.amount, movement.currency, false);

    const categoryKey = movement.category.id ?? `virtual:${movement.category.name}`;
    const category = categoryMap.get(categoryKey) ?? {
      id: movement.category.id,
      name: movement.category.name,
      amountArs: 0n,
      amountUsd: 0n,
      records: 0,
    };
    if (movement.currency === "ARS") category.amountArs += cents;
    else category.amountUsd += cents;
    category.records += 1;
    categoryMap.set(categoryKey, category);

    const sourceKey = movement.sourceType;
    const source = sourceMap.get(sourceKey) ?? {
      sourceType: movement.sourceType,
      label: sourceLabel(movement),
      amountArs: 0n,
      amountUsd: 0n,
      records: 0,
    };
    if (movement.currency === "ARS") source.amountArs += cents;
    else source.amountUsd += cents;
    source.records += 1;
    sourceMap.set(sourceKey, source);
  }

  const categories = sortByAmount([...categoryMap.values()]).map((entry) => ({
    id: entry.id,
    name: entry.name,
    amountArs: formatMovementAmount(entry.amountArs, "ARS"),
    amountUsd: formatMovementAmount(entry.amountUsd, "USD"),
    shareArs: percentage(entry.amountArs, actual.expenseArs),
    shareUsd: percentage(entry.amountUsd, actual.expenseUsd),
    records: entry.records,
  }));

  const sources = sortByAmount([...sourceMap.values()]).map((entry) => ({
    sourceType: entry.sourceType,
    label: entry.label,
    amountArs: formatMovementAmount(entry.amountArs, "ARS"),
    amountUsd: formatMovementAmount(entry.amountUsd, "USD"),
    shareArs: percentage(entry.amountArs, actual.expenseArs),
    shareUsd: percentage(entry.amountUsd, actual.expenseUsd),
    records: entry.records,
  }));

  const monthly = months.map((monthKey) => {
    const range = monthRange(monthKey, query);
    const monthActual = totalFor(movements, range, ["actual"]);
    const monthPending = totalFor(movements, range, ["pending"]);
    const monthProjected = totalFor(movements, range, ["projected"]);
    const expected = {
      incomeArs: monthActual.incomeArs + monthPending.incomeArs + monthProjected.incomeArs,
      expenseArs: monthActual.expenseArs + monthPending.expenseArs + monthProjected.expenseArs,
      incomeUsd: monthActual.incomeUsd + monthPending.incomeUsd + monthProjected.incomeUsd,
      expenseUsd: monthActual.expenseUsd + monthPending.expenseUsd + monthProjected.expenseUsd,
      records: monthActual.records + monthPending.records + monthProjected.records,
    };
    return {
      monthKey,
      label: formatMonth(monthKey),
      range,
      actual: serializeTotals(monthActual),
      pending: serializeTotals(monthPending),
      projected: serializeTotals(monthProjected),
      expected: serializeTotals(expected),
    };
  });

  const monthlyIncomeArsMax = monthly.reduce((maximum, item) => {
    const cents = parseMovementAmount(item.actual.incomeArs, "ARS", true);
    return cents > maximum ? cents : maximum;
  }, 0n);
  const monthlyExpenseArsMax = monthly.reduce((maximum, item) => {
    const cents = parseMovementAmount(item.actual.expenseArs, "ARS", true);
    return cents > maximum ? cents : maximum;
  }, 0n);
  const monthlyIncomeUsdMax = monthly.reduce((maximum, item) => {
    const cents = parseMovementAmount(item.actual.incomeUsd, "USD", true);
    return cents > maximum ? cents : maximum;
  }, 0n);
  const monthlyExpenseUsdMax = monthly.reduce((maximum, item) => {
    const cents = parseMovementAmount(item.actual.expenseUsd, "USD", true);
    return cents > maximum ? cents : maximum;
  }, 0n);
  const monthlyWithChart = monthly.map((item) => ({
    ...item,
    chart: {
      incomeArsPercent: percentage(parseMovementAmount(item.actual.incomeArs, "ARS", true), monthlyIncomeArsMax) ?? "0.00",
      expenseArsPercent: percentage(parseMovementAmount(item.actual.expenseArs, "ARS", true), monthlyExpenseArsMax) ?? "0.00",
      incomeUsdPercent: percentage(parseMovementAmount(item.actual.incomeUsd, "USD", true), monthlyIncomeUsdMax) ?? "0.00",
      expenseUsdPercent: percentage(parseMovementAmount(item.actual.expenseUsd, "USD", true), monthlyExpenseUsdMax) ?? "0.00",
    },
  }));

  const cardDebt = months.map((monthKey) => {
    const range = monthRange(monthKey, query);
    const cardMovements = movements.filter((movement) => isCardMovement(movement));
    return {
      monthKey,
      label: formatMonth(monthKey),
      range,
      actual: serializeTotals(totalFor(cardMovements, range, ["actual"])),
      pending: serializeTotals(totalFor(cardMovements, range, ["pending"])),
      projected: serializeTotals(totalFor(cardMovements, range, ["projected"])),
    };
  });

  const recurringSourceMap = new Map<string, {
    sourceId: string;
    label: string;
    months: Map<string, { actualArs: bigint; actualUsd: bigint; projectedArs: bigint; projectedUsd: bigint }>;
  }>();
  for (const movement of movements) {
    if (!inRange(movement, query) || movement.sourceType !== "income_recurring") continue;
    const source = recurringSourceMap.get(movement.sourceId) ?? {
      sourceId: movement.sourceId,
      label: movement.trace.sourceLabel || movement.description,
      months: new Map(),
    };
    const month = source.months.get(movement.effectiveMonthKey) ?? {
      actualArs: 0n,
      actualUsd: 0n,
      projectedArs: 0n,
      projectedUsd: 0n,
    };
    const cents = parseMovementAmount(movement.amount, movement.currency, false);
    const projectedMovement = movement.status === "projected";
    if (movement.currency === "ARS") {
      if (projectedMovement) month.projectedArs += cents;
      else month.actualArs += cents;
    } else if (projectedMovement) month.projectedUsd += cents;
    else month.actualUsd += cents;
    source.months.set(movement.effectiveMonthKey, month);
    recurringSourceMap.set(movement.sourceId, source);
  }

  const recurringIncome = [...recurringSourceMap.values()]
    .sort((left, right) => left.label.localeCompare(right.label, "es"))
    .map((source) => ({
      sourceId: source.sourceId,
      label: source.label,
      months: months.map((monthKey) => {
        const value = source.months.get(monthKey) ?? {
          actualArs: 0n,
          actualUsd: 0n,
          projectedArs: 0n,
          projectedUsd: 0n,
        };
        return {
          monthKey,
          label: formatMonth(monthKey),
          actualArs: formatMovementAmount(value.actualArs, "ARS"),
          actualUsd: formatMovementAmount(value.actualUsd, "USD"),
          projectedArs: formatMovementAmount(value.projectedArs, "ARS"),
          projectedUsd: formatMovementAmount(value.projectedUsd, "USD"),
        };
      }),
    }));

  return {
    range: query,
    previousRange,
    monthCount: months.length,
    summary: {
      actual: serializeTotals(actual),
      pending: serializeTotals(pending),
      projected: serializeTotals(projected),
      expected: serializeTotals({
        incomeArs: actual.incomeArs + pending.incomeArs + projected.incomeArs,
        expenseArs: actual.expenseArs + pending.expenseArs + projected.expenseArs,
        incomeUsd: actual.incomeUsd + pending.incomeUsd + projected.incomeUsd,
        expenseUsd: actual.expenseUsd + pending.expenseUsd + projected.expenseUsd,
        records: actual.records + pending.records + projected.records,
      }),
      monthlyAverageActual: serializeAverage(actual, months.length),
    },
    comparison: {
      current: serializeTotals(actual),
      previous: serializeTotals(previousActual),
      incomeArs: percentChange(actual.incomeArs, previousActual.incomeArs),
      expenseArs: percentChange(actual.expenseArs, previousActual.expenseArs),
      resultArs: percentChange(actual.incomeArs - actual.expenseArs, previousActual.incomeArs - previousActual.expenseArs),
      incomeUsd: percentChange(actual.incomeUsd, previousActual.incomeUsd),
      expenseUsd: percentChange(actual.expenseUsd, previousActual.expenseUsd),
      resultUsd: percentChange(actual.incomeUsd - actual.expenseUsd, previousActual.incomeUsd - previousActual.expenseUsd),
    },
    monthly: monthlyWithChart,
    categories,
    sources,
    cardDebt,
    recurringIncome,
    dataQuality: {
      totalRecords: movements.filter((movement) => inRange(movement, query)).length,
      actualRecords: actual.records,
      pendingRecords: pending.records,
      projectedRecords: projected.records,
      unclassifiedRecords: movements.filter((movement) => inRange(movement, query) && movement.category.name === "Sin clasificar").length,
      currencies: {
        arsRecords: movements.filter((movement) => inRange(movement, query) && movement.currency === "ARS").length,
        usdRecords: movements.filter((movement) => inRange(movement, query) && movement.currency === "USD").length,
      },
    },
  };
}

function csvValue(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildReportsCsv(report: ReturnType<typeof buildReportsOverview>): string {
  const lines: string[] = ["\uFEFFSeccion;Periodo;Dimension;Estado;ARS;USD;Registros;Porcentaje"];
  const add = (...values: unknown[]) => lines.push(values.map(csvValue).join(";"));

  for (const month of report.monthly) {
    add("Evolucion mensual", month.label, "Ingresos", "Real", month.actual.incomeArs, month.actual.incomeUsd, month.actual.records, month.actual.savingsRateArs);
    add("Evolucion mensual", month.label, "Egresos", "Real", month.actual.expenseArs, month.actual.expenseUsd, month.actual.records, "");
    add("Evolucion mensual", month.label, "Resultado", "Real", month.actual.resultArs, month.actual.resultUsd, month.actual.records, month.actual.savingsRateArs);
    add("Evolucion mensual", month.label, "Egresos", "Esperado", month.expected.expenseArs, month.expected.expenseUsd, month.expected.records, "");
  }
  for (const category of report.categories) {
    add("Categorias", `${report.range.from} a ${report.range.to}`, category.name, "Real", category.amountArs, category.amountUsd, category.records, category.shareArs ?? category.shareUsd);
  }
  for (const source of report.sources) {
    add("Fuentes", `${report.range.from} a ${report.range.to}`, source.label, "Real", source.amountArs, source.amountUsd, source.records, source.shareArs ?? source.shareUsd);
  }
  for (const debt of report.cardDebt) {
    add("Deuda tarjeta", debt.label, "Egresos", "Real", debt.actual.expenseArs, debt.actual.expenseUsd, debt.actual.records, "");
    add("Deuda tarjeta", debt.label, "Egresos", "Proyectado", debt.projected.expenseArs, debt.projected.expenseUsd, debt.projected.records, "");
  }
  return lines.join("\r\n");
}

export class ReportsService {
  async getOverview(query: ReportsQueryInput) {
    const previousRange = previousEquivalentRange(query);
    const movements = await movementsService.getAllMovements({
      from: previousRange.from < query.from ? previousRange.from : query.from,
      to: query.to,
      includeProjected: true,
    });
    return buildReportsOverview(movements, query);
  }

  async exportCsv(query: ReportsQueryInput): Promise<{ csv: string; fileName: string }> {
    const report = await this.getOverview(query);
    return {
      csv: buildReportsCsv(report),
      fileName: `cajaapp-reportes-${query.from}-${query.to}.csv`,
    };
  }
}

export const reportsService = new ReportsService();
