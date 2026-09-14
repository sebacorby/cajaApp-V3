import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env.js";
import type { AgentChatMessage } from "../ai/agent/agent-chat-provider.js";
import { settingsService, type SettingsService } from "../settings/settings.service.js";
import { agentChatService, type AgentChatService } from "./agent-chat.service.js";
import { agentMemoryService, type AgentMemoryService } from "./agent-memory.service.js";
import { agentToolRegistry, type AgentToolRegistry } from "./agent-tool-registry.js";

type ContextDeps = {
  memory?: AgentMemoryService;
  chat?: AgentChatService;
  settings?: SettingsService;
  registry?: AgentToolRegistry;
  recentMessages?: number;
  maxContextCharacters?: number;
  loadPrompt?: () => Promise<string>;
  now?: () => Date;
};

export type AgentProviderContext = {
  messages: AgentChatMessage[];
  latestUserText: string;
};

export class AgentContextService {
  private readonly memory: AgentMemoryService;
  private readonly chat: AgentChatService;
  private readonly settings: SettingsService;
  private readonly registry: AgentToolRegistry;
  private readonly recentMessages: number;
  private readonly maxContextCharacters: number;
  private readonly loadPrompt: () => Promise<string>;
  private readonly now: () => Date;

  constructor(deps: ContextDeps = {}) {
    this.memory = deps.memory ?? agentMemoryService;
    this.chat = deps.chat ?? agentChatService;
    this.settings = deps.settings ?? settingsService;
    this.registry = deps.registry ?? agentToolRegistry;
    this.recentMessages = deps.recentMessages ?? env.AGENT_RECENT_MESSAGES;
    this.maxContextCharacters = deps.maxContextCharacters ?? env.AGENT_MAX_CONTEXT_CHARACTERS;
    this.loadPrompt = deps.loadPrompt ?? (() => fs.readFile(path.resolve(env.AGENT_PROMPTS_DIR, "01-agent-system.md"), "utf8"));
    this.now = deps.now ?? (() => new Date());
  }

  async build(conversationId: string): Promise<AgentProviderContext> {
    const [memory, settings, basePrompt] = await Promise.all([
      this.memory.compactIfNeeded(conversationId),
      this.settings.getSettings(),
      this.loadPrompt(),
    ]);
    const recent = await this.chat.getProviderMessages(conversationId, {
      afterSequence: memory.summaryThroughSequence ?? 0,
      limit: this.recentMessages,
    });
    const localNow = new Intl.DateTimeFormat("es-AR", {
      timeZone: settings.timezone,
      dateStyle: "full",
      timeStyle: "long",
    }).format(this.now());
    const toolCatalog = this.registry.listPublic()
      .map((tool) => `${tool.name}:${tool.riskClass}`)
      .join(", ");
    const runtimeLines = [
      "[CajaApp runtime context]",
      `localDateTime=${localNow}`,
      `timezone=${settings.timezone}`,
      `locale=${settings.locale}`,
      `defaultCurrency=${settings.defaultCurrency}`,
      `hideAmounts=${settings.hideAmounts}`,
      `toolCatalog=${toolCatalog}`,
    ];
    if (memory.summaryText) {
      runtimeLines.push(`conversationSummaryVersion=${memory.summaryVersion ?? "unknown"}`);
      runtimeLines.push(`conversationSummaryThroughSequence=${memory.summaryThroughSequence ?? 0}`);
      runtimeLines.push(`conversationSummary=${memory.summaryText}`);
    }
    const systemMessage: AgentChatMessage = {
      role: "system",
      content: `${basePrompt.trim()}\n\n${runtimeLines.join("\n")}`,
    };
    const messages: AgentChatMessage[] = [systemMessage, ...recent];
    while (
      messages.length > 2 &&
      messages.reduce((sum, message) => sum + message.content.length, 0) > this.maxContextCharacters
    ) {
      messages.splice(1, 1);
    }
    const latestUserText = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
    return { messages, latestUserText };
  }
}

export const agentContextService = new AgentContextService();
