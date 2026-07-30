import type {
  SalaryReceiptParseResult,
  SalaryReceiptParser,
  SalaryReceiptParserInput,
} from "./salary-receipt-parser.types.js";
import { parseSalaryAmountToCents, splitSalaryReceiptLines } from "./salary-receipt-parser.utils.js";
import {
  buildNetOnlySalaryReceiptResult,
  localDateToIso,
  normalizeReceiptTaxId,
} from "./salary-receipt-net-only.js";

function findLine(lines: string[], pattern: RegExp): string | null {
  return lines.find((line) => pattern.test(line)) ?? null;
}

function capture(line: string | null, pattern: RegExp): string | null {
  if (!line) return null;
  return line.match(pattern)?.[1]?.trim() ?? null;
}

export class FluxitSalaryReceiptParser implements SalaryReceiptParser {
  readonly id = "fluxit-v1";
  readonly version = "1.0.0";

  supports(input: SalaryReceiptParserInput): boolean {
    const text = input.rawText.toUpperCase();
    return text.includes("FLUXIT") && /\bNETO\s+[-\d.,]+/i.test(input.rawText);
  }

  parse(input: SalaryReceiptParserInput): SalaryReceiptParseResult {
    const startedAt = Date.now();
    const lines = splitSalaryReceiptLines(input.rawText);

    const employerTaxId = normalizeReceiptTaxId(
      capture(findLine(lines, /^C\.?U\.?I\.?T\.?\s+/i), /([\d-]{11,15})/),
    );
    const employeeLine = findLine(lines, /^Legajo\s+/i);
    const employeeName =
      capture(employeeLine, /^Legajo\s+\S+\s+-\s+(.+)$/i) ?? "Empleado";
    const employeeTaxId = normalizeReceiptTaxId(
      capture(findLine(lines, /^CUIL\s+/i), /^CUIL\s+([\d-]+)/i),
    );
    const periodLine = findLine(lines, /^Periodo\s+\d{1,2}[/.-]\d{1,2}[/.-]20\d{2}/i);
    const periodDate = capture(periodLine, /^Periodo\s+(\d{1,2}[/.-]\d{1,2}[/.-]20\d{2})/i);
    const periodIso = localDateToIso(periodDate);
    const payDate = localDateToIso(
      capture(findLine(lines, /^Fecha de pago\s+/i), /^Fecha de pago\s+([^\s]+)/i),
    );

    const totalsLine = findLine(lines, /^Totales\s+/i);
    const totals = totalsLine?.match(
      /^Totales\s+([-\d.,]+)\s+([-\d.,]+)\s+([-\d.,]+)\s*$/i,
    );
    const netLine = findLine(lines, /^Neto\s+[-\d.,]+/i);
    const netValue = capture(netLine, /^Neto\s+([-\d.,]+)/i);

    if (!periodIso || !netValue) {
      throw new Error("El recibo FluxIT no contiene período o neto inequívoco.");
    }

    const remunerativeCents = totals ? parseSalaryAmountToCents(totals[1]) : undefined;
    const nonRemunerativeCents = totals ? parseSalaryAmountToCents(totals[2]) : undefined;
    const grossCents =
      remunerativeCents !== undefined && nonRemunerativeCents !== undefined
        ? remunerativeCents + nonRemunerativeCents
        : undefined;
    const deductionsCents = totals ? parseSalaryAmountToCents(totals[3]) : undefined;

    return buildNetOnlySalaryReceiptResult({
      parserId: this.id,
      parserVersion: this.version,
      employerName: "FLUXIT",
      employerTaxId,
      employeeName,
      employeeTaxId,
      periodMonthKey: periodIso.slice(0, 7),
      payDate,
      grossCents,
      deductionsCents,
      netCents: parseSalaryAmountToCents(netValue),
      pageCount: input.pageCount,
      sourceLineCount: lines.length,
      durationMs: Date.now() - startedAt,
      netOriginalText: netLine ?? `Neto ${netValue}`,
      warnings: [
        "El PDF original se conserva como fuente para futuros cálculos y parsers de conceptos detallados.",
      ],
    });
  }
}

export const fluxitSalaryReceiptParser = new FluxitSalaryReceiptParser();
