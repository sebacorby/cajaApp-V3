import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { validateData } from "../../shared/validation.js";
import {
  agentConversationParamsSchema,
  agentRunParamsSchema,
  createAgentConversationBodySchema,
  createAgentMessageBodySchema,
  getAgentConversationQuerySchema,
  listAgentConversationsQuerySchema,
  updateAgentConversationBodySchema,
} from "./agent-chat.schemas.js";
import { agentChatService } from "./agent-chat.service.js";
import { agentRunnerService } from "./agent-runner.service.js";
import { agentEventsService } from "./agent-events.service.js";

function lastEventSequence(header: string | string[] | undefined): number {
  const raw = Array.isArray(header) ? header[0] : header;
  const value = Number(raw ?? 0);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

export const agentChatController: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/conversations", async (request, reply) => {
    const query = validateData(listAgentConversationsQuerySchema, request.query) as {
      status?: "active" | "archived";
      cursor?: string;
      limit: number;
    };
    return reply.send(await agentChatService.listConversations(query));
  });

  app.post("/conversations", async (request, reply) => {
    const body = validateData(createAgentConversationBodySchema, request.body ?? {});
    return reply.status(201).send(await agentChatService.createConversation(body));
  });

  app.get("/conversations/:id", async (request, reply) => {
    const params = validateData(agentConversationParamsSchema, request.params);
    const query = validateData(getAgentConversationQuerySchema, request.query);
    return reply.send(await agentChatService.getConversation(params.id, query));
  });

  app.put("/conversations/:id", async (request, reply) => {
    const params = validateData(agentConversationParamsSchema, request.params);
    const body = validateData(updateAgentConversationBodySchema, request.body);
    return reply.send(await agentChatService.updateConversation(params.id, body));
  });

  app.delete("/conversations/:id", async (request, reply) => {
    const params = validateData(agentConversationParamsSchema, request.params);
    await agentChatService.deleteConversation(params.id);
    return reply.status(204).send();
  });

  app.post("/conversations/:id/messages", async (request, reply) => {
    const params = validateData(agentConversationParamsSchema, request.params);
    const body = validateData(createAgentMessageBodySchema, request.body) as {
      content: string;
      attachmentIds: string[];
    };
    const run = await agentRunnerService.startRun(params.id, body);
    return reply.status(202).send({ runId: run.id, status: run.status });
  });

  app.get("/runs/:runId", async (request, reply) => {
    const params = validateData(agentRunParamsSchema, request.params);
    const run = await agentRunnerService.getRun(params.runId);
    if (!run) return reply.status(404).send({ code: "NOT_FOUND", message: "Agent run not found" });
    return reply.send(run);
  });

  app.post("/runs/:runId/cancel", async (request, reply) => {
    const params = validateData(agentRunParamsSchema, request.params);
    return reply.send(await agentRunnerService.cancelRun(params.runId));
  });

  app.get("/runs/:runId/events", async (request, reply) => {
    const params = validateData(agentRunParamsSchema, request.params);
    const abort = new AbortController();
    request.raw.on("close", () => abort.abort());
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    try {
      for await (const event of agentEventsService.stream(params.runId, {
        afterSequence: lastEventSequence(request.headers["last-event-id"]),
        signal: abort.signal,
      })) {
        reply.raw.write(`id: ${event.sequence}\n`);
        reply.raw.write(`event: ${event.type}\n`);
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
        if (["run.completed", "run.cancelled", "run.failed"].includes(event.type)) break;
      }
    } finally {
      if (!reply.raw.destroyed) reply.raw.end();
    }
  });
};
