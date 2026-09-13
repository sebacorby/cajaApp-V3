import type { FastifyInstance } from "fastify";
import { reconciliationController } from "./reconciliation.controller.js";

export async function reconciliationRoutes(app: FastifyInstance): Promise<void> {
  await app.register(reconciliationController, {
    prefix: "/api/reconciliation",
  });
}
