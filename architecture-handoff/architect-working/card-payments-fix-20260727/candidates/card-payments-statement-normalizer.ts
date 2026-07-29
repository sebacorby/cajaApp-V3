import { resolveInstallmentSequence } from "../../shared/installment-sequence.js";
import type {
  CardPaymentCard,
  CardPaymentMovement,
  CardPaymentsResponse,
} from "./card-payments.service.js";

export interface PersistedStatementPaymentGroup {
  cardLast4: string | null;
  holderName: string | null;
}

export interface PersistedStatementPaymentRow {
  id: string;
  displayOrder: number;
  rowType: string;
  dateIso: string | null;
  installmentRaw: string | null;
  referenceRaw: string | null;
  originalText: string;
  amountPesosRaw: string | null;
  amountDollarsRaw: string | null;
  currencyOriginal: string | null;
}

type Cents = { ars: bigint; usd: bigint };

const DETAIL_ROW_TYPES = new Set(["transaction", "charge", "tax", "interest"]);

function toCents(value: string | null | undefined): bigint {
  const raw = (value ?? "0")
    .trim()
    .replace(/\s/g, "")
    .replace(/ARS|USD|U\$S|\$/gi, "");
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

function moneyFromRaw(ars: string | null | undefined, usd: string | null | undefined): Cents {
  return { ars: toCents(ars), usd: toCents(usd) };
}

function addMoney(left: Cents, right: Cents): Cents {
  return { ars: left.ars + right.ars, usd: left.usd + right.usd };
}

function subtractMoney(left: Cents, right: Cents): Cents {
  return { ars: left.ars - right.ars, usd: left.usd - right.usd };
}

function isZero(value: Cents): boolean {
  return value.ars === 0n && value.usd === 0n;
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function statementDescription(row: PersistedStatementPaymentRow): string {
  return row.referenceRaw?.trim() || row.originalText.replace(/\s+/g, " ").trim() || "Movimiento de tarjeta";
}

function buildStatementMovement(
  row: PersistedStatementPaymentRow,
  statementMonthKey: string,
): CardPaymentMovement | null {
  const money = moneyFromRaw(row.amountPesosRaw, row.amountDollarsRaw);
  if (isZero(money)) return null;

  const sequence = resolveInstallmentSequence(
    row.installmentRaw,
    row.referenceRaw,
    row.originalText,
  );

  return {
    id: row.id,
    sourceType: "statement_row",
    description: statementDescription(row),
    dateIso: row.dateIso,
    cells: [
      {
        monthKey: statementMonthKey,
        status: "confirmed",
        installmentNumber: sequence?.current ?? null,
        installmentTotal: sequence?.total ?? null,
        ars: fromCents(money.ars),
        usd: fromCents(money.usd),
      },
    ],
  };
}

function currentStatementTotal(movements: CardPaymentMovement[], monthKey: string): Cents {
  let result: Cents = { ars: 0n, usd: 0n };
  for (const movement of movements) {
    if (movement.sourceType !== "statement_row") continue;
    const cell = movement.cells.find((item) => item.monthKey === monthKey);
    if (!cell) continue;
    result = addMoney(result, moneyFromRaw(cell.ars, cell.usd));
  }
  return result;
}

function buildReconciliationMovement(
  statementId: string,
  monthKey: string,
  difference: Cents,
): CardPaymentMovement | null {
  if (isZero(difference)) return null;
  return {
    id: `reconciliation:${statementId}:${monthKey}`,
    sourceType: "reconciliation",
    description: "Otros cargos y ajustes del resumen",
    dateIso: null,
    cells: [
      {
        monthKey,
        status: "confirmed",
        installmentNumber: null,
        installmentTotal: null,
        ars: fromCents(difference.ars),
        usd: fromCents(difference.usd),
      },
    ],
  };
}

export function normalizeAcceptedStatementAccount(
  response: CardPaymentsResponse,
  input: {
    rows: PersistedStatementPaymentRow[];
    groups: PersistedStatementPaymentGroup[];
  },
): CardPaymentsResponse {
  const baseline = response.baseline;
  if (!baseline) return response;

  const statementMovements = input.rows
    .filter((row) => DETAIL_ROW_TYPES.has(row.rowType.toLocaleLowerCase("es")))
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((row) => buildStatementMovement(row, baseline.periodKey))
    .filter((movement): movement is CardPaymentMovement => movement !== null);

  if (statementMovements.length === 0) return response;

  const manualMovementsById = new Map<string, CardPaymentMovement>();
  for (const card of response.cards) {
    for (const movement of card.movements) {
      if (movement.sourceType === "manual_purchase") {
        manualMovementsById.set(movement.id, movement);
      }
    }
  }

  const last4Values = uniqueNonEmpty(input.groups.map((group) => group.cardLast4));
  const holderValues = uniqueNonEmpty(input.groups.map((group) => group.holderName));
  const cardLabel = [baseline.brand, baseline.bankName].filter(Boolean).join(" · ") || "Tarjeta";

  const baselineTotal = moneyFromRaw(baseline.total.ars, baseline.total.usd);
  const detailedTotal = currentStatementTotal(statementMovements, baseline.periodKey);
  const reconciliation = buildReconciliationMovement(
    baseline.statementId,
    baseline.periodKey,
    subtractMoney(baselineTotal, detailedTotal),
  );

  const movements = [
    ...statementMovements,
    ...(reconciliation ? [reconciliation] : []),
    ...manualMovementsById.values(),
  ];

  movements.sort((left, right) => {
    if (left.sourceType === "reconciliation" && right.sourceType !== "reconciliation") return 1;
    if (right.sourceType === "reconciliation" && left.sourceType !== "reconciliation") return -1;
    const leftDate = left.dateIso ?? "9999-99-99";
    const rightDate = right.dateIso ?? "9999-99-99";
    return leftDate.localeCompare(rightDate) || left.description.localeCompare(right.description, "es");
  });

  const unifiedCard: CardPaymentCard = {
    cardId: `statement:${baseline.statementId}`,
    cardLabel,
    cardLast4: last4Values.length === 1 ? last4Values[0] : null,
    holderName: holderValues.length === 1 ? holderValues[0] : null,
    movements,
    totalsByMonth: [],
  };

  return {
    ...response,
    cards: [unifiedCard],
    warnings: [
      ...response.warnings,
      ...(last4Values.length > 1
        ? [`CajaApp consolidó ${last4Values.length} plásticos del mismo resumen en una única cuenta ${cardLabel}.`]
        : []),
    ],
  };
}
