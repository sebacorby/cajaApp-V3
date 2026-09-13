import { FastifyPluginAsync } from "fastify";
import { importsController } from "./imports.controller.js";

export const importsRoutes: FastifyPluginAsync = async (app) => {
  app.register(importsController, { prefix: "/api/card-statements" });
};
