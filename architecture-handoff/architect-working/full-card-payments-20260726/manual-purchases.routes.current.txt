import { FastifyPluginAsync } from "fastify";
import { manualPurchasesController } from "./manual-purchases.controller.js";

export const manualPurchasesRoutes: FastifyPluginAsync = async (app) => {
  app.register(manualPurchasesController, { prefix: "/api/card-statements" });
};
