import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import {
  AppError,
  FileRequiredError,
  FileTooLargeError,
  UnsupportedMediaTypeError,
} from "../../shared/errors.js";
import { logger } from "../../shared/logger.js";
import { salaryReceiptExtractionService } from "./salary-receipt-extraction.service.js";
import { SalaryReceiptsService as BaseSalaryReceiptsService } from "./salary-receipts.service.base.js";

export { buildSalaryReceiptHistoryKey } from "./salary-receipts.service.base.js";

export class SalaryReceiptsService extends BaseSalaryReceiptsService {
  override async importPdf(file: {
    filename: string;
    mimetype: string;
    file: Buffer | Uint8Array;
  }) {
    if (!file.file || file.file.length === 0) throw new FileRequiredError();
    if (file.file.length > env.MAX_UPLOAD_BYTES) {
      throw new FileTooLargeError(env.MAX_UPLOAD_BYTES);
    }
    if (file.mimetype !== "application/pdf") {
      throw new UnsupportedMediaTypeError(file.mimetype);
    }

    const buffer = Buffer.isBuffer(file.file) ? file.file : Buffer.from(file.file);
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const duplicate = await prisma.uploadedDocument.findFirst({
      where: {
        sha256,
        OR: [
          {
            salaryReceiptDrafts: {
              some: { status: { in: ["processing", "preview_ready", "accepted"] } },
            },
          },
          {
            salaryReceipts: {
              some: { status: { in: ["accepted", "superseded"] } },
            },
          },
        ],
      },
      select: { fileName: true },
    });
    if (duplicate) {
      throw new AppError(
        "SALARY_RECEIPT_DUPLICATE",
        `Este recibo ya fue importado (${duplicate.fileName}).`,
        409,
      );
    }

    const storageDir = path.resolve(env.STORAGE_DIR, "salary-receipts");
    await fs.mkdir(storageDir, { recursive: true });
    const safeFilename = file.filename.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const storagePath = path.join(storageDir, `${sha256}_${safeFilename}`);
    await fs.writeFile(storagePath, buffer);

    const document = await prisma.uploadedDocument.create({
      data: {
        fileName: file.filename,
        mimeType: file.mimetype,
        sizeBytes: buffer.length,
        sha256,
        storagePath,
      },
    });
    const draft = await prisma.salaryReceiptDraft.create({
      data: {
        documentId: document.id,
        aiRunId: null,
        status: "processing",
      },
    });

    try {
      const result = await salaryReceiptExtractionService.extract(storagePath);
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.uploadedDocument.update({
          where: { id: document.id },
          data: { pageCount: result.pageCount },
        });
        await tx.salaryReceiptDraft.update({
          where: { id: draft.id },
          data: {
            status: "preview_ready",
            previewJson: JSON.stringify(result.preview),
            items: {
              create: result.preview.items.map((item) => ({
                displayOrder: item.displayOrder,
                kind: item.kind,
                code: item.code,
                label: item.label,
                amountRaw: item.amount,
                sourcePage: item.sourcePage,
                originalText: item.originalText,
                confidence: item.confidence,
              })),
            },
          },
        });
      });

      logger.info(
        {
          draftId: draft.id,
          documentId: document.id,
          parser: result.model,
          rawResponseHash: result.rawResponseHash,
          durationMs: result.durationMs,
        },
        "Deterministic salary receipt preview ready",
      );
      return this.getDraft(draft.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await prisma.salaryReceiptDraft.update({
        where: { id: draft.id },
        data: {
          status: "failed",
          previewJson: JSON.stringify({ error: message }),
        },
      });
      throw error;
    }
  }
}

export const salaryReceiptsService = new SalaryReceiptsService();
