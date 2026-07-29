import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { validateData } from "../../shared/validation.js";
import {
  createMonthCloseSchema,
  listMonthCloseQuerySchema,
  monthCloseParamsSchema,
} from "./month-close.schemas.js";
import { monthCloseService } from "./month-close.service.js";

export const monthCloseController: FastifyPluginAsync = async (
  app: FastifyInstance,
) => {
  app.get("/", async (request, reply) => {
    const query = validateData(listMonthCloseQuerySchema, request.query);
    return reply.send(
      await monthCloseService.list({
        monthKey: query.monthKey,
        status: query.status ?? "all",
        limit: query.limit ? Number(query.limit) : 25,
        offset: query.offset ? Number(query.offset) : 0,
      }),
    );
  });

  app.post("/", async (request, reply) => {
    const input = validateData(createMonthCloseSchema, request.body);
    return reply.status(201).send(await monthCloseService.create(input.monthKey));
  });

  app.get("/:id", async (request, reply) => {
    const params = validateData(monthCloseParamsSchema, request.params);
    return reply.send(await monthCloseService.detail(params.id));
  });

  app.post("/:id/reopen", async (request, reply) => {
    const params = validateData(monthCloseParamsSchema, request.params);
    return reply.send(await monthCloseService.reopen(params.id));
  });
};
