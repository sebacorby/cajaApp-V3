import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { validateData } from "../../shared/validation.js";
import {
  futureOverviewQuerySchema,
  type FutureOverviewQueryInput,
} from "./future.schemas.js";
import { futureService } from "./future.service.js";


export const futureController: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/", async (request, reply) => {
    const query = validateData(
      futureOverviewQuerySchema,
      request.query,
    ) as FutureOverviewQueryInput;
    return reply.send(await futureService.getOverview(query));
  });
};