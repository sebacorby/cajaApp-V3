import type { PdfRawExtractionResult } from "../documents/pdf-raw-extractor.service.js";
import { pdfRawExtractorService } from "../documents/pdf-raw-extractor.service.js";
import {
  SalaryReceiptParserIncompleteError,
  SalaryReceiptPreviewValidationError,
  SalaryReceiptTextExtractionEmptyError,
} from "./salary-receipt-parser.errors.js";
import { SalaryReceiptParserRegistry } from "./salary-receipt-parser.js";
import type {
  SalaryReceiptParseResult,
  SalaryReceiptParser,
} from "./salary-receipt-parser.types.js";
import { normalizeSalaryReceiptText } from "./salary-receipt-parser.utils.js";
import { salaryReceiptPreviewSchema } from "./salary-receipts.schemas.js";

export interface SalaryReceiptRawExtractor {
  extract(pdfPath: string): Promise<PdfRawExtractionResult>;
}

export interface DeterministicSalaryReceiptImportInput {
  pdfPath: string;
  sourceFileName?: string;
}

export interface DeterministicSalaryReceiptImportResult extends SalaryReceiptParseResult {
  extraction: {
    engine: string;
    engineVersion: string;
    pageCount: number;
    textPageCount: number;
    emptyPageCount: number;
    characterCount: number;
    rawSha256: string;
    durationMs: number;
  };
}

export class DeterministicSalaryReceiptImportService {
  private readonly registry: SalaryReceiptParserRegistry;

  constructor(
    parsers: readonly SalaryReceiptParser[],
    private readonly extractor: SalaryReceiptRawExtractor = pdfRawExtractorService,
  ) {
    this.registry = new SalaryReceiptParserRegistry(parsers);
  }

  async import(
    input: DeterministicSalaryReceiptImportInput,
  ): Promise<DeterministicSalaryReceiptImportResult> {
    const extraction = await this.extractor.extract(input.pdfPath);
    const rawText = normalizeSalaryReceiptText(extraction.rawText);

    if (!rawText) {
      throw new SalaryReceiptTextExtractionEmptyError();
    }

    const result = this.registry.parse({
      rawText,
      pageCount: extraction.pageCount,
      sourceFileName: input.sourceFileName,
    });

    if (
      result.diagnostics.requiredFieldsMissing.length > 0 ||
      result.diagnostics.unexplainedMonetaryLineCount > 0
    ) {
      throw new SalaryReceiptParserIncompleteError(result.diagnostics);
    }

    const preview = salaryReceiptPreviewSchema.safeParse(result.preview);
    if (!preview.success) {
      throw new SalaryReceiptPreviewValidationError(
        preview.error.issues.map((issue) => {
          const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
          return `${path}${issue.message}`;
        }),
      );
    }

    return {
      ...result,
      preview: preview.data,
      extraction: {
        engine: extraction.engine,
        engineVersion: extraction.engineVersion,
        pageCount: extraction.pageCount,
        textPageCount: extraction.textPageCount,
        emptyPageCount: extraction.emptyPageCount,
        characterCount: extraction.characterCount,
        rawSha256: extraction.rawSha256,
        durationMs: extraction.durationMs,
      },
    };
  }

  listParsers(): ReadonlyArray<{ id: string; version: string }> {
    return this.registry.list();
  }
}
