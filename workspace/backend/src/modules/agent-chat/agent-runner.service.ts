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
import { agentApprovalService, type AgentApprovalDecision, type AgentApprovalService } from "./agent-approval.service.js";
import type { AgentJsonValue } from "../ai/agent/agent-chat-provider.js";

const PROMPT_VERSION = "agent-prompt-v1.0.0";

type RunnerDeps = {
  db?: PrismaClient;
  chat?: AgentChatService;
  provider?: AgentChatProvider;
  eventBus?: AgentEventsService;
  registry?: AgentToolRegistry;
  executor?: AgentToolExecutor;
  approvals?: AgentApprovalService;
};

type ActiveRun = { controller: AbortController; task: Promise<void> };
type PreparedToolCall = {
  providerCall: AgentProviderToolCall;
  dbId: string;
  ordinal: number;
  status: string;
  argumentsValid: boolean;
  request: AgentToolRequest;
};

export class AgentRunnerService {
  private readonly db: PrismaClient;
  private readonly chat: AgentChatService;
  private readonly provider: AgentChatProvider;
  private readonly eventBus: AgentEventsService;
  private readonly registry: AgentToolRegistry;
  private readonly executor: AgentToolExecutor;
  private readonly approvals: AgentApprovalService;
  private readonly active = new Map<string, ActiveRun>();

