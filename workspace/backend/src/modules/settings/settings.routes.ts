import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { settingsController } from "./settings.controller.js";

export const settingsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  await app.register(settingsController, { prefix: "/api/settings" });
};
