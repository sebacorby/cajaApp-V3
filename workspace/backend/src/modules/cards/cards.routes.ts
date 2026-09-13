import { FastifyPluginAsync } from "fastify";
import { cardsController } from "./cards.controller.js";

export const cardsRoutes: FastifyPluginAsync = async (app) => {
  app.register(cardsController, { prefix: "/api/card-statements" });
};
