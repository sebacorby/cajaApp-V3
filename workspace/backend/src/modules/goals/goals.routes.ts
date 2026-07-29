import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { goalsController } from "./goals.controller.js";

export const goalsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  await app.register(goalsController, { prefix: "/api/goals" });
};
