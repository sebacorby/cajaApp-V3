import { env } from "../../../config/env.js";
import type { AgentChatProvider } from "./agent-chat-provider.js";
import { OllamaAgentChatClient } from "./ollama-agent-chat.client.js";
import { OpenAICompatibleAgentChatClient } from "./openai-compatible-agent-chat.client.js";

let singleton: AgentChatProvider | undefined;
let testOverride: AgentChatProvider | undefined;

export function setAgentChatProviderForTests(provider?: AgentChatProvider): void {
  testOverride = provider;
  singleton = undefined;
}

export function getAgentChatProvider(): AgentChatProvider {
  if (testOverride) return testOverride;
  if (singleton) return singleton;

  switch (env.AI_PROVIDER) {
    case "ollama":
      singleton = new OllamaAgentChatClient();
      break;
    case "openai-compatible":
      singleton = new OpenAICompatibleAgentChatClient({
        baseUrl: env.AI_BASE_URL,
        model: env.AI_MODEL,
        apiKey: env.AI_API_KEY,
        chatCompletionsPath: env.AI_CHAT_COMPLETIONS_PATH,
        toolCallingEnabled: env.AGENT_OPENAI_TOOL_CALLING_ENABLED,
      });
      break;
    default: {
      const unsupported: never = env.AI_PROVIDER;
      throw new Error(`Unsupported agent provider: ${String(unsupported)}`);
    }
  }
  return singleton;
}

export async function preflightAgentChatProvider(): Promise<void> {
  await getAgentChatProvider().preflight?.();
}
