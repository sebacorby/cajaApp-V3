import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { manualPurchasesService } from "./manual-purchases.service.js";
import { logger } from "../../shared/logger.js";

interface CreatePurchaseBody {
  statementId: string;
  cardLast4: string;
  holderName: string;
  purchaseDate: string;
  description: string;
  currency: "ARS" | "USD";
  amount: string;
  installments: number;
  notes?: string;
}

export const manualPurchasesController: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post<{ Body: CreatePurchaseBody }>("/manual-purchases", async (request, reply) => {
    const body = request.body;

    if (!body.statementId || !body.cardLast4 || !body.holderName || !body.purchaseDate || !body.description || !body.currency || !body.amount || !body.installments) {
      return reply.status(400).send({ error: "Missing required fields" });
    }

    logger.info({ body }, "Manual purchase request received");

    const result = await manualPurchasesService.createPurchase(body.statementId, {
      cardLast4: body.cardLast4,
      holderName: body.holderName,
      purchaseDate: body.purchaseDate,
      description: body.description,
      currency: body.currency,
      amount: body.amount,
      installments: body.installments,
      notes: body.notes,
    });

    return reply.send(result);
  });

  app.delete("/manual-purchases/:purchaseId", async (request, reply) => {
    const params = request.params as { purchaseId: string };
    const result = await manualPurchasesService.deletePurchase(params.purchaseId);
    return reply.send(result);
  });

};
