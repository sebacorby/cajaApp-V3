import { createHash } from "node:crypto";
import { DeterministicSalaryReceiptImportService } from "./deterministic-salary-receipt-import.service.js";
import { salaryReceiptParsers } from "./salary-receipt-parsers.js";
import {
  formatSalaryAmountFromCents,
  parseSalaryAmountToCents,
} from "./salary-receipt-parser.utils.js";
import type {
  SalaryReceiptItem,
  SalaryReceiptPreview,
} from "./salary-receipts.types.js";

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

function cents(value: string): number {
  return parseSalaryAmountToCents(normalizeSalaryAmount(value));
}

function findInformationAmount(
  items: SalaryReceiptItem[],
  patterns: RegExp[],
): number | undefined {
  const item = items.find(
    (candidate) =>
      candidate.kind === "information" &&
      patterns.some((pattern) => pattern.test(candidate.label)),
  );
  return item ? cents(item.amount) : undefined;
}

export function recalculateSalaryReceiptPreview(
  preview: SalaryReceiptPreview,
): SalaryReceiptPreview {
  const items = preview.items.map((item, index) => ({
    ...item,
    displayOrder: index + 1,
    amount: normalizeSalaryAmount(item.amount),
  }));
  const earnings = items.filter((item) => item.kind === "earning");
  const deductions = items.filter((item) => item.kind === "deduction");
  const hasDetailedBreakdown = earnings.length > 0 || deductions.length > 0;

  let grossCents: number;
  let deductionsCents: number;
  let netCents: number;

  if (hasDetailedBreakdown) {
    grossCents = earnings.reduce((total, item) => total + cents(item.amount), 0);
    deductionsCents = deductions.reduce(
      (total, item) => total + cents(item.amount),
      0,
    );
    netCents = grossCents - deductionsCents;
  } else {
    grossCents =
      findInformationAmount(items, [
        /^total haberes informado$/i,
        /^total (?:haberes|remuneraci[oó]n|bruto)/i,
      ]) ?? cents(preview.summary.grossAmount);
    deductionsCents =
      findInformationAmount(items, [
        /^total descuentos informado$/i,
        /^total (?:descuentos|retenciones)/i,
      ]) ?? cents(preview.summary.deductionsAmount);
    netCents =
      findInformationAmount(items, [
        /^neto en mano$/i,
        /^neto a cobrar$/i,
        /^total neto$/i,
      ]) ?? cents(preview.summary.netAmount);
  }

  return {
    ...preview,
    items,
    summary: {
      grossAmount: formatSalaryAmountFromCents(grossCents),
      deductionsAmount: formatSalaryAmountFromCents(deductionsCents),
      netAmount: formatSalaryAmountFromCents(netCents),
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
