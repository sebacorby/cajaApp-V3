import type { FastifyPluginAsync } from "fastify";
import { salaryReceiptsController } from "./salary-receipts.controller.js";

export const salaryReceiptsRoutes: FastifyPluginAsync = async (app) => {
  app.register(salaryReceiptsController, { prefix: "/api/salary-receipts" });
};
