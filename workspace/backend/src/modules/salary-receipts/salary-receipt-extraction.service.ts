import { createHash } from "node:crypto";
import { DeterministicSalaryReceiptImportService } from "./deterministic-salary-receipt-import.service.js";
import { salaryReceiptParsers } from "./salary-receipt-parsers.js";
import {
  formatSalaryAmountFromCents,
  parseSalaryAmountToCents,
} from "./salary-receipt-parser.utils.js";
import type { SalaryReceiptPreview } from "./salary-receipts.types.js";

export {
  looksLikeSalaryReceipt,
  normalizeLegacySalaryAmount,
  normalizeSalaryReceiptModelResponse,
} from "./salary-receipt-legacy-compatibility.js";

interface ExtractionResult {
  preview: SalaryReceiptPreview;
  promptPath: string;
  promptHash: string;
  rawResponse: unknown;
  rawResponseHash: string;
  provider: string;
  model: string;
  durationMs: number;
  pageCount: number;
}

export function normalizeSalaryAmount(value: unknown): string {
  const text = String(value ?? "0").trim();
  try {
    return formatSalaryAmountFromCents(parseSalaryAmountToCents(text));
  } catch {
    return "0.00";
  }
}

export function recalculateSalaryReceiptPreview(
  preview: SalaryReceiptPreview,
): SalaryReceiptPreview {
  const items = preview.items.map((item, index) => ({
    ...item,
    displayOrder: index + 1,
    amount: normalizeSalaryAmount(item.amount),
  }));
  const grossCents = items
    .filter((item) => item.kind === "earning")
    .reduce((total, item) => total + parseSalaryAmountToCents(item.amount), 0);
  const deductionsCents = items
    .filter((item) => item.kind === "deduction")
    .reduce((total, item) => total + parseSalaryAmountToCents(item.amount), 0);

  return {
    ...preview,
    items,
    summary: {
      grossAmount: formatSalaryAmountFromCents(grossCents),
      deductionsAmount: formatSalaryAmountFromCents(deductionsCents),
      netAmount: formatSalaryAmountFromCents(grossCents - deductionsCents),
    },
  };
}

export class SalaryReceiptExtractionService {
  private readonly deterministic = new DeterministicSalaryReceiptImportService(
    salaryReceiptParsers,
  );

  async extract(absolutePdfPath: string): Promise<ExtractionResult> {
    const result = await this.deterministic.import({ pdfPath: absolutePdfPath });
    const rawResponse = {
      parser: result.parser,
      diagnostics: result.diagnostics,
      extraction: result.extraction,
    };
    const rawResponseHash = createHash("sha256")
      .update(JSON.stringify(rawResponse), "utf8")
      .digest("hex");

    return {
      preview: result.preview,
      promptPath: "deterministic://salary-receipts",
      promptHash: `${result.parser.id}@${result.parser.version}`,
      rawResponse,
      rawResponseHash,
      provider: "deterministic",
      model: `${result.parser.id}@${result.parser.version}`,
      durationMs: result.diagnostics.durationMs + result.extraction.durationMs,
      pageCount: result.extraction.pageCount,
    };
  }
}

export const salaryReceiptExtractionService = new SalaryReceiptExtractionService();
