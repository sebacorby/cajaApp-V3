import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { validateData } from "../../shared/validation.js";
import { updateSettingsSchema, type UpdateSettingsInput } from "./settings.schemas.js";
import { settingsService } from "./settings.service.js";

export const settingsController: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/", async (_request, reply) => reply.send(await settingsService.getSettings()));
  app.put("/", async (request, reply) => {
    const input = validateData(updateSettingsSchema, request.body) as UpdateSettingsInput;
    return reply.send(await settingsService.updateSettings(input));
  });
  app.get("/system", async (_request, reply) => reply.send(settingsService.getSystemStatus()));
};
