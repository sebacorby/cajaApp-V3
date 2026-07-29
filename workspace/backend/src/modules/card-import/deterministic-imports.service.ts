import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { prisma } from "../../db/prisma.js";
import {
  pdfRawExtractorService,
  splitRawTextIntoPages,
} from "../documents/pdf-raw-extractor.service.js";
import { documentDetectorService } from "../imports/document-detector.service.js";
import { env } from "../../config/env.js";
import { logger } from "../../shared/logger.js";
import {
  DuplicateCardStatementError,
  FileRequiredError,
  FileTooLargeError,
  ImportConflictError,
  UnsupportedDocumentTypeError,
  UnsupportedMediaTypeError,
} from "../../shared/errors.js";
import { cardStatementPreviewSchema } from "../cards/cards.schemas.js";
import type { CardStatementPreview, CardStatementRow } from "../cards/cards.types.js";
import { parseCardStatementRaw } from "./card-statement-parser.js";
import {
  StatementParseCompletenessError,
  UnsupportedStatementLayoutError,
  type CardStatementParseDiagnostics,
} from "./card-statement-parser.types.js";

export type DeterministicImportStage =
  | "queued"
  | "extracting_raw_text"
  | "detecting_layout"
  | "parsing_statement"
  | "validating_parse"
  | "persisting_preview"
  | "preview_ready"
  | "failed";

export type DeterministicProgressInfo = {
  stage: DeterministicImportStage;
  message: string;
  startedAt: string;
  lastHeartbeatAt?: string;
  parser?: {
    layout?: string;
    sourcePageCount?: number;
    sourceLineCount?: number;
    candidateTransactionLines?: number;
    parsedTransactionLines?: number;
    unexplainedTransactionLines?: number;
    parsedRows?: number;
    futureReferenceRows?: number;
    durationMs?: number;
  };
  rawExtraction?: {
    pageCount: number;
    characterCount: number;
    durationMs: number;
  };
  error?: {
    code: string;
    message: string;
    failedAt: string;
  };
  errorStage?: string;
};

export type DeterministicImportStatus = {
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
};

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

function diagnosticsForProgress(diagnostics: CardStatementParseDiagnostics) {
  return {
    layout: diagnostics.layout,
    sourcePageCount: diagnostics.sourcePageCount,
    sourceLineCount: diagnostics.sourceLineCount,
    candidateTransactionLines: diagnostics.candidateTransactionLines,
    parsedTransactionLines: diagnostics.parsedTransactionLines,
    unexplainedTransactionLines: diagnostics.unexplainedTransactionLines.length,
    parsedRows: diagnostics.parsedRows,
    futureReferenceRows: diagnostics.futureReferenceRows,
    durationMs: diagnostics.durationMs,
  };
}