  constructor(deps: RunnerDeps = {}) {
    this.db = deps.db ?? prisma;
    this.chat = deps.chat ?? agentChatService;
    this.provider = deps.provider ?? getAgentChatProvider();
    this.eventBus = deps.eventBus ?? agentEventsService;
    this.registry = deps.registry ?? agentToolRegistry;
    this.executor = deps.executor ?? agentToolExecutor;
    this.approvals = deps.approvals ?? agentApprovalService;
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

  private explicitMutationIntent(userText: string, toolName: string): boolean {
    const action = /(?:^|\s)(registr(?:a|á|ar)|cre(?:a|á|ar)|agreg(?:a|á|ar)|añad(?:e|í|ir)|cambi(?:a|á|ar)|edit(?:a|á|ar)|actualiz(?:a|á|ar)|asign(?:a|á|ar)|establec(?:e|é|er)|configur(?:a|á|ar)|pon(?:é|e|er)|aport(?:a|á|ar)|gener(?:a|á|ar)|guard(?:a|á|ar)|ocult(?:a|á|ar)|mostr(?:a|á|ar)|activ(?:a|á|ar)|desactiv(?:a|á|ar)|paus(?:a|á|ar)|reanud(?:a|á|ar)|cerr(?:a|á|ar)|create|update|set|add|register|assign|save|import(?:a|á|ar)?|prepar(?:a|á|ar)|previsualiz(?:a|á|ar)|valid(?:a|á|ar)|escane(?:a|á|ar)|scan|validate|import|prepare|preview)(?=\s|$|[.,;:!?])/i.test(userText);
    if (!action) return false;

    const ambiguousReference = /\b(ese|esa|eso|este|esta|aquel|aquella)\b/i.test(userText);
    const targeted = /^(movements\.update_manual|categories\.update|categories\.assign|incomes\.update_source|budgets\.update|budgets\.set_status|goals\.update|goals\.set_status|goals\.add_contribution|cards\.create_manual_purchase|card_import\.update_draft|debit_import\.update_row|salary_receipt\.update_draft)$/.test(toolName);
    const explicitId = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(userText);
    if (targeted && ambiguousReference && !explicitId) return false;

    const domainPatterns: Record<string, RegExp> = {
      movements: /\b(gasto|movimiento|ingreso|egreso)\b/i,
      categories: /\bcategor(?:ía|ia|ías|ias)\b/i,
      incomes: /\b(ingreso|sueldo|salario|fuente|evento)\b/i,
      budgets: /\bpresupuesto\b/i,
      goals: /\b(objetivo|meta|aporte)\b/i,
      cards: /\b(tarjeta|compra|cotizaci(?:ó|o)n|d[oó]lar|usd|ars|tipo de cambio)\b/i,
      backup: /\b(backup|respaldo)\b/i,
      card_import: /\b(tarjeta|resumen|extracto|pdf|adjunto|attachment|draft|borrador)\b/i,
      debit_import: /\b(débito|debito|csv|banco|adjunto|attachment|fila|importaci(?:ó|o)n)\b/i,
      salary_receipt: /\b(recibo|sueldo|salario|pdf|adjunto|attachment|draft|borrador)\b/i,
      reconciliation: /\b(conciliaci(?:ó|o)n|conciliar|scan|escaneo)\b/i,
      financial_health: /\b(salud financiera|snapshot|salud)\b/i,
      settings: /\b(configuraci(?:ó|o)n|preferencia|tema|moneda|importe|monto)\b/i,
    };
    const prefix = toolName.split(".")[0];
    return domainPatterns[prefix]?.test(userText) ?? false;
  }

  private explicitIntentFor(userText: string, toolName: string, riskClass: string): boolean | undefined {
    if (riskClass === "R1") return this.explicitArtifactIntent(userText);
    if (riskClass === "R2") return this.explicitMutationIntent(userText, toolName);
    return undefined;
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
    if (["INVALID_TOOL_ARGUMENTS", "UNKNOWN_TOOL", "EXPLICIT_INTENT_REQUIRED", "IDEMPOTENCY_KEY_REQUIRED", "IDEMPOTENCY_RECORD_MISMATCH", "APPROVAL_REQUIRED", "APPROVAL_ARGUMENTS_MISMATCH", "APPROVAL_REJECTED", "APPROVAL_EXPIRED", "VALIDATION_ERROR", "NOT_FOUND"].includes(code)) {
      return { code, message: error instanceof Error ? error.message.slice(0, 500) : code };
    }
    return { code, message: "La tool no pudo completarse con los argumentos validados." };
  }

  private async resolveToolImpact(
    definition: { impactSummary?: (args: unknown) => unknown | Promise<unknown> },
    name: string,
    args: AgentJsonValue,
  ): Promise<unknown> {
    if (definition.impactSummary) return await definition.impactSummary(args);
    return {
      tool: name,
      arguments: args,
      message: "Acción crítica de CajaApp: se detiene antes de ejecutarse hasta que confirmes el impacto.",
    };
  }

  private async waitApprovalDecision(toolCallId: string, signal: AbortSignal): Promise<AgentApprovalDecision> {
    let aborted = false;
    const abortPromise = new Promise<never>((_resolve, reject) => {
      const fail = () => {
        aborted = true;
        reject(Object.assign(new Error("Agent run aborted"), { name: "AbortError" }));
      };
      if (signal.aborted) return fail();
      signal.addEventListener("abort", fail, { once: true });
    });
    const decision = await Promise.race([
      this.approvals.waitForDecision(toolCallId),
      abortPromise,
    ]);
    if (aborted) throw Object.assign(new Error("Agent run aborted"), { name: "AbortError" });
    return decision;
  }

  private needsApproval(item: PreparedToolCall, latestUserText: string): boolean {
    if (item.status === "succeeded" || !item.argumentsValid) return false;
    const definition = this.registry.lookup(item.providerCall.name);
    if (!definition) return false;
    if (definition.riskClass === "R3" || definition.riskClass === "R4") return true;
    if (definition.riskClass === "R2") {
      const explicit = this.explicitIntentFor(latestUserText, item.providerCall.name, definition.riskClass);
      return explicit !== true;
    }
    return false;
  }

  private async markToolStarted(runId: string, item: PreparedToolCall): Promise<void> {
    if (item.status === "succeeded") return;
    const definition = this.registry.lookup(item.providerCall.name);
    if (!definition) return;
    await this.db.agentToolCall.update({
      where: { id: item.dbId },
      data: { status: "running" },
    });
    this.eventBus.publish(runId, "tool.started", {
      toolCallId: item.dbId,
      name: item.providerCall.name,
      riskClass: definition.riskClass,
    });
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
          const definition = this.registry.lookup(providerCall.name);
          const parsedArguments = definition?.inputSchema.safeParse(providerCall.arguments);
          const executionArguments = parsedArguments?.success
            ? parsedArguments.data as AgentJsonValue
            : providerCall.arguments;
          const idempotencyKey = `${runId}:${providerCall.id}`;
          const argumentsJson = JSON.stringify(executionArguments);
          let row = await this.db.agentToolCall.findUnique({ where: { idempotencyKey } });
          if (row) {
            if (row.runId !== runId || row.toolName !== providerCall.name || row.argumentsJson !== argumentsJson) {
              throw Object.assign(new Error("Provider tool call id was reused with different arguments"), { code: "IDEMPOTENCY_CONFLICT" });
            }
            ordinal = Math.max(ordinal, row.ordinal);
          } else {
            ordinal += 1;
            row = await this.db.agentToolCall.create({
              data: {
                runId,
                ordinal,
                toolName: providerCall.name,
                riskClass: definition?.riskClass ?? "UNKNOWN",
                argumentsJson,
                idempotencyKey,
                status: "proposed",
              },
            });
          }
          this.eventBus.publish(runId, "tool.proposed", {
            toolCallId: row.id, providerCallId: providerCall.id, name: providerCall.name,
            riskClass: definition?.riskClass ?? "UNKNOWN", arguments: executionArguments,
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

          prepared.push({
            providerCall,
            dbId: row.id,
            ordinal: row.ordinal,
            status: row.status,
            argumentsValid: parsedArguments?.success === true,
            request: {
              name: providerCall.name,
              arguments: executionArguments,
              conversationId,
              explicitIntent: definition.requiresExplicitIntent
                ? this.explicitIntentFor(latestUserText, providerCall.name, definition.riskClass)
                : undefined,
              toolCallId: row.id,
              idempotencyKey,
            },
          });
        }

        const immediate = prepared.filter((item) => !this.needsApproval(item, latestUserText));
        const pendingSequence: PreparedToolCall[] = [];

        for (const item of prepared) {
          if (!this.needsApproval(item, latestUserText)) continue;
          const definition = this.registry.lookup(item.providerCall.name);
          if (!definition) continue;
          let impact: unknown;
          try {
            impact = await this.resolveToolImpact(definition, item.providerCall.name, item.request.arguments);
          } catch (error) {
            const failure = this.safeToolFailure(error);
            await this.db.agentToolCall.update({
              where: { id: item.dbId },
              data: { status: "failed", errorCode: failure.code, errorMessage: failure.message, completedAt: new Date() },
            });
            await this.chat.appendMessage(conversationId, "tool", {
              text: JSON.stringify({ error: failure }),
              toolCall: {
                id: item.dbId, providerCallId: item.providerCall.id, name: item.providerCall.name,
                riskClass: definition.riskClass, status: "failed", arguments: item.request.arguments,
                errorCode: failure.code, errorMessage: failure.message,
              },
            });
            this.eventBus.publish(runId, "tool.failed", { toolCallId: item.dbId, name: item.providerCall.name, ...failure });
            continue;
          }
          const approval = await this.approvals.requestApproval({
            toolCallId: item.dbId,
            toolName: definition.name,
            arguments: item.request.arguments,
            impactSummary: impact,
          });
          await this.db.agentToolCall.update({
            where: { id: item.dbId },
            data: { status: "awaiting_approval" },
          });
          this.eventBus.publish(runId, "approval.required", {
            toolCallId: item.dbId,
            approvalId: approval.id,
            name: definition.name,
            riskClass: definition.riskClass,
            arguments: item.request.arguments,
            impact: (approval.impact ?? {}) as AgentJsonValue,
            argumentsHash: approval.argumentsHash,
          } as AgentJsonValue);
          pendingSequence.push(item);
        }

        if (pendingSequence.length > 0) {
          await this.db.agentRun.update({ where: { id: runId }, data: { status: "awaiting_approval" } });
        }

        const decisions = new Map<string, AgentApprovalDecision>();
        for (const item of pendingSequence) {
          const decision = await this.waitApprovalDecision(item.dbId, signal);
          decisions.set(item.dbId, decision);
          this.eventBus.publish(runId, "approval.resolved", {
            toolCallId: item.dbId,
            status: decision.status,
            argumentsHash: decision.argumentsHash,
            resolvedAt: decision.resolvedAt,
          });
          if (decision.status === "approved") {
            const persisted = await this.approvals.getByToolCall(item.dbId);
            if (!persisted || persisted.status !== "approved") {
              decisions.set(item.dbId, { status: "expired", argumentsHash: decision.argumentsHash, resolvedAt: null });
            }
          }
        }
        if (pendingSequence.length > 0) {
          await this.db.agentRun.update({ where: { id: runId }, data: { status: "running" } });
        }

        const outcomes = new Map<string, PromiseSettledResult<ExecutedAgentTool>>();
        for (const item of immediate) await this.markToolStarted(runId, item);
        const settledImmediate = await this.settleToolRequests(immediate.map((item) => item.request));
        for (let index = 0; index < immediate.length; index += 1) {
          outcomes.set(immediate[index].dbId, settledImmediate[index]);
        }

        for (const item of pendingSequence) {
          const decision = decisions.get(item.dbId)!;
          const definition = this.registry.lookup(item.providerCall.name);
          if (decision.status === "approved") {
            try {
              await this.markToolStarted(runId, item);
              const executed = await this.executor.execute({
                ...item.request,
                explicitIntent: definition?.riskClass === "R2" ? true : item.request.explicitIntent,
                approval: { status: "approved", argumentsHash: decision.argumentsHash },
              });
              outcomes.set(item.dbId, { status: "fulfilled", value: executed });
            } catch (reason) {
              outcomes.set(item.dbId, { status: "rejected", reason });
            }
          } else {
            const code = decision.status === "expired" ? "APPROVAL_EXPIRED" : "APPROVAL_REJECTED";
            const message = decision.status === "expired" ? "La aprobación expiró" : "La acción fue rechazada por el usuario";
            outcomes.set(item.dbId, { status: "rejected", reason: Object.assign(new Error(message), { code }) });
          }
        }

        for (const item of prepared) {
          const outcome = outcomes.get(item.dbId)!;
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
            const rejected = failure.code === "APPROVAL_REJECTED" || failure.code === "APPROVAL_EXPIRED";
            await this.db.agentToolCall.update({
              where: { id: item.dbId },
              data: {
                status: rejected ? "rejected" : "failed",
                errorCode: failure.code,
                errorMessage: failure.message,
                completedAt: new Date(),
              },
            });
            await this.chat.appendMessage(conversationId, "tool", {
              text: JSON.stringify({ error: failure }),
              toolCall: {
                id: item.dbId, providerCallId: item.providerCall.id, name: item.providerCall.name,
                riskClass: this.registry.lookup(item.providerCall.name)?.riskClass ?? "UNKNOWN",
                status: rejected ? "rejected" : "failed", arguments: item.providerCall.arguments,
                errorCode: failure.code, errorMessage: failure.message,
              },
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
