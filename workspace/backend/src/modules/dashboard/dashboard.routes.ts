import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { dashboardController } from "./dashboard.controller.js";

export const dashboardRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  await app.register(dashboardController, { prefix: "/api/dashboard" });
};
