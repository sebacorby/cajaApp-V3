import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { cardsService } from "./cards.service.js";
import { cardStatementPreviewSchema, exchangeRateUpdateSchema, statementArchiveSchema } from "./cards.schemas.js";
import { validateData } from "../../shared/validation.js";
import { logger } from "../../shared/logger.js";
import { cardStatementMapper } from "./card-statement.mapper.js";

export const cardsController: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/statements", async (request, reply) => {
    const query = request.query as {
      limit?: string;
      search?: string;
      status?: string;
      includeArchived?: string;
    };
    const statements = await cardsService.listStatements({
      limit: query.limit ? Number.parseInt(query.limit, 10) : 50,
      search: query.search,
      status: query.status,
      includeArchived: query.includeArchived === "true",
    });
    return reply.send({ statements });
  });

  app.get("/statements/latest", async (_request, reply) => {
    const statement = await cardsService.getLatestStatement();

    if (!statement) {
      return reply.status(404).send({
        code: "NO_ACCEPTED_STATEMENT",
        message: "No accepted card statement exists yet",
      });
    }

    const response = cardStatementMapper.statementToApiResponse(statement);
    const pricing = await cardsService.getPricing(
      response.summary.totalPesos,
      response.summary.totalDollars,
      response.projections,
    );

    return reply.send({
      ...response,
      exchangeRate: pricing.exchangeRate,
      equivalents: pricing.equivalents,
      projections: pricing.months,
    });
  });

  app.get("/statements/:statementId/traceability", async (request, reply) => {
    const params = request.params as { statementId: string };
    const traceability = await cardsService.getStatementTraceability(params.statementId);
    return reply.send(traceability);
  });

  app.post("/statements/:statementId/archive", async (request, reply) => {
    const params = request.params as { statementId: string };
    const input = validateData(statementArchiveSchema, request.body ?? {});
    const result = await cardsService.archiveStatement(params.statementId, input.reason);
    return reply.send(result);
  });

  app.post("/statements/:statementId/activate", async (request, reply) => {
    const params = request.params as { statementId: string };
    const statement = await cardsService.activateStatement(params.statementId);
    const response = cardStatementMapper.statementToApiResponse(statement);
    const pricing = await cardsService.getPricing(
      response.summary.totalPesos,
      response.summary.totalDollars,
      response.projections,
    );
    return reply.send({
      ...response,
      exchangeRate: pricing.exchangeRate,
      equivalents: pricing.equivalents,
      projections: pricing.months,
    });
  });

  app.get("/statements/:statementId", async (request, reply) => {
    const params = request.params as { statementId: string };
    const statement = await cardsService.getStatement(params.statementId);
    const response = cardStatementMapper.statementToApiResponse(statement);
    const pricing = await cardsService.getPricing(
      response.summary.totalPesos,
      response.summary.totalDollars,
      response.projections,
    );

    return reply.send({
      ...response,
      exchangeRate: pricing.exchangeRate,
      equivalents: pricing.equivalents,
      projections: pricing.months,
    });
  });

  app.get("/drafts/:draftId", async (request, reply) => {
    const params = request.params as { draftId: string };
    const { draftId } = params;
    const draft = await cardsService.getDraft(draftId);
    const response = cardStatementMapper.draftToApiResponse(draft);
    const pricing = await cardsService.getPricing(
      response.preview.summary.totalPesos,
      response.preview.summary.totalDollars,
    );
    return reply.send({
      ...response,
      exchangeRate: pricing.exchangeRate,
      equivalents: pricing.equivalents,
    });
  });

  app.put("/drafts/:draftId", async (request, reply) => {
    const params = request.params as { draftId: string };
    const body = request.body as { preview: unknown };
    const { draftId } = params;
    const { preview } = body;

    const validatedPreview = validateData(cardStatementPreviewSchema, preview);

    const result = await cardsService.updateDraft(draftId, validatedPreview);

    logger.info({ draftId }, "Draft updated");

    return reply.send(result);
  });

  app.post("/drafts/:draftId/accept", async (request, reply) => {
    const params = request.params as { draftId: string };
    const body = request.body as { preview: unknown };
    const { draftId } = params;
    const { preview } = body;

    const validatedPreview = validateData(cardStatementPreviewSchema, preview);

    const result = await cardsService.acceptDraft(draftId, validatedPreview);

    logger.info({ draftId, statementId: result.statementId }, "Draft accepted");

    return reply.send(result);
  });


  app.get("/exchange-rate", async (_request, reply) => {
    const exchangeRate = await cardsService.getExchangeRate();
    return reply.send(exchangeRate);
  });

  app.put("/exchange-rate", async (request, reply) => {
    const input = validateData(exchangeRateUpdateSchema, request.body);
    const exchangeRate = await cardsService.updateExchangeRate(input);
    return reply.send(exchangeRate);
  });

  app.get("/updated-values", async (request, reply) => {
    const query = request.query as { from?: string; to?: string };
    const { from, to } = query;

    if (!from || !to) {
      return reply.status(400).send({ error: "from and to query parameters are required" });
    }

    const result = await cardsService.getUpdatedValues(from, to);
    return reply.send(result);
  });
};
