import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { futureController, type FutureControllerOptions } from "./future.controller.js";

export type FutureRoutesOptions = FutureControllerOptions;

export const futureRoutes: FastifyPluginAsync<FutureRoutesOptions> = async (
  app: FastifyInstance,
  options,
) => {
  await app.register(futureController, {
    prefix: "/api/future-debt",
    service: options.service,
  });
};
