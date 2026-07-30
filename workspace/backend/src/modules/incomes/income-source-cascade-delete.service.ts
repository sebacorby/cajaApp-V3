import fs from "node:fs/promises";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { NotFoundError } from "../../shared/errors.js";
import { logger } from "../../shared/logger.js";

export interface DeleteIncomeSourceCascadeResult {
  success: true;
  deletedSourceId: string;
  deletedReceiptCount: number;
  deletedDocumentCount: number;
}

export async function deleteIncomeSourceCascade(
  sourceId: string,
): Promise<DeleteIncomeSourceCascadeResult> {
  const result = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const source = await tx.incomeSource.findUnique({
        where: { id: sourceId },
        select: {
          id: true,
          salaryReceipts: {
            select: {
              id: true,
              draftId: true,
              documentId: true,
              document: { select: { storagePath: true } },
            },
          },
        },
      });

      if (!source) throw new NotFoundError("Income source");

      const receiptIds = source.salaryReceipts.map((receipt) => receipt.id);
      const draftIds = source.salaryReceipts
        .map((receipt) => receipt.draftId)
        .filter((value): value is string => Boolean(value));
      const documents = Array.from(
        new Map(
          source.salaryReceipts.map((receipt) => [
            receipt.documentId,
            {
              id: receipt.documentId,
              storagePath: receipt.document.storagePath,
            },
          ]),
        ).values(),
      );

      if (receiptIds.length > 0) {
        await tx.salaryReceipt.deleteMany({
          where: { id: { in: receiptIds } },
        });
      }

      if (draftIds.length > 0) {
        await tx.salaryReceiptDraft.deleteMany({
          where: { id: { in: draftIds } },
        });
      }

      await tx.incomeSource.delete({ where: { id: sourceId } });

      const deletedFiles: string[] = [];
      for (const document of documents) {
        const [salaryReceipts, salaryDrafts, cardStatements, cardDrafts] =
          await Promise.all([
            tx.salaryReceipt.count({ where: { documentId: document.id } }),
            tx.salaryReceiptDraft.count({ where: { documentId: document.id } }),
            tx.cardStatement.count({ where: { documentId: document.id } }),
            tx.cardStatementDraft.count({ where: { documentId: document.id } }),
          ]);

        if (
          salaryReceipts === 0 &&
          salaryDrafts === 0 &&
          cardStatements === 0 &&
          cardDrafts === 0
        ) {
          await tx.uploadedDocument.delete({ where: { id: document.id } });
          deletedFiles.push(document.storagePath);
        }
      }

      return {
        response: {
          success: true as const,
          deletedSourceId: sourceId,
          deletedReceiptCount: receiptIds.length,
          deletedDocumentCount: deletedFiles.length,
        },
        deletedFiles,
      };
    },
  );

  for (const storagePath of result.deletedFiles) {
    try {
      await fs.unlink(storagePath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        logger.warn(
          { error, sourceId, storagePath },
          "Income source was deleted but a linked receipt file could not be removed",
        );
      }
    }
  }

  logger.info(result.response, "Income source and linked salary receipts deleted");
  return result.response;
}
