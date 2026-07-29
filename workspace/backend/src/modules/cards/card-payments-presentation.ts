import { prisma } from "../../db/prisma.js";
import {
  centsToString,
  parseArgentinePesos,
  parseDollars,
} from "../../shared/money.js";
import { logger } from "../../shared/logger.js";
import { cardsService } from "./cards.service.js";
import type {
  CardPaymentMoney,
  CardPaymentsResponse,
} from "./card-payments.service.js";
import {
  cardIdentityDisplaySuffix,
  mergePresentedCards,
  selectCurrentStatementsForPayments,
} from "./card-payments-multicard.js";
import { normalizeAcceptedStatementAccount } from "./card-payments-statement-normalizer.js";
import { applyDynamicTaxProjection } from "./card-payments-tax-engine.js";
import { presentCardPayments as presentCardPaymentsBase } from "./card-payments-presentation.base.js";

export * from "./card-payments-presentation.base.js";

function safeMoney(
  pesos: string | null,
  dollars: string | null,
): CardPaymentMoney {
  let ars = 0n;
  let usd = 0n;
  try {
    if (pesos?.trim()) ars = parseArgentinePesos(pesos);
  } catch {
    ars = 0n;
  }
  try {
    if (dollars?.trim()) usd = parseDollars(dollars);
  } catch {
    usd = 0n;
  }
  return {
    ars: centsToString(ars, "ARS"),
    usd: centsToString(usd, "USD"),
  };
}

function emptyMonthlyResponse(
  input: CardPaymentsResponse,
): CardPaymentsResponse["months"] {
  return input.months.map((month) => ({
    ...month,
    totals: { ars: "0.00", usd: "0.00" },
  }));
}

function applyIdentityLabel(
  cards: CardPaymentsResponse["cards"],
  statement: Parameters<typeof cardIdentityDisplaySuffix>[0],
): void {
  const suffix = cardIdentityDisplaySuffix(statement);
  if (!suffix) return;
  for (const card of cards) {
    if (!card.cardLabel.includes(suffix)) {
      card.cardLabel = `${card.cardLabel} · ${suffix}`;
    }
  }
}

