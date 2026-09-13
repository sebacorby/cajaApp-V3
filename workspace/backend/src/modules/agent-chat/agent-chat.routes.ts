import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { agentChatController } from "./agent-chat.controller.js";

export const agentChatRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  await app.register(agentChatController, { prefix: "/api/agent" });
};
