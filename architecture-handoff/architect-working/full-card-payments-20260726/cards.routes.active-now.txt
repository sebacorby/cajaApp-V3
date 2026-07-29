import { FastifyPluginAsync, FastifyRequest } from "fastify";
import { cardsController } from "./cards.controller.js";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../shared/logger.js";
import { releaseCardImportDocument } from "../imports/card-import-lifecycle.js";
import { persistIssuerFutureReferences } from "./issuer-future-reference.js";
import { listIssuerFutureReferences } from "./issuer-future-reference-query.js";
import { cardPaymentsService } from "./card-payments.service.js";
import { normalizeManualCardAssignments } from "./card-payments-manual-normalizer.js";
import type { CardStatementPreview } from "./cards.types.js";

const deletedStatementDocumentByRequest = new WeakMap<FastifyRequest, string>();

function isSuccessfulStatus(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

function acceptedPreview(
  request: FastifyRequest,
): Pick<CardStatementPreview, "futureInstallmentsBlock"> | null {
  const body = request.body as { preview?: unknown } | undefined;
  const preview = body?.preview;
  if (!preview || typeof preview !== "object" || Array.isArray(preview)) return null;

  const futureInstallmentsBlock = (
    preview as { futureInstallmentsBlock?: unknown }
  ).futureInstallmentsBlock;

  if (!Array.isArray(futureInstallmentsBlock)) {
    return { futureInstallmentsBlock: [] };
  }

  return {
    futureInstallmentsBlock:
      futureInstallmentsBlock as CardStatementPreview["futureInstallmentsBlock"],
  };
}

function acceptedDraftId(request: FastifyRequest): string | null {
  if (request.method !== "POST") return null;
  const params = (request.params ?? {}) as { draftId?: string };
  if (!params.draftId) return null;
  return /\/drafts\/[^/]+\/accept(?:\?|$)/.test(request.url)
    ? params.draftId
    : null;
}

export const cardsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", async (request) => {
    if (request.method !== "DELETE") return;

    const params = (request.params ?? {}) as { statementId?: string };
    if (!params.statementId) return;

    const statement = await prisma.cardStatement.findUnique({
      where: { id: params.statementId },
      select: { documentId: true },
    });

    if (statement) {
      deletedStatementDocumentByRequest.set(request, statement.documentId);
    }
  });

  app.addHook("onSend", async (request, reply, payload) => {
    const draftId = acceptedDraftId(request);
    if (isSuccessfulStatus(reply.statusCode) && draftId) {
      const preview = acceptedPreview(request);

      if (preview) {
        try {
          const statement = await prisma.cardStatement.findUnique({
            where: { draftId },
            select: { id: true },
          });

          if (!statement) {
            logger.error(
              {
                event: "card-statement.accept.issuer-future-reference.statement-missing",
                draftId,
              },
              "Accepted statement could not be resolved from draft",
            );
          } else {
            const result = await persistIssuerFutureReferences(statement.id, preview);
            logger.info(
              {
                event: "card-statement.accept.issuer-future-reference.persisted",
                draftId,
                statementId: statement.id,
                persisted: result.persisted,
              },
              "Persisted issuer future installment references",
            );
          }
        } catch (error) {
          logger.error(
            {
              event: "card-statement.accept.issuer-future-reference.failed",
              draftId,
              error,
            },
            "Failed to persist issuer future installment references",
          );
        }
      }
    }

    const documentId = deletedStatementDocumentByRequest.get(request);
    if (!documentId) return payload;

    deletedStatementDocumentByRequest.delete(request);

    if (isSuccessfulStatus(reply.statusCode)) {
      const released = await releaseCardImportDocument(
        documentId,
        "accepted_statement_deleted",
      );

      logger.info(
        {
          event: "card-statement.delete.import-release",
          documentId,
          released,
          statusCode: reply.statusCode,
        },
        "Completed card statement delete import lifecycle cleanup",
      );
    }

    return payload;
  });

  app.get("/api/card-payments", async (request, reply) => {
    const query = request.query as { months?: string };
    const parsedMonths = query.months ? Number.parseInt(query.months, 10) : 6;
    if (!Number.isInteger(parsedMonths) || parsedMonths < 1 || parsedMonths > 24) {
      return reply.status(400).send({
        code: "INVALID_MONTHS",
        message: "months must be an integer between 1 and 24",
      });
    }

    const result = await cardPaymentsService.getPayments({ months: parsedMonths });
    return reply.send(normalizeManualCardAssignments(result));
  });

  app.get(
    "/api/card-statements/statements/:statementId/issuer-future-references",
    async (request, reply) => {
      const { statementId } = request.params as { statementId: string };
      const statement = await prisma.cardStatement.findUnique({
        where: { id: statementId },
        select: { id: true },
      });

      if (!statement) {
        return reply.status(404).send({
          code: "NOT_FOUND",
          message: "Card statement not found",
        });
      }

      const references = await listIssuerFutureReferences(statementId);
      return reply.send({
        statementId,
        issuerFutureInstallments: references,
      });
    },
  );

  app.register(cardsController, { prefix: "/api/card-statements" });
};
