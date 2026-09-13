import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import {
  AppError,
  FileRequiredError,
  FileTooLargeError,
  NotFoundError,
  UnsupportedMediaTypeError,
  ValidationError,
} from "../../shared/errors.js";
import { logger } from "../../shared/logger.js";
import {
  normalizeSalaryAmount,
  recalculateSalaryReceiptPreview,
  salaryReceiptExtractionService,
} from "./salary-receipt-extraction.service.js";
import type {
  AcceptSalaryReceiptInput,
  SalaryReceiptPreview,
} from "./salary-receipts.types.js";

function normalizeIdentity(value: string | null | undefined): string {
  return (value ?? "unknown")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

export function buildSalaryReceiptHistoryKey(preview: SalaryReceiptPreview): string {
  const employerIdentity = preview.source.employerTaxId
    ? `tax:${normalizeIdentity(preview.source.employerTaxId)}`
    : `name:${normalizeIdentity(preview.source.employerName)}`;
  const employeeIdentity = preview.source.employeeTaxId
    ? `tax:${normalizeIdentity(preview.source.employeeTaxId)}`
    : `name:${normalizeIdentity(preview.source.employeeName)}`;
  return [employerIdentity, employeeIdentity, preview.source.periodMonthKey].join("|");
}

function assertMoney(value: string, currency: string): void {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized) || Number(normalized) < 0) {
    throw new ValidationError(`Invalid ${currency} salary receipt amount: ${value}`);
  }
}

function normalizeEditableAmount(value: string): string {
  const compact = value.trim().replace(/\s/g, "");
  const valid =
    /^\d+(?:[.,]\d{1,2})?$/.test(compact) ||
    /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(compact) ||
    /^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(compact);
  if (!valid) throw new ValidationError(`Invalid salary receipt amount: ${value}`);
  return normalizeSalaryAmount(compact);
}

function readPreview(previewJson: string | null): SalaryReceiptPreview {
  if (!previewJson) throw new ValidationError("The salary receipt draft has no preview");
  return JSON.parse(previewJson) as SalaryReceiptPreview;
}

function receiptLabel(preview: SalaryReceiptPreview): string {
  return `Sueldo ${preview.source.periodMonthKey} · ${preview.source.employerName}`;
}

function datePaymentDay(payDate: string | null): number | null {
  if (!payDate || !/^\d{4}-\d{2}-\d{2}$/.test(payDate)) return null;
  return Number.parseInt(payDate.slice(8, 10), 10);
}

function mapDraft(draft: {
  id: string;
  status: string;
  previewJson: string | null;
  createdAt: Date;
  updatedAt: Date;
  document: { id: string; fileName: string; pageCount: number | null; sha256: string };
  aiRun: { id: string; status: string; modelProvider: string; modelName: string; completedAt: Date | null } | null;
}) {
  return {
    id: draft.id,
    status: draft.status,
    preview: draft.previewJson ? JSON.parse(draft.previewJson) as SalaryReceiptPreview : null,
    document: draft.document,
    aiRun: draft.aiRun,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  };
}

function mapReceipt(receipt: {
  id: string;
  status: string;
  historyKey: string;
  version: number;
  isActiveForPeriod: boolean;
  employerName: string;
  employerTaxId: string | null;
  employeeName: string;
  employeeTaxId: string | null;
  periodMonthKey: string;
  payDate: string | null;
  currency: string;
  grossAmountRaw: string;
  deductionsAmountRaw: string;
  netAmountRaw: string;
  sourceId: string | null;
  actualIncomeEventId: string | null;
  projectionIncomeEventId: string | null;
  acceptedAt: Date;
  reversedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  document: { id: string; fileName: string; pageCount: number | null; sha256: string };
  items?: Array<{
    id: string;
    displayOrder: number;
    kind: string;
    code: string | null;
    label: string;
    amountRaw: string;
    sourcePage: number | null;
    originalText: string;
    confidence: number | null;
  }>;
}) {
  return {
    ...receipt,
    grossAmount: receipt.grossAmountRaw,
    deductionsAmount: receipt.deductionsAmountRaw,
    netAmount: receipt.netAmountRaw,
    grossAmountRaw: undefined,
    deductionsAmountRaw: undefined,
    netAmountRaw: undefined,
    acceptedAt: receipt.acceptedAt.toISOString(),
    reversedAt: receipt.reversedAt?.toISOString() ?? null,
    createdAt: receipt.createdAt.toISOString(),
    updatedAt: receipt.updatedAt.toISOString(),
    items: receipt.items?.map((item) => ({
      ...item,
      amount: item.amountRaw,
      amountRaw: undefined,
    })),
  };
}

