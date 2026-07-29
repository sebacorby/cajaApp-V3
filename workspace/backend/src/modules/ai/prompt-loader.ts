import fs from "fs/promises";
import path from "path";
import { env } from "../../config/env.js";
import { logger } from "../../shared/logger.js";
import crypto from "crypto";

export class PromptLoader {
  private promptsDir: string;

  constructor() {
    this.promptsDir = path.resolve(env.CARD_STATEMENT_PROMPTS_DIR);
  }

  async loadPrompt(filename: string): Promise<{ content: string; hash: string; path: string }> {
    const fullPath = path.join(this.promptsDir, filename);

    const content = await fs.readFile(fullPath, "utf-8");
    const hash = crypto.createHash("sha256").update(content).digest("hex");

    logger.debug({ path: fullPath, hash: hash.slice(0, 8) }, "Prompt loaded");

    return {
      content,
      hash,
      path: fullPath,
    };
  }

  async loadDetectDocumentPrompt(): Promise<{ content: string; hash: string; path: string }> {
    return this.loadPrompt("00-detect-document-type.md");
  }

  async loadExtractCardStatementPrompt(): Promise<{ content: string; hash: string; path: string }> {
    return this.loadPrompt("01-extract-credit-card-statement.md");
  }

  async loadRepairJsonPrompt(): Promise<{ content: string; hash: string; path: string }> {
    return this.loadPrompt("02-repair-credit-card-json.md");
  }
}

export const promptLoader = new PromptLoader();
