import { prisma } from "../../db/prisma.js";
import { NotFoundError } from "../../shared/errors.js";
import { CardStatementDeleteConflictError } from "./card-statement-delete.errors.js";
import type { AcceptResult, CardStatementPreview } from "./cards.types.js";
import { CardsService as BaseCardsService } from "./cards.service.base.js";
import {
  buildStatementSummaryKey,
  type CardStatementIdentityInput,
} from "./card-statement-identity.js";

export * from "./cards.service.base.js";

type PreviewWithAccountIdentity = CardStatementPreview & {
  source: CardStatementPreview["source"] & {
    accountNumber?: string | null;
  };
};

type RelatedStatement = CardStatementIdentityInput & {
  id: string;
  version: number;
  status: string;
  archivedAt: Date | null;
  createdAt: Date;
};

export type DeleteStatementResult = {
  success: true;
  deletedId: string;
  deletedStatementId: string;
  deletedDocumentId: string | null;
  promotedStatementId: string | null;
  historyKey: string | null;
};

function cleanAccountNumber(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function groupByCanonicalSummary(
  statements: RelatedStatement[],
): Map<string, RelatedStatement[]> {
  const groups = new Map<string, RelatedStatement[]>();
  for (const statement of statements) {
    const key = buildStatementSummaryKey(statement);
    const current = groups.get(key) ?? [];
    current.push(statement);
    groups.set(key, current);
  }
  return groups;
}

export class CardsService extends BaseCardsService {
  override async acceptDraft(
    draftId: string,
    preview: CardStatementPreview,
  ): Promise<AcceptResult> {
    const preExisting = await prisma.cardStatement.findMany({
      where: {
        archivedAt: null,
        status: { in: ["accepted", "superseded"] },
      },
      select: { id: true },
    });

    const result = await super.acceptDraft(draftId, preview);
    const enriched = preview as PreviewWithAccountIdentity;
    const accountNumber = cleanAccountNumber(enriched.source.accountNumber);
    const current = await prisma.cardStatement.findUnique({
      where: { id: result.statementId },
      select: {
        id: true,
        periodKey: true,
        bankName: true,
        brand: true,
        accountNumber: true,
        statementNumber: true,
        currentDueDate: true,
        nextClosingDate: true,
        nextDueDate: true,
        version: true,
        status: true,
        archivedAt: true,
        createdAt: true,
      },
    });
    if (!current) return result;

    const candidateIds = [
      ...new Set([...preExisting.map((statement) => statement.id), current.id]),
    ];
    const candidates = await prisma.cardStatement.findMany({
      where: { id: { in: candidateIds } },
      select: {
        id: true,
        periodKey: true,
        bankName: true,
        brand: true,
        accountNumber: true,
        statementNumber: true,
        currentDueDate: true,
        nextClosingDate: true,
        nextDueDate: true,
        version: true,
        status: true,
        archivedAt: true,
        createdAt: true,
      },
    });

    const normalizedCandidates: RelatedStatement[] = candidates.map((statement) =>
      statement.id === current.id
        ? { ...statement, accountNumber, archivedAt: null }
        : { ...statement, archivedAt: null },
    );
    const groups = groupByCanonicalSummary(normalizedCandidates);

    await prisma.$transaction(async (tx) => {
      for (const statement of normalizedCandidates) {
        await tx.cardStatement.update({
          where: { id: statement.id },
          data: {
            historyKey: `identity-migrate:${statement.id}`,
            version: 1,
            archivedAt: null,
            archivedReason: null,
            ...(statement.id === current.id ? { accountNumber } : {}),
          },
        });
      }

      for (const [historyKey, versions] of groups) {
        const ordered = [...versions].sort(
          (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
        );
        const latestId = ordered[ordered.length - 1]?.id;

        for (let index = 0; index < ordered.length; index += 1) {
          const statement = ordered[index];
          const isLatest = statement.id === latestId;
          await tx.cardStatement.update({
            where: { id: statement.id },
            data: {
              historyKey,
              version: index + 1,
              status: isLatest ? "accepted" : "superseded",
              isActiveForPeriod: isLatest,
              archivedAt: null,
              archivedReason: null,
              ...(statement.id === current.id ? { accountNumber } : {}),
            },
          });
        }
      }
    });

    return result;
  }

  override async deleteStatement(statementId: string): Promise<DeleteStatementResult> {
    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.cardStatement.findUnique({
        where: { id: statementId },
        select: {
          id: true,
          documentId: true,
          historyKey: true,
          version: true,
          status: true,
          isActiveForPeriod: true,
        },
      });

      if (!target) return null;
      if (!["accepted", "superseded", "archived"].includes(target.status)) {
        throw new CardStatementDeleteConflictError(target.status);
      }

      const replacement =
        target.isActiveForPeriod && target.historyKey
          ? await tx.cardStatement.findFirst({
              where: {
                historyKey: target.historyKey,
                id: { not: target.id },
                status: { in: ["accepted", "superseded", "archived"] },
              },
              orderBy: [
                { version: "desc" },
                { createdAt: "desc" },
                { id: "desc" },
              ],
              select: { id: true },
            })
          : null;

      if (replacement) {
        await tx.manualCardPurchase.updateMany({
          where: { statementId: target.id },
          data: { statementId: replacement.id },
        });
        await tx.cardInstallmentProjection.updateMany({
          where: { statementId: target.id, isManual: true },
          data: { statementId: replacement.id },
        });
      }

      await tx.cardStatement.delete({ where: { id: target.id } });

      if (replacement) {
        await tx.cardStatement.update({
          where: { id: replacement.id },
          data: {
            status: "accepted",
            isActiveForPeriod: true,
            archivedAt: null,
            archivedReason: null,
          },
        });
      }

      const [otherStatements, salaryReceipts] = await Promise.all([
        tx.cardStatement.count({ where: { documentId: target.documentId } }),
        tx.salaryReceipt.count({ where: { documentId: target.documentId } }),
      ]);
      const canDeleteDocument = otherStatements === 0 && salaryReceipts === 0;
      if (canDeleteDocument) {
        await tx.uploadedDocument.delete({ where: { id: target.documentId } });
      }

      return {
        success: true as const,
        deletedId: target.id,
        deletedStatementId: target.id,
        deletedDocumentId: canDeleteDocument ? target.documentId : null,
        promotedStatementId: replacement?.id ?? null,
        historyKey: target.historyKey,
      };
    });

    if (!result) throw new NotFoundError("Statement");
    return result;
  }
}

export const cardsService = new CardsService();
