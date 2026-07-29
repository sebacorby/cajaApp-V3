import { prisma } from "../../db/prisma.js";
import { cardsService } from "./cards.service.js";
import type { CardPaymentsResponse } from "./card-payments.service.js";
import { normalizeAcceptedStatementAccount } from "./card-payments-statement-normalizer.js";
import { applyDynamicTaxProjection } from "./card-payments-tax-engine.js";
import { presentCardPayments as presentCardPaymentsBase } from "./card-payments-presentation.base.js";

export * from "./card-payments-presentation.base.js";

export async function presentCardPayments(input: CardPaymentsResponse) {
  if (!input.baseline) {
    const exchangeRate = await cardsService.getExchangeRate();
    return Object.assign(await presentCardPaymentsBase(input), { exchangeRate });
  }

  const statement = await prisma.cardStatement.findUnique({
    where: { id: input.baseline.statementId },
    select: {
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

  const exchangeRate = await cardsService.getExchangeRate();
  if (!statement) return Object.assign(await presentCardPaymentsBase(input), { exchangeRate });

  const normalized = normalizeAcceptedStatementAccount(input, statement);
  const presented = await presentCardPaymentsBase(normalized);
  return applyDynamicTaxProjection(presented, statement.rows, exchangeRate);
}
