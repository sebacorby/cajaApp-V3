import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { importsService } from "./imports.service.js";
import { logger } from "../../shared/logger.js";
import { prisma } from "../../db/prisma.js";
import { purgeOrphanedAcceptedCardImportsForFile } from "./card-import-lifecycle.js";

type AiErrorDetails = {
  message?: string;
  code?: string;
  stage?: string;
};

function extractAiErrorDetails(value: unknown): AiErrorDetails {
  if (typeof value === "string") {
    const message = value.trim();
    return message ? { message } : {};
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const details = extractAiErrorDetails(item);
      if (details.message) return details;
    }
    return {};
  }

  if (!value || typeof value !== "object") return {};

  const record = value as Record<string, unknown>;
  const messageCandidates = [
    record.message,
    record.error,
    record.detail,
    record.reason,
  ];
  const message = messageCandidates.find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0,
  );

  const code =
    typeof record.code === "string" && record.code.trim()
      ? record.code.trim()
      : undefined;
  const stage =
    typeof record.stage === "string" && record.stage.trim()
      ? record.stage.trim()
      : undefined;

  if (message) {
    return { message: message.trim(), code, stage };
  }

  for (const nestedKey of ["errors", "issues", "cause", "validationErrors"]) {
    if (!(nestedKey in record)) continue;
    const nested = extractAiErrorDetails(record[nestedKey]);
    if (nested.message) {
      return {
        message: nested.message,
        code: nested.code ?? code,
        stage: nested.stage ?? stage,
      };
    }
  }

  return { code, stage };
}

function parseValidationErrors(raw: string | null | undefined): AiErrorDetails {
  if (!raw?.trim()) return {};
  try {
    return extractAiErrorDetails(JSON.parse(raw));
  } catch {
    return { message: raw.trim() };
  }
}

export const importsController: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post("/import", async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ code: "FILE_REQUIRED", message: "No file provided" });
    }

    const fileBuffer = await data.toBuffer();
    const fileUint8Array = new Uint8Array(fileBuffer);

    const fileData = {
      filename: data.filename,
      mimetype: data.mimetype,
      file: fileUint8Array,
    };

    logger.info(
      { filename: fileData.filename, size: fileData.file.length },
      "import.request.received"
    );

    // A deleted accepted statement can leave its accepted draft/document behind
    // in older data. Release only that orphaned dedupe lock before the normal
    // import admission flow. Active/preview imports and existing statements are
    // never removed here.
    if (fileData.mimetype === "application/pdf") {
      const releasedOrphans = await purgeOrphanedAcceptedCardImportsForFile(
        fileData.file,
      );
      if (releasedOrphans > 0) {
        logger.info(
          { filename: fileData.filename, releasedOrphans },
          "import.request.released_orphaned_card_imports",
        );
      }
    }

    const { draftId, pageCount } = await importsService.startImport(fileData);

    logger.info({ draftId, pageCount }, "import.request.started");

    return reply.send({ draftId, pageCount });
  });

  app.get("/import/:draftId/status", async (request, reply) => {
    const { draftId } = request.params as { draftId: string };
    const { startTime } = request.query as { startTime?: string };
    const start = startTime ? parseInt(startTime, 10) : Date.now();

    const status = await importsService.getImportStatus(draftId, start);

    if (status.status === "failed") {
      let errorMessage = status.error?.message?.trim();
      let errorStage = status.error?.stage;
      let errorCode: string | undefined;

      if (!errorMessage || errorMessage === "Unknown error") {
        const draft = await prisma.cardStatementDraft.findUnique({
          where: { id: draftId },
          select: {
            aiRun: {
              select: {
                validationErrors: true,
                status: true,
              },
            },
          },
        });

        const aiError = parseValidationErrors(draft?.aiRun?.validationErrors);
        errorMessage =
          aiError.message ||
          "La importación falló sin detalle del proveedor. Revisá backend.log para el evento ai.run.failed.";
        errorStage = errorStage || aiError.stage || "ai_processing";
        errorCode = aiError.code;

        status.error = {
          message: errorMessage,
          stage: errorStage,
        };
      }

      logger.error(
        {
          event: "import.status.failed",
          draftId,
          errorMessage,
          errorStage,
          errorCode,
        },
        "Card statement import failed",
      );
    } else if (status.status === "preview_ready") {
      logger.info(
        { draftId, status: status.status },
        "import.status.preview_ready",
      );
    }

    return reply.send(status);
  });
};
