import { prisma } from "../../db/prisma.js";
import { ensureIssuerFutureReferenceStorage } from "./issuer-future-reference.js";

export interface StoredIssuerFutureReference {
  id: string;
  statementId: string;
  sourceRowId: string;
  displayOrder: number;
  sourceLabel: string | null;
  sourcePage: number | null;
  periodLabelRaw: string;
  issuerPeriodKey: string | null;
  targetPaymentMonthKey: string | null;
  periodBasis: string;
  amountPesosRaw: string | null;
  amountDollarsRaw: string | null;
  currencyOriginal: string;
  originalText: string;
  confidence: number | null;
  createdAt: Date;
}

export async function listIssuerFutureReferences(
  statementId: string,
): Promise<StoredIssuerFutureReference[]> {
  await ensureIssuerFutureReferenceStorage();

  return prisma.$queryRaw<StoredIssuerFutureReference[]>`
    SELECT
      "id",
      "statementId",
      "sourceRowId",
      "displayOrder",
      "sourceLabel",
      "sourcePage",
      "periodLabelRaw",
      "issuerPeriodKey",
      "targetPaymentMonthKey",
      "periodBasis",
      "amountPesosRaw",
      "amountDollarsRaw",
      "currencyOriginal",
      "originalText",
      "confidence",
      "createdAt"
    FROM "CardIssuerFutureReference"
    WHERE "statementId" = ${statementId}
    ORDER BY "displayOrder" ASC
  `;
}
