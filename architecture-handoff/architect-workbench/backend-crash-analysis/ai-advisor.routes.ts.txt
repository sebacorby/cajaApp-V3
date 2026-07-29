import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { aiAdvisorController } from "./ai-advisor.controller.js";


export const aiAdvisorRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  await app.register(aiAdvisorController, { prefix: "/api/ai-advisor" });
};