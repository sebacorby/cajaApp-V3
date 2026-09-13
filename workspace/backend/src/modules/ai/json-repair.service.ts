import { ollamaClient } from "./ollama.client.js";
import { promptLoader } from "./prompt-loader.js";
import { logger } from "../../shared/logger.js";
import { z } from "zod";
import { cardStatementPreviewSchema } from "../cards/cards.schemas.js";

export class JsonRepairService {
  async repairJson(invalidJson: string, schema: z.ZodType): Promise<{ success: boolean; data?: unknown; errors?: string[] }> {
    const promptTemplate = await promptLoader.loadRepairJsonPrompt();

    const instruction = promptTemplate.content.replace("{{INVALID_JSON}}", invalidJson);

    logger.info({ promptHash: promptTemplate.hash.slice(0, 8) }, "JSON repair requested");

    const response = await ollamaClient.generate(instruction);

    const extractedJson = this.extractJson(response.response);

    if (!extractedJson) {
      return { success: false, errors: ["Could not extract JSON from repair response"] };
    }

    const result = schema.safeParse(extractedJson);

    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`);
      return { success: false, errors };
    }

    return { success: true, data: result.data };
  }

  private extractJson(text: string): unknown | null {
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
}

export const jsonRepairService = new JsonRepairService();