export class SalaryReceiptsService {
  async importPdf(file: {
    filename: string;
    mimetype: string;
    file: Buffer | Uint8Array;
  }) {
    if (!file.file || file.file.length === 0) throw new FileRequiredError();
    if (file.file.length > env.MAX_UPLOAD_BYTES) throw new FileTooLargeError(env.MAX_UPLOAD_BYTES);
    if (file.mimetype !== "application/pdf") throw new UnsupportedMediaTypeError(file.mimetype);

    const buffer = Buffer.isBuffer(file.file) ? file.file : Buffer.from(file.file);
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const duplicate = await prisma.uploadedDocument.findFirst({
      where: {
        sha256,
        OR: [
          { salaryReceiptDrafts: { some: { status: { in: ["processing", "preview_ready", "accepted"] } } } },
          { salaryReceipts: { some: { status: { in: ["accepted", "superseded"] } } } },
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

    const aiRun = await prisma.aiExtractionRun.create({
      data: {
        documentId: document.id,
        promptFilePath: `${env.SALARY_RECEIPT_PROMPTS_DIR}/01-extract-salary-receipt.md`,
        promptHash: "pending",
        modelProvider: env.AI_PROVIDER,
        modelBaseUrl: env.AI_PROVIDER === "ollama" ? env.OLLAMA_BASE_URL : env.AI_BASE_URL!,
        modelName: env.AI_PROVIDER === "ollama" ? env.OLLAMA_MODEL : (env.AI_MODEL ?? "unknown"),
        status: "processing",
      },
    });

    const draft = await prisma.salaryReceiptDraft.create({
      data: {
        documentId: document.id,
        aiRunId: aiRun.id,
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
        await tx.aiExtractionRun.update({
          where: { id: aiRun.id },
          data: {
            promptFilePath: result.promptPath,
            promptHash: result.promptHash,
            promptVersion: result.preview.version,
            modelProvider: result.provider,
            modelName: result.model,
            rawResponseHash: result.rawResponseHash,
            jsonOutput: JSON.stringify(result.rawResponse),
            validationErrors: JSON.stringify(result.preview.warnings),
            status: "completed",
            completedAt: new Date(),
          },
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

      logger.info({ draftId: draft.id, documentId: document.id }, "Salary receipt preview ready");
      return this.getDraft(draft.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await prisma.$transaction([
        prisma.salaryReceiptDraft.update({
          where: { id: draft.id },
          data: { status: "failed", previewJson: JSON.stringify({ error: message }) },
        }),
        prisma.aiExtractionRun.update({
          where: { id: aiRun.id },
          data: {
            status: "failed",
            validationErrors: JSON.stringify([{ message }]),
            completedAt: new Date(),
          },
        }),
      ]);
      throw error;
    }
  }

  async getDraft(draftId: string) {
    const draft = await prisma.salaryReceiptDraft.findUnique({
      where: { id: draftId },
      include: {
        document: { select: { id: true, fileName: true, pageCount: true, sha256: true } },
        aiRun: { select: { id: true, status: true, modelProvider: true, modelName: true, completedAt: true } },
      },
    });
    if (!draft) throw new NotFoundError("Salary receipt draft");
    return mapDraft(draft);
  }

  async updateDraft(draftId: string, preview: SalaryReceiptPreview) {
    for (const item of preview.items) assertMoney(normalizeEditableAmount(item.amount), preview.source.currency);
    const recalculatedPreview = recalculateSalaryReceiptPreview(preview);
    assertMoney(recalculatedPreview.summary.grossAmount, recalculatedPreview.source.currency);
    assertMoney(recalculatedPreview.summary.deductionsAmount, recalculatedPreview.source.currency);
    assertMoney(recalculatedPreview.summary.netAmount, recalculatedPreview.source.currency);

    const existing = await prisma.salaryReceiptDraft.findUnique({ where: { id: draftId } });
    if (!existing) throw new NotFoundError("Salary receipt draft");
    if (existing.status !== "preview_ready") {
      throw new ValidationError("Only preview-ready salary receipt drafts can be edited");
    }

    await prisma.$transaction([
      prisma.salaryReceiptDraftItem.deleteMany({ where: { draftId } }),
      prisma.salaryReceiptDraft.update({
        where: { id: draftId },
        data: {
          previewJson: JSON.stringify(recalculatedPreview),
          items: {
            create: recalculatedPreview.items.map((item, index) => ({
              displayOrder: index + 1,
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
      }),
    ]);
    return this.getDraft(draftId);
  }

  private async resolveIncomeSource(
    tx: Prisma.TransactionClient,
    preview: SalaryReceiptPreview,
    requestedSourceId?: string | null,
  ) {
    if (requestedSourceId) {
      const source = await tx.incomeSource.findUnique({ where: { id: requestedSourceId } });
      if (!source) throw new NotFoundError("Income source");
      if (source.kind !== "salary") throw new ValidationError("The selected income source is not a salary source");
      if (source.currency !== preview.source.currency) throw new ValidationError("The selected income source uses another currency");
      return source;
    }

    const salarySources = await tx.incomeSource.findMany({
      where: { kind: "salary", currency: preview.source.currency, active: true },
      orderBy: { createdAt: "asc" },
    });
    const matching = salarySources.find((source: { employer: string | null }) =>
      normalizeIdentity(source.employer) === normalizeIdentity(preview.source.employerName),
    );
    if (matching) return matching;

    return tx.incomeSource.create({
      data: {
        name: `Sueldo ${preview.source.employerName}`,
        employer: preview.source.employerName,
        kind: "salary",
        currency: preview.source.currency,
        baseAmountRaw: preview.summary.netAmount,
        startMonthKey: preview.source.periodMonthKey,
        paymentDay: datePaymentDay(preview.source.payDate),
        increaseEveryMonths: 3,
        increasePercentRaw: "0",
        active: true,
      },
    });
  }

  async acceptDraft(draftId: string, input: AcceptSalaryReceiptInput) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const draft = await tx.salaryReceiptDraft.findUnique({
        where: { id: draftId },
        include: { document: true, acceptedReceipt: true },
      });
      if (!draft) throw new NotFoundError("Salary receipt draft");
      if (draft.status !== "preview_ready") {
        if (draft.acceptedReceipt) return mapReceipt({
          ...draft.acceptedReceipt,
          document: {
            id: draft.document.id,
            fileName: draft.document.fileName,
            pageCount: draft.document.pageCount,
            sha256: draft.document.sha256,
          },
        });
        throw new ValidationError("The salary receipt draft is not ready to accept");
      }

      const preview = readPreview(draft.previewJson);
      const historyKey = buildSalaryReceiptHistoryKey(preview);
      const existing = await tx.salaryReceipt.findFirst({
        where: { historyKey, isActiveForPeriod: true, status: "accepted" },
        orderBy: { version: "desc" },
      });
      const latest = await tx.salaryReceipt.findFirst({
        where: { historyKey },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const source = await this.resolveIncomeSource(tx, preview, input.sourceId);

      if (existing) {
        const previousEventIds = [
          existing.actualIncomeEventId,
          existing.projectionIncomeEventId,
        ].filter((value): value is string => Boolean(value));
        await tx.salaryReceipt.update({
          where: { id: existing.id },
          data: {
            status: "superseded",
            isActiveForPeriod: false,
            actualIncomeEventId: null,
            projectionIncomeEventId: null,
          },
        });
        if (previousEventIds.length > 0) {
          await tx.incomeEvent.deleteMany({ where: { id: { in: previousEventIds } } });
        }
      }

      const actualDedupe = `salary-receipt:actual:${source.id}:${preview.source.periodMonthKey}`;
      const actualEvent = await tx.incomeEvent.upsert({
        where: { dedupeKey: actualDedupe },
        create: {
          sourceId: source.id,
          dedupeKey: actualDedupe,
          monthKey: preview.source.periodMonthKey,
          kind: "monthly_override",
          currency: preview.source.currency,
          amountRaw: preview.summary.netAmount,
          label: receiptLabel(preview),
          status: "actual",
          notes: `Importado desde recibo ${draft.document.fileName}`,
        },
        update: {
          sourceId: source.id,
          currency: preview.source.currency,
          amountRaw: preview.summary.netAmount,
          label: receiptLabel(preview),
          status: "actual",
          notes: `Actualizado desde recibo ${draft.document.fileName}`,
        },
      });

      let projectionEvent: { id: string } | null = null;
      const projectionDedupe = `salary-receipt:projection:${source.id}:${preview.source.periodMonthKey}`;
      if (input.useAsFutureBase) {
        projectionEvent = await tx.incomeEvent.upsert({
          where: { dedupeKey: projectionDedupe },
          create: {
            sourceId: source.id,
            dedupeKey: projectionDedupe,
            monthKey: preview.source.periodMonthKey,
            kind: "permanent_adjustment",
            currency: preview.source.currency,
            amountRaw: preview.summary.netAmount,
            label: `Nueva base desde ${preview.source.periodMonthKey}`,
            status: "projected",
            notes: `Base salarial tomada del recibo ${draft.document.fileName}`,
          },
          update: {
            amountRaw: preview.summary.netAmount,
            label: `Nueva base desde ${preview.source.periodMonthKey}`,
            status: "projected",
            notes: `Base salarial actualizada desde ${draft.document.fileName}`,
          },
        });
      } else {
        await tx.incomeEvent.deleteMany({ where: { dedupeKey: projectionDedupe } });
      }

      const receipt = await tx.salaryReceipt.create({
        data: {
          documentId: draft.documentId,
          draftId: draft.id,
          historyKey,
          version: (latest?.version ?? 0) + 1,
          isActiveForPeriod: true,
          status: "accepted",
          employerName: preview.source.employerName,
          employerTaxId: preview.source.employerTaxId,
          employeeName: preview.source.employeeName,
          employeeTaxId: preview.source.employeeTaxId,
          periodMonthKey: preview.source.periodMonthKey,
          payDate: preview.source.payDate,
          currency: preview.source.currency,
          grossAmountRaw: preview.summary.grossAmount,
          deductionsAmountRaw: preview.summary.deductionsAmount,
          netAmountRaw: preview.summary.netAmount,
          sourceId: source.id,
          actualIncomeEventId: actualEvent.id,
          projectionIncomeEventId: projectionEvent?.id ?? null,
          items: {
            create: preview.items.map((item, index) => ({
              displayOrder: index + 1,
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
        include: {
          document: { select: { id: true, fileName: true, pageCount: true, sha256: true } },
          items: { orderBy: { displayOrder: "asc" } },
        },
      });

      await tx.salaryReceiptDraft.update({
        where: { id: draft.id },
        data: { status: "accepted" },
      });

      logger.info({ receiptId: receipt.id, sourceId: source.id, historyKey }, "Salary receipt accepted");
      return mapReceipt(receipt);
    });
  }

  async list(input: { limit: number; includeReversed: boolean }) {
    const records = await prisma.salaryReceipt.findMany({
      where: input.includeReversed ? undefined : { status: { not: "reversed" } },
      take: input.limit,
      orderBy: [{ periodMonthKey: "desc" }, { version: "desc" }],
      include: {
        document: { select: { id: true, fileName: true, pageCount: true, sha256: true } },
      },
    });
    return records.map(mapReceipt);
  }

  async get(receiptId: string) {
    const receipt = await prisma.salaryReceipt.findUnique({
      where: { id: receiptId },
      include: {
        document: { select: { id: true, fileName: true, pageCount: true, sha256: true } },
        items: { orderBy: { displayOrder: "asc" } },
      },
    });
    if (!receipt) throw new NotFoundError("Salary receipt");
    return mapReceipt(receipt);
  }

  async reverse(receiptId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const receipt = await tx.salaryReceipt.findUnique({ where: { id: receiptId } });
      if (!receipt) throw new NotFoundError("Salary receipt");
      if (receipt.status === "reversed") return { success: true };

      if (receipt.actualIncomeEventId) {
        await tx.incomeEvent.deleteMany({ where: { id: receipt.actualIncomeEventId } });
      }
      if (receipt.projectionIncomeEventId) {
        await tx.incomeEvent.deleteMany({ where: { id: receipt.projectionIncomeEventId } });
      }
      await tx.salaryReceipt.update({
        where: { id: receiptId },
        data: {
          status: "reversed",
          isActiveForPeriod: false,
          actualIncomeEventId: null,
          projectionIncomeEventId: null,
          reversedAt: new Date(),
        },
      });
      return { success: true };
    });
  }
}

export const salaryReceiptsService = new SalaryReceiptsService();
