import type { FastifyPluginAsync } from "fastify";
import { importCenterController } from "./import-center.controller.js";

export const importCenterRoutes: FastifyPluginAsync = async (app) => {
  await app.register(importCenterController, {
    prefix: "/api/import-center",
  });
};
