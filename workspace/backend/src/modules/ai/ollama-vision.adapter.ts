import { randomUUID } from "node:crypto";

import { ollamaClient } from "./ollama.client.js";
import type { VisionExtractionProvider, VisionExtractionResult } from "./vision-provider.types.js";

function extractJsonFromText(text: string): unknown | null {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // continue
    }
  }

  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch {
      // continue
    }
  }

  return null;
}

export class OllamaVisionAdapter implements VisionExtractionProvider {
  async extract(input: {
    prompt: string;
    imageBase64: string;
    mimeType: "image/jpeg" | "image/png";
  }): Promise<VisionExtractionResult> {
    const requestId = randomUUID();
    const startedAt = Date.now();

    const response = await ollamaClient.generateWithImages(
      input.prompt,
      [input.imageBase64],
    );

    const durationMs = Date.now() - startedAt;

    const extractedJson = extractJsonFromText(response.response);

    if (!extractedJson) {
      throw new Error("Could not extract JSON from Ollama response");
    }

    return {
      provider: "ollama",
      rawJson: extractedJson,
      durationMs,
    };
  }
}
