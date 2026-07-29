import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { movementsController } from "./movements.controller.js";

export const movementsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  await app.register(movementsController, { prefix: "/api/movements" });
};
