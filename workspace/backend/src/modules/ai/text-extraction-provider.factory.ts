import { env } from "../../config/env.js";

import { OllamaNativeClient } from "./ollama-native.client.js";
import { OpenAICompatibleClient } from "./openai-compatible.client.js";
import type {
  TextExtractionProvider,
} from "./text-extraction-provider.js";

let provider: TextExtractionProvider | undefined;

export function getTextExtractionProvider(): TextExtractionProvider {
  if (provider) {
    return provider;
  }

  switch (env.AI_PROVIDER) {
    case "ollama":
      provider = new OllamaNativeClient();
      break;

    case "openai-compatible":
      provider = new OpenAICompatibleClient();
      break;

    default: {
      const unsupported: never = env.AI_PROVIDER;
      throw new Error(
        `Unsupported AI provider: ${String(unsupported)}`,
      );
    }
  }

  return provider;
}

export async function preflightTextExtractionProvider(): Promise<void> {
  if (env.AI_MOCK_MODE) {
    return;
  }

  await getTextExtractionProvider().preflight?.();
}
