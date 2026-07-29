import { prisma } from "../../db/prisma.js";
import {
  centsToString,
  parseArgentinePesos,
  parseDollars,
} from "../../shared/money.js";
import {
  listIssuerFutureReferences,
  type StoredIssuerFutureReference,
} from "./issuer-future-reference-query.js";

export type CardPaymentStatus = "confirmed" | "projected";
export type CardPaymentCurrency = "ARS" | "USD";

export interface CardPaymentMoney {
  ars: string;
  usd: string;
}

export interface CardPaymentCell extends CardPaymentMoney {
  monthKey: string;
  status: CardPaymentStatus;
  installmentNumber: number | null;
  installmentTotal: number | null;
}

export interface CardPaymentMovement {
  id: string;
  sourceType: "statement_row" | "manual_purchase" | "reconciliation";
  description: string;
  dateIso: string | null;
  cells: CardPaymentCell[];
}

export interface CardPaymentCard {
  cardId: string;
  cardLabel: string;
  cardLast4: string | null;
  holderName: string | null;
  movements: CardPaymentMovement[];
  totalsByMonth: Array<{ monthKey: string; totals: CardPaymentMoney }>;
}

export type IssuerValidationStatus =
  | "matched"
  | "mismatch"
  | "ambiguous_mapping";

export interface IssuerProjectionValidation {
  referenceId: string;
  issuerPeriodLabel: string;
  issuerPeriodKey: string | null;
  targetPaymentMonthKey: string | null;
  periodBasis: string;
  issuerAmount: CardPaymentMoney;
  calculatedInstallments: CardPaymentMoney;
  difference: CardPaymentMoney;
  status: IssuerValidationStatus;
}

export interface CardPaymentsResponse {
  baseline: null | {
    statementId: string;
    periodKey: string;
    bankName: string | null;
    brand: string | null;
    fileName: string;
    currentDueDate: string | null;
    nextClosingDate: string | null;
    nextDueDate: string | null;
    total: CardPaymentMoney;
    acceptedAt: string;
  };
  range: {
    from: string;
    to: string;
    months: number;
  };
  months: Array<{
    monthKey: string;
    label: string;
    status: CardPaymentStatus;
    totals: CardPaymentMoney;
  }>;
  cards: CardPaymentCard[];
  issuerValidation: {
    available: boolean;
    items: IssuerProjectionValidation[];
  };
  warnings: string[];
}

type MoneyCents = { ars: bigint; usd: bigint };

type PaymentCellBuilder = {
  monthKey: string;
  status: CardPaymentStatus;
  installmentNumber: number | null;
  installmentTotal: number | null;
  money: MoneyCents;
};

type MovementBuilder = {
  id: string;
  sourceType: CardPaymentMovement["sourceType"];
  description: string;
  dateIso: string | null;
  cells: Map<string, PaymentCellBuilder>;
};

type CardBuilder = {
  cardId: string;
  cardLabel: string;
  cardLast4: string | null;
  holderName: string | null;
  movements: Map<string, MovementBuilder>;
};

type LoadedGroup = {
  id: string;
  groupKey: string;
  label: string;
  cardLast4: string | null;
  holderName: string | null;
  totalPesosRaw: string | null;
  totalDollarsRaw: string | null;
};

type LoadedRow = {
  id: string;
  groupKey: string | null;
  rowType: string;
  dateIso: string | null;
  installmentRaw: string | null;
  referenceRaw: string | null;
  originalText: string;
  amountPesosRaw: string | null;
  amountDollarsRaw: string | null;
  currencyOriginal: string | null;
};

type LoadedProjection = {
  id: string;
  rowId: string;
  monthKey: string;
  label: string;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  amountPesosRaw: string | null;
  amountDollarsRaw: string | null;
  currencyOriginal: string | null;
  isManual: boolean;
};

type LoadedManualPurchase = {
  id: string;
  cardLast4: string;
  holderName: string;
  purchaseDate: string;
  description: string;
  currency: string;
  amountRaw: string;
  installments: number;
};

