import type { FastifyInstance } from "fastify";
import { monthCloseController } from "./month-close.controller.js";

export async function monthCloseRoutes(app: FastifyInstance): Promise<void> {
  await app.register(monthCloseController, { prefix: "/api/month-close" });
}
