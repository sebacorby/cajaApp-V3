import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { debitImportsController } from "./debit-imports.controller.js";

export const debitImportsRoutes: FastifyPluginAsync = async (
  app: FastifyInstance,
) => {
  await app.register(debitImportsController, {
    prefix: "/api/debit-imports",
  });
};
