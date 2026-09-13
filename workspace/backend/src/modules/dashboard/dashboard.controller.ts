import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { validateData } from "../../shared/validation.js";
import { dashboardQuerySchema, type DashboardQueryInput } from "./dashboard.schemas.js";
import { dashboardService } from "./dashboard.service.js";

export const dashboardController: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/", async (request, reply) => {
    const query = validateData(dashboardQuerySchema, request.query) as DashboardQueryInput;
    return reply.send(await dashboardService.getOverview(query));
  });
};
