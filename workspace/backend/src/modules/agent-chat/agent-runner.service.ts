import fs from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { getAgentChatProvider } from "../ai/agent/agent-chat-provider.factory.js";
import type { AgentChatProvider } from "../ai/agent/agent-chat-provider.js";
import { agentChatService, type AgentChatService } from "./agent-chat.service.js";
import { agentEventsService, type AgentEventsService } from "./agent-events.service.js";

const PROMPT_VERSION = "agent-prompt-v1.0.0";

type RunnerDeps = {
  db?: PrismaClient;
  chat?: AgentChatService;
  provider?: AgentChatProvider;
  eventBus?: AgentEventsService;
};

type ActiveRun = { controller: AbortController; task: Promise<void> };

export class AgentRunnerService {
  private readonly db: PrismaClient;
  private readonly chat: AgentChatService;
  private readonly provider: AgentChatProvider;
  private readonly eventBus: AgentEventsService;
  private readonly active = new Map<string, ActiveRun>();

  constructor(deps: RunnerDeps = {}) {
    this.db = deps.db ?? prisma;
    this.chat = deps.chat ?? agentChatService;
    this.provider = deps.provider ?? getAgentChatProvider();
    this.eventBus = deps.eventBus ?? agentEventsService;
  }

  async startRun(conversationId: string, input: { content: string; attachmentIds: string[] }) {
    await this.chat.getConversation(conversationId, { limit: 1 });
    const userMessage = await this.chat.appendMessage(conversationId, "user", {
      text: input.content,
      attachmentIds: input.attachmentIds,
    });
    const run = await this.db.agentRun.create({
      data: {
        conversationId,
        userMessageId: userMessage.id,
        provider: this.provider.identity.provider,
        model: this.provider.identity.model,
        systemPromptVersion: PROMPT_VERSION,
      },
    });
    const controller = new AbortController();
    this.eventBus.publish(run.id, "run.started", { conversationId });
    const task = this.execute(run.id, conversationId, controller.signal);
    this.active.set(run.id, { controller, task });
    task.catch(() => undefined);
    return { id: run.id, status: run.status };
  }

  async cancelRun(runId: string) {
    const active = this.active.get(runId);
    active?.controller.abort();
    if (!active) {
      await this.db.agentRun.update({ where: { id: runId }, data: { status: "cancelled", completedAt: new Date() } });
      this.eventBus.publish(runId, "run.cancelled", {});
    }
    return { runId, cancelled: true };
  }

  async waitForRun(runId: string): Promise<void> {
    await this.active.get(runId)?.task;
  }

  async getRun(runId: string) {
    const run = await this.db.agentRun.findUnique({ where: { id: runId } });
    if (!run) return null;
    return {
      id: run.id, conversationId: run.conversationId, status: run.status,
      provider: run.provider, model: run.model,
      startedAt: run.startedAt.toISOString(), completedAt: run.completedAt?.toISOString() ?? null,
      inputTokens: run.inputTokens ?? null, outputTokens: run.outputTokens ?? null,
      errorCode: run.errorCode ?? null, errorMessage: run.errorMessage ?? null,
    };
  }

  private async loadSystemPrompt(): Promise<string> {
    return fs.readFile(path.resolve(env.AGENT_PROMPTS_DIR, "01-agent-system.md"), "utf8");
  }

  private async execute(runId: string, conversationId: string, signal: AbortSignal): Promise<void> {
    let assistantText = "";
    let usage: { inputTokens?: number; outputTokens?: number } | undefined;
    try {
      const messages = await this.chat.getProviderMessages(conversationId);
      const systemPrompt = await this.loadSystemPrompt();
      for await (const event of this.provider.stream({
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools: [], signal,
      })) {
        if (event.type === "text-delta") {
          assistantText += event.text;
          this.eventBus.publish(runId, "assistant.delta", { text: event.text });
        } else if (event.type === "tool-call") {
          throw Object.assign(new Error("Tool calls are not enabled in US1"), { code: "TOOLS_NOT_AVAILABLE" });
        } else {
          usage = event.usage;
        }
      }
      if (assistantText) {
        await this.chat.appendMessage(conversationId, "assistant", { text: assistantText });
        this.eventBus.publish(runId, "assistant.completed", { text: assistantText });
      }
      await this.db.agentConversation.update({
        where: { id: conversationId },
        data: { lastProvider: this.provider.identity.provider, lastModel: this.provider.identity.model },
      });
      await this.db.agentRun.update({
        where: { id: runId },
        data: {
          status: "completed", completedAt: new Date(),
          inputTokens: usage?.inputTokens, outputTokens: usage?.outputTokens,
        },
      });
      this.eventBus.publish(runId, "run.completed", {});
    } catch (error) {
      if ((error as Error)?.name === "AbortError" || signal.aborted) {
        await this.db.agentRun.update({ where: { id: runId }, data: { status: "cancelled", completedAt: new Date() } });
        this.eventBus.publish(runId, "run.cancelled", {});
        return;
      }
      const code = typeof (error as any)?.code === "string" ? (error as any).code : "AGENT_RUN_FAILED";
      const message = error instanceof Error ? error.message.slice(0, 500) : "Agent run failed";
      await this.db.agentRun.update({
        where: { id: runId }, data: { status: "failed", completedAt: new Date(), errorCode: code, errorMessage: message },
      });
      this.eventBus.publish(runId, "run.failed", { code, message });
    }
  }
}

export const agentRunnerService = new AgentRunnerService();
