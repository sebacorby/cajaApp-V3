import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { validateData } from "../../shared/validation.js";
import { budgetsService } from "./budgets.service.js";
import { budgetIdSchema, changeBudgetStatusSchema, createBudgetSchema, listBudgetsQuerySchema, updateBudgetSchema, type ChangeBudgetStatusInput, type CreateBudgetInput, type ListBudgetsQueryInput, type UpdateBudgetInput } from "./budgets.schemas.js";


export const budgetsController: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/overview", async (request, reply) => reply.send(
    await budgetsService.overview(
      validateData(listBudgetsQuerySchema, request.query) as ListBudgetsQueryInput,
    ),
  ));
  app.get("/", async (request, reply) => reply.send(await budgetsService.list(validateData(listBudgetsQuerySchema, request.query) as ListBudgetsQueryInput)));
  app.post("/", async (request, reply) => reply.status(201).send(await budgetsService.create(validateData(createBudgetSchema, request.body) as CreateBudgetInput)));
  app.put("/:budgetId", async (request, reply) => {
    const id = validateData(budgetIdSchema, (request.params as { budgetId: string }).budgetId);
    return reply.send(await budgetsService.update(id, validateData(updateBudgetSchema, request.body) as UpdateBudgetInput));
  });
  app.post("/:budgetId/status", async (request, reply) => {
    const id = validateData(budgetIdSchema, (request.params as { budgetId: string }).budgetId);
    const input = validateData(changeBudgetStatusSchema, request.body) as ChangeBudgetStatusInput;
    return reply.send(await budgetsService.changeStatus(id, input.status));
  });
  app.delete("/:budgetId", async (request, reply) => reply.send(await budgetsService.delete(validateData(budgetIdSchema, (request.params as { budgetId: string }).budgetId))));
};