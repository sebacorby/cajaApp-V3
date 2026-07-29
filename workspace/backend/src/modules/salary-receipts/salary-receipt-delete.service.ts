import fs from "node:fs/promises";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { AppError, NotFoundError } from "../../shared/errors.js";
import { logger } from "../../shared/logger.js";
import { canDeleteSalaryReceiptStatus } from "./salary-receipt-delete.policy.js";

export type DeleteSalaryReceiptResult = {
  deleted: true;
  deletedReceiptId: string;
  deletedDocumentId: string | null;
};

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
