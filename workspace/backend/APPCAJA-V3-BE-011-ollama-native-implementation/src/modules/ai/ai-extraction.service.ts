import { createHash } from "node:crypto";
import { getTextExtractionProvider } from "./text-extraction-provider.factory.js";
import { aiRequestContext } from "./ai-provider-context.js";
import { mockAiExtractionService } from "./mock-ai-extraction.service.js";
import { promptLoader } from "./prompt-loader.js";
import { jsonRepairService } from "./json-repair.service.js";
import { logger } from "../../shared/logger.js";
import { cardStatementPreviewSchema } from "../cards/cards.schemas.js";
import type { CardStatementPreview } from "../cards/cards.types.js";
import { validateData } from "../../shared/validation.js";
import { AiOutputSchemaInvalidError } from "../../shared/errors.js";
import { env } from "../../config/env.js";
import { pdfRawExtractorService } from "../documents/pdf-raw-extractor.service.js";

export interface ExtractionInput {
  absolutePdfPath: string;
  pageCount: number;
}

export interface ExtractionResult {
  preview: CardStatementPreview;
  blockingErrors: string[];
  warnings: string[];
  retries: number;
  rawExtractionMs?: number;
  aiExtractionMs?: number;
  provider?: "ollama" | "openai-compatible";
  model?: string;
  providerMetrics?: {
    httpStatus?: number;
    finishReason?: string | null;
    streamChunks?: number;
    responseCharacters?: number;
    thinkingCharacters?: number;
    totalDurationNs?: number;
    loadDurationNs?: number;
    promptEvalCount?: number;
    promptEvalDurationNs?: number;
    evalCount?: number;
    evalDurationNs?: number;
  };
}

export interface DocumentDetectionResult {
  documentType: string;
  confidence: number;
  reasoning: string;
}

export class AiExtractionService {
  async extractCardStatement(
    input: ExtractionInput,
    _aiRunId: string,
  ): Promise<ExtractionResult> {
    if (env.AI_MOCK_MODE) {
      const mockResult = await mockAiExtractionService.extractCardStatementMock("", input.pageCount);
      return {
        preview: mockResult.preview,
        blockingErrors: mockResult.blockingErrors,
        warnings: mockResult.warnings,
        retries: 0,
      };
    }

    if (!input.absolutePdfPath) {
      throw new Error("absolutePdfPath is required for extraction");
    }

    return this.extractWithConfiguredProvider(input.absolutePdfPath, input.pageCount);
  }

  private async extractWithConfiguredProvider(
    absolutePdfPath: string,
    pageCount: number,
  ): Promise<ExtractionResult> {
    const promptTemplate = await promptLoader.loadExtractCardStatementPrompt();

    const extractionPrompt = promptTemplate.content
      .replace("{{PAGE_COUNT}}", String(pageCount));

    const promptSha256 = createHash("sha256")
      .update(extractionPrompt, "utf8")
      .digest("hex");

    const rawExtractionStart = Date.now();
    const rawExtraction = await pdfRawExtractorService.extract(absolutePdfPath);
    const rawExtractionMs = Date.now() - rawExtractionStart;

    logger.info({
      event: "ai_extraction.raw_extraction.completed",
      promptSha256,
      pageCount: rawExtraction.pageCount,
      textPageCount: rawExtraction.textPageCount,
      emptyPageCount: rawExtraction.emptyPageCount,
      provider: env.AI_PROVIDER,
      rawCharacterCount: rawExtraction.rawText.length,
      rawSha256: rawExtraction.rawSha256,
    }, "Card statement extraction requested with RAW text");

    const requestContext = aiRequestContext.getStore();

    await requestContext?.onRawExtractionCompleted?.({
      pageCount: rawExtraction.pageCount,
      characterCount: rawExtraction.rawText.length,
      durationMs: rawExtractionMs,
    });

    const textProvider = getTextExtractionProvider();

    const aiResult = await textProvider.extractJson({
      systemPrompt: extractionPrompt,
      rawDocument: rawExtraction.rawText,
      onProgress: requestContext?.onProviderProgress,
    });

    logger.info({
      provider: aiResult.provider,
      model: aiResult.model,
      durationMs: aiResult.durationMs,
    }, "Text extraction provider completed");

    if (!aiResult.rawJson) {
      throw new AiOutputSchemaInvalidError("Could not extract JSON from AI response");
    }

    const normalized = this.normalizeModelResponse(
      aiResult.rawJson as Record<string, unknown>,
      rawExtraction.pageCount,
    );

    const blockingErrors: string[] = [];
    const warnings: string[] = [];
    let preview: CardStatementPreview;

    try {
      preview = validateData(cardStatementPreviewSchema, normalized);
    } catch (error) {
      logger.warn({ error }, "Initial validation failed, attempting repair");

      const repairResult = await jsonRepairService.repairJson(
        JSON.stringify(normalized),
        cardStatementPreviewSchema
      );

      if (!repairResult.success) {
        throw new AiOutputSchemaInvalidError(repairResult.errors?.join("; ") || "Unknown validation error");
      }

      preview = repairResult.data as CardStatementPreview;
      warnings.push(...(repairResult.errors || []));
    }

    const validationResult = this.validateExtractedData(preview);
    blockingErrors.push(...validationResult.blockingErrors);
    warnings.push(...validationResult.warnings);

    logger.info({
      sectionsCount: preview.sections.length,
      groupsCount: preview.groups.length,
      rowsCount: preview.rows.length,
      blockingErrorsCount: blockingErrors.length,
      warningsCount: warnings.length,
    }, "Card statement extraction completed");

    return {
      preview,
      blockingErrors,
      warnings,
      retries: 0,
      rawExtractionMs,
      aiExtractionMs: aiResult.durationMs,
      provider: aiResult.provider,
      model: aiResult.model,
      providerMetrics: aiResult.metrics,
    };
  }

