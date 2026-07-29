import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { validateData } from "../../shared/validation.js";
import {
  globalSearchQuerySchema,
  type GlobalSearchQuery,
} from "./global-search.schemas.js";
import { globalSearchService } from "./global-search.service.js";


export const globalSearchController: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/", async (request, reply) => {
    const query = validateData(
      globalSearchQuerySchema,
      request.query,
    ) as GlobalSearchQuery;


    return reply.send(await globalSearchService.search(query));
  });
};