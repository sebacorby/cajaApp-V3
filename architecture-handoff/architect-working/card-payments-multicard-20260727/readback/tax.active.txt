import { resolveInstallmentSequence } from "../../shared/installment-sequence.js";
import type {
  CardPaymentCard,
  CardPaymentMoney,
  CardPaymentMovement,
  CardPaymentsResponse,
} from "./card-payments.service.js";
import type { PersistedStatementPaymentRow } from "./card-payments-statement-normalizer.js";

export interface CardPaymentExchangeRate {
  configured: boolean;
  pair: "USD_ARS";
  rate: string | null;
  effectiveDate: string | null;
  source: string | null;
  status: string;
  updatedAt: string | null;
}

type Cents = { ars: bigint; usd: bigint };

type TaxMovement = CardPaymentMovement & {
  sourceType: CardPaymentMovement["sourceType"];
};

const COMMON_TAX_BPS = [2100, 1050, 350, 300, 250, 200, 120, 100];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function toCents(value: string | null | undefined): bigint {
  const raw = (value ?? "0").trim().replace(/\s/g, "").replace(/ARS|USD|U\$S|\$/gi, "");
  if (!raw) return 0n;
  const sign = raw.startsWith("-") ? -1n : 1n;
  const unsigned = raw.replace(/^[+-]/, "");
  let normalized: string;
  if (unsigned.includes(",")) {
    normalized = unsigned.replace(/\./g, "").replace(",", ".");
  } else {
    const dotCount = (unsigned.match(/\./g) ?? []).length;
    const lastDot = unsigned.lastIndexOf(".");
    const decimalDigits = lastDot >= 0 ? unsigned.length - lastDot - 1 : 0;
    normalized = dotCount === 1 && decimalDigits > 0 && decimalDigits <= 2
      ? unsigned
      : unsigned.replace(/\./g, "");
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return 0n;
  const [whole = "0", fraction = ""] = normalized.split(".");
  return sign * (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")));
}

function fromCents(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}

function add(left: Cents, right: Cents): Cents {
  return { ars: left.ars + right.ars, usd: left.usd + right.usd };
}

function subtract(left: Cents, right: Cents): Cents {
  return { ars: left.ars - right.ars, usd: left.usd - right.usd };
}

function money(value: CardPaymentMoney): Cents {
  return { ars: toCents(value.ars), usd: toCents(value.usd) };
}

function moneyApi(value: Cents): CardPaymentMoney {
  return { ars: fromCents(value.ars), usd: fromCents(value.usd) };
}

function roundDivide(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) return 0n;
  if (numerator >= 0n) return (numerator + denominator / 2n) / denominator;
  return -((-numerator + denominator / 2n) / denominator);
}

function percentOf(baseCents: bigint, bps: number): bigint {
  return roundDivide(baseCents * BigInt(bps), 10_000n);
}

function parsePercentageBps(text: string): number | null {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!match) return null;
  const parsed = Number(match[1].replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : null;
}

function snapTaxBps(value: number): number {
  let best = value;
  let distance = Number.POSITIVE_INFINITY;
  for (const candidate of COMMON_TAX_BPS) {
    const current = Math.abs(candidate - value);
    if (current < distance) {
      best = candidate;
      distance = current;
    }
  }
  return distance <= 8 ? best : value;
}

function inferBps(amountCents: bigint, baseCents: bigint): number | null {
  if (amountCents <= 0n || baseCents <= 0n) return null;
  const raw = Number(roundDivide(amountCents * 10_000n, baseCents));
  return raw > 0 ? snapTaxBps(raw) : null;
}

function moneyTokens(text: string): bigint[] {
  const matches = text.match(/[+-]?(?:(?:\d{1,3}(?:\.\d{3})+)|\d+),\d{2}/g) ?? [];
  return matches.map((item) => toCents(item));
}

function parseRateCents(value: string | null): bigint | null {
  if (!value) return null;
  const cents = toCents(value);
  return cents > 0n ? cents : null;
}

function usdToArs(usdCents: bigint, rateCents: bigint | null): bigint {
  if (!rateCents) return 0n;
  return roundDivide(usdCents * rateCents, 100n);
}

function cellMoney(movement: CardPaymentMovement, monthKey: string): Cents {
  const cell = movement.cells.find((item) => item.monthKey === monthKey);
  return cell ? { ars: toCents(cell.ars), usd: toCents(cell.usd) } : { ars: 0n, usd: 0n };
}

function sumRegular(card: CardPaymentCard, monthKey: string): Cents {
  let result: Cents = { ars: 0n, usd: 0n };
  for (const movement of card.movements) {
    if (movement.sourceType !== "statement_row" && movement.sourceType !== "manual_purchase") continue;
    result = add(result, cellMoney(movement, monthKey));
  }
  return result;
}

function taxLabel(row: PersistedStatementPaymentRow): string {
  return row.referenceRaw?.trim() || row.originalText.replace(/\s+/g, " ").trim() || "Impuesto";
}

function makeTaxMovement(
  row: PersistedStatementPaymentRow,
  baselineMonth: string,
  future: Map<string, bigint>,
): TaxMovement {
  const cells: CardPaymentMovement["cells"] = [];
  const currentArs = toCents(row.amountPesosRaw);
  const currentUsd = toCents(row.amountDollarsRaw);
  if (currentArs !== 0n || currentUsd !== 0n) {
    cells.push({
      monthKey: baselineMonth,
      status: "confirmed",
      installmentNumber: null,
      installmentTotal: null,
      ars: fromCents(currentArs),
      usd: fromCents(currentUsd),
    });
  }
  for (const [monthKey, ars] of future) {
    if (ars === 0n) continue;
    cells.push({
      monthKey,
      status: "projected",
      installmentNumber: null,
      installmentTotal: null,
      ars: fromCents(ars),
      usd: "0.00",
    });
  }
  cells.sort((left, right) => left.monthKey.localeCompare(right.monthKey));
  return {
    id: `tax:${row.id}`,
    sourceType: "tax_projection" as CardPaymentMovement["sourceType"],
    description: taxLabel(row),
    dateIso: row.dateIso,
    cells,
  };
}

function recalculateTotals(response: CardPaymentsResponse): void {
  for (const card of response.cards) {
    card.totalsByMonth = response.months.map((month) => {
      let total: Cents = { ars: 0n, usd: 0n };
      for (const movement of card.movements) total = add(total, cellMoney(movement, month.monthKey));
      return { monthKey: month.monthKey, totals: moneyApi(total) };
    });
  }
  for (const month of response.months) {
    let total: Cents = { ars: 0n, usd: 0n };
    for (const card of response.cards) {
      const current = card.totalsByMonth.find((item) => item.monthKey === month.monthKey);
      if (current) total = add(total, money(current.totals));
    }
    month.totals = moneyApi(total);
  }
}

function addCurrentReconciliation(response: CardPaymentsResponse, card: CardPaymentCard): void {
  const baseline = response.baseline;
  if (!baseline) return;
  let calculated: Cents = { ars: 0n, usd: 0n };
  for (const movement of card.movements) calculated = add(calculated, cellMoney(movement, baseline.periodKey));
  const difference = subtract(money(baseline.total), calculated);
  if (difference.ars === 0n && difference.usd === 0n) return;
  card.movements.splice(Math.max(0, card.movements.findIndex((item) => item.sourceType === ("tax_projection" as CardPaymentMovement["sourceType"]))), 0, {
    id: `reconciliation:${baseline.statementId}:${baseline.periodKey}`,
    sourceType: "reconciliation",
    description: "Otros cargos y ajustes del resumen",
    dateIso: null,
    cells: [{
      monthKey: baseline.periodKey,
      status: "confirmed",
      installmentNumber: null,
      installmentTotal: null,
      ars: fromCents(difference.ars),
      usd: fromCents(difference.usd),
    }],
  });
}

function projectPlanVat(
  rows: PersistedStatementPaymentRow[],
  card: CardPaymentCard,
  taxRow: PersistedStatementPaymentRow,
  baselineMonth: string,
): Map<string, bigint> {
  const result = new Map<string, bigint>();
  const taxText = normalizeText(`${taxRow.referenceRaw ?? ""} ${taxRow.originalText}`);
  if (!taxText.includes("PLAN V")) return result;

  const planRow = rows.find((row) => {
    if (row.id === taxRow.id || row.rowType.toLocaleLowerCase("es") === "tax") return false;
    return normalizeText(`${row.referenceRaw ?? ""} ${row.originalText}`).includes("PLAN V");
  });
  if (!planRow) return result;

  const planMovement = card.movements.find((movement) => movement.id === planRow.id);
  if (!planMovement) return result;

  const sequence = resolveInstallmentSequence(planRow.installmentRaw, planRow.referenceRaw, planRow.originalText);
  if (!sequence || sequence.current >= sequence.total) return result;

  const tokens = moneyTokens(taxRow.originalText);
  const currentInterest = tokens.length >= 2 ? tokens[tokens.length - 2] : 0n;
  const currentTax = toCents(taxRow.amountPesosRaw);
  const vatBps = parsePercentageBps(taxRow.originalText) ?? inferBps(currentTax, currentInterest) ?? 2100;
  const planText = `${planRow.referenceRaw ?? ""} ${planRow.originalText}`;
  const tnaMatch = planText.match(/TNA\s*([0-9]+(?:[.,][0-9]+)?)/i);
  const tnaBps = tnaMatch ? Math.round(Number(tnaMatch[1].replace(",", ".")) * 100) : 0;
  const payment = toCents(planRow.amountPesosRaw);
  if (currentInterest <= 0n || tnaBps <= 0 || payment <= currentInterest) return result;

  const monthlyDenominator = 120_000n;
  const monthlyNumerator = BigInt(tnaBps);
  let outstanding = roundDivide(currentInterest * monthlyDenominator, monthlyNumerator) - (payment - currentInterest);

  const futureCells = planMovement.cells
    .filter((cell) => cell.monthKey > baselineMonth && cell.installmentNumber !== null)
    .sort((left, right) => (left.installmentNumber ?? 0) - (right.installmentNumber ?? 0));

  for (const cell of futureCells) {
    if (outstanding <= 0n) break;
    const interest = roundDivide(outstanding * monthlyNumerator, monthlyDenominator);
    const tax = percentOf(interest, vatBps);
    result.set(cell.monthKey, tax);
    outstanding -= payment - interest;
  }
  return result;
}

export function applyDynamicTaxProjection(
  response: CardPaymentsResponse,
  rows: PersistedStatementPaymentRow[],
  exchangeRate: CardPaymentExchangeRate,
): CardPaymentsResponse & { exchangeRate: CardPaymentExchangeRate } {
  const baseline = response.baseline;
  const card = response.cards[0];
  if (!baseline || !card) return Object.assign(response, { exchangeRate });

  const taxRows = rows
    .filter((row) => row.rowType.toLocaleLowerCase("es") === "tax")
    .sort((left, right) => left.displayOrder - right.displayOrder);
  if (taxRows.length === 0) {
    addCurrentReconciliation(response, card);
    recalculateTotals(response);
    return Object.assign(response, { exchangeRate });
  }

  const futureByTaxId = new Map<string, Map<string, bigint>>(
    taxRows.map((row) => [row.id, new Map<string, bigint>()]),
  );
  const textById = new Map(taxRows.map((row) => [row.id, normalizeText(`${row.referenceRaw ?? ""} ${row.originalText}`)]));

  const planVatRow = taxRows.find((row) => textById.get(row.id)?.includes("IVA") && textById.get(row.id)?.includes("PLAN V"));
  if (planVatRow) futureByTaxId.set(planVatRow.id, projectPlanVat(rows, card, planVatRow, baseline.periodKey));

  const rgRow = taxRows.find((row) => textById.get(row.id)?.includes("IVA RG 4240"));
  const rgBps = rgRow ? parsePercentageBps(rgRow.originalText) ?? 2100 : null;
  const rateCents = exchangeRate.configured ? parseRateCents(exchangeRate.rate) : null;

  if (rgRow && rgBps) {
    const target = futureByTaxId.get(rgRow.id)!;
    for (const month of response.months) {
      if (month.monthKey <= baseline.periodKey) continue;
      const regular = sumRegular(card, month.monthKey);
      const foreignBase = usdToArs(regular.usd, rateCents);
      target.set(month.monthKey, percentOf(foreignBase, rgBps));
    }
  }

  const stampRows = taxRows.filter((row) => textById.get(row.id)?.includes("IMPUESTO DE SELLOS"));
  const stampForeign = stampRows.find((row) => /IMPUESTO DE SELLOS\s+P\b/.test(textById.get(row.id) ?? ""));
  const stampMain = stampRows.find((row) => row.id !== stampForeign?.id) ?? null;

  let stampBps: number | null = null;
  if (stampMain) {
    const currentRegular = sumRegular(card, baseline.periodKey);
    let otherTaxArs = 0n;
    for (const row of taxRows) {
      if (row.id === stampMain.id || row.id === stampForeign?.id) continue;
      otherTaxArs += toCents(row.amountPesosRaw);
    }
    stampBps = inferBps(toCents(stampMain.amountPesosRaw), currentRegular.ars + otherTaxArs);
  }

  if (stampBps && stampMain) {
    const target = futureByTaxId.get(stampMain.id)!;
    for (const month of response.months) {
      if (month.monthKey <= baseline.periodKey) continue;
      const regular = sumRegular(card, month.monthKey);
      let otherDynamicTax = 0n;
      for (const row of taxRows) {
        if (row.id === stampMain.id || row.id === stampForeign?.id) continue;
        otherDynamicTax += futureByTaxId.get(row.id)?.get(month.monthKey) ?? 0n;
      }
      target.set(month.monthKey, percentOf(regular.ars + otherDynamicTax, stampBps));
    }
  }

  if (stampBps && stampForeign) {
    const target = futureByTaxId.get(stampForeign.id)!;
    for (const month of response.months) {
      if (month.monthKey <= baseline.periodKey) continue;
      const regular = sumRegular(card, month.monthKey);
      target.set(month.monthKey, percentOf(usdToArs(regular.usd, rateCents), stampBps));
    }
  }

  const regularMovements = card.movements.filter(
    (movement) => movement.sourceType !== ("tax_projection" as CardPaymentMovement["sourceType"]) && movement.sourceType !== "reconciliation",
  );
  const taxMovements = taxRows.map((row) => makeTaxMovement(row, baseline.periodKey, futureByTaxId.get(row.id) ?? new Map()));
  card.movements = [...regularMovements, ...taxMovements];
  addCurrentReconciliation(response, card);
  recalculateTotals(response);

  return Object.assign(response, { exchangeRate });
}