  async detectDocumentType(
    pdfText: string,
    pageCount: number,
  ): Promise<DocumentDetectionResult> {
    if (env.AI_MOCK_MODE) {
      return mockAiExtractionService.detectDocumentTypeMock();
    }

    const promptTemplate =
      await promptLoader.loadDetectDocumentPrompt();

    const systemPrompt = promptTemplate.content
      .replace("{{PDF_TEXT}}", "")
      .replace("{{PAGE_COUNT}}", String(pageCount));

    const result = await getTextExtractionProvider().extractJson({
      systemPrompt,
      rawDocument: pdfText,
    });

    const raw = result.rawJson as Record<string, unknown>;

    return {
      documentType:
        typeof raw.documentType === "string"
          ? raw.documentType
          : "unknown",
      confidence:
        typeof raw.confidence === "number"
          ? raw.confidence
          : 0,
      reasoning:
        typeof raw.reasoning === "string"
          ? raw.reasoning
          : "",
    };
  }

  private normalizeModelResponse(raw: Record<string, unknown>, pageCount: number): Record<string, unknown> {
    const normalizeAmount = (val: unknown): string | null => {
      if (val === null || val === undefined) return null;
      const str = String(val).trim();
      if (!str || str === "null") return null;
      let normalized = str.replace(/[^\d.,-]/g, "");
      const commaCount = (normalized.match(/,/g) || []).length;
      const dotCount = (normalized.match(/\./g) || []).length;
      if (commaCount >= 2 || (commaCount === 1 && dotCount >= 1 && normalized.indexOf(",") > normalized.lastIndexOf("."))) {
        normalized = normalized.replace(/\./g, "").replace(",", ".");
      } else if (commaCount === 1 && dotCount === 0) {
        normalized = normalized.replace(",", ".");
      } else {
        normalized = normalized.replace(/,/g, "");
      }
      const num = parseFloat(normalized);
      if (isNaN(num)) return null;
      return num.toFixed(2);
    };

    const normalizeDate = (val: unknown): string | null => {
      if (!val) return null;
      const str = String(val).trim();
      if (!str || str === "null") return null;
      return str;
    };

    const parseInstallment = (val: unknown): { current: number | null; total: number | null } => {
      if (!val || val === null) return { current: null, total: null };
      const str = String(val);
      const match = str.match(/(\d+)\s*\/\s*(\d+)/);
      if (match) return { current: parseInt(match[1], 10), total: parseInt(match[2], 10) };
      return { current: null, total: null };
    };

    const source = raw.source as Record<string, unknown> || {};
    const summary = raw.summary as Record<string, unknown> || {};
    const rawGroups = raw.groups as Array<Record<string, unknown>> || [];
    const rawSections = raw.sections as Array<Record<string, unknown>> || [];
    const rawRows = raw.rows as Array<Record<string, unknown>> || [];
    const rawFutureBlock = raw.futureInstallmentsBlock as Array<Record<string, unknown>> || [];

    const sections = rawSections.map((s: Record<string, unknown>, idx: number) => ({
      id: `section-${idx + 1}`,
      displayOrder: idx + 1,
      label: String(s.title || s.label || ""),
    }));

    const groups = rawGroups.map((g: Record<string, unknown>, idx: number) => {
      const cardNumber = String(g.cardNumber || g.cardLast4 || "");
      return {
        id: `group-${idx + 1}`,
        displayOrder: idx + 1,
        label: String(g.label || ""),
        cardLast4: cardNumber.slice(-4) || null,
        holderName: String(g.cardHolder || g.holderName || "") || null,
      };
    });

    let displayOrder = 1;
    const rows: Array<Record<string, unknown>> = [];

    for (const r of rawRows) {
      const installment = parseInstallment(r.installment);
      const amountPesos = normalizeAmount(r.pesos || r.amountPesos);
      const amountDollars = normalizeAmount(r.dollars || r.amountDollars);
      const ref = String(r.reference || r.referenceRaw || r.descripcion || "");
      const dateRaw = normalizeDate(r.date || r.dateRaw);

      rows.push({
        id: `row-${displayOrder}`,
        displayOrder,
        sourcePage: null,
        sectionId: "section-2",
        sectionLabel: "Detalle del Consumo",
        groupId: null,
        groupLabel: null,
        groupOrder: null,
        rowType: "transaction",
        editable: true,
        dateRaw,
        dateIso: null,
        markerRaw: null,
        referenceRaw: ref || null,
        installmentRaw: r.installment ? String(r.installment) : null,
        installmentCurrent: installment.current,
        installmentTotal: installment.total,
        receiptRaw: r.receipt ? String(r.receipt) : null,
        amountPesos,
        amountDollars,
        currencyOriginal: amountDollars ? "MIXED" as const : (amountPesos ? "ARS" as const : "UNKNOWN" as const),
        originalText: ref || "",
        confidence: null,
        warnings: [],
      });
      displayOrder++;
    }

    for (const r of rawFutureBlock) {
      const installment = parseInstallment(r.installment);
      const amountPesos = normalizeAmount(r.pesos);
      const amountDollars = normalizeAmount(r.dollars);
      const ref = String(r.reference || "") || null;
      const dateRaw = normalizeDate(r.date);

      rows.push({
        id: `row-${displayOrder}`,
        displayOrder,
        sourcePage: null,
        sectionId: "section-2",
        sectionLabel: "Detalle del Consumo",
        groupId: null,
        groupLabel: null,
        groupOrder: null,
        rowType: "future_installment_reference",
        editable: false,
        dateRaw,
        dateIso: null,
        markerRaw: null,
        referenceRaw: ref,
        installmentRaw: r.installment ? String(r.installment) : null,
        installmentCurrent: installment.current,
        installmentTotal: installment.total,
        receiptRaw: r.receipt ? String(r.receipt) : null,
        amountPesos,
        amountDollars,
        currencyOriginal: amountDollars ? "MIXED" as const : (amountPesos ? "ARS" as const : "UNKNOWN" as const),
        originalText: ref || "",
        confidence: null,
        warnings: [],
      });
      displayOrder++;
    }

    return {
      statementId: null,
      source: {
        bankName: source.bankName as string || null,
        brand: source.brand as string || null,
        statementNumber: source.statementNumber as string || null,
        pageCount,
      },
      summary: {
        totalPesos: normalizeAmount(summary.totalPesos),
        totalDollars: normalizeAmount(summary.totalDollars),
        minimumPaymentPesos: normalizeAmount(summary.minimumPaymentPesos),
        currentDueDate: normalizeDate(summary.currentDueDate),
        nextClosingDate: normalizeDate(summary.nextClosingDate),
        nextDueDate: normalizeDate(summary.nextDueDate),
      },
      sections,
      groups,
      rows,
      futureInstallmentsBlock: [],
    };
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

  private validateExtractedData(preview: CardStatementPreview): { blockingErrors: string[]; warnings: string[] } {
    const blockingErrors: string[] = [];
    const warnings: string[] = [];

    if (!preview.summary?.totalPesos) {
      blockingErrors.push("Missing totalPesos in summary");
    }

    if (preview.rows.length === 0) {
      blockingErrors.push("No rows extracted from document");
    }

    const hasTransaction = preview.rows.some(r => r.rowType === "transaction");
    if (!hasTransaction) {
      blockingErrors.push("No transaction rows found");
    }

    const rowsWithoutOriginalText = preview.rows.filter(r => !r.originalText);
    if (rowsWithoutOriginalText.length > 0) {
      warnings.push(`${rowsWithoutOriginalText.length} rows missing originalText`);
    }

    const displayOrders = preview.rows.map(r => r.displayOrder);
    const uniqueOrders = new Set(displayOrders);
    if (displayOrders.length !== uniqueOrders.size) {
      warnings.push("Duplicate displayOrder values detected");
    }

    const sectionIds = new Set(preview.sections.map(s => s.id));
    for (const row of preview.rows) {
      if (row.sectionId && !sectionIds.has(row.sectionId)) {
        blockingErrors.push(`Row references unknown sectionId: ${row.sectionId}`);
      }
    }

    const groupIds = new Set(preview.groups.map(g => g.id));
    for (const row of preview.rows) {
      if (row.groupId && !groupIds.has(row.groupId)) {
        blockingErrors.push(`Row references unknown groupId: ${row.groupId}`);
      }
    }

    return { blockingErrors, warnings };
  }
}

export const aiExtractionService = new AiExtractionService();
