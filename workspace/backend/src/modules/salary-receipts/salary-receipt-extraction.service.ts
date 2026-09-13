import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { env } from "../../config/env.js";
import { getTextExtractionProvider } from "../ai/text-extraction-provider.factory.js";
import { jsonRepairService } from "../ai/json-repair.service.js";
import { pdfRawExtractorService } from "../documents/pdf-raw-extractor.service.js";
import { AiOutputSchemaInvalidError, UnsupportedDocumentTypeError } from "../../shared/errors.js";
import { logger } from "../../shared/logger.js";
import { validateData } from "../../shared/validation.js";
import { salaryReceiptPreviewSchema } from "./salary-receipts.schemas.js";
import type {
  SalaryReceiptItem,
  SalaryReceiptItemKind,
  SalaryReceiptPreview,
} from "./salary-receipts.types.js";

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

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
    : [];
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  if (!normalized || normalized.toLowerCase() === "null") return null;
  return normalized;
}

export function normalizeSalaryAmount(value: unknown): string {
  const original = text(value) ?? "0";
  let compact = original.replace(/\s/g, "").replace(/[^0-9,.-]/g, "");
  const negative = compact.startsWith("-");
  compact = compact.replace(/-/g, "");

  const comma = compact.lastIndexOf(",");
  const dot = compact.lastIndexOf(".");
  const decimalIndex = Math.max(comma, dot);
  let normalized: string;

  if (decimalIndex >= 0 && compact.length - decimalIndex - 1 <= 2) {
    const whole = compact.slice(0, decimalIndex).replace(/[.,]/g, "") || "0";
    const fraction = compact.slice(decimalIndex + 1).replace(/[.,]/g, "").padEnd(2, "0").slice(0, 2);
    normalized = `${whole}.${fraction}`;
  } else {
    normalized = `${compact.replace(/[.,]/g, "") || "0"}.00`;
  }

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return "0.00";
  return Math.abs(negative ? -numeric : numeric).toFixed(2);
}

function cents(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole || "0") * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2));
}

function amountFromCents(value: bigint): string {
  const safe = value < 0n ? 0n : value;
  return `${safe / 100n}.${(safe % 100n).toString().padStart(2, "0")}`;
}

export function recalculateSalaryReceiptPreview(preview: SalaryReceiptPreview): SalaryReceiptPreview {
  const gross = preview.items
    .filter((item) => item.kind === "earning")
    .reduce((total, item) => total + cents(normalizeSalaryAmount(item.amount)), 0n);
  const deductions = preview.items
    .filter((item) => item.kind === "deduction")
    .reduce((total, item) => total + cents(normalizeSalaryAmount(item.amount)), 0n);
  return {
    ...preview,
    summary: {
      grossAmount: amountFromCents(gross),
      deductionsAmount: amountFromCents(deductions),
      netAmount: amountFromCents(gross - deductions),
    },
    items: preview.items.map((item, index) => ({
      ...item,
      displayOrder: index + 1,
      amount: normalizeSalaryAmount(item.amount),
    })),
  };
}

function normalizeMonthKey(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  const direct = candidate.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (direct) return `${direct[1]}-${direct[2]}`;
  const slash = candidate.match(/^(0?[1-9]|1[0-2])[\/-](\d{4})$/);
  if (slash) return `${slash[2]}-${slash[1].padStart(2, "0")}`;
  const long = candidate.match(/(\d{4})[\/-](0?[1-9]|1[0-2])/);
  if (long) return `${long[1]}-${long[2].padStart(2, "0")}`;
  return null;
}

function normalizeIsoDate(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return candidate;
  const match = candidate.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : null;
}

function normalizeKind(value: unknown, label: string): SalaryReceiptItemKind {
  const candidate = (text(value) ?? "").toLowerCase();
  if (["earning", "earning_item", "haber", "haberes", "remuneration", "remunerativo", "non_remunerative"].includes(candidate)) return "earning";
  if (["deduction", "deductions", "descuento", "retencion", "withholding"].includes(candidate)) return "deduction";
  if (["employer_contribution", "contribution", "contribucion_patronal", "aporte_patronal"].includes(candidate)) return "employer_contribution";
  const normalizedLabel = label.toLowerCase();
  if (/descuento|retenci[oó]n|jubilaci[oó]n|obra social|sindicato|ganancias/.test(normalizedLabel)) return "deduction";
  if (/contribuci[oó]n patronal|aporte patronal/.test(normalizedLabel)) return "employer_contribution";
  return candidate === "information" ? "information" : "earning";
}

