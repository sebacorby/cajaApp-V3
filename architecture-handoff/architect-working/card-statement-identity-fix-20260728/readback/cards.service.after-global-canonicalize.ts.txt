import { prisma } from "../../db/prisma.js";
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
    // Snapshot every persisted, non-archived statement that is currently part of
    // the accepted history BEFORE invoking the legacy acceptance path. The base
    // service still owns persistence of rows/projections, but its historical
    // period activation rules must not be allowed to make another card account
    // disappear when a different statement is accepted.
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

    // Re-canonicalize the complete accepted history, not only the statement that
    // was just imported. This is the critical distinction for multi-card:
    // Visa and Mastercard are separate summary groups and therefore both remain
    // accepted. Only true duplicates of the SAME canonical summary are versioned
    // old -> superseded / newest -> accepted.
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
      // Break any legacy history-key/version collisions first. Each statement gets
      // a temporary unique history namespace before canonical keys are assigned.
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
}

export const cardsService = new CardsService();