function emptyMoney(): MoneyCents {
  return { ars: 0n, usd: 0n };
}

function cloneMoney(value: MoneyCents): MoneyCents {
  return { ars: value.ars, usd: value.usd };
}

function subtractMoney(left: MoneyCents, right: MoneyCents): MoneyCents {
  return { ars: left.ars - right.ars, usd: left.usd - right.usd };
}

function moneyEqualsZero(value: MoneyCents): boolean {
  return value.ars === 0n && value.usd === 0n;
}

function moneyToApi(value: MoneyCents): CardPaymentMoney {
  return {
    ars: centsToString(value.ars, "ARS"),
    usd: centsToString(value.usd, "USD"),
  };
}

function safeParse(
  value: string | null | undefined,
  currency: CardPaymentCurrency,
): bigint {
  if (!value?.trim()) return 0n;
  try {
    return currency === "ARS"
      ? parseArgentinePesos(value)
      : parseDollars(value);
  } catch {
    return 0n;
  }
}

function moneyFromRaw(
  pesos: string | null | undefined,
  dollars: string | null | undefined,
): MoneyCents {
  return {
    ars: safeParse(pesos, "ARS"),
    usd: safeParse(dollars, "USD"),
  };
}

function addMoney(target: MoneyCents, value: MoneyCents): void {
  target.ars += value.ars;
  target.usd += value.usd;
}

