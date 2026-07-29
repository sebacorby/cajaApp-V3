import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";

async function removePath(target: string | null | undefined): Promise<boolean> {
  if (!target?.trim()) return false;
  const resolved = path.isAbsolute(target) ? target : path.resolve(target);
  try {
    await fs.rm(resolved, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const cardDocuments = await prisma.uploadedDocument.findMany({
    where: {
      OR: [
        { drafts: { some: {} } },
        { statements: { some: {} } },
        {
          aiExtractionRuns: {
            some: {
              promptFilePath: { contains: "cards" },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      fileName: true,
      storagePath: true,
      drafts: {
        select: {
          id: true,
          aiRunId: true,
        },
      },
      statements: {
        select: { id: true },
      },
      aiExtractionRuns: {
        select: {
          id: true,
          promptFilePath: true,
          rawResponsePath: true,
          draft: { select: { id: true } },
          salaryReceiptDraft: { select: { id: true } },
        },
      },
      salaryReceiptDrafts: {
        take: 1,
        select: { id: true },
      },
      salaryReceipts: {
        take: 1,
        select: { id: true },
      },
    },
  });

  const documentIds = new Set<string>();
  const deletableDocumentIds = new Set<string>();
  const cardDraftIds = new Set<string>();
  const cardAiRunIds = new Set<string>();
  const storagePaths = new Set<string>();
  const rawResponsePaths = new Set<string>();

  for (const document of cardDocuments) {
    documentIds.add(document.id);

    for (const draft of document.drafts) {
      cardDraftIds.add(draft.id);
      if (draft.aiRunId) cardAiRunIds.add(draft.aiRunId);
    }

    for (const run of document.aiExtractionRuns) {
      const looksLikeCardRun =
        Boolean(run.draft) || run.promptFilePath.toLocaleLowerCase("en").includes("cards");
      const usedBySalary = Boolean(run.salaryReceiptDraft);
      if (looksLikeCardRun && !usedBySalary) {
        cardAiRunIds.add(run.id);
        if (run.rawResponsePath) rawResponsePaths.add(run.rawResponsePath);
      }
    }

    const sharedWithSalary =
      document.salaryReceiptDrafts.length > 0 || document.salaryReceipts.length > 0;
    if (!sharedWithSalary) {
      deletableDocumentIds.add(document.id);
      storagePaths.add(document.storagePath);
    }
  }

  const before = {
    statements: await prisma.cardStatement.count(),
    drafts: await prisma.cardStatementDraft.count(),
    draftSections: await prisma.cardStatementDraftSection.count(),
    draftGroups: await prisma.cardStatementDraftGroup.count(),
    draftRows: await prisma.cardStatementDraftRow.count(),
    sections: await prisma.cardStatementSection.count(),
    groups: await prisma.cardStatementGroup.count(),
    rows: await prisma.cardStatementRow.count(),
    projections: await prisma.cardInstallmentProjection.count(),
    manualPurchases: await prisma.manualCardPurchase.count(),
    cardDocuments: documentIds.size,
    cardAiRuns: cardAiRunIds.size,
  };

  const deleted = await prisma.$transaction(async (tx) => {
    // Statements reference drafts, so accepted statements go first.
    const statements = await tx.cardStatement.deleteMany({});

    // Draft child tables cascade from CardStatementDraft.
    const drafts = await tx.cardStatementDraft.deleteMany({});

    const aiRuns =
      cardAiRunIds.size > 0
        ? await tx.aiExtractionRun.deleteMany({
            where: { id: { in: [...cardAiRunIds] } },
          })
        : { count: 0 };

    const documents =
      deletableDocumentIds.size > 0
        ? await tx.uploadedDocument.deleteMany({
            where: {
              id: { in: [...deletableDocumentIds] },
              salaryReceiptDrafts: { none: {} },
              salaryReceipts: { none: {} },
            },
          })
        : { count: 0 };

    return {
      statements: statements.count,
      drafts: drafts.count,
      aiRuns: aiRuns.count,
      documents: documents.count,
    };
  });

  let removedStoredFiles = 0;
  for (const storagePath of storagePaths) {
    if (await removePath(storagePath)) removedStoredFiles += 1;
  }

  let removedRawResponses = 0;
  for (const rawResponsePath of rawResponsePaths) {
    if (await removePath(rawResponsePath)) removedRawResponses += 1;
  }

  const parserRunsPath = path.resolve(env.STORAGE_DIR, "parser-runs");
  const parserRunsRemoved = await removePath(parserRunsPath);

  const after = {
    statements: await prisma.cardStatement.count(),
    drafts: await prisma.cardStatementDraft.count(),
    draftSections: await prisma.cardStatementDraftSection.count(),
    draftGroups: await prisma.cardStatementDraftGroup.count(),
    draftRows: await prisma.cardStatementDraftRow.count(),
    sections: await prisma.cardStatementSection.count(),
    groups: await prisma.cardStatementGroup.count(),
    rows: await prisma.cardStatementRow.count(),
    projections: await prisma.cardInstallmentProjection.count(),
    manualPurchases: await prisma.manualCardPurchase.count(),
  };

  console.log(
    JSON.stringify(
      {
        event: "card_import.cleanup.completed",
        before,
        deleted,
        files: {
          removedStoredFiles,
          removedRawResponses,
          parserRunsRemoved,
        },
        after,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          event: "card_import.cleanup.failed",
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
