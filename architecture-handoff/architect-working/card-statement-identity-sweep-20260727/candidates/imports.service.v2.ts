import crypto from "node:crypto";

import { prisma } from "../../db/prisma.js";
import { logger } from "../../shared/logger.js";
import { deterministicImportsService } from "../card-import/deterministic-imports.service.js";

async function releaseLegacyAiProcessingDrafts(): Promise<number> {
  const legacyDrafts = await prisma.cardStatementDraft.findMany({
    where: { status: "processing", aiRunId: { not: null } },
    select: { id: true, aiRunId: true },
  });
  if (legacyDrafts.length === 0) return 0;

  const failedAt = new Date();
  const draftIds = legacyDrafts.map((draft) => draft.id);
  const aiRunIds = legacyDrafts.map((draft) => draft.aiRunId).filter((id): id is string => Boolean(id));
  const errorPayload = {
    code: "LEGACY_AI_CARD_IMPORT_DISABLED",
    message: "La importación de tarjetas por IA fue deshabilitada. Este draft legacy fue cerrado para no bloquear el parser programático.",
    failedAt: failedAt.toISOString(),
  };

  await prisma.$transaction([
    prisma.cardStatementDraft.updateMany({
      where: { id: { in: draftIds } },
      data: { status: "failed", previewJson: JSON.stringify({ stage: "failed", message: errorPayload.message, startedAt: failedAt.toISOString(), errorStage: "legacy_ai_disabled", error: errorPayload }) },
    }),
    prisma.aiExtractionRun.updateMany({
      where: { id: { in: aiRunIds } },
      data: { status: "failed", completedAt: failedAt, validationErrors: JSON.stringify([errorPayload]) },
    }),
  ]);

  logger.warn({ event: "card_import.legacy_ai_drafts.released", draftIds, aiRunIds, count: legacyDrafts.length }, "Legacy AI card imports were closed before deterministic import admission");
  return legacyDrafts.length;
}

type PreviousStatementState = { id: string; status: string };
type PreviousDraftState = { id: string; status: string };

async function openExactDuplicateForReimport(fileBytes: Buffer | Uint8Array): Promise<{
  statements: PreviousStatementState[];
  drafts: PreviousDraftState[];
}> {
  const buffer = Buffer.isBuffer(fileBytes) ? fileBytes : Buffer.from(fileBytes);
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  const documents = await prisma.uploadedDocument.findMany({
    where: { sha256 },
    select: {
      statements: {
        where: { status: { in: ["accepted", "superseded", "archived"] } },
        select: { id: true, status: true },
      },
      drafts: {
        where: { status: { in: ["processing", "preview_ready", "accepted"] } },
        select: { id: true, status: true },
      },
    },
  });

  const statements = documents.flatMap((document) => document.statements);
  const drafts = documents.flatMap((document) => document.drafts);
  if (drafts.some((draft) => draft.status === "processing")) {
    return { statements: [], drafts: [] };
  }
  if (statements.length === 0 && drafts.length === 0) {
    return { statements: [], drafts: [] };
  }

  await prisma.$transaction([
    ...(statements.length > 0 ? [prisma.cardStatement.updateMany({ where: { id: { in: statements.map((item) => item.id) } }, data: { status: "reimport_pending" } })] : []),
    ...(drafts.length > 0 ? [prisma.cardStatementDraft.updateMany({ where: { id: { in: drafts.map((item) => item.id) } }, data: { status: "reimport_replaced" } })] : []),
  ]);

  return { statements, drafts };
}

async function restoreDuplicateStates(
  state: { statements: PreviousStatementState[]; drafts: PreviousDraftState[] },
  previewReady: boolean,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const statement of state.statements) {
      await tx.cardStatement.update({ where: { id: statement.id }, data: { status: statement.status } });
    }
    for (const draft of state.drafts) {
      await tx.cardStatementDraft.update({
        where: { id: draft.id },
        data: { status: previewReady && draft.status === "preview_ready" ? "superseded" : draft.status },
      });
    }
  });
}

class ImportsServiceFacade {
  async startImport(file: { filename: string; mimetype: string; file: Buffer | Uint8Array }) {
    await releaseLegacyAiProcessingDrafts();
    const duplicateState = await openExactDuplicateForReimport(file.file);
    const bypassed = duplicateState.statements.length > 0 || duplicateState.drafts.length > 0;
    if (!bypassed) return deterministicImportsService.startImport(file);

    try {
      const result = await deterministicImportsService.startImport(file);
      const createdDraft = await prisma.cardStatementDraft.findUnique({
        where: { id: result.draftId },
        select: { status: true },
      });
      const previewReady = createdDraft?.status === "preview_ready";
      await restoreDuplicateStates(duplicateState, previewReady);
      if (previewReady) {
        logger.info({ event: "card_import.exact_duplicate.reimport_opened", draftId: result.draftId, previousStatementIds: duplicateState.statements.map((item) => item.id) }, "Exact duplicate PDF was reopened as a new deterministic preview");
      }
      return result;
    } catch (error) {
      await restoreDuplicateStates(duplicateState, false);
      throw error;
    }
  }

  async getImportStatus(draftId: string, startTime: number) {
    return deterministicImportsService.getImportStatus(draftId, startTime);
  }
}

export const importsService = new ImportsServiceFacade();
