import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "../../db/prisma.js";
import {
  pdfRawExtractorService,
  splitRawTextIntoPages,
} from "../documents/pdf-raw-extractor.service.js";
import { documentDetectorService } from "./document-detector.service.js";
import { env } from "../../config/env.js";
import { logger } from "../../shared/logger.js";
import {
  FileRequiredError,
  FileTooLargeError,
  UnsupportedMediaTypeError,
  UnsupportedDocumentTypeError,
  ImportConflictError,
  DuplicateCardStatementError,
} from "../../shared/errors.js";
import type { CardStatementPreview } from "../cards/cards.types.js";

export interface ProgressInfo {
  stage:
    | "queued"
    | "loading_document"
    | "extracting_raw_text"
    | "sending_raw_text_to_ai"
    | "receiving_ai_stream"
    | "validating_ai_response"
    | "persisting_preview"
    | "preview_ready"
    | "failed";
  message: string;
  startedAt: string;
  error?:
    | string
    | {
        code?: string;
        message?: string;
        failedAt?: string;
      };
  errorStage?: string;
  errorStack?: string;
}

export interface ImportStatus {
  draftId: string;
  status: "processing" | "preview_ready" | "failed";
  progress?: {
    stage: string;
    message: string;
    elapsedSeconds: number;
  };
  preview?: CardStatementPreview | null;
  error?: {
    message: string;
    stage?: string;
  };
}

class AsyncSerialGate {
  private tail: Promise<void> = Promise.resolve();

  async run<T>(operation: () => Promise<T>): Promise<T> {
    let release!: () => void;

    const previous = this.tail;

    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;

    try {
      return await operation();
    } finally {
      release();
    }
  }
}

export class ImportsService {
  private readonly importAdmissionGate = new AsyncSerialGate();

  async startImport(file: {
    filename: string;
    mimetype: string;
    file: Buffer | Uint8Array;
  }): Promise<{ draftId: string; pageCount: number }> {
    return this.importAdmissionGate.run(async () => {
      await this.failStaleImports();

      const activeImport = await prisma.cardStatementDraft.findFirst({
        where: {
          status: "processing",
          updatedAt: {
            gte: this.getImportStaleBefore(),
          },
        },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (activeImport) {
        throw new ImportConflictError({
          message: "Ya existe una importación de resumen en proceso.",
          activeDraftId: activeImport.id,
          startedAt: activeImport.createdAt,
        });
      }

      return this.createImportFromFile(file);
    });
  }

  private getImportStaleBefore(): Date {
    return new Date(
      Date.now() - env.AI_PROCESSING_STALE_AFTER_MS,
    );
  }

  private async failStaleImports(): Promise<number> {
    const staleBefore = this.getImportStaleBefore();

    const staleDrafts = await prisma.cardStatementDraft.findMany({
      where: {
        status: "processing",
        updatedAt: {
          lt: staleBefore,
        },
        aiRun: {
          is: {
            status: {
              in: ["processing", "recovering"],
            },
          },
        },
      },
      select: {
        id: true,
        aiRunId: true,
        updatedAt: true,
      },
    });

    if (staleDrafts.length === 0) {
      return 0;
    }

    const failedAt = new Date();

    const errorPayload = {
      stage: "stale_import_recovery",
      message:
        "The import exceeded its allowed processing window and was recovered automatically.",
      failedAt: failedAt.toISOString(),
    };

    const draftIds = staleDrafts.map((draft) => draft.id);

    const aiRunIds = staleDrafts
      .map((draft) => draft.aiRunId)
      .filter((id): id is string => Boolean(id));

    await prisma.$transaction([
      prisma.cardStatementDraft.updateMany({
        where: {
          id: { in: draftIds },
          status: "processing",
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
        where: {
          id: { in: aiRunIds },
        },
        data: {
          status: "failed",
          validationErrors: JSON.stringify([errorPayload]),
          completedAt: failedAt,
        },
      }),
    ]);

    logger.warn(
      {
        event: "import.stale.recovered",
        staleBefore: staleBefore.toISOString(),
        draftIds,
        count: staleDrafts.length,
      },
      "Recovered stale card statement imports",
    );

    return staleDrafts.length;
  }

  private async createImportFromFile(file: {
    filename: string;
    mimetype: string;
    file: Buffer | Uint8Array;
  }): Promise<{ draftId: string; pageCount: number }> {
    if (!file || !file.file || file.file.length === 0) {
      throw new FileRequiredError();
    }

    if (file.file.length > env.MAX_UPLOAD_BYTES) {
      throw new FileTooLargeError(env.MAX_UPLOAD_BYTES);
    }

    if (file.mimetype !== "application/pdf") {
      throw new UnsupportedMediaTypeError(file.mimetype);
    }

    const storageDir = path.resolve(env.STORAGE_DIR);
    await fs.mkdir(storageDir, { recursive: true });

    const fileBuffer =
      Buffer.isBuffer(file.file) ? file.file : Buffer.from(file.file as Uint8Array);
    const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const duplicateDocument = await prisma.uploadedDocument.findFirst({
      where: {
        sha256,
        OR: [
          { statements: { some: { status: { in: ["accepted", "superseded", "archived"] } } } },
          { drafts: { some: { status: { in: ["processing", "preview_ready", "accepted"] } } } },
        ],
      },
      select: {
        fileName: true,
        statements: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, periodKey: true, version: true },
        },
        drafts: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true },
        },
      },
    });

