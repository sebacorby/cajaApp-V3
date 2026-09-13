import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { globalSearchController } from "./global-search.controller.js";


export const globalSearchRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  await app.register(globalSearchController, { prefix: "/api/search" });
};