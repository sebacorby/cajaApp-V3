import fs from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { getAgentChatProvider } from "../ai/agent/agent-chat-provider.factory.js";
import type { AgentChatProvider, AgentProviderToolCall } from "../ai/agent/agent-chat-provider.js";
import { agentChatService, type AgentChatService } from "./agent-chat.service.js";
import { agentEventsService, type AgentEventsService } from "./agent-events.service.js";
import { AgentToolRegistry, agentToolRegistry } from "./agent-tool-registry.js";
import { AgentToolExecutor, agentToolExecutor, type AgentToolRequest, type ExecutedAgentTool } from "./agent-tool-executor.js";

const PROMPT_VERSION = "agent-prompt-v1.0.0";

type RunnerDeps = {
  db?: PrismaClient;
  chat?: AgentChatService;
  provider?: AgentChatProvider;
  eventBus?: AgentEventsService;
  registry?: AgentToolRegistry;
  executor?: AgentToolExecutor;
};

type ActiveRun = { controller: AbortController; task: Promise<void> };
type PreparedToolCall = {
  providerCall: AgentProviderToolCall;
  dbId: string;
  ordinal: number;
  request: AgentToolRequest;
};

export class AgentRunnerService {
  private readonly db: PrismaClient;
  private readonly chat: AgentChatService;
  private readonly provider: AgentChatProvider;
  private readonly eventBus: AgentEventsService;
  private readonly registry: AgentToolRegistry;
  private readonly executor: AgentToolExecutor;
  private readonly active = new Map<string, ActiveRun>();

