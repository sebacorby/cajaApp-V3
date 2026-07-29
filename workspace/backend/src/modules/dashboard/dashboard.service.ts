import { prisma } from "../../db/prisma.js";
import { movementCategoriesService } from "../movements/categories.service.js";
import {
  formatMovementAmount,
  movementsService,
  parseMovementAmount,
  type NormalizedMovement,
} from "../movements/movements.service.js";
import type { DashboardQueryInput } from "./dashboard.schemas.js";




type Currency = "ARS" | "USD";
type MovementState = "actual" | "pending" | "projected";




export type DashboardAlertSeverity = "critical" | "warning" | "info";




export type DashboardAlertFacts = {
  today: string;
  cardDueDates: Array<{ statementId: string; label: string; dueDate: string }>;
  rejectedCsvImports: number;
  rejectedCsvRows: number;
  exchangeRateConfigured: boolean;
};




export type DashboardAlert = {
  id: string;
  rule: string;
  severity: DashboardAlertSeverity;
  title: string;
  message: string;
  evidence: string[];
  action: {
    section: "movimientos" | "tarjetas" | "ingresos";
    label: string;
    drilldown?: {
      from: string;
      to: string;
      label: string;
      type?: "income" | "expense";
      source?: string;
      category?: string;
      status?: "actual" | "pending" | "projected";
      includeProjected?: boolean;
    };
  };
};




type CategoryMetadata = {
  id: string;
  name: string;
  color: string;
  icon: string;
};




type TotalsAccumulator = {
  incomeArs: bigint;
  expenseArs: bigint;
  incomeUsd: bigint;
  expenseUsd: bigint;
  records: number;
};




const DAY_MS = 86_400_000;




