import { prisma } from "../../db/prisma.js";
import {
  centsToString,
  parseArgentinePesos,
  parseDollars,
} from "../../shared/money.js";
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
    // Legacy versioning could populate archivedAt on a superseded statement even
    // though it still belongs to the accepted statement history. Manual archive
    // changes the status to "archived", so status is the authoritative read gate
    // here. Canonical summary/account selection below still removes true duplicates.
    where: {
      status: { in: ["accepted", "superseded"] },
    },
    orderBy: [{ periodKey: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      periodKey: true,
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

  const currentStatements = selectCurrentStatementsForPayments(statements);
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

  return Object.assign(merged, {
    exchangeRate,
    autoReconciliation: {
      adjusted: anyRepaired,
      adjustments: [],
    },
  });
}