  constructor(deps: RunnerDeps = {}) {
    this.db = deps.db ?? prisma;
    this.chat = deps.chat ?? agentChatService;
    this.provider = deps.provider ?? getAgentChatProvider();
    this.eventBus = deps.eventBus ?? agentEventsService;
    this.registry = deps.registry ?? agentToolRegistry;
    this.executor = deps.executor ?? agentToolExecutor;
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

  private explicitArtifactIntent(userText: string): boolean {
    return /\b(export(?:ar|á)?|csv|descarg(?:ar|á)?|download|backup|respaldo)\b/i.test(userText);
  }

  private async settleToolRequests(requests: AgentToolRequest[]): Promise<PromiseSettledResult<ExecutedAgentTool>[]> {
    if (this.executor.canRunInParallel(requests)) {
      return Promise.allSettled(requests.map((request) => this.executor.execute(request)));
    }
    const settled: PromiseSettledResult<ExecutedAgentTool>[] = [];
    for (const request of requests) {
      try {
        settled.push({ status: "fulfilled", value: await this.executor.execute(request) });
      } catch (reason) {
        settled.push({ status: "rejected", reason });
      }
    }
    return settled;
  }

  private limitedResult(result: ExecutedAgentTool["result"]): { result: ExecutedAgentTool["result"]; text: string } {
    const full = JSON.stringify(result);
    if (full.length <= env.AGENT_MAX_TOOL_RESULT_CHARACTERS) return { result, text: full };
    const safe = {
      truncated: true,
      preview: full.slice(0, Math.max(1, env.AGENT_MAX_TOOL_RESULT_CHARACTERS - 120)),
    } as const;
    return { result: safe, text: JSON.stringify(safe) };
  }

  private safeToolFailure(error: unknown): { code: string; message: string } {
    const code = typeof (error as any)?.code === "string" ? (error as any).code : "TOOL_EXECUTION_FAILED";
    if (code === "INVALID_TOOL_ARGUMENTS" || code === "UNKNOWN_TOOL" || code === "EXPLICIT_INTENT_REQUIRED") {
      return { code, message: error instanceof Error ? error.message.slice(0, 500) : code };
    }
    return { code, message: "La tool no pudo completarse con los argumentos validados." };
  }

  private async execute(runId: string, conversationId: string, signal: AbortSignal): Promise<void> {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let ordinal = 0;
    try {
      const systemPrompt = await this.loadSystemPrompt();
      for (let step = 0; step < env.AGENT_MAX_STEPS_PER_RUN; step += 1) {
        if (signal.aborted) throw Object.assign(new Error("Agent run aborted"), { name: "AbortError" });
        const messages = await this.chat.getProviderMessages(conversationId);
        const latestUserText = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
        let assistantText = "";
        const toolCalls: AgentProviderToolCall[] = [];

        for await (const event of this.provider.stream({
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          tools: this.registry.listProviderTools(),
          signal,
        })) {
          if (event.type === "text-delta") {
            assistantText += event.text;
            this.eventBus.publish(runId, "assistant.delta", { text: event.text });
          } else if (event.type === "tool-call") {
            toolCalls.push(event.toolCall);
          } else {
            totalInputTokens += event.usage?.inputTokens ?? 0;
            totalOutputTokens += event.usage?.outputTokens ?? 0;
          }
        }

        if (toolCalls.length === 0) {
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
              status: "completed", completedAt: new Date(), toolCallCount: ordinal,
              inputTokens: totalInputTokens || undefined, outputTokens: totalOutputTokens || undefined,
            },
          });
          this.eventBus.publish(runId, "run.completed", {});
          return;
        }

        await this.chat.appendMessage(conversationId, "assistant", { text: assistantText, toolCalls });
        const prepared: PreparedToolCall[] = [];

        for (const providerCall of toolCalls) {
          ordinal += 1;
          const definition = this.registry.lookup(providerCall.name);
          const row = await this.db.agentToolCall.create({
            data: {
              runId,
              ordinal,
              toolName: providerCall.name,
              riskClass: definition?.riskClass ?? "UNKNOWN",
              argumentsJson: JSON.stringify(providerCall.arguments),
              idempotencyKey: `${runId}:${ordinal}:${providerCall.id}`,
              status: "proposed",
            },
          });
          this.eventBus.publish(runId, "tool.proposed", {
            toolCallId: row.id, providerCallId: providerCall.id, name: providerCall.name,
            riskClass: definition?.riskClass ?? "UNKNOWN", arguments: providerCall.arguments,
          });

          if (!definition) {
            const failure = { code: "UNKNOWN_TOOL", message: `Unknown agent tool: ${providerCall.name}` };
            await this.db.agentToolCall.update({ where: { id: row.id }, data: { status: "failed", errorCode: failure.code, errorMessage: failure.message, completedAt: new Date() } });
            await this.chat.appendMessage(conversationId, "tool", {
              text: JSON.stringify({ error: failure }),
              toolCall: { id: row.id, providerCallId: providerCall.id, name: providerCall.name, riskClass: "UNKNOWN", status: "failed", arguments: providerCall.arguments, errorCode: failure.code, errorMessage: failure.message },
            });
            this.eventBus.publish(runId, "tool.failed", { toolCallId: row.id, name: providerCall.name, ...failure });
            continue;
          }

          await this.db.agentToolCall.update({ where: { id: row.id }, data: { status: "running" } });
          this.eventBus.publish(runId, "tool.started", { toolCallId: row.id, name: providerCall.name, riskClass: definition.riskClass });
          prepared.push({
            providerCall,
            dbId: row.id,
            ordinal,
            request: {
              name: providerCall.name,
              arguments: providerCall.arguments,
              explicitIntent: definition.requiresExplicitIntent ? this.explicitArtifactIntent(latestUserText) : undefined,
            },
          });
        }

        const settled = await this.settleToolRequests(prepared.map((item) => item.request));
        for (let index = 0; index < prepared.length; index += 1) {
          const item = prepared[index];
          const outcome = settled[index];
          if (outcome.status === "fulfilled") {
            const limited = this.limitedResult(outcome.value.result);
            await this.db.agentToolCall.update({
              where: { id: item.dbId },
              data: { status: "succeeded", resultJson: JSON.stringify(limited.result), completedAt: new Date() },
            });
            await this.chat.appendMessage(conversationId, "tool", {
              text: limited.text,
              toolCall: {
                id: item.dbId, providerCallId: item.providerCall.id, name: item.providerCall.name,
                riskClass: outcome.value.riskClass, status: "succeeded", arguments: outcome.value.arguments,
                result: limited.result, entityRefs: outcome.value.entityRefs,
              },
            });
            this.eventBus.publish(runId, "tool.completed", {
              toolCallId: item.dbId,
              name: item.providerCall.name,
              riskClass: outcome.value.riskClass,
              result: limited.result,
              entityRefs: outcome.value.entityRefs.map((ref) => ({
                entityType: ref.entityType,
                entityId: ref.entityId,
                label: ref.label ?? null,
                section: ref.section ?? null,
              })),
            });
            if (item.providerCall.name === "ui.navigate") this.eventBus.publish(runId, "ui.navigate", limited.result);
          } else {
            const failure = this.safeToolFailure(outcome.reason);
            await this.db.agentToolCall.update({ where: { id: item.dbId }, data: { status: "failed", errorCode: failure.code, errorMessage: failure.message, completedAt: new Date() } });
            await this.chat.appendMessage(conversationId, "tool", {
              text: JSON.stringify({ error: failure }),
              toolCall: { id: item.dbId, providerCallId: item.providerCall.id, name: item.providerCall.name, riskClass: this.registry.lookup(item.providerCall.name)?.riskClass ?? "UNKNOWN", status: "failed", arguments: item.providerCall.arguments, errorCode: failure.code, errorMessage: failure.message },
            });
            this.eventBus.publish(runId, "tool.failed", { toolCallId: item.dbId, name: item.providerCall.name, ...failure });
          }
        }
        await this.db.agentRun.update({ where: { id: runId }, data: { toolCallCount: ordinal } });
      }
      throw Object.assign(new Error("Agent run exceeded the maximum number of tool steps"), { code: "AGENT_MAX_STEPS_EXCEEDED" });
    } catch (error) {
      if ((error as Error)?.name === "AbortError" || signal.aborted) {
        await this.db.agentRun.update({ where: { id: runId }, data: { status: "cancelled", completedAt: new Date(), toolCallCount: ordinal } });
        this.eventBus.publish(runId, "run.cancelled", {});
        return;
      }
      const code = typeof (error as any)?.code === "string" ? (error as any).code : "AGENT_RUN_FAILED";
      const message = error instanceof Error ? error.message.slice(0, 500) : "Agent run failed";
      await this.db.agentRun.update({
        where: { id: runId }, data: { status: "failed", completedAt: new Date(), toolCallCount: ordinal, errorCode: code, errorMessage: message },
      });
      this.eventBus.publish(runId, "run.failed", { code, message });
    }
  }
}

export const agentRunnerService = new AgentRunnerService();
