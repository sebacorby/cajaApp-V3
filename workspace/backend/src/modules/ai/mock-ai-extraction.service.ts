import fs from "fs/promises";
import path from "path";
import { env } from "../../config/env.js";
import { logger } from "../../shared/logger.js";
import { cardStatementPreviewSchema } from "../cards/cards.schemas.js";
import type { CardStatementPreview } from "../cards/cards.types.js";
import { validateData } from "../../shared/validation.js";

const FIXTURE_PATH = path.resolve(
  env.CARD_STATEMENT_PROMPTS_DIR,
  "..",
  "..",
  "contracts",
  "examples",
  "cards",
  "visa-galicia-julio2026.sanitized.preview.json"
);

export interface MockExtractionResult {
  preview: CardStatementPreview;
  warnings: string[];
  blockingErrors: string[];
  fromFixture: boolean;
}

export class MockAiExtractionService {
  private cachedFixture: CardStatementPreview | null = null;
  private cacheTime: number = 0;
  private readonly CACHE_TTL_MS = 60000;

  async getFixturePreview(): Promise<CardStatementPreview> {
    const now = Date.now();

    if (this.cachedFixture && (now - this.cacheTime) < this.CACHE_TTL_MS) {
      return this.cachedFixture;
    }

    try {
      const content = await fs.readFile(FIXTURE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      const validated = validateData(cardStatementPreviewSchema, parsed);

      this.cachedFixture = validated;
      this.cacheTime = now;

      logger.info({ path: FIXTURE_PATH }, "Golden fixture loaded for mock mode");

      return validated;
    } catch (error) {
      logger.error({ error, path: FIXTURE_PATH }, "Failed to load golden fixture");
      throw error;
    }
  }

  async extractCardStatementMock(
    _pdfText: string,
    pageCount: number
  ): Promise<MockExtractionResult> {
    const fixture = await this.getFixturePreview();

    const preview: CardStatementPreview = {
      ...fixture,
      source: {
        ...fixture.source,
        pageCount,
      },
    };

    logger.info({
      fromFixture: true,
      sectionsCount: preview.sections.length,
      groupsCount: preview.groups.length,
      rowsCount: preview.rows.length,
    }, "Mock extraction returned golden fixture");

    return {
      preview,
      warnings: [],
      blockingErrors: [],
      fromFixture: true,
    };
  }

  async detectDocumentTypeMock(): Promise<{
    documentType: string;
    confidence: number;
    reasoning: string;
  }> {
    return {
      documentType: "credit_card_statement_pdf",
      confidence: 1.0,
      reasoning: "Mock mode: using golden fixture for credit card statement",
    };
  }
}

export const mockAiExtractionService = new MockAiExtractionService();
