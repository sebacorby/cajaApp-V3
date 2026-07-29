import { createHash } from "node:crypto";
import {
  SalaryReceiptParserIncompleteError,
  SalaryReceiptTotalsMismatchError,
} from "./salary-receipt-parser.errors.js";
import type {
  SalaryReceiptParseDiagnostics,
  SalaryReceiptParseResult,
  SalaryReceiptParser,
  SalaryReceiptParserInput,
} from "./salary-receipt-parser.types.js";
import {
  formatSalaryAmountFromCents,
  parseSalaryAmountToCents,
  splitSalaryReceiptLines,
} from "./salary-receipt-parser.utils.js";
import type {
  SalaryReceiptItem,
  SalaryReceiptItemKind,
} from "./salary-receipts.types.js";

const AMOUNT_TOKEN = "-?(?:\\$\\s*)?(?:\\d{1,3}(?:\\.\\d{3})+|\\d+)(?:,\\d{1,2}|\\.\\d{1,2})?";
const MONEY_AT_END = new RegExp(`(${AMOUNT_TOKEN})\\s*$`);
const ITEM_LINE = new RegExp(`^(?:(?<code>[A-Z0-9.-]{1,16})\\s+)?(?<label>.+?)\\s+(?<amount>${AMOUNT_TOKEN})\\s*$`, "i");

const SECTION_PATTERNS: Array<[RegExp, SalaryReceiptItemKind]> = [
  [/^haberes?\s+remunerativos?$/i, "earning"],
  [/^haberes?\s+no\s+remunerativos?$/i, "earning"],
  [/^(descuentos?|retenciones?)$/i, "deduction"],
  [/^(aportes?|contribuciones?)\s+patronales?$/i, "employer_contribution"],
  [/^(informaci[oó]n|datos\s+informativos?)$/i, "information"],
];

const TOTAL_PATTERNS = {
  gross: /^(?:total\s+)?(?:haberes|remuneraci[oó]n)\s+(?:bruta|total)?\s*[:$]?\s*(.+)$/i,
  deductions: /^total\s+(?:descuentos|retenciones)\s*[:$]?\s*(.+)$/i,
  net: /^(?:neto(?:\s+a\s+(?:cobrar|pagar))?|total\s+neto)\s*[:$]?\s*(.+)$/i,
};

function fold(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function capture(lines: string[], patterns: RegExp[]): string | null {
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      const value = match?.[1]?.trim();
      if (value) return value;
    }
  }
  return null;
}

function normalizeTaxId(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 ? digits : null;
}

function normalizeMonth(value: string | null): string | null {
  if (!value) return null;
  const direct = value.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])\b/);
  if (direct) return `${direct[1]}-${direct[2].padStart(2, "0")}`;
  const reverse = value.match(/\b(0?[1-9]|1[0-2])[-/.](20\d{2})\b/);
  if (reverse) return `${reverse[2]}-${reverse[1].padStart(2, "0")}`;

  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const normalized = fold(value);
  const year = normalized.match(/\b(20\d{2})\b/)?.[1];
  const monthIndex = months.findIndex((month) => normalized.includes(month));
  return year && monthIndex >= 0 ? `${year}-${String(monthIndex + 1).padStart(2, "0")}` : null;
}

function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const iso = value.match(/\b(20\d{2})-(0[1-9]|1[0-2])-([0-2]\d|3[01])\b/);
  if (iso) return iso[0];
  const local = value.match(/\b([0-2]?\d|3[01])[/-](0?\d|1[0-2])[/-](20\d{2})\b/);
  return local
    ? `${local[3]}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}`
    : null;
}

function amountFromTail(value: string): number | undefined {
  const match = value.match(MONEY_AT_END);
  return match ? parseSalaryAmountToCents(match[1]) : undefined;
}

function stableItemId(parserId: string, line: string, index: number): string {
  return `${parserId}-${createHash("sha256").update(`${index}:${line}`).digest("hex").slice(0, 12)}`;
}

export class GenericArgentinaSalaryReceiptParser implements SalaryReceiptParser {
  readonly id = "argentina-sectioned-v1";
  readonly version = "1.0.0";

  supports(input: SalaryReceiptParserInput): boolean {
    const normalized = fold(input.rawText);
    const receiptSignals = [
      /recibo de (sueldo|haberes)/,
      /liquidacion de haberes/,
      /neto a (cobrar|pagar)/,
    ].filter((pattern) => pattern.test(normalized)).length;
    const sectionSignals = SECTION_PATTERNS.filter(([pattern]) =>
      splitSalaryReceiptLines(input.rawText).some((line) => pattern.test(line)),
    ).length;
    return receiptSignals >= 1 && sectionSignals >= 2;
  }

