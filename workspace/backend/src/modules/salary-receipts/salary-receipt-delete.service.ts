import fs from "node:fs/promises";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { AppError, NotFoundError } from "../../shared/errors.js";
import { logger } from "../../shared/logger.js";
import {
  canDeleteSalaryReceiptDraftStatus,
  canDeleteSalaryReceiptStatus,
} from "./salary-receipt-delete.policy.js";

export type DeleteSalaryReceiptResult = {
  deleted: true;
  deletedReceiptId: string;
  deletedDocumentId: string | null;
};

export type PendingSalaryReceiptDraft = {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  document: { fileName: string };
};

export async function listPendingSalaryReceiptDrafts(): Promise<PendingSalaryReceiptDraft[]> {
  return prisma.salaryReceiptDraft.findMany({
    where: {
      acceptedReceipt: null,
      status: { in: ["preview_ready", "failed", "draft"] },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      document: { select: { fileName: true } },
    },
  });
}

export async function deleteSalaryReceiptDraft(draftId: string) {
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const draft = await tx.salaryReceiptDraft.findUnique({
      where: { id: draftId },
      select: {
        id: true,
        status: true,
        documentId: true,
        aiRunId: true,
        acceptedReceipt: { select: { id: true } },
        document: { select: { storagePath: true } },
      },
    });

    if (!draft) throw new NotFoundError("Salary receipt draft");
    if (draft.acceptedReceipt) {
      throw new AppError(
        "SALARY_RECEIPT_DRAFT_ALREADY_ACCEPTED",
        "El borrador ya fue aceptado y no puede descartarse.",
        409,
      );
    }
    if (!canDeleteSalaryReceiptDraftStatus(draft.status)) {
      throw new AppError(
        "SALARY_RECEIPT_DRAFT_STATUS_NOT_DELETABLE",
        "El borrador no puede eliminarse en su estado actual.",
        409,
      );
    }

    await tx.salaryReceiptDraft.delete({ where: { id: draft.id } });

    const [remainingReceipts, remainingDrafts, cardStatements, cardDrafts] =
      await Promise.all([
        tx.salaryReceipt.count({ where: { documentId: draft.documentId } }),
        tx.salaryReceiptDraft.count({ where: { documentId: draft.documentId } }),
        tx.cardStatement.count({ where: { documentId: draft.documentId } }),
        tx.cardStatementDraft.count({ where: { documentId: draft.documentId } }),
      ]);

    const deleteDocument =
      remainingReceipts === 0 &&
      remainingDrafts === 0 &&
      cardStatements === 0 &&
      cardDrafts === 0;

    if (deleteDocument) {
      await tx.uploadedDocument.delete({ where: { id: draft.documentId } });
    } else if (draft.aiRunId) {
      await tx.aiExtractionRun.deleteMany({ where: { id: draft.aiRunId } });
    }

    return {
      response: {
        deleted: true as const,
        deletedDraftId: draft.id,
        deletedDocumentId: deleteDocument ? draft.documentId : null,
      },
      storagePath: deleteDocument ? draft.document.storagePath : null,
    };
  });

  if (result.storagePath) {
    try {
      await fs.unlink(result.storagePath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        logger.warn(
          { error, draftId, storagePath: result.storagePath },
          "Salary receipt draft was deleted but the source file could not be removed",
        );
      }
    }
  }

  logger.info(result.response, "Pending salary receipt draft deleted");
  return result.response;
}

export async function deleteSalaryReceipt(
  receiptId: string,
): Promise<DeleteSalaryReceiptResult> {
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const receipt = await tx.salaryReceipt.findUnique({
      where: { id: receiptId },
      select: {
        id: true,
        status: true,
        draftId: true,
        documentId: true,
        document: { select: { storagePath: true } },
        draft: { select: { aiRunId: true } },
      },
    });

    if (!receipt) throw new NotFoundError("Salary receipt");
    if (!canDeleteSalaryReceiptStatus(receipt.status)) {
      throw new AppError(
        "SALARY_RECEIPT_STATUS_NOT_DELETABLE",
        "Solo se pueden eliminar recibos anulados.",
        409,
      );
    }

    await tx.salaryReceipt.delete({ where: { id: receipt.id } });

    if (receipt.draftId) {
      await tx.salaryReceiptDraft.delete({ where: { id: receipt.draftId } });
    }

    const [remainingReceipts, remainingDrafts, cardStatements, cardDrafts] =
      await Promise.all([
        tx.salaryReceipt.count({ where: { documentId: receipt.documentId } }),
        tx.salaryReceiptDraft.count({ where: { documentId: receipt.documentId } }),
        tx.cardStatement.count({ where: { documentId: receipt.documentId } }),
        tx.cardStatementDraft.count({ where: { documentId: receipt.documentId } }),
      ]);

    const deleteDocument =
      remainingReceipts === 0 &&
      remainingDrafts === 0 &&
      cardStatements === 0 &&
      cardDrafts === 0;

    if (deleteDocument) {
      await tx.uploadedDocument.delete({ where: { id: receipt.documentId } });
    } else if (receipt.draft?.aiRunId) {
      await tx.aiExtractionRun.deleteMany({ where: { id: receipt.draft.aiRunId } });
    }

    return {
      response: {
        deleted: true as const,
        deletedReceiptId: receipt.id,
        deletedDocumentId: deleteDocument ? receipt.documentId : null,
      },
      storagePath: deleteDocument ? receipt.document.storagePath : null,
    };
  });

  if (result.storagePath) {
    try {
      await fs.unlink(result.storagePath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        logger.warn(
          { error, receiptId, storagePath: result.storagePath },
          "Salary receipt database records were deleted but the source file could not be removed",
        );
      }
    }
  }

  logger.info(result.response, "Reversed salary receipt deleted");
  return result.response;
}