function monthKeyWithOffset(monthKey: string, offset: number): string {
  const [yearText, monthText] = monthKey.split("-");
  const absolute = Number(yearText) * 12 + Number(monthText) - 1 + offset;
  return `${Math.floor(absolute / 12)}-${String((absolute % 12) + 1).padStart(2, "0")}`;
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  const text = new Intl.DateTimeFormat("es-AR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1).replace(".", "");
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
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

function inRange(monthKey: string, from: string, months: number): boolean {
  const to = monthKeyWithOffset(from, months - 1);
  return monthKey >= from && monthKey <= to;
}

function ensureCard(
  cards: Map<string, CardBuilder>,
  input: {
    id: string;
    label: string;
    last4?: string | null;
    holderName?: string | null;
  },
): CardBuilder {
  let card = cards.get(input.id);
  if (!card) {
    card = {
      cardId: input.id,
      cardLabel: input.label,
      cardLast4: input.last4 ?? null,
      holderName: input.holderName ?? null,
      movements: new Map(),
    };
    cards.set(input.id, card);
  }
  return card;
}

function ensureMovement(
  card: CardBuilder,
  input: {
    id: string;
    sourceType: CardPaymentMovement["sourceType"];
    description: string;
    dateIso: string | null;
  },
): MovementBuilder {
  let movement = card.movements.get(input.id);
  if (!movement) {
    movement = {
      ...input,
      cells: new Map(),
    };
    card.movements.set(input.id, movement);
  }
  return movement;
}

function addCell(
  movement: MovementBuilder,
  input: {
    monthKey: string;
    status: CardPaymentStatus;
    installmentNumber: number | null;
    installmentTotal: number | null;
    money: MoneyCents;
  },
): void {
  let cell = movement.cells.get(input.monthKey);
  if (!cell) {
    cell = {
      monthKey: input.monthKey,
      status: input.status,
      installmentNumber: input.installmentNumber,
      installmentTotal: input.installmentTotal,
      money: emptyMoney(),
    };
    movement.cells.set(input.monthKey, cell);
  }
  addMoney(cell.money, input.money);
  if (input.status === "confirmed") cell.status = "confirmed";
  if (cell.installmentNumber === null) cell.installmentNumber = input.installmentNumber;
  if (cell.installmentTotal === null) cell.installmentTotal = input.installmentTotal;
}

function movementMoneyForMonth(card: CardBuilder, monthKey: string): MoneyCents {
  const total = emptyMoney();
  for (const movement of card.movements.values()) {
    const cell = movement.cells.get(monthKey);
    if (cell) addMoney(total, cell.money);
  }
  return total;
}

function addReconciliationMovement(
  card: CardBuilder,
  monthKey: string,
  difference: MoneyCents,
): void {
  if (moneyEqualsZero(difference)) return;
  const movement = ensureMovement(card, {
    id: `reconciliation:${card.cardId}:${monthKey}`,
    sourceType: "reconciliation",
    description: "Otros cargos y ajustes del resumen",
    dateIso: null,
  });
  addCell(movement, {
    monthKey,
    status: "confirmed",
    installmentNumber: null,
    installmentTotal: null,
    money: difference,
  });
}

function referenceMoney(reference: StoredIssuerFutureReference): MoneyCents {
  return moneyFromRaw(reference.amountPesosRaw, reference.amountDollarsRaw);
}

function isReferenceMatch(reference: MoneyCents, calculated: MoneyCents): boolean {
  const arsMatches = reference.ars === 0n || reference.ars === calculated.ars;
  const usdMatches = reference.usd === 0n || reference.usd === calculated.usd;
  return arsMatches && usdMatches;
}

export class CardPaymentsService {
  async getPayments(input: { months?: number } = {}): Promise<CardPaymentsResponse> {
    const months = Math.min(Math.max(Math.trunc(input.months ?? 6), 1), 24);

    const statement = await prisma.cardStatement.findFirst({
      where: { status: "accepted", isActiveForPeriod: true },
      orderBy: [{ periodKey: "desc" }, { createdAt: "desc" }],
      include: {
        document: { select: { fileName: true } },
        groups: { orderBy: { displayOrder: "asc" } },
        rows: { orderBy: { displayOrder: "asc" } },
        projections: { orderBy: [{ monthKey: "asc" }, { id: "asc" }] },
        manualPurchases: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!statement) {
      const from = currentMonthKey();
      return {
        baseline: null,
        range: {
          from,
          to: monthKeyWithOffset(from, months - 1),
          months,
        },
        months: Array.from({ length: months }, (_, index) => {
          const monthKey = monthKeyWithOffset(from, index);
          return {
            monthKey,
            label: monthLabel(monthKey),
            status: index === 0 ? "confirmed" : "projected",
            totals: moneyToApi(emptyMoney()),
          };
        }),
        cards: [],
        issuerValidation: { available: false, items: [] },
        warnings: [],
      };
    }

    const currentPeriodKey =
      statement.periodKey ?? statement.currentDueDate?.slice(0, 7) ?? currentMonthKey();
    const rangeTo = monthKeyWithOffset(currentPeriodKey, months - 1);
    const groups = statement.groups as LoadedGroup[];
    const rows = statement.rows as LoadedRow[];
    const projections = statement.projections as LoadedProjection[];
    const manualPurchases = statement.manualPurchases as LoadedManualPurchase[];
    const groupByKey = new Map(groups.map((group) => [group.groupKey, group]));
    const rowById = new Map(rows.map((row) => [row.id, row]));
    const manualById = new Map(manualPurchases.map((purchase) => [purchase.id, purchase]));
    const soleGroup = groups.length === 1 ? groups[0] : null;
    const cards = new Map<string, CardBuilder>();

    const cardFromGroup = (group: LoadedGroup | null | undefined): CardBuilder => {
      if (group) {
        return ensureCard(cards, {
          id: group.id,
          label: group.label || statement.brand || statement.bankName || "Tarjeta",
          last4: group.cardLast4,
          holderName: group.holderName,
        });
      }
      return ensureCard(cards, {
        id: `statement:${statement.id}:summary`,
        label: statement.brand || statement.bankName || "Resumen de tarjeta",
        holderName: statement.holderName,
      });
    };

    const confirmedRowTypes = new Set(["transaction", "tax", "charge"]);
    for (const row of rows) {
      if (!confirmedRowTypes.has(row.rowType)) continue;
      const amount = moneyFromRaw(row.amountPesosRaw, row.amountDollarsRaw);
      if (moneyEqualsZero(amount)) continue;

      const group = row.groupKey ? groupByKey.get(row.groupKey) : soleGroup;
      const card = cardFromGroup(group);
      const installment = parseInstallment(row.installmentRaw);
      const movement = ensureMovement(card, {
        id: `row:${row.id}`,
        sourceType: "statement_row",
        description: cleanDescription(row.originalText || row.referenceRaw),
        dateIso: row.dateIso,
      });
      addCell(movement, {
        monthKey: currentPeriodKey,
        status: "confirmed",
        installmentNumber: installment.current,
        installmentTotal: installment.total,
        money: amount,
      });
    }

    const installmentBaseByMonth = new Map<string, MoneyCents>();

    for (const projection of projections) {
      if (!inRange(projection.monthKey, currentPeriodKey, months)) continue;

      const row = projection.isManual ? undefined : rowById.get(projection.rowId);
      const manual = projection.isManual ? manualById.get(projection.rowId) : undefined;
      let group: LoadedGroup | null | undefined = row?.groupKey
        ? groupByKey.get(row.groupKey)
        : null;

      if (!group && manual?.cardLast4) {
        group = groups.find((candidate) => candidate.cardLast4 === manual.cardLast4) ?? null;
      }
      if (!group && !projection.isManual) group = soleGroup;

      const card = group
        ? cardFromGroup(group)
        : manual
          ? ensureCard(cards, {
              id: `manual-card:${manual.cardLast4}:${manual.holderName}`,
              label: manual.cardLast4
                ? `Tarjeta •••• ${manual.cardLast4}`
                : "Tarjeta manual",
              last4: manual.cardLast4 || null,
              holderName: manual.holderName || null,
            })
          : cardFromGroup(null);

      const sourceId = projection.isManual
        ? `manual:${manual?.id ?? projection.rowId}`
        : `row:${row?.id ?? projection.rowId}`;
      const description = projection.isManual
        ? cleanDescription(manual?.description ?? projection.label)
        : cleanDescription(row?.originalText ?? row?.referenceRaw ?? projection.label);
      const movement = ensureMovement(card, {
        id: sourceId,
        sourceType: projection.isManual ? "manual_purchase" : "statement_row",
        description,
        dateIso: manual?.purchaseDate ?? row?.dateIso ?? null,
      });
      const amount = moneyFromRaw(
        projection.amountPesosRaw ?? row?.amountPesosRaw,
        projection.amountDollarsRaw ?? row?.amountDollarsRaw,
      );
      if (moneyEqualsZero(amount)) continue;

      addCell(movement, {
        monthKey: projection.monthKey,
        status: projection.monthKey === currentPeriodKey ? "confirmed" : "projected",
        installmentNumber: projection.installmentCurrent,
        installmentTotal: projection.installmentTotal,
        money: amount,
      });

      if (!projection.isManual) {
        let bucket = installmentBaseByMonth.get(projection.monthKey);
        if (!bucket) {
          bucket = emptyMoney();
          installmentBaseByMonth.set(projection.monthKey, bucket);
        }
        addMoney(bucket, amount);
      }
    }

    for (const group of groups) {
      const target = moneyFromRaw(group.totalPesosRaw, group.totalDollarsRaw);
      if (moneyEqualsZero(target)) continue;
      const card = cardFromGroup(group);
      const current = movementMoneyForMonth(card, currentPeriodKey);
      addReconciliationMovement(card, currentPeriodKey, subtractMoney(target, current));
    }

    const statementTarget = moneyFromRaw(
      statement.totalPesosRaw,
      statement.totalDollarsRaw,
    );
    const globalCurrent = emptyMoney();
    for (const card of cards.values()) {
      addMoney(globalCurrent, movementMoneyForMonth(card, currentPeriodKey));
    }
    const globalDifference = subtractMoney(statementTarget, globalCurrent);
    if (!moneyEqualsZero(globalDifference)) {
      const reconciliationCard =
        groups.length === 1
          ? cardFromGroup(groups[0])
          : cardFromGroup(null);
      addReconciliationMovement(
        reconciliationCard,
        currentPeriodKey,
        globalDifference,
      );
    }

    const cardResponses: CardPaymentCard[] = Array.from(cards.values())
      .map((card) => {
        const movements = Array.from(card.movements.values())
          .map<CardPaymentMovement>((movement) => ({
            id: movement.id,
            sourceType: movement.sourceType,
            description: movement.description,
            dateIso: movement.dateIso,
            cells: Array.from(movement.cells.values())
              .sort((left, right) => left.monthKey.localeCompare(right.monthKey))
              .map((cell) => ({
                monthKey: cell.monthKey,
                status: cell.status,
                installmentNumber: cell.installmentNumber,
                installmentTotal: cell.installmentTotal,
                ...moneyToApi(cell.money),
              })),
          }))
          .sort((left, right) => {
            const leftDate = left.dateIso ?? "9999-99-99";
            const rightDate = right.dateIso ?? "9999-99-99";
            return (
              leftDate.localeCompare(rightDate) ||
              left.description.localeCompare(right.description, "es")
            );
          });

        const totalsByMonth = Array.from({ length: months }, (_, index) => {
          const monthKey = monthKeyWithOffset(currentPeriodKey, index);
          return {
            monthKey,
            totals: moneyToApi(movementMoneyForMonth(card, monthKey)),
          };
        });

        return {
          cardId: card.cardId,
          cardLabel: card.cardLabel,
          cardLast4: card.cardLast4,
          holderName: card.holderName,
          movements,
          totalsByMonth,
        };
      })
      .filter((card) => card.movements.length > 0)
      .sort((left, right) => left.cardLabel.localeCompare(right.cardLabel, "es"));

    const monthResponses = Array.from({ length: months }, (_, index) => {
      const monthKey = monthKeyWithOffset(currentPeriodKey, index);
      const totals = emptyMoney();
      for (const card of cards.values()) {
        addMoney(totals, movementMoneyForMonth(card, monthKey));
      }
      return {
        monthKey,
        label: monthLabel(monthKey),
        status: (index === 0 ? "confirmed" : "projected") as CardPaymentStatus,
        totals: moneyToApi(totals),
      };
    });

    const references = await listIssuerFutureReferences(statement.id);
    const validationItems: IssuerProjectionValidation[] = references.map((reference) => {
      const issuerAmount = referenceMoney(reference);
      const calculated = reference.targetPaymentMonthKey
        ? cloneMoney(
            installmentBaseByMonth.get(reference.targetPaymentMonthKey) ?? emptyMoney(),
          )
        : emptyMoney();
      const difference = subtractMoney(calculated, issuerAmount);
      return {
        referenceId: reference.id,
        issuerPeriodLabel: reference.periodLabelRaw,
        issuerPeriodKey: reference.issuerPeriodKey,
        targetPaymentMonthKey: reference.targetPaymentMonthKey,
        periodBasis: reference.periodBasis,
        issuerAmount: moneyToApi(issuerAmount),
        calculatedInstallments: moneyToApi(calculated),
        difference: moneyToApi(difference),
        status: !reference.targetPaymentMonthKey
          ? "ambiguous_mapping"
          : isReferenceMatch(issuerAmount, calculated)
            ? "matched"
            : "mismatch",
      };
    });

    return {
      baseline: {
        statementId: statement.id,
        periodKey: currentPeriodKey,
        bankName: statement.bankName,
        brand: statement.brand,
        fileName: statement.document.fileName,
        currentDueDate: statement.currentDueDate,
        nextClosingDate: statement.nextClosingDate,
        nextDueDate: statement.nextDueDate,
        total: moneyToApi(statementTarget),
        acceptedAt: statement.createdAt.toISOString(),
      },
      range: {
        from: currentPeriodKey,
        to: rangeTo,
        months,
      },
      months: monthResponses,
      cards: cardResponses,
      issuerValidation: {
        available: references.length > 0,
        items: validationItems,
      },
      warnings: [],
    };
  }
}

export const cardPaymentsService = new CardPaymentsService();
