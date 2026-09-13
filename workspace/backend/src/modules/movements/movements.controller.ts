import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { validateData } from "../../shared/validation.js";
import {
  archiveMovementCategorySchema,
  assignMovementCategorySchema,
  createManualMovementSchema,
  createMovementCategorySchema,
  listMovementCategoriesQuerySchema,
  movementEntityIdSchema,
  movementQuerySchema,
  suggestMovementCategorySchema,
  updateManualMovementSchema,
  updateMovementCategorySchema,
  type ArchiveMovementCategoryInput,
  type AssignMovementCategoryInput,
  type CreateManualMovementInput,
  type CreateMovementCategoryInput,
  type ListMovementCategoriesQueryInput,
  type MovementQueryInput,
  type SuggestMovementCategoryInput,
  type UpdateManualMovementInput,
  type UpdateMovementCategoryInput,
} from "./movements.schemas.js";
import { movementCategoriesService } from "./categories.service.js";
import { movementsService } from "./movements.service.js";

export const movementsController: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/", async (request, reply) => {
    const query = validateData(movementQuerySchema, request.query) as MovementQueryInput;
    return reply.send(await movementsService.getMovements(query));
  });

  app.get("/export.csv", async (request, reply) => {
    const query = validateData(movementQuerySchema, request.query) as MovementQueryInput;
    const result = await movementsService.exportCsv(query);
    return reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="${result.fileName}"`)
      .header("X-Exported-Records", String(result.records))
      .send(result.csv);
  });

  app.get("/categories", async (request, reply) => {
    const query = validateData(
      listMovementCategoriesQuerySchema,
      request.query,
    ) as ListMovementCategoriesQueryInput;
    return reply.send(
      await movementCategoriesService.listCategories(query.includeInactive),
    );
  });

  app.post("/categories", async (request, reply) => {
    const input = validateData(
      createMovementCategorySchema,
      request.body,
    ) as CreateMovementCategoryInput;
    return reply
      .status(201)
      .send(await movementCategoriesService.createCategory(input));
  });

  app.put("/categories/assignment", async (request, reply) => {
    const input = validateData(
      assignMovementCategorySchema,
      request.body,
    ) as AssignMovementCategoryInput;
    return reply.send(await movementCategoriesService.assignCategory(input));
  });

  app.post("/categories/suggest", async (request, reply) => {
    const input = validateData(
      suggestMovementCategorySchema,
      request.body,
    ) as SuggestMovementCategoryInput;
    return reply.send(await movementCategoriesService.suggestCategory(input));
  });

  app.put("/categories/:categoryId", async (request, reply) => {
    const params = request.params as { categoryId: string };
    const categoryId = validateData(movementEntityIdSchema, params.categoryId);
    const input = validateData(
      updateMovementCategorySchema,
      request.body,
    ) as UpdateMovementCategoryInput;
    return reply.send(
      await movementCategoriesService.updateCategory(categoryId, input),
    );
  });

  app.delete("/categories/:categoryId", async (request, reply) => {
    const params = request.params as { categoryId: string };
    const categoryId = validateData(movementEntityIdSchema, params.categoryId);
    const input = validateData(
      archiveMovementCategorySchema,
      request.body ?? {},
    ) as ArchiveMovementCategoryInput;
    return reply.send(
      await movementCategoriesService.archiveCategory(categoryId, input),
    );
  });

  app.post("/categories/:categoryId/restore", async (request, reply) => {
    const params = request.params as { categoryId: string };
    const categoryId = validateData(movementEntityIdSchema, params.categoryId);
    return reply.send(await movementCategoriesService.restoreCategory(categoryId));
  });

  app.post("/manual", async (request, reply) => {
    const input = validateData(
      createManualMovementSchema,
      request.body,
    ) as CreateManualMovementInput;
    return reply
      .status(201)
      .send(await movementsService.createManualMovement(input));
  });

  app.put("/manual/:movementId", async (request, reply) => {
    const params = request.params as { movementId: string };
    const movementId = validateData(movementEntityIdSchema, params.movementId);
    const input = validateData(
      updateManualMovementSchema,
      request.body,
    ) as UpdateManualMovementInput;
    return reply.send(
      await movementsService.updateManualMovement(movementId, input),
    );
  });

  app.delete("/manual/:movementId", async (request, reply) => {
    const params = request.params as { movementId: string };
    const movementId = validateData(movementEntityIdSchema, params.movementId);
    return reply.send(await movementsService.voidManualMovement(movementId));
  });
};