function emptyTotals(): TotalsAccumulator {
  return {
    incomeArs: 0n,
    expenseArs: 0n,
    incomeUsd: 0n,
    expenseUsd: 0n,
    records: 0,
  };
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




function previousEquivalentRange(query: DashboardQueryInput) {
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




function startOfMonthWithOffset(value: string, offset: number): string {
  const date = toDate(value);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return toIsoDate(date);
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




function formatMonth(monthKey: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    month: "short",
    year: "numeric",
  }).format(new Date(`${monthKey}-01T00:00:00Z`));
}




function addMovement(total: TotalsAccumulator, movement: NormalizedMovement): void {
  const cents = parseMovementAmount(movement.amount, movement.currency, false);
  total.records += 1;
  if (movement.currency === "ARS") {
    if (movement.type === "income") total.incomeArs += cents;
    else total.expenseArs += cents;
  } else if (movement.type === "income") total.incomeUsd += cents;
  else total.expenseUsd += cents;
}




function serializeTotals(total: TotalsAccumulator) {
  return {
    incomeArs: formatMovementAmount(total.incomeArs, "ARS"),
    expenseArs: formatMovementAmount(total.expenseArs, "ARS"),
    balanceArs: formatMovementAmount(total.incomeArs - total.expenseArs, "ARS"),
    incomeUsd: formatMovementAmount(total.incomeUsd, "USD"),
    expenseUsd: formatMovementAmount(total.expenseUsd, "USD"),
    balanceUsd: formatMovementAmount(total.incomeUsd - total.expenseUsd, "USD"),
    savingsRateArs: percentageOf(total.incomeArs - total.expenseArs, total.incomeArs),
    savingsRateUsd: percentageOf(total.incomeUsd - total.expenseUsd, total.incomeUsd),
    records: total.records,
  };
}




function percentageOf(numerator: bigint, denominator: bigint): string | null {
  if (denominator === 0n) return null;
  const scaled = (numerator * 10_000n) / denominator;
  return formatScaledPercent(scaled);
}




function percentChange(current: bigint, previous: bigint): string | null {
  if (previous === 0n) return current === 0n ? "0.00" : null;
  const base = previous < 0n ? -previous : previous;
  const scaled = ((current - previous) * 10_000n) / base;
  return formatScaledPercent(scaled);
}




function formatScaledPercent(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  return `${negative ? "-" : ""}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, "0")}`;
}




function totalFor(
  movements: NormalizedMovement[],
  range: { from: string; to: string },
  statuses: MovementState[],
): TotalsAccumulator {
  const statusSet = new Set(statuses);
  const total = emptyTotals();
  for (const movement of movements) {
    if (movement.occurredOn < range.from || movement.occurredOn > range.to) continue;
    if (!statusSet.has(movement.status as MovementState)) continue;
    addMovement(total, movement);
  }
  return total;
}




function latestMovementUpdatedAt(movements: NormalizedMovement[]): string | null {
  let latest: string | null = null;
  for (const movement of movements) {
    const candidate = movement.updatedAt ?? movement.createdAt;
    if (!candidate) continue;
    if (latest === null || candidate.localeCompare(latest) > 0) latest = candidate;
  }
  return latest;
}




function categoryFallback(name: string): CategoryMetadata {
  const fixed: Record<string, Omit<CategoryMetadata, "id" | "name">> = {
    Ingresos: { color: "#059669", icon: "banknote" },
    Tarjetas: { color: "#2563eb", icon: "credit-card" },
    "Impuestos y percepciones": { color: "#dc2626", icon: "landmark" },
    "Cargos de tarjeta": { color: "#9333ea", icon: "receipt-text" },
    "Sin clasificar": { color: "#64748b", icon: "circle-help" },
  };
  const meta = fixed[name] ?? fixed["Sin clasificar"];
  return { id: `virtual:${name}`, name, ...meta };
}




function currentDateInTucuman(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Tucuman",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}




function addIsoDays(value: string, days: number): string {
  const date = toDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}




function significantIncrease(current: bigint, previous: bigint): string | null {
  if (previous <= 0n || current <= previous) return null;
  const scaled = ((current - previous) * 10_000n) / previous;
  return scaled >= 2_000n ? formatScaledPercent(scaled) : null;
}




function negativeBalanceEvidence(label: string, ars: bigint, usd: bigint): string[] {
  const evidence: string[] = [];
  if (ars < 0n) evidence.push(`${label} ARS: ${formatMovementAmount(ars, "ARS")}`);
  if (usd < 0n) evidence.push(`${label} USD: ${formatMovementAmount(usd, "USD")}`);
  return evidence;
}




function severityOrder(value: DashboardAlertSeverity): number {
  return value === "critical" ? 0 : value === "warning" ? 1 : 2;
}




export function buildDashboardAlerts(
  movements: NormalizedMovement[],
  query: DashboardQueryInput,
  facts: DashboardAlertFacts = {
    today: currentDateInTucuman(),
    cardDueDates: [],
    rejectedCsvImports: 0,
    rejectedCsvRows: 0,
    exchangeRateConfigured: true,
  },
): DashboardAlert[] {
  const current = movements.filter((movement) =>
    movement.occurredOn >= query.from
    && movement.occurredOn <= query.to
    && movement.status !== "voided",
  );
  const previousRange = previousEquivalentRange(query);
  const actual = totalFor(current, query, ["actual"]);
  const pending = totalFor(current, query, ["pending"]);
  const projected = totalFor(current, query, ["projected"]);
  const previousActual = totalFor(movements, previousRange, ["actual"]);
  const expectedBalanceArs = actual.incomeArs + pending.incomeArs + projected.incomeArs
    - actual.expenseArs - pending.expenseArs - projected.expenseArs;
  const expectedBalanceUsd = actual.incomeUsd + pending.incomeUsd + projected.incomeUsd
    - actual.expenseUsd - pending.expenseUsd - projected.expenseUsd;
  const actualBalanceArs = actual.incomeArs - actual.expenseArs;
  const actualBalanceUsd = actual.incomeUsd - actual.expenseUsd;
  const alerts: DashboardAlert[] = [];




  const expectedNegative = negativeBalanceEvidence("Saldo esperado", expectedBalanceArs, expectedBalanceUsd);
  const actualNegative = negativeBalanceEvidence("Saldo realizado", actualBalanceArs, actualBalanceUsd);
  if (expectedNegative.length > 0 || actualNegative.length > 0) {
    alerts.push({
      id: "negative-operating-balance",
      rule: "balance < 0",
      severity: "critical",
      title: "Saldo operativo negativo",
      message: expectedNegative.length > 0
        ? "Los ingresos realizados y esperados no alcanzan para cubrir los egresos y compromisos del período."
        : "Los egresos realizados superan a los ingresos realizados del período.",
      evidence: [...actualNegative, ...expectedNegative],
      action: {
        section: "movimientos",
        label: "Revisar movimientos del período",
        drilldown: {
          from: query.from,
          to: query.to,
          label: "Alerta: saldo operativo negativo",
          includeProjected: expectedNegative.length > 0,
        },
      },
    });
  }




  const unclassified = current.filter((movement) => movement.category.name === "Sin clasificar");
  if (unclassified.length > 0) {
    alerts.push({
      id: "unclassified-movements",
      rule: "category = Sin clasificar",
      severity: "warning",
      title: "Movimientos sin clasificar",
      message: `${unclassified.length} movimiento${unclassified.length === 1 ? "" : "s"} necesita${unclassified.length === 1 ? "" : "n"} una categoría para mejorar reportes y control.`,
      evidence: [`Registros detectados: ${unclassified.length}`],
      action: {
        section: "movimientos",
        label: "Clasificar movimientos",
        drilldown: {
          from: query.from,
          to: query.to,
          label: "Alerta: movimientos sin clasificar",
          category: "Sin clasificar",
          includeProjected: true,
        },
      },
    });
  }




  const expenseIncreaseArs = significantIncrease(actual.expenseArs, previousActual.expenseArs);
  const expenseIncreaseUsd = significantIncrease(actual.expenseUsd, previousActual.expenseUsd);
  if (expenseIncreaseArs || expenseIncreaseUsd) {
    alerts.push({
      id: "significant-expense-increase",
      rule: "gasto real aumenta >= 20%",
      severity: "warning",
      title: "Aumento significativo de gasto",
      message: "Los egresos realizados aumentaron al menos 20% contra el período anterior equivalente.",
      evidence: [
        ...(expenseIncreaseArs ? [`Variación ARS: +${expenseIncreaseArs}%`] : []),
        ...(expenseIncreaseUsd ? [`Variación USD: +${expenseIncreaseUsd}%`] : []),
      ],
      action: {
        section: "movimientos",
        label: "Revisar egresos realizados",
        drilldown: {
          from: query.from,
          to: query.to,
          label: "Alerta: aumento significativo de gasto",
          type: "expense",
          status: "actual",
        },
      },
    });
  }




  const expectedIncome = current.filter((movement) =>
    movement.type === "income" && (movement.status === "pending" || movement.status === "projected"),
  );
  if (expectedIncome.length > 0) {
    const expectedIncomeArs = pending.incomeArs + projected.incomeArs;
    const expectedIncomeUsd = pending.incomeUsd + projected.incomeUsd;
    alerts.push({
      id: "expected-income-not-actual",
      rule: "ingreso status in pending|projected",
      severity: "info",
      title: "Ingresos esperados aún no realizados",
      message: `${expectedIncome.length} ingreso${expectedIncome.length === 1 ? "" : "s"} sigue${expectedIncome.length === 1 ? "" : "n"} pendiente${expectedIncome.length === 1 ? "" : "s"} o proyectado${expectedIncome.length === 1 ? "" : "s"}.`,
      evidence: [
        `ARS esperados: ${formatMovementAmount(expectedIncomeArs, "ARS")}`,
        `USD esperados: ${formatMovementAmount(expectedIncomeUsd, "USD")}`,
      ],
      action: {
        section: "movimientos",
        label: "Revisar ingresos esperados",
        drilldown: {
          from: query.from,
          to: query.to,
          label: "Alerta: ingresos esperados aún no realizados",
          type: "income",
          includeProjected: true,
        },
      },
    });
  }




  const dueLimit = addIsoDays(facts.today, 7);
  const dueSoon = facts.cardDueDates
    .filter((item) => item.dueDate >= facts.today && item.dueDate <= dueLimit)
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate) || left.statementId.localeCompare(right.statementId));
  if (dueSoon.length > 0) {
    alerts.push({
      id: "card-due-soon",
      rule: "currentDueDate between today and today + 7 days",
      severity: "warning",
      title: "Vencimientos de tarjeta próximos",
      message: `${dueSoon.length} resumen${dueSoon.length === 1 ? "" : "es"} activo${dueSoon.length === 1 ? "" : "s"} vence${dueSoon.length === 1 ? "" : "n"} dentro de los próximos 7 días.`,
      evidence: dueSoon.map((item) => `${item.label}: ${item.dueDate}`),
      action: {
        section: "tarjetas",
        label: "Revisar vencimientos",
      },
    });
  }




  if (facts.rejectedCsvRows > 0) {
    alerts.push({
      id: "csv-rejected-rows",
      rule: "debitCsvImport.rejectedCount > 0",
      severity: "warning",
      title: "Filas rechazadas en importaciones CSV",
      message: "Hay filas de extractos de débito que no pudieron incorporarse al ledger durante el período.",
      evidence: [
        `Importaciones afectadas: ${facts.rejectedCsvImports}`,
        `Filas rechazadas: ${facts.rejectedCsvRows}`,
      ],
      action: {
        section: "movimientos",
        label: "Revisar importaciones CSV",
        drilldown: {
          from: query.from,
          to: query.to,
          label: "Alerta: importaciones CSV con filas rechazadas",
          source: "debit_csv",
          includeProjected: true,
        },
      },
    });
  }




  const usdRecords = current.filter((movement) => movement.currency === "USD");
  if (usdRecords.length > 0 && !facts.exchangeRateConfigured) {
    alerts.push({
      id: "missing-usd-exchange-rate",
      rule: "currency = USD and USD_ARS status != active",
      severity: "warning",
      title: "Falta cotización USD/ARS activa",
      message: "Existen movimientos en USD, pero no hay una cotización USD/ARS activa para mostrar equivalentes informativos.",
      evidence: [`Movimientos USD del período: ${usdRecords.length}`],
      action: {
        section: "tarjetas",
        label: "Configurar cotización",
      },
    });
  }




  return alerts.sort((left, right) =>
    severityOrder(left.severity) - severityOrder(right.severity)
    || left.id.localeCompare(right.id),
  );
}




