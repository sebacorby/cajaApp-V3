import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { validateData } from "../../shared/validation.js";
import {
  changeGoalStatusSchema,
  createGoalContributionSchema,
  createGoalSchema,
  goalContributionIdSchema,
  goalIdSchema,
  goalStatusSchema,
  updateGoalSchema,
  type ChangeGoalStatusInput,
  type CreateGoalContributionInput,
  type CreateGoalInput,
  type UpdateGoalInput,
} from "./goals.schemas.js";
import { goalsService, type GoalsOverviewQuery } from "./goals.service.js";


export const goalsController: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/", async (request, reply) => {
    const query = request.query as { status?: string };
    const status = query.status ? validateData(goalStatusSchema, query.status) : undefined;
    return reply.send(await goalsService.listGoals(status));
  });


  app.get("/overview", async (request, reply) => {
    const query = request.query as { status?: string; limit?: string };
    const status = query.status
      ? validateData(goalStatusSchema, query.status)
      : undefined;
    const limit = query.limit === undefined ? undefined : Number(query.limit);
    return reply.send(await goalsService.overview({
      status,
      limit,
    } as GoalsOverviewQuery));
  });


  app.get("/:goalId", async (request, reply) => {
    const params = request.params as { goalId: string };
    return reply.send(await goalsService.getGoal(validateData(goalIdSchema, params.goalId)));
  });


  app.post("/", async (request, reply) => {
    const input = validateData(createGoalSchema, request.body) as CreateGoalInput;
    return reply.status(201).send(await goalsService.createGoal(input));
  });


  app.put("/:goalId", async (request, reply) => {
    const params = request.params as { goalId: string };
    const goalId = validateData(goalIdSchema, params.goalId);
    const input = validateData(updateGoalSchema, request.body) as UpdateGoalInput;
    return reply.send(await goalsService.updateGoal(goalId, input));
  });


  app.post("/:goalId/status", async (request, reply) => {
    const params = request.params as { goalId: string };
    const goalId = validateData(goalIdSchema, params.goalId);
    const input = validateData(changeGoalStatusSchema, request.body) as ChangeGoalStatusInput;
    return reply.send(await goalsService.changeStatus(goalId, input));
  });


  app.post("/:goalId/contributions", async (request, reply) => {
    const params = request.params as { goalId: string };
    const goalId = validateData(goalIdSchema, params.goalId);
    const input = validateData(
      createGoalContributionSchema,
      request.body,
    ) as CreateGoalContributionInput;
    return reply.status(201).send(await goalsService.addContribution(goalId, input));
  });


  app.delete("/:goalId/contributions/:contributionId", async (request, reply) => {
    const params = request.params as { goalId: string; contributionId: string };
    const goalId = validateData(goalIdSchema, params.goalId);
    const contributionId = validateData(goalContributionIdSchema, params.contributionId);
    return reply.send(await goalsService.deleteContribution(goalId, contributionId));
  });


  app.delete("/:goalId", async (request, reply) => {
    const params = request.params as { goalId: string };
    return reply.send(await goalsService.deleteGoal(validateData(goalIdSchema, params.goalId)));
  });
};