import type { FastifyPluginAsync } from "fastify";
import { incomesController } from "./incomes.controller.js";

export const incomesRoutes: FastifyPluginAsync = async (app) => {
  app.register(incomesController, { prefix: "/api/incomes" });
};
