import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { validateData } from "../../shared/validation.js";
import { aiAdvisorService } from "./ai-advisor.service.js";
import {
  aiAdvisorContextQuerySchema,
  aiAdvisorHistoryQuerySchema,
  aiAdvisorInteractionParamsSchema,
  aiAdvisorQuestionSchema,
  type AiAdvisorContextQueryInput,
  type AiAdvisorHistoryQueryInput,
  type AiAdvisorInteractionParams,
  type AiAdvisorQuestionInput,
} from "./ai-advisor.schemas.js";


export const aiAdvisorController: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/context", async (request, reply) => {
    const query = validateData(
      aiAdvisorContextQuerySchema,
      request.query,
    ) as AiAdvisorContextQueryInput;
    return reply.send(await aiAdvisorService.context(query));
  });


  app.post("/ask", async (request, reply) => {
    const input = validateData(
      aiAdvisorQuestionSchema,
      request.body,
    ) as AiAdvisorQuestionInput;
    return reply.status(201).send(await aiAdvisorService.ask(input));
  });


  app.get("/history", async (request, reply) => {
    const query = validateData(
      aiAdvisorHistoryQuerySchema,
      request.query,
    ) as AiAdvisorHistoryQueryInput;
    return reply.send(await aiAdvisorService.history(query.limit));
  });


  app.get("/history/:interactionId", async (request, reply) => {
    const params = validateData(
      aiAdvisorInteractionParamsSchema,
      request.params,
    ) as AiAdvisorInteractionParams;
    return reply.send(await aiAdvisorService.detail(params.interactionId));
  });


  app.delete("/history/:interactionId", async (request, reply) => {
    const params = validateData(
      aiAdvisorInteractionParamsSchema,
      request.params,
    ) as AiAdvisorInteractionParams;
    return reply.send(await aiAdvisorService.delete(params.interactionId));
  });
};