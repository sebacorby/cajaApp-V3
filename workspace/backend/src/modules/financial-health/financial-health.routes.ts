import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { financialHealthController } from "./financial-health.controller.js";


export const financialHealthRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  await app.register(financialHealthController, { prefix: "/api/financial-health" });
};