export async function presentCardPayments(input: CardPaymentsResponse) {
  const exchangeRate = await cardsService.getExchangeRate();

  const statements = await prisma.cardStatement.findMany({
    // Manual archive is the only state that must be excluded here. Historical
    // acceptance/versioning has used several non-archived statuses over time;
    // canonical selection below is responsible for removing true duplicates.
    where: {
      status: { not: "archived" },
    },
    orderBy: [{ periodKey: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      periodKey: true,
      historyKey: true,
      version: true,
      status: true,
      isActiveForPeriod: true,
      archivedAt: true,
      bankName: true,
      brand: true,
      accountNumber: true,
      holderName: true,
      statementNumber: true,
      totalPesosRaw: true,
      totalDollarsRaw: true,
      currentDueDate: true,
      nextClosingDate: true,
      nextDueDate: true,
      createdAt: true,
      document: { select: { fileName: true } },
      groups: {
        select: { cardLast4: true, holderName: true },
        orderBy: { displayOrder: "asc" },
      },
      rows: {
        select: {
          id: true,
          displayOrder: true,
          rowType: true,
          dateIso: true,
          installmentRaw: true,
          referenceRaw: true,
          originalText: true,
          amountPesosRaw: true,
          amountDollarsRaw: true,
          currencyOriginal: true,
        },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  logger.info(
    {
      event: "card-payments.multicard.loaded",
      count: statements.length,
      statements: statements.map((statement) => ({
        id: statement.id,
        status: statement.status,
        active: statement.isActiveForPeriod,
        archivedAt: statement.archivedAt?.toISOString() ?? null,
        historyKey: statement.historyKey,
        version: statement.version,
        periodKey: statement.periodKey,
        bankName: statement.bankName,
        brand: statement.brand,
        statementNumber: statement.statementNumber,
        accountNumber: statement.accountNumber,
        rows: statement.rows.length,
        groups: statement.groups.length,
      })),
    },
    "Card payments multicard candidates loaded",
  );

  const currentStatements = selectCurrentStatementsForPayments(statements);

  logger.info(
    {
      event: "card-payments.multicard.selected",
      count: currentStatements.length,
      statements: currentStatements.map((statement) => ({
        id: statement.id,
        periodKey: statement.periodKey,
        brand: statement.brand,
        statementNumber: statement.statementNumber,
        accountNumber: statement.accountNumber,
      })),
    },
    "Card payments multicard candidates selected",
  );

  if (currentStatements.length === 0) {
    return Object.assign(await presentCardPaymentsBase(input), { exchangeRate });
  }

  const cards = [] as CardPaymentsResponse["cards"];
  const warnings: string[] = [];
  let anyRepaired = false;
  let primaryBaseline: CardPaymentsResponse["baseline"] = null;

  for (const statement of currentStatements) {
    if (!statement.periodKey) {
      warnings.push(
        `El resumen ${statement.brand ?? "Tarjeta"} · ${statement.bankName ?? "Emisor"} no tiene período y no pudo incorporarse a Pagos de tarjeta.`,
      );
      continue;
    }

    const baseline: NonNullable<CardPaymentsResponse["baseline"]> = {
      statementId: statement.id,
      periodKey: statement.periodKey,
      bankName: statement.bankName,
      brand: statement.brand,
      fileName: statement.document.fileName,
      currentDueDate: statement.currentDueDate,
      nextClosingDate: statement.nextClosingDate,
      nextDueDate: statement.nextDueDate,
      total: safeMoney(statement.totalPesosRaw, statement.totalDollarsRaw),
      acceptedAt: statement.createdAt.toISOString(),
    };
    primaryBaseline ??= baseline;

    const carryLegacyCards =
      input.baseline?.statementId === statement.id ? input.cards : [];

    const statementInput: CardPaymentsResponse = {
      ...input,
      baseline,
      months: emptyMonthlyResponse(input),
      cards: carryLegacyCards,
      issuerValidation:
        input.baseline?.statementId === statement.id
          ? input.issuerValidation
          : { available: false, items: [] },
      warnings: [],
    };

    const normalized = normalizeAcceptedStatementAccount(statementInput, statement);
    const presented = await presentCardPaymentsBase(normalized);
    const withTaxes = applyDynamicTaxProjection(
      presented,
      statement.rows,
      exchangeRate,
    );

    applyIdentityLabel(withTaxes.cards, statement);

    logger.info(
      {
        event: "card-payments.multicard.statement-presented",
        statementId: statement.id,
        brand: statement.brand,
        accountNumber: statement.accountNumber,
        rows: statement.rows.length,
        normalizedCards: normalized.cards.length,
        presentedCards: withTaxes.cards.length,
        movements: withTaxes.cards.reduce(
          (total, card) => total + card.movements.length,
          0,
        ),
      },
      "Card payments statement presented",
    );

    cards.push(...withTaxes.cards);
    warnings.push(...withTaxes.warnings);
    anyRepaired =
      anyRepaired ||
      Boolean(
        (withTaxes as { autoReconciliation?: { adjusted?: boolean } })
          .autoReconciliation?.adjusted,
      );
  }

  const merged = mergePresentedCards(
    { ...input, baseline: primaryBaseline ?? input.baseline },
    cards,
    warnings,
  );

  logger.info(
    {
      event: "card-payments.multicard.final",
      cardCount: merged.cards.length,
      cards: merged.cards.map((card) => ({
        cardId: card.cardId,
        cardLabel: card.cardLabel,
        movements: card.movements.length,
      })),
    },
    "Card payments multicard response completed",
  );

  return Object.assign(merged, {
    exchangeRate,
    autoReconciliation: {
      adjusted: anyRepaired,
      adjustments: [],
    },
  });
}
