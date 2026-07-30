import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { validateData } from "../../shared/validation.js";
import {
  createIncomeEventSchema,
  createIncomeSourceSchema,
  incomeEntityIdSchema,
  monthKeySchema,
  updateIncomeSourceSchema,
  type CreateIncomeEventInput,
  type CreateIncomeSourceInput,
  type UpdateIncomeSourceInput,
} from "./incomes.schemas.js";
import { incomesService } from "./incomes.service.js";
import { deleteIncomeSourceCascade } from "./income-source-cascade-delete.service.js";

export const incomesController: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/overview", async (request, reply) => {
    const query = request.query as { from?: string; to?: string };
    const from = validateData(monthKeySchema, query.from);
    const to = validateData(monthKeySchema, query.to);
    return reply.send(await incomesService.getOverview(from, to));
  });

  app.post("/sources", async (request, reply) => {
    const input = validateData(
      createIncomeSourceSchema,
      request.body,
    ) as CreateIncomeSourceInput;
    return reply.status(201).send(await incomesService.createSource(input));
  });

  app.put("/sources/:sourceId", async (request, reply) => {
    const params = request.params as { sourceId: string };
    const sourceId = validateData(incomeEntityIdSchema, params.sourceId);
    const input = validateData(
      updateIncomeSourceSchema,
      request.body,
    ) as UpdateIncomeSourceInput;
    return reply.send(await incomesService.updateSource(sourceId, input));
  });

  app.delete("/sources/:sourceId", async (request, reply) => {
    const params = request.params as { sourceId: string };
    const sourceId = validateData(incomeEntityIdSchema, params.sourceId);
    return reply.send(await deleteIncomeSourceCascade(sourceId));
  });

  app.post("/events", async (request, reply) => {
    const input = validateData(
      createIncomeEventSchema,
      request.body,
    ) as CreateIncomeEventInput;
    return reply.status(201).send(await incomesService.createEvent(input));
  });

  app.delete("/events/:eventId", async (request, reply) => {
    const params = request.params as { eventId: string };
    const eventId = validateData(incomeEntityIdSchema, params.eventId);
    return reply.send(await incomesService.deleteEvent(eventId));
  });
};
