import type {
  AgentChatProvider,
  AgentChatProviderIdentity,
  AgentChatRequest,
  AgentChatStreamEvent,
} from "./agent-chat-provider.js";

function abortError(): Error {
  const error = new Error("Agent provider request aborted");
  error.name = "AbortError";
  return error;
}

export class FakeAgentChatProvider implements AgentChatProvider {
  readonly identity: AgentChatProviderIdentity;

  constructor(
    private readonly events: AgentChatStreamEvent[] = [],
    identity: AgentChatProviderIdentity = { provider: "fake", model: "deterministic" },
  ) {
    this.identity = identity;
  }

  async *stream(request: AgentChatRequest): AsyncIterable<AgentChatStreamEvent> {
    for (const event of this.events) {
      if (request.signal?.aborted) throw abortError();
      await Promise.resolve();
      if (request.signal?.aborted) throw abortError();
      yield event;
    }
    if (request.signal?.aborted) throw abortError();
  }
}
