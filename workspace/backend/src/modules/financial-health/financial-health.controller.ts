import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { validateData } from "../../shared/validation.js";
import {
  financialHealthHistoryQuerySchema,
  financialHealthQuerySchema,
  financialHealthSnapshotParamsSchema,
  financialHealthSnapshotSchema,
  type FinancialHealthHistoryQueryInput,
  type FinancialHealthQueryInput,
  type FinancialHealthSnapshotParamsInput,
} from "./financial-health.schemas.js";
import { financialHealthService } from "./financial-health.service.js";


export const financialHealthController: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/", async (request, reply) => {
    const query = validateData(financialHealthQuerySchema, request.query) as FinancialHealthQueryInput;
    return reply.send(await financialHealthService.evaluate(query));
  });


  app.get("/history", async (request, reply) => {
    const query = validateData(
      financialHealthHistoryQuerySchema,
      request.query,
    ) as FinancialHealthHistoryQueryInput;
    return reply.send({ history: await financialHealthService.history(query.limit) });
  });


  app.post("/snapshots", async (request, reply) => {
    const input = validateData(
      financialHealthSnapshotSchema,
      request.body,
    ) as FinancialHealthQueryInput;
    return reply.status(201).send(await financialHealthService.saveSnapshot(input));
  });


  app.delete("/snapshots/:snapshotId", async (request, reply) => {
    const params = validateData(
      financialHealthSnapshotParamsSchema,
      request.params,
    ) as FinancialHealthSnapshotParamsInput;
    return reply.send(await financialHealthService.deleteSnapshot(params.snapshotId));
  });
};