function persistedRows(preview: CardStatementPreview): CardStatementRow[] {
  const seen = new Set<string>();
  const rows: CardStatementRow[] = [];
  for (const row of [...preview.rows, ...preview.futureInstallmentsBlock]) {
    const key = `${row.sectionId}|${row.displayOrder}|${row.rowType}|${row.originalText}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }
  return rows;
}

export class DeterministicImportsService {
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
          updatedAt: { gte: this.getImportStaleBefore() },
        },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });

      if (activeImport) {
        throw new ImportConflictError({
          message: "Ya existe una importación de resumen en proceso.",
          activeDraftId: activeImport.id,
          startedAt: activeImport.createdAt,
        });
      }

      return this.createAndProcessImport(file);
    });
  }

  private getImportStaleBefore(): Date {
    return new Date(Date.now() - env.AI_PROCESSING_STALE_AFTER_MS);
  }

  private async failStaleImports(): Promise<number> {
    const staleBefore = this.getImportStaleBefore();
    const stale = await prisma.cardStatementDraft.findMany({
      where: {
        status: "processing",
        updatedAt: { lt: staleBefore },
        aiRunId: null,
      },
      select: { id: true },
    });
    if (stale.length === 0) return 0;

    const failedAt = new Date().toISOString();
    for (const draft of stale) {
      await prisma.cardStatementDraft.update({
        where: { id: draft.id },
        data: {
          status: "failed",
          previewJson: JSON.stringify({
            stage: "failed",
            message: "Importación programática interrumpida.",
            startedAt: failedAt,
            errorStage: "stale_import_recovery",
            error: {
              code: "STALE_DETERMINISTIC_IMPORT",
              message: "La importación programática quedó interrumpida y fue recuperada automáticamente.",
              failedAt,
            },
          } satisfies DeterministicProgressInfo),
        },
      });
    }
    return stale.length;
  }

  private async createAndProcessImport(file: {
    filename: string;
    mimetype: string;
    file: Buffer | Uint8Array;
  }): Promise<{ draftId: string; pageCount: number }> {
    if (!file?.file || file.file.length === 0) throw new FileRequiredError();
    if (file.file.length > env.MAX_UPLOAD_BYTES) throw new FileTooLargeError(env.MAX_UPLOAD_BYTES);
    if (file.mimetype !== "application/pdf") throw new UnsupportedMediaTypeError(file.mimetype);

    const fileBuffer = Buffer.isBuffer(file.file)
      ? file.file
      : Buffer.from(file.file as Uint8Array);
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
          select: { id: true, status: true, version: true },
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

    const storageDir = path.resolve(env.STORAGE_DIR);
    await fs.mkdir(storageDir, { recursive: true });
    const storagePath = path.join(storageDir, `${sha256}_${file.filename}`);
    await fs.writeFile(storagePath, fileBuffer);

    const startedAt = new Date().toISOString();
    const rawExtraction = await pdfRawExtractorService.extract(storagePath);
    const pageCount = rawExtraction.pageCount;
    const pages = splitRawTextIntoPages(rawExtraction.rawText);
    const detectionText = pages.slice(0, 2).map((page) => page.text).join("\n\n");

    const detectedType = documentDetectorService.detectMimeType(file.filename, file.mimetype);
    if (detectedType === "csv" || detectedType === "png" || detectedType === "jpg") {
      throw new UnsupportedDocumentTypeError(detectedType);
    }
    const documentType = documentDetectorService.detectDocumentType(detectionText);
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

    const initialProgress: DeterministicProgressInfo = {
      stage: "parsing_statement",
      message: "Interpretando el resumen con reglas programáticas.",
      startedAt,
      lastHeartbeatAt: new Date().toISOString(),
      rawExtraction: {
        pageCount,
        characterCount: rawExtraction.characterCount,
        durationMs: rawExtraction.durationMs,
      },
    };

    const draft = await prisma.cardStatementDraft.create({
      data: {
        documentId: document.id,
        status: "processing",
        previewJson: JSON.stringify(initialProgress),
      },
    });

    logger.info(
      {
        event: "card_import.deterministic.started",
        draftId: draft.id,
        documentId: document.id,
        pageCount,
        rawCharacters: rawExtraction.characterCount,
        rawExtractionMs: rawExtraction.durationMs,
      },
      "Deterministic card statement import started",
    );

    try {
      const parseResult = parseCardStatementRaw(rawExtraction.rawText, pageCount);
      const validated = cardStatementPreviewSchema.safeParse(parseResult.preview);
      if (!validated.success) {
        throw new Error(
          `El parser produjo una vista previa inválida: ${validated.error.issues
            .slice(0, 8)
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; ")}`,
        );
      }

      await this.writeParserEvidence(draft.id, rawExtraction.rawText, validated.data, parseResult.diagnostics);
      await this.persistPreview(draft.id, validated.data);

      logger.info(
        {
          event: "card_import.deterministic.completed",
          draftId: draft.id,
          layout: parseResult.diagnostics.layout,
          parsedRows: parseResult.diagnostics.parsedRows,
          candidateTransactionLines: parseResult.diagnostics.candidateTransactionLines,
          parsedTransactionLines: parseResult.diagnostics.parsedTransactionLines,
          futureReferenceRows: parseResult.diagnostics.futureReferenceRows,
          parserDurationMs: parseResult.diagnostics.durationMs,
          totalElapsedMs: Date.now() - new Date(startedAt).getTime(),
        },
        "Deterministic card statement import completed",
      );
    } catch (error) {
      const diagnostics =
        error instanceof StatementParseCompletenessError ? error.diagnostics : undefined;
      if (diagnostics) {
        await this.writeParserFailureEvidence(draft.id, rawExtraction.rawText, diagnostics);
      }
      await this.failDraft(draft.id, startedAt, error, diagnostics);
    }

    return { draftId: draft.id, pageCount };
  }

  private async persistPreview(draftId: string, preview: CardStatementPreview): Promise<void> {
    const groupSectionById = new Map<string, string>();
    for (const row of preview.rows) {
      if (row.groupId && !groupSectionById.has(row.groupId)) {
        groupSectionById.set(row.groupId, row.sectionId);
      }
    }

    const rows = persistedRows(preview);
    await prisma.$transaction(async (tx) => {
      await tx.cardStatementDraftRow.deleteMany({ where: { draftId } });
      await tx.cardStatementDraftGroup.deleteMany({ where: { draftId } });
      await tx.cardStatementDraftSection.deleteMany({ where: { draftId } });

      if (preview.sections.length > 0) {
        await tx.cardStatementDraftSection.createMany({
          data: preview.sections.map((section) => ({
            draftId,
            sectionKey: section.id,
            label: section.label,
            displayOrder: section.displayOrder,
          })),
        });
      }

      if (preview.groups.length > 0) {
        await tx.cardStatementDraftGroup.createMany({
          data: preview.groups.map((group) => ({
            draftId,
            groupKey: group.id,
            sectionKey: groupSectionById.get(group.id) ?? "detail",
            label: group.label,
            displayOrder: group.displayOrder,
            cardLast4: group.cardLast4,
            holderName: group.holderName,
          })),
        });
      }

      if (rows.length > 0) {
        await tx.cardStatementDraftRow.createMany({
          data: rows.map((row) => ({
            draftId,
            sectionKey: row.sectionId,
            groupKey: row.groupId,
            displayOrder: row.displayOrder,
            sourcePage: row.sourcePage,
            rowType: row.rowType,
            editable: row.editable,
            dateRaw: row.dateRaw,
            dateIso: row.dateIso,
            markerRaw: row.markerRaw,
            referenceRaw: row.referenceRaw,
            installmentRaw: row.installmentRaw,
            receiptRaw: row.receiptRaw,
            amountPesosRaw: row.amountPesos,
            amountDollarsRaw: row.amountDollars,
            currencyOriginal: row.currencyOriginal,
            originalText: row.originalText,
            confidence: row.confidence,
          })),
        });
      }

      await tx.cardStatementDraft.update({
        where: { id: draftId },
        data: {
          status: "preview_ready",
          previewJson: JSON.stringify(preview),
        },
      });
    });
  }

  private async failDraft(
    draftId: string,
    startedAt: string,
    error: unknown,
    diagnostics?: CardStatementParseDiagnostics,
  ): Promise<void> {
    const failedAt = new Date().toISOString();
    const code =
      error instanceof StatementParseCompletenessError
        ? "PARSER_INCOMPLETE"
        : error instanceof UnsupportedStatementLayoutError
          ? "PARSER_LAYOUT_UNSUPPORTED"
          : "PARSER_ERROR";
    const message = error instanceof Error ? error.message : String(error);
    const progress: DeterministicProgressInfo = {
      stage: "failed",
      message: "No pudimos interpretar el resumen de forma programática.",
      startedAt,
      lastHeartbeatAt: failedAt,
      errorStage: "programmatic_parser",
      error: { code, message, failedAt },
      parser: diagnostics ? diagnosticsForProgress(diagnostics) : undefined,
    };
    await prisma.cardStatementDraft.update({
      where: { id: draftId },
      data: { status: "failed", previewJson: JSON.stringify(progress) },
    });
    logger.error(
      { event: "card_import.deterministic.failed", draftId, code, message },
      "Deterministic card statement import failed",
    );
  }

  private async writeParserEvidence(
    draftId: string,
    rawText: string,
    preview: CardStatementPreview,
    diagnostics: CardStatementParseDiagnostics,
  ): Promise<void> {
    const dir = path.resolve(env.STORAGE_DIR, "parser-runs", draftId);
    await fs.mkdir(dir, { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(dir, "raw.txt"), rawText, "utf8"),
      fs.writeFile(path.join(dir, "parsed.json"), JSON.stringify(preview, null, 2), "utf8"),
      fs.writeFile(path.join(dir, "diagnostics.json"), JSON.stringify(diagnostics, null, 2), "utf8"),
      fs.writeFile(
        path.join(dir, "unparsed-lines.txt"),
        diagnostics.unexplainedTransactionLines
          .map((line) => `page=${line.pageNumber} line=${line.lineNumber} ${line.reason}: ${line.text}`)
          .join("\n"),
        "utf8",
      ),
    ]);
  }

  private async writeParserFailureEvidence(
    draftId: string,
    rawText: string,
    diagnostics: CardStatementParseDiagnostics,
  ): Promise<void> {
    const dir = path.resolve(env.STORAGE_DIR, "parser-runs", draftId);
    await fs.mkdir(dir, { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(dir, "raw.txt"), rawText, "utf8"),
      fs.writeFile(path.join(dir, "diagnostics.json"), JSON.stringify(diagnostics, null, 2), "utf8"),
      fs.writeFile(
        path.join(dir, "unparsed-lines.txt"),
        diagnostics.unexplainedTransactionLines
          .map((line) => `page=${line.pageNumber} line=${line.lineNumber} ${line.reason}: ${line.text}`)
          .join("\n"),
        "utf8",
      ),
    ]);
  }

  async getImportStatus(draftId: string, startTime: number): Promise<DeterministicImportStatus> {
    const draft = await prisma.cardStatementDraft.findUnique({
      where: { id: draftId },
      select: { status: true, previewJson: true },
    });
    if (!draft) {
      return { draftId, status: "failed", error: { message: "Draft not found" } };
    }

    if (draft.status === "preview_ready") {
      try {
        const preview = cardStatementPreviewSchema.parse(JSON.parse(draft.previewJson ?? "{}"));
        return { draftId, status: "preview_ready", preview };
      } catch (error) {
        return {
          draftId,
          status: "failed",
          error: {
            message: error instanceof Error ? error.message : "La vista previa guardada es inválida.",
            stage: "preview_deserialization",
          },
        };
      }
    }

    if (draft.status === "failed") {
      try {
        const progress = JSON.parse(draft.previewJson ?? "{}") as DeterministicProgressInfo;
        return {
          draftId,
          status: "failed",
          error: {
            message: progress.error?.message ?? progress.message ?? "Unknown error",
            stage: progress.errorStage ?? progress.stage,
          },
        };
      } catch {
        return { draftId, status: "failed", error: { message: "Unknown error" } };
      }
    }

    let stage = "processing";
    let message = "Procesando resumen...";
    try {
      const progress = JSON.parse(draft.previewJson ?? "{}") as DeterministicProgressInfo;
      stage = progress.stage ?? stage;
      message = progress.message ?? message;
    } catch {
      // Defaults above are safe.
    }
    return {
      draftId,
      status: "processing",
      progress: {
        stage,
        message,
        elapsedSeconds: Math.max(0, Math.floor((Date.now() - startTime) / 1000)),
      },
    };
  }
}

export const deterministicImportsService = new DeterministicImportsService();
