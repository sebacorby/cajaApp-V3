import { createHash } from "node:crypto";
import { getTextExtractionProvider } from "./text-extraction-provider.factory.js";
import { aiRequestContext } from "./ai-provider-context.js";
import { mockAiExtractionService } from "./mock-ai-extraction.service.js";
import { promptLoader } from "./prompt-loader.js";
import { jsonRepairService } from "./json-repair.service.js";
import { logger } from "../../shared/logger.js";
import { cardStatementPreviewSchema } from "../cards/cards.schemas.js";
import { parseAnyDateToISO } from "../cards/date-normalizer.js";
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

    await requestContext?.onStageChanged?.({
      stage: "validating_ai_response",
      message: "Validando los datos extraídos.",
    });

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
    const asRecord = (value: unknown): Record<string, unknown> =>
      value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};

    const asRecordArray = (value: unknown): Array<Record<string, unknown>> =>
      Array.isArray(value)
        ? value.filter((item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === "object" && !Array.isArray(item),
          )
        : [];

    const asString = (value: unknown): string | null => {
      if (value === null || value === undefined) return null;
      const normalized = String(value).trim();
      return normalized && normalized.toLowerCase() !== "null" ? normalized : null;
    };

    const asFiniteNumber = (value: unknown): number | null => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value !== "string" || !value.trim()) return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const normalizeAmount = (value: unknown): string | null => {
      const original = asString(value);
      if (!original) return null;

      let normalized = original.replace(/[^\d.,-]/g, "");
      const commaCount = (normalized.match(/,/g) || []).length;
      const dotCount = (normalized.match(/\./g) || []).length;

      if (
        commaCount >= 2 ||
        (commaCount === 1 && dotCount >= 1 && normalized.indexOf(",") > normalized.lastIndexOf("."))
      ) {
        normalized = normalized.replace(/\./g, "").replace(",", ".");
      } else if (commaCount === 1 && dotCount === 0) {
        normalized = normalized.replace(",", ".");
      } else {
        normalized = normalized.replace(/,/g, "");
      }

      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed.toFixed(2) : null;
    };

    const parseInstallment = (value: unknown): { current: number | null; total: number | null } => {
      const rawValue = asString(value);
      if (!rawValue) return { current: null, total: null };
      const match = rawValue.match(/(\d+)\s*\/\s*(\d+)/);
      return match
        ? { current: Number.parseInt(match[1], 10), total: Number.parseInt(match[2], 10) }
        : { current: null, total: null };
    };

    const canonicalLabel = (value: string): string =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();

    const source = asRecord(raw.source);
    const summary = asRecord(raw.summary);
    const rawRows = asRecordArray(raw.rows);
    const rawFutureRows = asRecordArray(raw.futureInstallmentsBlock);

    const sections: Array<{ id: string; displayOrder: number; label: string }> = [];
    const sectionIds = new Set<string>();

    const addSection = (candidate: Record<string, unknown>, fallbackIndex: number): void => {
      const label = asString(candidate.label ?? candidate.title ?? candidate.sectionLabel);
      if (!label) return;

      let id = asString(candidate.id ?? candidate.sectionId) ?? `section-${fallbackIndex + 1}`;
      if (sectionIds.has(id)) {
        const existing = sections.find((section) => canonicalLabel(section.label) === canonicalLabel(label));
        if (existing) return;
        id = `section-${sections.length + 1}`;
      }

      sectionIds.add(id);
      sections.push({
        id,
        displayOrder: asFiniteNumber(candidate.displayOrder) ?? sections.length + 1,
        label,
      });
    };

    asRecordArray(raw.sections).forEach(addSection);

    for (const row of [...rawRows, ...rawFutureRows]) {
      const rowSectionId = asString(row.sectionId);
      const rowSectionLabel = asString(row.sectionLabel ?? row.section ?? row.sectionName);
      if (rowSectionLabel && (!rowSectionId || !sectionIds.has(rowSectionId))) {
        addSection(
          { id: rowSectionId ?? undefined, label: rowSectionLabel },
          sections.length,
        );
      }
    }

    if (sections.length === 0) {
      addSection({ id: "section-detail", label: "Detalle del Consumo" }, 0);
    }

    const groups: Array<{
      id: string;
      displayOrder: number;
      label: string;
      cardLast4: string | null;
      holderName: string | null;
    }> = [];
    const groupIds = new Set<string>();

    asRecordArray(raw.groups).forEach((group, index) => {
      const cardNumber = asString(group.cardNumber ?? group.cardLast4);
      const holderName = asString(group.cardHolder ?? group.holderName);
      const generatedLabel = [
        cardNumber ? `Tarjeta ${cardNumber.slice(-4)}` : null,
        holderName,
      ]
        .filter(Boolean)
        .join(" - ");
      const label = asString(group.label) ?? (generatedLabel || `Tarjeta ${index + 1}`);

      let id = asString(group.id) ?? `group-${index + 1}`;
      if (groupIds.has(id)) id = `group-${groups.length + 1}`;
      groupIds.add(id);

      groups.push({
        id,
        displayOrder: asFiniteNumber(group.displayOrder) ?? index + 1,
        label,
        cardLast4: cardNumber ? cardNumber.slice(-4) : null,
        holderName,
      });
    });

    const validRowTypes = new Set([
      "section_header",
      "group_header",
      "transaction",
      "group_total",
      "consolidated_row",
      "tax",
      "charge",
      "statement_total",
      "future_installment_reference",
      "legal_text",
      "unknown",
    ]);

    const validCurrencies = new Set(["ARS", "USD", "MIXED", "UNKNOWN"]);

    const findSection = (
      row: Record<string, unknown>,
      rowType: string,
    ): { id: string; displayOrder: number; label: string } => {
      const explicitId = asString(row.sectionId);
      if (explicitId) {
        const byId = sections.find((section) => section.id === explicitId);
        if (byId) return byId;
      }

      const explicitLabel = asString(row.sectionLabel ?? row.section ?? row.sectionName);
      if (explicitLabel) {
        const canonical = canonicalLabel(explicitLabel);
        const byLabel = sections.find((section) => canonicalLabel(section.label) === canonical);
        if (byLabel) return byLabel;
      }

      const labelHint = rowType === "consolidated_row"
        ? "CONSOLIDADO"
        : rowType === "legal_text"
          ? "LEGAL"
          : rowType === "tax" || rowType === "charge" || rowType === "statement_total"
            ? "DETALLE"
            : "DETALLE";

      return sections.find((section) => canonicalLabel(section.label).includes(labelHint)) ?? sections[0];
    };

    const findGroup = (row: Record<string, unknown>) => {
      const explicitId = asString(row.groupId);
      if (explicitId) {
        const byId = groups.find((group) => group.id === explicitId);
        if (byId) return byId;
      }

      const explicitLabel = asString(row.groupLabel ?? row.group);
      if (explicitLabel) {
        const canonical = canonicalLabel(explicitLabel);
        const byLabel = groups.find((group) => canonicalLabel(group.label) === canonical);
        if (byLabel) return byLabel;
      }

      const cardLast4 = asString(row.cardLast4 ?? row.cardNumber)?.slice(-4);
      if (cardLast4) {
        const byCard = groups.find((group) => group.cardLast4 === cardLast4);
        if (byCard) return byCard;
      }

      return null;
    };

    const inferRowType = (row: Record<string, unknown>): string => {
      const rawType = asString(row.rowType);
      if (rawType && validRowTypes.has(rawType)) return rawType;

      const sectionLabel = canonicalLabel(asString(row.sectionLabel ?? row.section) ?? "");
      const reference = canonicalLabel(
        asString(row.referenceRaw ?? row.reference ?? row.descripcion ?? row.description) ?? "",
      );

      if (sectionLabel.includes("LEGAL")) return "legal_text";
      if (sectionLabel.includes("CONSOLIDADO")) return "consolidated_row";
      if (reference.includes("TOTAL A PAGAR")) return "statement_total";
      if (reference.includes("TOTAL CONSUMOS")) return "group_total";
      if (reference.includes("IMPUESTO") || reference.includes("IVA ") || reference.includes("RG 5617")) return "tax";
      if (reference.includes("CUOTAS A VENCER")) return "future_installment_reference";
      return "transaction";
    };

    const normalizeRow = (
      row: Record<string, unknown>,
      fallbackOrder: number,
      forcedType?: string,
    ): Record<string, unknown> => {
      const rowType = forcedType ?? inferRowType(row);
      const section = findSection(row, rowType);
      const group = findGroup(row);

      const dateRaw = asString(row.dateRaw ?? row.date);
      const markerRaw = asString(row.markerRaw ?? row.marker ?? row.indicator);
      const referenceRaw = asString(
        row.referenceRaw ?? row.reference ?? row.descripcion ?? row.description,
      );
      const installmentRaw = asString(
        row.installmentRaw ?? row.installment ?? row.cuota,
      );
      const receiptRaw = asString(
        row.receiptRaw ?? row.receipt ?? row.comprobante,
      );
      const amountPesos = normalizeAmount(row.amountPesos ?? row.pesos ?? row.amountArs);
      const amountDollars = normalizeAmount(row.amountDollars ?? row.dollars ?? row.usd);
      const parsedInstallment = parseInstallment(installmentRaw);

      const explicitCurrency = asString(row.currencyOriginal)?.toUpperCase();
      const currencyOriginal = explicitCurrency && validCurrencies.has(explicitCurrency)
        ? explicitCurrency
        : amountPesos && amountDollars
          ? "MIXED"
          : amountDollars
            ? "USD"
            : amountPesos
              ? "ARS"
              : "UNKNOWN";

      const originalText = asString(row.originalText) ??
        [dateRaw, markerRaw, referenceRaw, installmentRaw, receiptRaw, amountPesos, amountDollars]
          .filter(Boolean)
          .join(" ");

      const warnings = Array.isArray(row.warnings)
        ? row.warnings.map(asString).filter((value): value is string => Boolean(value))
        : [];

      const editableDefault = rowType === "transaction" || rowType === "tax" || rowType === "charge";

      return {
        id: asString(row.id) ?? `row-${fallbackOrder}`,
        displayOrder: asFiniteNumber(row.displayOrder) ?? fallbackOrder,
        sourcePage: asFiniteNumber(row.sourcePage ?? row.page),
        sectionId: section.id,
        sectionLabel: section.label,
        groupId: group?.id ?? null,
        groupLabel: group?.label ?? asString(row.groupLabel),
        groupOrder: asFiniteNumber(row.groupOrder) ?? group?.displayOrder ?? null,
        rowType,
        editable: typeof row.editable === "boolean" ? row.editable : editableDefault,
        dateRaw,
        dateIso: asString(row.dateIso),
        markerRaw,
        referenceRaw,
        installmentRaw,
        installmentCurrent: asFiniteNumber(row.installmentCurrent) ?? parsedInstallment.current,
        installmentTotal: asFiniteNumber(row.installmentTotal) ?? parsedInstallment.total,
        receiptRaw,
        amountPesos,
        amountDollars,
        currencyOriginal,
        originalText,
        confidence: asFiniteNumber(row.confidence),
        warnings,
      };
    };

    const rows = rawRows.map((row, index) => normalizeRow(row, index + 1));
    const futureInstallmentsBlock = rawFutureRows.map((row, index) =>
      normalizeRow(row, rows.length + index + 1, "future_installment_reference"),
    );

    return {
      statementId: asString(raw.statementId),
      source: {
        bankName: asString(source.bankName),
        brand: asString(source.brand),
        statementNumber: asString(source.statementNumber),
        pageCount,
      },
      summary: {
        totalPesos: normalizeAmount(summary.totalPesos),
        totalDollars: normalizeAmount(summary.totalDollars),
        minimumPaymentPesos: normalizeAmount(summary.minimumPaymentPesos),
        currentDueDate: parseAnyDateToISO(asString(summary.currentDueDate)),
        nextClosingDate: parseAnyDateToISO(asString(summary.nextClosingDate)),
        nextDueDate: parseAnyDateToISO(asString(summary.nextDueDate)),
      },
      sections,
      groups,
      rows,
      futureInstallmentsBlock,
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
