import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { validateData } from "../../shared/validation.js";
import {
  listReconciliationQuerySchema,
  reconciliationParamsSchema,
  resolveReconciliationSchema,
  scanReconciliationSchema,
} from "./reconciliation.schemas.js";
import {
  reconciliationService,
  type ReconciliationQuery,
} from "./reconciliation.service.js";

export const reconciliationController: FastifyPluginAsync = async (
  app: FastifyInstance,
) => {
  app.get("/", async (request, reply) => {
    const payload = validateData(
      listReconciliationQuerySchema,
      request.query,
    );

    const query: ReconciliationQuery = {
      status: payload.status ?? "all",
      relationType: payload.relationType ?? "all",
      scope: payload.scope ?? "current",
      search: payload.search?.trim() ?? "",
      limit: payload.limit === undefined ? 25 : Number(payload.limit),
      offset: payload.offset === undefined ? 0 : Number(payload.offset),
    };

    return reply.send(await reconciliationService.list(query));
  });

  app.post("/scan", async (request, reply) => {
    const input = validateData(scanReconciliationSchema, request.body);
    return reply.status(201).send(await reconciliationService.scan(input));
  });

  app.get("/:id", async (request, reply) => {
    const params = validateData(reconciliationParamsSchema, request.params);
    return reply.send(await reconciliationService.detail(params.id));
  });

  app.post("/:id/resolve", async (request, reply) => {
    const params = validateData(reconciliationParamsSchema, request.params);
    const input = validateData(resolveReconciliationSchema, request.body);
    return reply.send(
      await reconciliationService.resolve(params.id, input.action),
    );
  });

  app.post("/:id/reopen", async (request, reply) => {
    const params = validateData(reconciliationParamsSchema, request.params);
    return reply.send(await reconciliationService.reopen(params.id));
  });
};
