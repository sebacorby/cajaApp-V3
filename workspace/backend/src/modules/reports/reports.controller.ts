import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { validateData } from "../../shared/validation.js";
import { reportsQuerySchema, type ReportsQueryInput } from "./reports.schemas.js";
import { reportsService } from "./reports.service.js";

export const reportsController: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/", async (request, reply) => {
    const query = validateData(reportsQuerySchema, request.query) as ReportsQueryInput;
    return reply.send(await reportsService.getOverview(query));
  });

  app.get("/export.csv", async (request, reply) => {
    const query = validateData(reportsQuerySchema, request.query) as ReportsQueryInput;
    const { csv, fileName } = await reportsService.exportCsv(query);
    return reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="${fileName}"`)
      .send(csv);
  });
};
