import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { budgetsController } from "./budgets.controller.js";
export const budgetsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => { await app.register(budgetsController, { prefix: "/api/budgets" }); };
