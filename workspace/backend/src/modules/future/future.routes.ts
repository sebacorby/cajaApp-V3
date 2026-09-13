import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { futureController } from "./future.controller.js";


export const futureRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  await app.register(futureController, { prefix: "/api/future-commitments" });
};