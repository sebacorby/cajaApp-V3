import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { aiExtractionService } from "./ai-extraction.service.js";
import { logger } from "../../shared/logger.js";
import { env } from "../../config/env.js";
import { aiRequestContext } from "./ai-provider-context.js";
import { TextExtractionProviderError } from "./text-extraction-provider.js";
import type { CardStatementPreview } from "../cards/cards.types.js";

interface ProgressInfo {
  stage: "queued" | "loading_document" | "rendering" | "extracting_raw_text" | "sending_raw_text_to_ai" | "extracting" | "normalizing" | "persisting" | "preview_ready" | "failed";
  message: string;
  startedAt: string;
  error?: string;
  errorStage?: string;
  errorStack?: string;
  failedAt?: string;
  lastHeartbeatAt?: string;
  providerProgress?: {
    phase: "connecting" | "streaming" | "completed";
    chunkCount: number;
    contentCharacters: number;
    thinkingCharacters: number;
    elapsedMs: number;
  };
  rawExtraction?: {
    pageCount: number;
    characterCount: number;
    durationMs: number;
  };
}

type AiRunWithDraft = Prisma.AiExtractionRunGetPayload<{
  include: {
    draft: true;
    document: true;
  };
}>;

let workerInstanceId: string | undefined;
let workerStarted = false;
let shuttingDown = false;

export function isAiWorkerStarted(): boolean {
  return workerStarted;
}

