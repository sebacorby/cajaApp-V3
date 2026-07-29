import { prisma } from "../../db/prisma.js";
import type { CardPaymentsResponse } from "./card-payments.service.js";
import { normalizeAcceptedStatementAccount } from "./card-payments-statement-normalizer.js";
import { presentCardPayments as presentCardPaymentsBase } from "./card-payments-presentation.base.js";

export * from "./card-payments-presentation.base.js";

export async function presentCardPayments(input: CardPaymentsResponse) {
  if (!input.baseline) return presentCardPaymentsBase(input);

  const statement = await prisma.cardStatement.findUnique({
    where: { id: input.baseline.statementId },
    select: {
      groups: {
        select: {
          cardLast4: true,
          holderName: true,
        },
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

  if (!statement) return presentCardPaymentsBase(input);

  const normalized = normalizeAcceptedStatementAccount(input, statement);
  return presentCardPaymentsBase(normalized);
}
