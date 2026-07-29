import { prisma } from "../../db/prisma.js";
import { resolveInstallmentSequence } from "../../shared/installment-sequence.js";
import type {
  CardPaymentCard,
  CardPaymentMoney,
  CardPaymentMovement,
  CardPaymentsResponse,
} from "./card-payments.service.js";

export type CardPaymentAdjustmentKind =
  | "confirmed_statement_total"
  | "issuer_reference_adjustment";

export interface CardPaymentAdjustmentDetail {
  kind: CardPaymentAdjustmentKind;
  monthKey: string;
  sourceLabel: string;
  original: CardPaymentMoney;
  adjusted: CardPaymentMoney;
  adjustment: CardPaymentMoney;
  message: string;
}

type ExtendedMonth = CardPaymentsResponse["months"][number] & {
  adjustmentDetail?: CardPaymentAdjustmentDetail;
};

type ExtendedCardTotal = CardPaymentCard["totalsByMonth"][number] & {
  adjustmentDetail?: CardPaymentAdjustmentDetail;
};

export type PresentedCardPaymentsResponse = CardPaymentsResponse & {
  months: ExtendedMonth[];
  cards: Array<
    Omit<CardPaymentCard, "totalsByMonth"> & {
      totalsByMonth: ExtendedCardTotal[];
    }
  >;
  autoReconciliation: {
    adjusted: boolean;
    adjustments: CardPaymentAdjustmentDetail[];
  };
};

type Cents = { ars: bigint; usd: bigint };

type PersistedInstallmentRow = {
  installmentRaw: string | null;
  referenceRaw: string | null;
  originalText: string;
  amountPesosRaw: string | null;
  amountDollarsRaw: string | null;
};

function toCents(value: string | null | undefined): bigint {
  const raw = (value ?? "0")
    .trim()
    .replace(/\s/g, "")
    .replace(/ARS|USD|U\$S|\$/gi, "");
  if (!raw) return 0n;

  const sign = raw.startsWith("-") ? -1n : 1n;
  const unsigned = raw.replace(/^[+-]/, "");
  const normalized = unsigned.includes(",")
    ? unsigned.replace(/\./g, "").replace(",", ".")
    : unsigned;
  const [wholeRaw = "0", fractionRaw = ""] = normalized.split(".");
  const whole = wholeRaw.replace(/\D/g, "") || "0";
  const fraction = `${fractionRaw.replace(/\D/g, "")}00`.slice(0, 2);
  return sign * (BigInt(whole) * 100n + BigInt(fraction));
}

function fromCents(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}

function moneyToCents(value: CardPaymentMoney): Cents {
  return { ars: toCents(value.ars), usd: toCents(value.usd) };
}

function centsToMoney(value: Cents): CardPaymentMoney {
  return { ars: fromCents(value.ars), usd: fromCents(value.usd) };
}

function add(left: Cents, right: Cents): Cents {
  return { ars: left.ars + right.ars, usd: left.usd + right.usd };
}

function subtract(left: Cents, right: Cents): Cents {
  return { ars: left.ars - right.ars, usd: left.usd - right.usd };
}

function isZero(value: Cents): boolean {
  return value.ars === 0n && value.usd === 0n;
}

export function monthKeyWithOffset(monthKey: string, offset: number): string {
  const [yearText, monthText] = monthKey.split("-");
  const absolute = Number(yearText) * 12 + Number(monthText) - 1 + offset;
  return `${Math.floor(absolute / 12)}-${String((absolute % 12) + 1).padStart(2, "0")}`;
}

export function deriveMissingInstallmentMonths(input: {
  statementMonthKey: string;
  installmentRaw: string | null | undefined;
  existingMonthKeys: Iterable<string>;
  rangeFrom: string;
  rangeTo: string;
}): Array<{ monthKey: string; installmentNumber: number; installmentTotal: number }> {
  const parsed = resolveInstallmentSequence(input.installmentRaw);
  if (!parsed || parsed.current >= parsed.total) return [];

  const existing = new Set(input.existingMonthKeys);
  const result: Array<{
    monthKey: string;
    installmentNumber: number;
    installmentTotal: number;
  }> = [];

  for (let installmentNumber = parsed.current + 1; installmentNumber <= parsed.total; installmentNumber += 1) {
    const offset = installmentNumber - parsed.current;
    const monthKey = monthKeyWithOffset(input.statementMonthKey, offset);
    if (monthKey < input.rangeFrom || monthKey > input.rangeTo || existing.has(monthKey)) continue;
    result.push({ monthKey, installmentNumber, installmentTotal: parsed.total });
  }

  return result;
}