export function normalizeSalaryReceiptModelResponse(
  raw: Record<string, unknown>,
  pageCount: number,
): SalaryReceiptPreview {
  const source = record(raw.source ?? raw.header ?? raw.employee);
  const summary = record(raw.summary ?? raw.totals);
  const rawItems = records(raw.items ?? raw.concepts ?? raw.rows);

  const items: SalaryReceiptItem[] = rawItems.map((item, index) => {
    const label = text(item.label ?? item.description ?? item.concept) ?? `Concepto ${index + 1}`;
    return {
      id: text(item.id) ?? `salary-item-${index + 1}`,
      displayOrder: Number.isFinite(Number(item.displayOrder)) ? Math.max(1, Math.trunc(Number(item.displayOrder))) : index + 1,
      kind: normalizeKind(item.kind ?? item.type, label),
      code: text(item.code ?? item.conceptCode),
      label,
      amount: normalizeSalaryAmount(item.amount ?? item.value),
      sourcePage: Number.isFinite(Number(item.sourcePage ?? item.page))
        ? Math.min(pageCount, Math.max(1, Math.trunc(Number(item.sourcePage ?? item.page))))
        : null,
      originalText: text(item.originalText ?? item.sourceText) ?? label,
      confidence: Number.isFinite(Number(item.confidence))
        ? Math.min(1, Math.max(0, Number(item.confidence)))
        : null,
    };
  }).sort((left, right) => left.displayOrder - right.displayOrder)
    .map((item, index) => ({ ...item, displayOrder: index + 1 }));

  const earnings = items
    .filter((item) => item.kind === "earning")
    .reduce((total, item) => total + cents(item.amount), 0n);
  const deductions = items
    .filter((item) => item.kind === "deduction")
    .reduce((total, item) => total + cents(item.amount), 0n);

  const extractedGross = normalizeSalaryAmount(summary.grossAmount ?? summary.gross ?? summary.totalEarnings);
  const extractedDeductions = normalizeSalaryAmount(summary.deductionsAmount ?? summary.deductions ?? summary.totalDeductions);
  const extractedNet = normalizeSalaryAmount(summary.netAmount ?? summary.net ?? summary.netPay);

  const gross = earnings > 0n ? earnings : cents(extractedGross);
  const deductionTotal = deductions > 0n ? deductions : cents(extractedDeductions);
  const calculatedNet = gross >= deductionTotal ? gross - deductionTotal : cents(extractedNet);

  const warnings = Array.isArray(raw.warnings)
    ? raw.warnings.map(text).filter((value): value is string => Boolean(value))
    : [];
  if (cents(extractedNet) > 0n && calculatedNet !== cents(extractedNet)) {
    warnings.push("El neto informado no coincide con la suma de conceptos; CajaApp recalculó el valor para el borrador.");
  }

  const monthKey = normalizeMonthKey(
    source.periodMonthKey ?? source.period ?? source.liquidationPeriod ?? raw.periodMonthKey,
  );

  return {
    version: "salary-receipt-v1",
    documentType: "salary_receipt_pdf",
    source: {
      employerName: text(source.employerName ?? source.employer ?? source.companyName) ?? "Empleador sin identificar",
      employerTaxId: text(source.employerTaxId ?? source.employerCuit ?? source.companyTaxId),
      employeeName: text(source.employeeName ?? source.workerName ?? source.name) ?? "Empleado sin identificar",
      employeeTaxId: text(source.employeeTaxId ?? source.employeeCuil ?? source.workerTaxId),
      periodMonthKey: monthKey ?? new Date().toISOString().slice(0, 7),
      payDate: normalizeIsoDate(source.payDate ?? source.paymentDate),
      currency: text(source.currency)?.toUpperCase() === "USD" ? "USD" : "ARS",
    },
    summary: {
      grossAmount: amountFromCents(gross),
      deductionsAmount: amountFromCents(deductionTotal),
      netAmount: amountFromCents(calculatedNet),
    },
    items,
    warnings,
  };
}

export function looksLikeSalaryReceipt(rawText: string): boolean {
  const normalized = rawText
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const indicators = [
    /recibo de (sueldo|haberes)/,
    /liquidacion de haberes/,
    /remuneracion (bruta|neta)/,
    /total (haberes|descuentos)/,
    /neto (a cobrar|pagado)/,
    /cuil/,
    /legajo/,
  ];
  return indicators.filter((pattern) => pattern.test(normalized)).length >= 2;
}

export class SalaryReceiptExtractionService {
  async extract(absolutePdfPath: string): Promise<ExtractionResult> {
    const rawExtraction = await pdfRawExtractorService.extract(absolutePdfPath);
    if (!looksLikeSalaryReceipt(rawExtraction.rawText)) {
      throw new UnsupportedDocumentTypeError("salary_receipt_pdf");
    }

    const promptPath = path.resolve(env.SALARY_RECEIPT_PROMPTS_DIR, "01-extract-salary-receipt.md");
    const promptTemplate = await fs.readFile(promptPath, "utf8");
    const prompt = promptTemplate.replace("{{PAGE_COUNT}}", String(rawExtraction.pageCount));
    const promptHash = createHash("sha256").update(prompt, "utf8").digest("hex");

    const aiResult = await getTextExtractionProvider().extractJson({
      systemPrompt: prompt,
      rawDocument: rawExtraction.rawText,
    });
    if (!aiResult.rawJson) {
      throw new AiOutputSchemaInvalidError("The model did not return JSON");
    }

    const normalized = normalizeSalaryReceiptModelResponse(
      aiResult.rawJson as Record<string, unknown>,
      rawExtraction.pageCount,
    );

    let preview: SalaryReceiptPreview;
    try {
      preview = validateData(salaryReceiptPreviewSchema, normalized);
    } catch (error) {
      const repair = await jsonRepairService.repairJson(JSON.stringify(normalized), salaryReceiptPreviewSchema);
      if (!repair.success) {
        throw new AiOutputSchemaInvalidError(repair.errors?.join("; ") || String(error));
      }
      preview = repair.data as SalaryReceiptPreview;
    }

    const rawResponse = aiResult.rawJson;
    const rawResponseHash = createHash("sha256")
      .update(JSON.stringify(rawResponse), "utf8")
      .digest("hex");

    logger.info({
      event: "salary_receipt.extraction.completed",
      pageCount: rawExtraction.pageCount,
      items: preview.items.length,
      promptHash,
      provider: aiResult.provider,
      model: aiResult.model,
      durationMs: aiResult.durationMs,
    }, "Salary receipt extraction completed");

    return {
      preview,
      promptPath,
      promptHash,
      rawResponse,
      rawResponseHash,
      provider: aiResult.provider,
      model: aiResult.model,
      durationMs: aiResult.durationMs,
      pageCount: rawExtraction.pageCount,
    };
  }
}

export const salaryReceiptExtractionService = new SalaryReceiptExtractionService();