export function buildDashboardOverview(
  movements: NormalizedMovement[],
  categories: CategoryMetadata[],
  query: DashboardQueryInput,
  alertFacts?: DashboardAlertFacts,
) {
  const previousRange = previousEquivalentRange(query);
  const actual = totalFor(movements, query, ["actual"]);
  const pending = totalFor(movements, query, ["pending"]);
  const projected = totalFor(movements, query, ["projected"]);
  const previousActual = totalFor(movements, previousRange, ["actual"]);
  const alerts = buildDashboardAlerts(movements, query, alertFacts);




  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const categoryByName = new Map(categories.map((category) => [category.name, category]));
  const categoryTotals = new Map<string, {
    metadata: CategoryMetadata;
    amountArs: bigint;
    amountUsd: bigint;
    records: number;
  }>();




  for (const movement of movements) {
    if (movement.occurredOn < query.from || movement.occurredOn > query.to) continue;
    if (movement.status !== "actual" || movement.type !== "expense") continue;
    const metadata =
      (movement.category.id ? categoryById.get(movement.category.id) : undefined) ??
      categoryByName.get(movement.category.name) ??
      categoryFallback(movement.category.name);
    const key = metadata.id;
    const entry = categoryTotals.get(key) ?? {
      metadata,
      amountArs: 0n,
      amountUsd: 0n,
      records: 0,
    };
    const cents = parseMovementAmount(movement.amount, movement.currency, false);
    if (movement.currency === "ARS") entry.amountArs += cents;
    else entry.amountUsd += cents;
    entry.records += 1;
    categoryTotals.set(key, entry);
  }




  const categoriesResponse = [...categoryTotals.values()]
    .sort((left, right) => {
      if (left.amountArs !== right.amountArs) return left.amountArs > right.amountArs ? -1 : 1;
      if (left.amountUsd !== right.amountUsd) return left.amountUsd > right.amountUsd ? -1 : 1;
      return left.metadata.name.localeCompare(right.metadata.name, "es");
    })
    .map((entry) => ({
      ...entry.metadata,
      amountArs: formatMovementAmount(entry.amountArs, "ARS"),
      amountUsd: formatMovementAmount(entry.amountUsd, "USD"),
      shareArs: percentageOf(entry.amountArs, actual.expenseArs),
      shareUsd: percentageOf(entry.amountUsd, actual.expenseUsd),
      records: entry.records,
    }));




  const evolutionFrom = query.from < startOfMonthWithOffset(query.to, -5)
    ? query.from
    : startOfMonthWithOffset(query.to, -5);
  const monthlyEvolution = monthKeys(evolutionFrom, query.to).map((monthKey) => {
    const monthMovements = movements.filter((movement) =>
      movement.effectiveMonthKey === monthKey && movement.status === "actual",
    );
    const monthActual = totalFor(monthMovements, {
      from: `${monthKey}-01`,
      to: `${monthKey}-31`,
    }, ["actual"]);
    const monthProjected = totalFor(
      movements.filter((movement) => movement.effectiveMonthKey === monthKey),
      { from: `${monthKey}-01`, to: `${monthKey}-31` },
      ["pending", "projected"],
    );
    return {
      monthKey,
      label: formatMonth(monthKey),
      ...serializeTotals(monthActual),
      projectedExpenseArs: formatMovementAmount(monthProjected.expenseArs, "ARS"),
      projectedExpenseUsd: formatMovementAmount(monthProjected.expenseUsd, "USD"),
    };
  });




  const currentMovements = movements
    .filter((movement) => movement.occurredOn >= query.from && movement.occurredOn <= query.to)
    .sort((left, right) => {
      const dateOrder = right.occurredOn.localeCompare(left.occurredOn);
      return dateOrder !== 0 ? dateOrder : right.id.localeCompare(left.id);
    });




  const projectedExpenses = currentMovements.filter(
    (movement) => movement.type === "expense" && (movement.status === "pending" || movement.status === "projected"),
  );




  return {
    range: query,
    previousRange,
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
    },
    comparison: {
      incomeArs: percentChange(actual.incomeArs, previousActual.incomeArs),
      expenseArs: percentChange(actual.expenseArs, previousActual.expenseArs),
      balanceArs: percentChange(actual.incomeArs - actual.expenseArs, previousActual.incomeArs - previousActual.expenseArs),
      incomeUsd: percentChange(actual.incomeUsd, previousActual.incomeUsd),
      expenseUsd: percentChange(actual.expenseUsd, previousActual.expenseUsd),
      balanceUsd: percentChange(actual.incomeUsd - actual.expenseUsd, previousActual.incomeUsd - previousActual.expenseUsd),
      previousActual: serializeTotals(previousActual),
    },
    categories: categoriesResponse,
    monthlyEvolution,
    recentMovements: currentMovements.filter((movement) => movement.status !== "projected").slice(0, 8),
    commitments: {
      totals: serializeTotals(totalFor(projectedExpenses, query, ["pending", "projected"])),
      items: projectedExpenses.slice(0, 8),
    },
    alerts,
    dataQuality: {
      unclassifiedRecords: currentMovements.filter((movement) => movement.category.name === "Sin clasificar").length,
      actualRecords: actual.records,
      pendingRecords: pending.records,
      projectedRecords: projected.records,
      lastUpdatedAt: latestMovementUpdatedAt(currentMovements),
    },
  };
}