export function repairMovementInstallmentSequence(input: {
  movement: CardPaymentMovement;
  row?: PersistedInstallmentRow | null;
  statementMonthKey: string;
  rangeFrom: string;
  rangeTo: string;
}): number {
  const sequence = resolveInstallmentSequence(
    input.row?.installmentRaw,
    input.row?.referenceRaw,
    input.row?.originalText,
    input.movement.description,
  );
  if (!sequence || sequence.current >= sequence.total) return 0;

  const currentCell = input.movement.cells.find(
    (cell) => cell.monthKey === input.statementMonthKey,
  );

  let ars = toCents(input.row?.amountPesosRaw);
  let usd = toCents(input.row?.amountDollarsRaw);

  // A row link is useful when available, but the already accepted matrix is also
  // an authoritative normalized source. This keeps old accepted summaries repairable
  // even when the presentation movement id does not match the persisted row id.
  if (ars === 0n && currentCell) ars = toCents(currentCell.ars);
  if (usd === 0n && currentCell) usd = toCents(currentCell.usd);
  if (ars === 0n && usd === 0n) return 0;

  const missing = deriveMissingInstallmentMonths({
    statementMonthKey: input.statementMonthKey,
    installmentRaw: sequence.raw,
    existingMonthKeys: input.movement.cells.map((cell) => cell.monthKey),
    rangeFrom: input.rangeFrom,
    rangeTo: input.rangeTo,
  });

  for (const item of missing) {
    input.movement.cells.push({
      monthKey: item.monthKey,
      status: "projected",
      installmentNumber: item.installmentNumber,
      installmentTotal: item.installmentTotal,
      ars: fromCents(ars),
      usd: fromCents(usd),
    });
  }

  input.movement.cells.sort((left, right) => left.monthKey.localeCompare(right.monthKey));
  return missing.length;
}

function sumMovementCells(
  movements: CardPaymentMovement[],
  monthKey: string,
  predicate: (movement: CardPaymentMovement) => boolean = () => true,
): Cents {
  let total: Cents = { ars: 0n, usd: 0n };
  for (const movement of movements) {
    if (!predicate(movement)) continue;
    const cell = movement.cells.find((item) => item.monthKey === monthKey);
    if (cell) total = add(total, moneyToCents(cell));
  }
  return total;
}

function recalculateTotals(response: PresentedCardPaymentsResponse): void {
  for (const card of response.cards) {
    card.totalsByMonth = response.months.map((month) => ({
      monthKey: month.monthKey,
      totals: centsToMoney(sumMovementCells(card.movements, month.monthKey)),
    }));
  }

  for (const month of response.months) {
    let total: Cents = { ars: 0n, usd: 0n };
    for (const card of response.cards) {
      const entry = card.totalsByMonth.find((item) => item.monthKey === month.monthKey);
      if (entry) total = add(total, moneyToCents(entry.totals));
    }
    month.totals = centsToMoney(total);
    delete month.adjustmentDetail;
  }
}

async function completeAcceptedInstallmentSequences(
  response: PresentedCardPaymentsResponse,
): Promise<number> {
  if (!response.baseline) return 0;

  const statement = await prisma.cardStatement.findUnique({
    where: { id: response.baseline.statementId },
    select: {
      rows: {
        select: {
          id: true,
          installmentRaw: true,
          referenceRaw: true,
          originalText: true,
          amountPesosRaw: true,
          amountDollarsRaw: true,
        },
      },
    },
  });
  if (!statement) return 0;

  const rowsById = new Map(statement.rows.map((row) => [row.id, row]));
  let repaired = 0;

  for (const card of response.cards) {
    for (const movement of card.movements) {
      if (movement.sourceType !== "statement_row") continue;

      repaired += repairMovementInstallmentSequence({
        movement,
        row: rowsById.get(movement.id),
        statementMonthKey: response.baseline.periodKey,
        rangeFrom: response.range.from,
        rangeTo: response.range.to,
      });
    }
  }

  return repaired;
}

function refreshIssuerValidation(response: PresentedCardPaymentsResponse): void {
  for (const item of response.issuerValidation.items) {
    if (!item.targetPaymentMonthKey) continue;

    let calculated: Cents = { ars: 0n, usd: 0n };
    for (const card of response.cards) {
      calculated = add(
        calculated,
        sumMovementCells(
          card.movements,
          item.targetPaymentMonthKey,
          (movement) => movement.sourceType === "statement_row",
        ),
      );
    }

    const issuer = moneyToCents(item.issuerAmount);
    const difference = subtract(calculated, issuer);
    item.calculatedInstallments = centsToMoney(calculated);
    item.difference = centsToMoney(difference);
    item.status = isZero(difference) ? "matched" : "mismatch";
  }
}

export async function presentCardPayments(
  input: CardPaymentsResponse,
): Promise<PresentedCardPaymentsResponse> {
  const response = input as PresentedCardPaymentsResponse;

  const repairedCells = await completeAcceptedInstallmentSequences(response);

  // Monthly totals and the card header are always derived from the matrix.
  // The issuer reference validates the result but never overwrites it.
  recalculateTotals(response);
  refreshIssuerValidation(response);

  response.autoReconciliation = {
    adjusted: repairedCells > 0,
    adjustments: [],
  };

  if (repairedCells > 0) {
    response.warnings = [
      ...response.warnings,
      `CajaApp reconstruyó ${repairedCells} cuota(s) futura(s) omitida(s) usando las secuencias aceptadas del resumen.`,
    ];
  }

  return response;
}