    if (duplicateDocument) {
      const existingStatement = duplicateDocument.statements[0];
      const existingDraft = duplicateDocument.drafts[0];
      const reference = existingStatement
        ? `resumen ${existingStatement.id} (${existingStatement.status}, versión ${existingStatement.version})`
        : existingDraft
          ? `importación ${existingDraft.id} (${existingDraft.status})`
          : duplicateDocument.fileName;
      throw new DuplicateCardStatementError(
        `Este PDF ya fue importado y está vinculado a ${reference}.`,
      );
    }

    const storedFilename = `${sha256}_${file.filename}`;
    const storagePath = path.join(storageDir, storedFilename);

    await fs.writeFile(storagePath, fileBuffer);

    const startedAt = new Date().toISOString();

    const rawExtraction = await pdfRawExtractorService.extract(storagePath);
    const pageCount = rawExtraction.pageCount;

    const pages = splitRawTextIntoPages(rawExtraction.rawText);
    const firstTwoPages = pages
      .slice(0, 2)
      .map((p) => p.text)
      .join("\n\n");
    const detectionText = `--- PAGE 1-2 / ${pageCount} ---\n${firstTwoPages}`;

    const detectedType = documentDetectorService.detectMimeType(file.filename, file.mimetype);

    if (detectedType === "csv" || detectedType === "png" || detectedType === "jpg") {
      throw new UnsupportedDocumentTypeError(detectedType);
    }

    const documentType =
      documentDetectorService.detectDocumentType(
        detectionText,
      );

    if (documentType !== "credit_card_statement_pdf") {
      throw new UnsupportedDocumentTypeError(documentType);
    }

    const document = await prisma.uploadedDocument.create({
      data: {
        fileName: file.filename,
        mimeType: file.mimetype,
        sizeBytes: fileBuffer.length,
        sha256,
        storagePath,
        pageCount,
      },
    });

    const aiRunData: {
      documentId: string;
      promptFilePath: string;
      promptHash: string;
      modelProvider: string;
      modelBaseUrl: string;
      modelName: string;
      status: string;
    } = {
      documentId: document.id,
      promptFilePath: `${env.CARD_STATEMENT_PROMPTS_DIR}/01-extract-credit-card-statement.md`,
      promptHash: "pending",
      modelProvider: env.AI_PROVIDER,
      modelBaseUrl:
        env.AI_PROVIDER === "ollama"
          ? env.OLLAMA_BASE_URL
          : env.AI_BASE_URL!,
      modelName:
        env.AI_PROVIDER === "ollama"
          ? env.OLLAMA_MODEL
          : (env.AI_MODEL || "unknown"),
      status: "started",
    };

    const aiRun = await prisma.aiExtractionRun.create({
      data: aiRunData,
    });

    const progress: ProgressInfo = {
      stage: "queued",
      message: "Cola de procesamiento iniciada",
      startedAt,
    };

    const draft = await prisma.cardStatementDraft.create({
      data: {
        documentId: document.id,
        aiRunId: aiRun.id,
        status: "processing",
        previewJson: JSON.stringify(progress),
        sections: { create: [] },
        groups: { create: [] },
        rows: { create: [] },
      },
    });

    logger.info(
      {
        draftId: draft.id,
        documentId: document.id,
        aiRunId: aiRun.id,
        model:
          env.AI_PROVIDER === "ollama"
            ? env.OLLAMA_MODEL
            : env.AI_MODEL,
        pageCount,
      },
      "import.start.created_draft"
    );

    logger.info(
      {
        draftId: draft.id,
        aiRunId: aiRun.id,
      },
      "import.background.queued_for_worker"
    );

    return { draftId: draft.id, pageCount };
  }

  private async updateProgress(draftId: string, progress: ProgressInfo): Promise<void> {
    try {
      await prisma.cardStatementDraft.update({
        where: { id: draftId },
        data: { previewJson: JSON.stringify(progress) },
      });
    } catch {
      // ignore update failures
    }
  }

  async getImportStatus(
    draftId: string,
    startTime: number
  ): Promise<ImportStatus> {
    const draft = await prisma.cardStatementDraft.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      return {
        draftId,
        status: "failed",
        error: { message: "Draft not found" },
      };
    }

    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

    if (draft.status === "processing") {
      let stage = "unknown";
      let message = "Procesando...";
      try {
        const progress = JSON.parse(draft.previewJson || "{}") as ProgressInfo;
        stage = progress.stage || "unknown";
        message = progress.message || message;
      } catch {
        // use defaults
      }

      return {
        draftId,
        status: "processing",
        progress: {
          stage,
          message,
          elapsedSeconds,
        },
      };
    }

    if (draft.status === "failed") {
      let errorMessage = "Unknown error";
      let errorStage: string | undefined;
      try {
        const progress = JSON.parse(
          draft.previewJson || "{}",
        ) as ProgressInfo;

        if (typeof progress.error === "string") {
          errorMessage = progress.error;
        } else if (
          progress.error &&
          typeof progress.error.message === "string"
        ) {
          errorMessage = progress.error.message;
        }

        errorStage = progress.errorStage;
      } catch {
        // use defaults
      }

      return {
        draftId,
        status: "failed",
        error: { message: errorMessage, stage: errorStage },
      };
    }

    if (draft.status === "preview_ready") {
      const preview = JSON.parse(draft.previewJson || "{}") as CardStatementPreview;
      return {
        draftId,
        status: "preview_ready",
        progress: {
          stage: "completed",
          message: "Extracción completada",
          elapsedSeconds,
        },
        preview,
      };
    }

    return {
      draftId,
      status: draft.status as "processing" | "preview_ready" | "failed",
      progress: {
        stage: "unknown",
        message: "Estado desconocido",
        elapsedSeconds,
      },
    };
  }
}

export const importsService = new ImportsService();
