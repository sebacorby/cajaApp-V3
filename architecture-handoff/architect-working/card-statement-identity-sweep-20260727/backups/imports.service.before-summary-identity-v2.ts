import { prisma } from "../../db/prisma.js";
import { logger } from "../../shared/logger.js";
import { deterministicImportsService } from "../card-import/deterministic-imports.service.js";

async function releaseLegacyAiProcessingDrafts(): Promise<number> {
  const legacyDrafts = await prisma.cardStatementDraft.findMany({
    where: {
      status: "processing",
      aiRunId: { not: null },
    },
    select: {
      id: true,
      aiRunId: true,
    },
  });

  if (legacyDrafts.length === 0) return 0;

  const failedAt = new Date();
  const draftIds = legacyDrafts.map((draft) => draft.id);
  const aiRunIds = legacyDrafts
    .map((draft) => draft.aiRunId)
    .filter((id): id is string => Boolean(id));

  const errorPayload = {
    code: "LEGACY_AI_CARD_IMPORT_DISABLED",
    message:
      "La importación de tarjetas por IA fue deshabilitada. Este draft legacy fue cerrado para no bloquear el parser programático.",
    failedAt: failedAt.toISOString(),
  };

  await prisma.$transaction([
    prisma.cardStatementDraft.updateMany({
      where: { id: { in: draftIds } },
      data: {
        status: "failed",
        previewJson: JSON.stringify({
          stage: "failed",
          message: errorPayload.message,
          startedAt: failedAt.toISOString(),
          errorStage: "legacy_ai_disabled",
          error: errorPayload,
        }),
      },
    }),
    prisma.aiExtractionRun.updateMany({
      where: { id: { in: aiRunIds } },
      data: {
        status: "failed",
        completedAt: failedAt,
        validationErrors: JSON.stringify([errorPayload]),
      },
    }),
  ]);

  logger.warn(
    {
      event: "card_import.legacy_ai_drafts.released",
      draftIds,
      aiRunIds,
      count: legacyDrafts.length,
    },
    "Legacy AI card imports were closed before deterministic import admission",
  );

  return legacyDrafts.length;
}

class ImportsServiceFacade {
  async startImport(file: {
    filename: string;
    mimetype: string;
    file: Buffer | Uint8Array;
  }) {
    await releaseLegacyAiProcessingDrafts();
    return deterministicImportsService.startImport(file);
  }

  async getImportStatus(draftId: string, startTime: number) {
    return deterministicImportsService.getImportStatus(draftId, startTime);
  }
}

export const importsService = new ImportsServiceFacade();
