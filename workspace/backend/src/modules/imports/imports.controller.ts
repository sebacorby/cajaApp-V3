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

type ImportTelemetry = {
  startedAt?: string;
  lastHeartbeatAt?: string;
  model?: {
    provider?: string;
    name?: string;
  };
  providerProgress?: {
    phase?: "connecting" | "streaming" | "completed";
    chunkCount?: number;
    contentCharacters?: number;
    thinkingCharacters?: number;
    elapsedMs?: number;
  };
  rawExtraction?: {
    pageCount?: number;
    characterCount?: number;
    durationMs?: number;
  };
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

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : undefined;
}

function parseImportTelemetry(
  raw: string | null | undefined,
  modelProvider?: string | null,
  modelName?: string | null,
): ImportTelemetry | undefined {
  let parsed: Record<string, unknown> = {};

  if (raw?.trim()) {
    try {
      const candidate = JSON.parse(raw) as unknown;
      if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
        parsed = candidate as Record<string, unknown>;
      }
    } catch {
      // Telemetry is best-effort and must never break the status endpoint.
    }
  }

  const telemetry: ImportTelemetry = {};
  const startedAt = stringValue(parsed.startedAt);
  const lastHeartbeatAt = stringValue(parsed.lastHeartbeatAt);
  if (startedAt) telemetry.startedAt = startedAt;
  if (lastHeartbeatAt) telemetry.lastHeartbeatAt = lastHeartbeatAt;

  const provider = stringValue(modelProvider);
  const name = stringValue(modelName);
  if (provider || name) {
    telemetry.model = { provider, name };
  }

  const rawExtraction = parsed.rawExtraction;
  if (rawExtraction && typeof rawExtraction === "object" && !Array.isArray(rawExtraction)) {
    const record = rawExtraction as Record<string, unknown>;
    telemetry.rawExtraction = {
      pageCount: finiteNumber(record.pageCount),
      characterCount: finiteNumber(record.characterCount),
      durationMs: finiteNumber(record.durationMs),
    };
  }

  const providerProgress = parsed.providerProgress;
  if (providerProgress && typeof providerProgress === "object" && !Array.isArray(providerProgress)) {
    const record = providerProgress as Record<string, unknown>;
    const phase = stringValue(record.phase);
    telemetry.providerProgress = {
      phase:
        phase === "connecting" || phase === "streaming" || phase === "completed"
          ? phase
          : undefined,
      chunkCount: finiteNumber(record.chunkCount),
      contentCharacters: finiteNumber(record.contentCharacters),
      thinkingCharacters: finiteNumber(record.thinkingCharacters),
      elapsedMs: finiteNumber(record.elapsedMs),
    };
  }

  return Object.keys(telemetry).length > 0 ? telemetry : undefined;
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
    const draftDetails = await prisma.cardStatementDraft.findUnique({
      where: { id: draftId },
      select: {
        previewJson: true,
        aiRun: {
          select: {
            validationErrors: true,
            status: true,
            modelProvider: true,
            modelName: true,
          },
        },
      },
    });

    const telemetry = parseImportTelemetry(
      draftDetails?.previewJson,
      draftDetails?.aiRun?.modelProvider,
      draftDetails?.aiRun?.modelName,
    );

    if (telemetry) {
      (status as typeof status & { telemetry?: ImportTelemetry }).telemetry = telemetry;
    }

    if (status.status === "failed") {
      let errorMessage = status.error?.message?.trim();
      let errorStage = status.error?.stage;
      let errorCode: string | undefined;

      if (!errorMessage || errorMessage === "Unknown error") {
        const aiError = parseValidationErrors(draftDetails?.aiRun?.validationErrors);
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