export class DashboardService {
  async getOverview(query: DashboardQueryInput) {
    const previousRange = previousEquivalentRange(query);
    const evolutionFrom = query.from < startOfMonthWithOffset(query.to, -5)
      ? query.from
      : startOfMonthWithOffset(query.to, -5);
    const ledgerFrom = [previousRange.from, evolutionFrom].sort()[0];
    const today = currentDateInTucuman();
    const dueLimit = addIsoDays(today, 7);
    const importFrom = new Date(`${query.from}T00:00:00.000Z`);
    const importToExclusive = new Date(`${addIsoDays(query.to, 1)}T00:00:00.000Z`);




    const [movements, categories, statements, csvImports, exchangeRate] = await Promise.all([
      movementsService.getAllMovements({
        from: ledgerFrom,
        to: query.to,
        includeProjected: true,
      }),
      movementCategoriesService.listCategories(false),
      prisma.cardStatement.findMany({
        where: {
          status: "accepted",
          isActiveForPeriod: true,
          archivedAt: null,
          currentDueDate: { gte: today, lte: dueLimit },
        },
        select: {
          id: true,
          bankName: true,
          brand: true,
          statementNumber: true,
          currentDueDate: true,
        },
        orderBy: [{ currentDueDate: "asc" }, { id: "asc" }],
      }),
      prisma.debitCsvImport.findMany({
        where: {
          rejectedCount: { gt: 0 },
          createdAt: { gte: importFrom, lt: importToExclusive },
        },
        select: { rejectedCount: true },
      }),
      prisma.currencyExchangeRate.findFirst({
        where: { pair: "USD_ARS", status: "active" },
        select: { id: true },
      }),
    ]);




    const alertFacts: DashboardAlertFacts = {
      today,
      cardDueDates: statements
        .filter((statement) => Boolean(statement.currentDueDate))
        .map((statement) => ({
          statementId: statement.id,
          label: [statement.bankName, statement.brand ?? statement.statementNumber]
            .filter((value): value is string => Boolean(value))
            .join(" · ") || "Resumen de tarjeta",
          dueDate: statement.currentDueDate as string,
        })),
      rejectedCsvImports: csvImports.length,
      rejectedCsvRows: csvImports.reduce((total, item) => total + item.rejectedCount, 0),
      exchangeRateConfigured: Boolean(exchangeRate),
    };




    return buildDashboardOverview(movements, categories, query, alertFacts);
  }
}




export const dashboardService = new DashboardService();