  parse(input: SalaryReceiptParserInput): SalaryReceiptParseResult {
    const startedAt = Date.now();
    const lines = splitSalaryReceiptLines(input.rawText);
    const employerName = capture(lines, [
      /^(?:raz[oó]n social|empleador|empresa)\s*[:|-]\s*(.+)$/i,
    ]);
    const employerTaxId = normalizeTaxId(capture(lines, [
      /^(?:cuit empleador|cuit empresa|cuit)\s*[:|-]\s*(.+)$/i,
    ]));
    const employeeName = capture(lines, [
      /^(?:empleado|trabajador|apellido y nombre|nombre y apellido)\s*[:|-]\s*(.+)$/i,
    ]);
    const employeeTaxId = normalizeTaxId(capture(lines, [
      /^(?:cuil empleado|cuil trabajador|cuil)\s*[:|-]\s*(.+)$/i,
    ]));
    const periodMonthKey = normalizeMonth(capture(lines, [
      /^(?:per[ií]odo|mes liquidado|liquidaci[oó]n)\s*[:|-]\s*(.+)$/i,
    ]));
    const payDate = normalizeDate(capture(lines, [
      /^(?:fecha de pago|pagado el)\s*[:|-]\s*(.+)$/i,
    ]));

    const items: SalaryReceiptItem[] = [];
    const unexplainedMonetaryLines: string[] = [];
    let section: SalaryReceiptItemKind | null = null;
    let printedGrossCents: number | undefined;
    let printedDeductionsCents: number | undefined;
    let printedNetCents: number | undefined;

    for (const [lineIndex, line] of lines.entries()) {
      const matchedSection = SECTION_PATTERNS.find(([pattern]) => pattern.test(line));
      if (matchedSection) {
        section = matchedSection[1];
        continue;
      }

      const gross = line.match(TOTAL_PATTERNS.gross);
      const deductions = line.match(TOTAL_PATTERNS.deductions);
      const net = line.match(TOTAL_PATTERNS.net);
      if (gross) {
        printedGrossCents = amountFromTail(gross[1]);
        section = null;
        continue;
      }
      if (deductions) {
        printedDeductionsCents = amountFromTail(deductions[1]);
        section = null;
        continue;
      }
      if (net) {
        printedNetCents = amountFromTail(net[1]);
        section = null;
        continue;
      }

      if (!section || !MONEY_AT_END.test(line)) continue;
      const match = line.match(ITEM_LINE);
      if (!match?.groups) {
        unexplainedMonetaryLines.push(line);
        continue;
      }

      const amountCents = parseSalaryAmountToCents(match.groups.amount);
      const label = match.groups.label.trim();
      if (!label || amountCents < 0) {
        unexplainedMonetaryLines.push(line);
        continue;
      }

      items.push({
        id: stableItemId(this.id, line, lineIndex),
        displayOrder: items.length + 1,
        kind: section,
        code: match.groups.code?.trim() || null,
        label,
        amount: formatSalaryAmountFromCents(amountCents),
        sourcePage: null,
        originalText: line,
        confidence: null,
      });
    }

    const grossCents = items
      .filter((item) => item.kind === "earning")
      .reduce((total, item) => total + parseSalaryAmountToCents(item.amount), 0);
    const deductionsCents = items
      .filter((item) => item.kind === "deduction")
      .reduce((total, item) => total + parseSalaryAmountToCents(item.amount), 0);
    const netCents = grossCents - deductionsCents;

    const required: Array<[string, unknown]> = [
      ["employerName", employerName],
      ["employeeName", employeeName],
      ["periodMonthKey", periodMonthKey],
      ["items", items.length > 0],
      ["printedGrossCents", printedGrossCents],
      ["printedDeductionsCents", printedDeductionsCents],
      ["printedNetCents", printedNetCents],
    ];
    const requiredFieldsMissing = required
      .filter(([, value]) => value === null || value === undefined || value === false)
      .map(([name]) => name);
    const requiredFieldsFound = required
      .filter(([, value]) => value !== null && value !== undefined && value !== false)
      .map(([name]) => name);

    const diagnostics: SalaryReceiptParseDiagnostics = {
      parserId: this.id,
      parserVersion: this.version,
      pageCount: input.pageCount,
      sourceLineCount: lines.length,
      candidateConceptLineCount: items.length + unexplainedMonetaryLines.length,
      parsedConceptCount: items.length,
      unexplainedMonetaryLineCount: unexplainedMonetaryLines.length,
      requiredFieldsFound,
      requiredFieldsMissing,
      warnings: unexplainedMonetaryLines.map((line) => ({
        code: "UNEXPLAINED_MONETARY_LINE",
        message: "Línea monetaria no interpretada.",
        lineNumber: lines.indexOf(line) + 1,
      })),
      totals: {
        printedGrossCents,
        calculatedGrossCents: grossCents,
        printedDeductionsCents,
        calculatedDeductionsCents: deductionsCents,
        printedNetCents,
        calculatedNetCents: netCents,
      },
      durationMs: Date.now() - startedAt,
    };

    if (requiredFieldsMissing.length > 0 || unexplainedMonetaryLines.length > 0) {
      throw new SalaryReceiptParserIncompleteError(diagnostics);
    }
    if (printedGrossCents !== grossCents) {
      throw new SalaryReceiptTotalsMismatchError("gross", printedGrossCents!, grossCents);
    }
    if (printedDeductionsCents !== deductionsCents) {
      throw new SalaryReceiptTotalsMismatchError("deductions", printedDeductionsCents!, deductionsCents);
    }
    if (printedNetCents !== netCents) {
      throw new SalaryReceiptTotalsMismatchError("net", printedNetCents!, netCents);
    }

    return {
      preview: {
        version: "salary-receipt-v1",
        documentType: "salary_receipt_pdf",
        source: {
          employerName: employerName!,
          employerTaxId,
          employeeName: employeeName!,
          employeeTaxId,
          periodMonthKey: periodMonthKey!,
          payDate,
          currency: "ARS",
        },
        summary: {
          grossAmount: formatSalaryAmountFromCents(grossCents),
          deductionsAmount: formatSalaryAmountFromCents(deductionsCents),
          netAmount: formatSalaryAmountFromCents(netCents),
        },
        items,
        warnings: [],
      },
      diagnostics,
      parser: { id: this.id, version: this.version },
    };
  }
}

export const genericArgentinaSalaryReceiptParser = new GenericArgentinaSalaryReceiptParser();
