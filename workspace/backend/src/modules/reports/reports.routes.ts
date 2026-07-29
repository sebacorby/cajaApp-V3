import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { reportsController } from "./reports.controller.js";

export const reportsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  await app.register(reportsController, { prefix: "/api/reports" });
};
