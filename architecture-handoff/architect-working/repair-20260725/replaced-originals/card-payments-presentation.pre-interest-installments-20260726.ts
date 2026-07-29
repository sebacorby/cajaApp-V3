import { prisma } from "../../db/prisma.js";
import type {
  CardPaymentCard,
  CardPaymentCell,
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
  const whole = absolute / 100n;
  const fraction = String(absolute % 100n).padStart(2, "0");
  return `${sign}${whole}.${fraction}`;
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

function cleanDescription(value: string | null | undefined): string {
  let text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "Movimiento de tarjeta";

  text = text
    .replace(
      /^\d{1,2}(?:[-/]\d{1,2}[-/]\d{2,4}|[-/][A-Za-zÁÉÍÓÚáéíóú]{3,9}[-/]\d{2,4})\s+/,
      "",
    )
    .replace(
      /\s+(?:ARS\s*|USD\s*|U\$S\s*|\$\s*)?-?\d{1,3}(?:\.\d{3})*,\d{2}\s*$/i,
      "",
    )
    .replace(
      /\s+(?:ARS\s*|USD\s*|U\$S\s*|\$\s*)?-?\d+(?:\.\d{2})\s*$/i,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();

  return text || "Movimiento de tarjeta";
}

function parseInstallment(value: string | null | undefined): {
  current: number | null;
  total: number | null;
} {
  if (!value) return { current: null, total: null };
  const match = value.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return { current: null, total: null };
  return {
    current: Number.parseInt(match[1], 10),
    total: Number.parseInt(match[2], 10),
  };
}

function inRange(monthKey: string, response: CardPaymentsResponse): boolean {
  return monthKey >= response.range.from && monthKey <= response.range.to;
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

function cardTotal(card: CardPaymentCard, monthKey: string): Cents {
  const entry = card.totalsByMonth.find((item) => item.monthKey === monthKey);
  return entry ? moneyToCents(entry.totals) : { ars: 0n, usd: 0n };
}

function upsertCardTotal(
  card: PresentedCardPaymentsResponse["cards"][number],
  monthKey: string,
  totals: Cents,
  detail?: CardPaymentAdjustmentDetail,
): void {
  let entry = card.totalsByMonth.find((item) => item.monthKey === monthKey);
  if (!entry) {
    entry = { monthKey, totals: centsToMoney(totals) };
    card.totalsByMonth.push(entry);
  } else {
    entry.totals = centsToMoney(totals);
  }
  if (detail) entry.adjustmentDetail = detail;
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
      total = add(total, cardTotal(card, month.monthKey));
    }
    month.totals = centsToMoney(total);
  }
}

async function rebuildMatrixIfNeeded(
  response: PresentedCardPaymentsResponse,
): Promise<void> {
  if (!response.baseline) return;
  if (response.cards.some((card) => card.movements.length > 0)) return;

  const statement = await prisma.cardStatement.findUnique({
    where: { id: response.baseline.statementId },
    include: {
      groups: { orderBy: { displayOrder: "asc" } },
      rows: { orderBy: { displayOrder: "asc" } },
      projections: { orderBy: [{ monthKey: "asc" }, { id: "asc" }] },
    },
  });

  if (!statement) return;

  const groupsByKey = new Map(statement.groups.map((group) => [group.groupKey, group]));
  const groupsById = new Map(statement.groups.map((group) => [group.id, group]));
  const projectionsByRow = new Map<string, typeof statement.projections>();

  for (const projection of statement.projections) {
    const list = projectionsByRow.get(projection.rowId) ?? [];
    list.push(projection);
    projectionsByRow.set(projection.rowId, list);
  }

  const cards = new Map<string, PresentedCardPaymentsResponse["cards"][number]>();

  const ensureCard = (rowGroupKey: string | null) => {
    let group = rowGroupKey ? groupsByKey.get(rowGroupKey) : undefined;
    if (!group && rowGroupKey) group = groupsById.get(rowGroupKey);
    if (!group && statement.groups.length === 1) group = statement.groups[0];

    const cardId = group?.id ?? `statement:${statement.id}`;
    let card = cards.get(cardId);
    if (!card) {
      card = {
        cardId,
        cardLabel:
          group?.label || response.baseline?.brand || response.baseline?.bankName || "Tarjeta",
        cardLast4: group?.cardLast4 ?? null,
        holderName: group?.holderName ?? null,
        movements: [],
        totalsByMonth: [],
      };
      cards.set(cardId, card);
    }
    return card;
  };

  for (const row of statement.rows) {
    const projections = projectionsByRow.get(row.id) ?? [];
    if (projections.length === 0) continue;

    const installment = parseInstallment(row.installmentRaw);
    const firstProjection = projections[0];
    const currentArs = toCents(row.amountPesosRaw ?? firstProjection?.amountPesosRaw ?? "0");
    const currentUsd = toCents(row.amountDollarsRaw ?? firstProjection?.amountDollarsRaw ?? "0");
    const cells: CardPaymentCell[] = [];

    if (inRange(response.baseline.periodKey, response) && (currentArs !== 0n || currentUsd !== 0n)) {
      cells.push({
        monthKey: response.baseline.periodKey,
        status: "confirmed",
        installmentNumber: installment.current,
        installmentTotal: installment.total,
        ars: fromCents(currentArs),
        usd: fromCents(currentUsd),
      });
    }

    for (const projection of projections) {
      if (!inRange(projection.monthKey, response)) continue;
      cells.push({
        monthKey: projection.monthKey,
        status: "projected",
        installmentNumber: projection.installmentCurrent,
        installmentTotal: projection.installmentTotal,
        ars: fromCents(toCents(projection.amountPesosRaw)),
        usd: fromCents(toCents(projection.amountDollarsRaw)),
      });
    }

    if (cells.length === 0) continue;

    ensureCard(row.groupKey).movements.push({
      id: row.id,
      sourceType: "statement_row",
      description: cleanDescription(row.referenceRaw || row.originalText),
      dateIso: row.dateIso,
      cells,
    });
  }

  for (const card of cards.values()) {
    card.movements.sort((left, right) => {
      const leftDate = left.dateIso ?? "9999-99-99";
      const rightDate = right.dateIso ?? "9999-99-99";
      return leftDate.localeCompare(rightDate) || left.description.localeCompare(right.description);
    });
  }

  response.cards = [...cards.values()];
  recalculateTotals(response);
}

function chooseAdjustmentCard(
  response: PresentedCardPaymentsResponse,
  monthKey: string,
): PresentedCardPaymentsResponse["cards"][number] | null {
  if (response.cards.length === 0) return null;
  if (response.cards.length === 1) return response.cards[0];

  return [...response.cards].sort((left, right) => {
    const leftTotal = cardTotal(left, monthKey);
    const rightTotal = cardTotal(right, monthKey);
    const leftAbs =
      (leftTotal.ars < 0n ? -leftTotal.ars : leftTotal.ars) +
      (leftTotal.usd < 0n ? -leftTotal.usd : leftTotal.usd);
    const rightAbs =
      (rightTotal.ars < 0n ? -rightTotal.ars : rightTotal.ars) +
      (rightTotal.usd < 0n ? -rightTotal.usd : rightTotal.usd);
    return rightAbs > leftAbs ? 1 : rightAbs < leftAbs ? -1 : 0;
  })[0];
}

function applyAdjustment(
  response: PresentedCardPaymentsResponse,
  input: {
    monthKey: string;
    desiredTotal: Cents;
    kind: CardPaymentAdjustmentKind;
    sourceLabel: string;
    message: string;
  },
): CardPaymentAdjustmentDetail | null {
  const month = response.months.find((item) => item.monthKey === input.monthKey);
  if (!month) return null;

  const original = moneyToCents(month.totals);
  const adjustment = subtract(input.desiredTotal, original);
  if (isZero(adjustment)) return null;

  const detail: CardPaymentAdjustmentDetail = {
    kind: input.kind,
    monthKey: input.monthKey,
    sourceLabel: input.sourceLabel,
    original: centsToMoney(original),
    adjusted: centsToMoney(input.desiredTotal),
    adjustment: centsToMoney(adjustment),
    message: input.message,
  };

  month.totals = detail.adjusted;
  month.adjustmentDetail = detail;

  const card = chooseAdjustmentCard(response, input.monthKey);
  if (card) {
    const currentCardTotal = cardTotal(card, input.monthKey);
    upsertCardTotal(card, input.monthKey, add(currentCardTotal, adjustment), detail);
  }

  return detail;
}

export async function presentCardPayments(
  input: CardPaymentsResponse,
): Promise<PresentedCardPaymentsResponse> {
  const response = input as PresentedCardPaymentsResponse;
  response.autoReconciliation = { adjusted: false, adjustments: [] };

  await rebuildMatrixIfNeeded(response);

  if (!response.baseline) return response;

  const currentMonth = response.months.find(
    (month) => month.monthKey === response.baseline?.periodKey,
  );

  if (currentMonth) {
    const confirmedDetail = applyAdjustment(response, {
      monthKey: currentMonth.monthKey,
      desiredTotal: moneyToCents(response.baseline.total),
      kind: "confirmed_statement_total",
      sourceLabel: "Resumen aceptado",
      message:
        "El total del mes fue confirmado por el resumen aceptado. La diferencia corresponde a conceptos del resumen que no se proyectan como cuotas individuales.",
    });
    if (confirmedDetail) response.autoReconciliation.adjustments.push(confirmedDetail);
  }

  for (const validation of response.issuerValidation.items) {
    const monthKey = validation.targetPaymentMonthKey;
    if (!monthKey) continue;
    const month = response.months.find((item) => item.monthKey === monthKey);
    if (!month) continue;

    let extras: Cents = { ars: 0n, usd: 0n };
    for (const card of response.cards) {
      extras = add(
        extras,
        sumMovementCells(
          card.movements,
          monthKey,
          (movement) => movement.sourceType !== "statement_row",
        ),
      );
    }

    const desired = add(moneyToCents(validation.issuerAmount), extras);
    const detail = applyAdjustment(response, {
      monthKey,
      desiredTotal: desired,
      kind: "issuer_reference_adjustment",
      sourceLabel: validation.issuerPeriodLabel,
      message:
        "CajaApp ajustó automáticamente la base de cuotas de este mes usando la referencia futura informada por el emisor. Las compras registradas después del resumen se suman por separado.",
    });

    if (detail) response.autoReconciliation.adjustments.push(detail);

    validation.calculatedInstallments = validation.issuerAmount;
    validation.difference = { ars: "0.00", usd: "0.00" };
    validation.status = "matched";
  }

  response.autoReconciliation.adjusted = response.autoReconciliation.adjustments.length > 0;
  return response;
}
