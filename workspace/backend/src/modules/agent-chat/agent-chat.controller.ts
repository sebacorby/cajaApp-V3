import "@fastify/multipart";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { validateData } from "../../shared/validation.js";
import {
  agentAttachmentParamsSchema,
  agentConversationParamsSchema,
  agentRunParamsSchema,
  agentToolCallParamsSchema,
  approveAgentToolCallBodySchema,
  createAgentConversationBodySchema,
  createAgentMessageBodySchema,
  getAgentConversationQuerySchema,
  listAgentConversationsQuerySchema,
  rejectAgentToolCallBodySchema,
  updateAgentConversationBodySchema,
} from "./agent-chat.schemas.js";
import { agentChatService } from "./agent-chat.service.js";
import { agentRunnerService } from "./agent-runner.service.js";
import { agentEventsService } from "./agent-events.service.js";
import { agentToolRegistry } from "./agent-tool-registry.js";
import { agentApprovalService } from "./agent-approval.service.js";

function lastEventSequence(header: string | string[] | undefined): number {
  const raw = Array.isArray(header) ? header[0] : header;
  const value = Number(raw ?? 0);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

export const agentChatController: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/tools", async (_request, reply) => reply.send({
    version: "agent-tools-v1.0.0",
    tools: agentToolRegistry.listPublic(),
  }));

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

  app.post("/conversations/:id/attachments", async (request, reply) => {
    const params = validateData(agentConversationParamsSchema, request.params);
    const upload = await request.file();
    if (!upload || upload.fieldname !== "file") {
      return reply.status(400).send({ code: "FILE_REQUIRED", message: "Multipart field 'file' is required" });
    }
    const attachment = await agentChatService.stageAttachment(params.id, {
      filename: upload.filename,
      mimetype: upload.mimetype,
      buffer: await upload.toBuffer(),
    });
    return reply.status(201).send(attachment);
  });

  app.get("/conversations/:id/attachments", async (request, reply) => {
    const params = validateData(agentConversationParamsSchema, request.params);
    return reply.send({ items: await agentChatService.listAttachments(params.id) });
  });

  app.delete("/conversations/:id/attachments/:attachmentId", async (request, reply) => {
    const params = validateData(agentAttachmentParamsSchema, request.params);
    await agentChatService.deleteAttachment(params.id, params.attachmentId);
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

  app.post("/tool-calls/:toolCallId/approve", async (request, reply) => {
    const params = validateData(agentToolCallParamsSchema, request.params);
    validateData(approveAgentToolCallBodySchema, request.body ?? {});
    return reply.send(await agentApprovalService.approve(params.toolCallId));
  });

  app.post("/tool-calls/:toolCallId/reject", async (request, reply) => {
    const params = validateData(agentToolCallParamsSchema, request.params);
    const body = validateData(rejectAgentToolCallBodySchema, request.body ?? {});
    return reply.send(await agentApprovalService.reject(params.toolCallId, body.reason));
  });

  app.get("/runs/:runId/events", async (request, reply) => {
    const params = validateData(agentRunParamsSchema, request.params);
    const abort = new AbortController();
    request.raw.on("close", () => abort.abort());
    reply.hijack();
    const requestOrigin = typeof request.headers.origin === "string" ? request.headers.origin : undefined;
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      ...(requestOrigin ? { "Access-Control-Allow-Origin": requestOrigin, Vary: "Origin" } : {}),
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
