import { prisma } from "../../db/prisma.js";
import type { AcceptResult, CardStatementPreview } from "./cards.types.js";
import {
  CardsService as BaseCardsService,
  resolveCardStatementPeriodKey,
} from "./cards.service.base.js";
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
    const result = await super.acceptDraft(draftId, preview);
    const enriched = preview as PreviewWithAccountIdentity;
    const accountNumber = cleanAccountNumber(enriched.source.accountNumber);
    const periodKey = resolveCardStatementPeriodKey(preview);
    const statementNumber = preview.source.statementNumber?.trim() || null;

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

    if (!periodKey || !statementNumber) {
      await prisma.cardStatement.update({
        where: { id: current.id },
        data: { accountNumber },
      });
      return result;
    }

    const related = await prisma.cardStatement.findMany({
      where: {
        bankName: preview.source.bankName,
        brand: preview.source.brand,
        statementNumber,
        periodKey,
        archivedAt: null,
      },
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

    const normalizedRelated: RelatedStatement[] = related.map((statement) =>
      statement.id === current.id
        ? { ...statement, accountNumber }
        : statement,
    );
    const groups = groupByCanonicalSummary(normalizedRelated);

    await prisma.$transaction(async (tx) => {
      for (const statement of normalizedRelated) {
        await tx.cardStatement.update({
          where: { id: statement.id },
          data: {
            historyKey: `identity-migrate:${statement.id}`,
            version: 1,
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
              ...(statement.id === current.id ? { accountNumber } : {}),
            },
          });
        }
      }
    });

    return result;
  }
}

export const cardsService = new CardsService();
