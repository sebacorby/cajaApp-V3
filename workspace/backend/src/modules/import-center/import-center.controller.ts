import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { validateData } from "../../shared/validation.js";
import {
  importCenterDetailParamsSchema,
  listImportCenterQuerySchema,
} from "./import-center.schemas.js";
import {
  importCenterService,
  type ImportCenterQuery,
} from "./import-center.service.js";

export const importCenterController: FastifyPluginAsync = async (
  app: FastifyInstance,
) => {
  app.get("/", async (request, reply) => {
    const payload = validateData(
      listImportCenterQuerySchema,
      request.query,
    );

    const query: ImportCenterQuery = {
      kind: payload.kind ?? "all",
      status: payload.status ?? "all",
      search: payload.search?.trim() ?? "",
      limit: payload.limit === undefined ? 25 : Number(payload.limit),
      offset: payload.offset === undefined ? 0 : Number(payload.offset),
    };

    return reply.send(await importCenterService.list(query));
  });

  app.get("/:kind/:id", async (request, reply) => {
    const params = validateData(
      importCenterDetailParamsSchema,
      request.params,
    );
    return reply.send(
      await importCenterService.detail(params.kind, params.id),
    );
  });
};