export function startAiProcessorWorker(): void {
  if (workerStarted) {
    logger.warn(
      {
        event: "ai.worker.already_started",
        workerInstanceId,
      },
      "AI processor worker already started; skipping"
    );
    return;
  }

  workerStarted = true;
  workerInstanceId = randomUUID();

  logger.info(
    {
      event: "ai.worker.started",
      workerInstanceId,
    },
    "AI processor worker started"
  );

  void pollLoop();

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

function shutdown(signal: string): void {
  shuttingDown = true;
  logger.info(
    {
      event: "ai.worker.shutting_down",
      workerInstanceId,
      signal,
    },
    "AI processor worker shutting down"
  );
}

async function pollLoop(): Promise<void> {
  while (!shuttingDown) {
    try {
      const run = await claimNextRun();

      if (!run) {
        await sleep(env.AI_WORKER_POLL_INTERVAL_MS);
        continue;
      }

      const runStartedAt = Date.now();
      const draftId = run.draft.id;
      const runId = run.id;


      logger.info(
        {
          event: "ai.run.claimed",
          workerInstanceId,
          draftId,
          runId,
          elapsedMs: 0,
        },
        "AI run claimed"
      );

      try {
        await runWithTimeout(
          aiRequestContext.run(
            {
              workerInstanceId,
              draftId,
              runId,
              onRawExtractionCompleted: async (metadata) => {
                await updateProgress(draftId, {
                  stage: "sending_raw_text_to_ai",
                  message: "Interpretando el resumen con el modelo.",
                  startedAt: new Date(runStartedAt).toISOString(),
                  lastHeartbeatAt: new Date().toISOString(),
                  rawExtraction: metadata,
                });
              },
              onProviderProgress: async (progress) => {
                await updateProgress(draftId, {
                  stage: "sending_raw_text_to_ai",
                  message:
                    progress.phase === "connecting"
                      ? "Conectando con el modelo."
                      : progress.phase === "completed"
                        ? "Respuesta del modelo recibida."
                        : "El modelo está interpretando el resumen.",
                  startedAt: new Date(runStartedAt).toISOString(),
                  lastHeartbeatAt: new Date().toISOString(),
                  providerProgress: progress,
                });
              },
            },
            () => processRun(run, runStartedAt),
          ),
          env.AI_JOB_TIMEOUT_MS,
          run,
          runStartedAt,
        );
      } catch (error) {
        const elapsedMs = Date.now() - runStartedAt;
        const isJobTimeout =
          error instanceof AiJobTimeoutError;

        if (!isJobTimeout) {
          await failRun(
            run,
            runStartedAt,
            error instanceof Error ? error.message : String(error),
            error instanceof TextExtractionProviderError
              ? error.code
              : "AI_PROCESSING_ERROR",
          );
        }

        if (!isJobTimeout) {
          logger.error(
            {
              event: "ai.run.failed",
              workerInstanceId,
              draftId,
              runId,
              elapsedMs,
              errorName:
                error instanceof Error
                  ? error.name
                  : "UnknownError",
              errorMessage:
                error instanceof Error
                  ? error.message
                  : String(error),
            },
            "AI run failed"
          );
        }
      }
    } catch (error) {
      logger.error(
        {
          event: "ai.worker.poll_error",
          workerInstanceId,
          errorName:
            error instanceof Error
              ? error.name
              : "UnknownError",
          errorMessage:
            error instanceof Error
              ? error.message
              : String(error),
        },
        "AI worker poll error"
      );
      await sleep(env.AI_WORKER_POLL_INTERVAL_MS);
    }
  }
}

async function claimNextRun(): Promise<AiRunWithDraft | null> {
  let candidate = await prisma.aiExtractionRun.findFirst({
    where: { status: "started" },
    orderBy: { createdAt: "asc" },
    include: {
      draft: true,
      document: true,
    },
  });

  if (!candidate) {
    const staleBefore = new Date(
      Date.now() - env.AI_PROCESSING_STALE_AFTER_MS,
    );
    candidate = await prisma.aiExtractionRun.findFirst({
      where: {
        status: "processing",
        draft: {
          is: {
            updatedAt: {
              lt: staleBefore,
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      include: {
        draft: true,
        document: true,
      },
    });
  }

  if (!candidate) {
    return null;
  }


  if (!candidate.draft || !candidate.document) {
    logger.warn(
      {
        event: "ai.worker.claim.skipped_incomplete",
        workerInstanceId,
        runId: candidate.id,
      },
      "Skipping incomplete run; marking as failed"
    );

    await prisma.aiExtractionRun.updateMany({
      where: { id: candidate.id },
      data: {
        status: "failed",
        validationErrors: JSON.stringify([
          {
            code: "INCOMPLETE_RUN",
            message: "Run missing draft or document",
            failedAt: new Date().toISOString(),
          },
        ]),
        completedAt: new Date(),
      },
    });

    return null;
  }

  const expectedStatus = candidate.status;
  const claimedStatus =
    expectedStatus === "processing"
      ? "recovering"
      : "processing";

  const updated = await prisma.aiExtractionRun.updateMany({
    where: {
      id: candidate.id,
      status: expectedStatus,
    },
    data: { status: claimedStatus },
  });


  if (updated.count === 0) {
    logger.info(
      {
        event: "ai.worker.claim.lost_race",
        workerInstanceId,
        runId: candidate.id,
      },
      "Lost claim race"
    );
    return null;
  }

  return prisma.aiExtractionRun.findUnique({
    where: { id: candidate.id },
    include: {
      draft: true,
      document: true,
    },
  });
}

async function processRun(
  run: AiRunWithDraft,
  runStartedAt: number,
): Promise<void> {
  const draft = run.draft;
  const document = run.document;

  if (!draft || !document) {
    throw new Error("Run missing draft or document");
  }

  const draftId = draft.id;
  const runId = run.id;

  await updateProgress(draftId, {
    stage: "extracting_raw_text",
    message: "Extrayendo texto del PDF.",
    startedAt: new Date(runStartedAt).toISOString(),
    lastHeartbeatAt: new Date().toISOString(),
  });

  if (run.status === "recovering") {
    await prisma.aiExtractionRun.updateMany({
      where: {
        id: runId,
        status: "recovering",
      },
      data: {
        status: "processing",
      },
    });
  }

  logger.info(
    {
      event: "ai.raw.started",
      workerInstanceId,
      draftId,
      runId,
      elapsedMs: Date.now() - runStartedAt,
    },
    "Starting raw extraction"
  );

  const extractionResult = await aiExtractionService.extractCardStatement(
    {
      absolutePdfPath: document.storagePath,
      pageCount: document.pageCount ?? 0,
    },
    runId,
  );

  const rawElapsedMs = Date.now() - runStartedAt;

  logger.info(
    {
      event: "ai.raw.completed",
      workerInstanceId,
      draftId,
      runId,
      elapsedMs: rawElapsedMs,
      rawExtractionDurationMs:
        extractionResult.rawExtractionMs,
      aiDurationMs: extractionResult.aiExtractionMs,
    },
    "Raw extraction completed"
  );

  logger.info(
    {
      event: "ai.schema.started",
      workerInstanceId,
      draftId,
      runId,
      elapsedMs: rawElapsedMs,
    },
    "Starting schema validation"
  );

  const hasBlockingErrors =
    extractionResult.blockingErrors.length > 0;

  if (hasBlockingErrors) {
    await failRun(
      run,
      runStartedAt,
      extractionResult.blockingErrors.join("; "),
      "AI_SCHEMA_VALIDATION_FAILED",
    );
    return;
  }

  logger.info(
    {
      event: "ai.schema.completed",
      workerInstanceId,
      draftId,
      runId,
      elapsedMs: Date.now() - runStartedAt,
      warnings: extractionResult.warnings.length,
    },
    "Schema validation completed"
  );

  logger.info(
    {
      event: "ai.persistence.started",
      workerInstanceId,
      draftId,
      runId,
      elapsedMs: Date.now() - runStartedAt,
    },
    "Starting persistence"
  );

  await persistPreview(draftId, extractionResult.preview);

  await prisma.aiExtractionRun.update({
    where: { id: runId },
    data: {
      status: "completed",
      completedAt: new Date(),
      jsonOutput: JSON.stringify(extractionResult.preview),
      retries: extractionResult.retries,
    },
  });

  const metrics = extractionResult.providerMetrics;

  logger.info(
    {
      event: "ai.persistence.completed",
      workerInstanceId,
      draftId,
      runId,
      elapsedMs: Date.now() - runStartedAt,
    },
    "Persistence completed"
  );

  logger.info(
    {
      event: "ai.run.preview_ready",
      workerInstanceId,
      draftId,
      runId,
      elapsedMs: Date.now() - runStartedAt,
      rowsCount: extractionResult.preview.rows.length,
      groupsCount: extractionResult.preview.groups.length,
      sectionsCount: extractionResult.preview.sections.length,
      provider: extractionResult.provider,
      model: extractionResult.model,
      providerHttpStatus: metrics?.httpStatus,
      finishReason: metrics?.finishReason,
      streamChunks: metrics?.streamChunks,
      responseCharacters: metrics?.responseCharacters,
      thinkingCharacters: metrics?.thinkingCharacters,
      totalDurationNs: metrics?.totalDurationNs,
      loadDurationNs: metrics?.loadDurationNs,
      promptEvalCount: metrics?.promptEvalCount,
      promptEvalDurationNs: metrics?.promptEvalDurationNs,
      evalCount: metrics?.evalCount,
      evalDurationNs: metrics?.evalDurationNs,
    },
    "AI run preview ready"
  );

}

class AiJobTimeoutError extends Error {
  constructor() {
    super("AI job timeout exceeded");
    this.name = "AiJobTimeoutError";
  }
}

async function runWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
  run: AiRunWithDraft,
  runStartedAt: number,
): Promise<T> {
  let timeoutWon = false;
  let timer: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>(
    (_, reject) => {
      timer = setTimeout(() => {
        timeoutWon = true;
        reject(new AiJobTimeoutError());
      }, ms);
    },
  );

  const guardedPromise = promise.catch((error) => {
    if (timeoutWon) {
      logger.warn(
        {
          event: "ai.run.late_error_after_timeout",
          workerInstanceId,
          draftId: run.draft?.id,
          runId: run.id,
          errorName:
            error instanceof Error
              ? error.name
              : "UnknownError",
          errorMessage:
            error instanceof Error
              ? error.message
              : String(error),
        },
        "Process run error after job timeout",
      );
      return undefined as T;
    }
    throw error;
  });

  try {
    return await Promise.race([
      guardedPromise,
      timeoutPromise,
    ]);
  } catch (error) {
    if (error instanceof AiJobTimeoutError) {
      await failRun(
        run,
        runStartedAt,
        "AI job timeout exceeded",
        "AI_JOB_TIMEOUT",
      );
    }
    throw error;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function failRun(
  run: AiRunWithDraft,
  runStartedAt: number,
  message: string,
  code: string,
): Promise<void> {
  const draftId = run.draft?.id;
  const runId = run.id;
  const elapsedMs = Date.now() - runStartedAt;

  const errorPayload = {
    code,
    message,
    failedAt: new Date().toISOString(),
  };

  await prisma.$transaction([
    prisma.cardStatementDraft.updateMany({
      where: {
        id: draftId,
        status: {
          notIn: ["preview_ready", "failed", "confirmed"],
        },
      },
      data: {
        status: "failed",
        previewJson: JSON.stringify({
          stage: "failed",
          error: errorPayload,
        }),
      },
    }),
    prisma.aiExtractionRun.updateMany({
      where: { id: runId },
      data: {
        status: "failed",
        validationErrors: JSON.stringify([errorPayload]),
        completedAt: new Date(),
      },
    }),
  ]);

  logger.info(
    {
      event: "ai.run.failed",
      workerInstanceId,
      draftId,
      runId,
      elapsedMs,
      code,
      message,
    },
    "AI run failed"
  );
}

async function updateProgress(
  draftId: string,
  progress: ProgressInfo,
): Promise<void> {
  try {
    await prisma.cardStatementDraft.update({
      where: { id: draftId },
      data: { previewJson: JSON.stringify(progress) },
    });
  } catch {
    // ignore update failures
  }
}

async function persistPreview(
  draftId: string,
  preview: CardStatementPreview,
): Promise<void> {
  const groupSectionMap = new Map<string, string>();
  for (const row of preview.rows) {
    if (row.groupId && row.sectionId && !groupSectionMap.has(row.groupId)) {
      groupSectionMap.set(row.groupId, row.sectionId);
    }
  }

  await prisma.cardStatementDraft.update({
    where: { id: draftId },
    data: {
      status: "preview_ready",
      previewJson: JSON.stringify(preview),
      sections: {
        deleteMany: {},
        create: preview.sections.map((s) => ({
          sectionKey: s.id,
          label: s.label,
          displayOrder: s.displayOrder,
        })),
      },
      groups: {
        deleteMany: {},
        create: preview.groups.map((g) => ({
          groupKey: g.id,
          sectionKey:
            groupSectionMap.get(g.id) ||
            preview.sections[0]?.id ||
            "",
          label: g.label,
          displayOrder: g.displayOrder,
          cardLast4: g.cardLast4,
          holderName: g.holderName,
        })),
      },
      rows: {
        deleteMany: {},
        create: preview.rows.map((r) => ({
          sectionKey: r.sectionId,
          groupKey: r.groupId,
          displayOrder: r.displayOrder,
          sourcePage: r.sourcePage,
          rowType: r.rowType,
          editable: r.editable,
          dateRaw: r.dateRaw,
          dateIso: r.dateIso,
          markerRaw: r.markerRaw,
          referenceRaw: r.referenceRaw,
          installmentRaw: r.installmentRaw,
          receiptRaw: r.receiptRaw,
          amountPesosRaw: r.amountPesos,
          amountDollarsRaw: r.amountDollars,
          currencyOriginal: r.currencyOriginal,
          originalText: r.originalText,
          confidence: r.confidence,
        })),
      },
    },
  });
}

process.on("unhandledRejection", (reason) => {
  logger.error(
    {
      event: "ai.worker.unhandled_rejection",
      workerInstanceId,
      reason:
        reason instanceof Error
          ? {
              message: reason.message,
              stack: reason.stack,
            }
          : String(reason),
    },
    "Unhandled rejection in AI processor worker"
  );
  process.exitCode = 1;
});

process.on("uncaughtException", (error) => {
  logger.fatal(
    {
      event: "ai.worker.uncaught_exception",
      workerInstanceId,
      error: error.message,
      stack: error.stack,
    },
    "Uncaught exception in AI processor worker"
  );
  process.exit(1);
});
