import type {
  SalaryReceiptParseResult,
  SalaryReceiptParser,
  SalaryReceiptParserInput,
} from "./salary-receipt-parser.types.js";
import {
  parseSalaryAmountToCents,
  splitSalaryReceiptLines,
} from "./salary-receipt-parser.utils.js";
import {
  buildNetOnlySalaryReceiptResult,
  localDateToIso,
  normalizeReceiptTaxId,
  type NetOnlySalaryReceiptExtraItem,
} from "./salary-receipt-net-only.js";

function findLine(lines: string[], pattern: RegExp): string | null {
  return lines.find((line) => pattern.test(line)) ?? null;
}

function capture(line: string | null, pattern: RegExp): string | null {
  if (!line) return null;
  return line.match(pattern)?.[1]?.trim() ?? null;
}

function lastMonetaryValue(line: string | null): string | null {
  if (!line) return null;
  const values = line.match(/-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2}|\.\d{1,2})/g);
  return values?.at(-1) ?? null;
}

export class NttDataSalaryReceiptParser implements SalaryReceiptParser {
  readonly id = "ntt-data-argentina-v1";
  readonly version = "1.1.0";

  supports(input: SalaryReceiptParserInput): boolean {
    const text = input.rawText.toUpperCase().replace(/\s+/g, " ");
    return /N\s*TT DATA ARGENTINA/.test(text) && text.includes("NETO A COBRAR");
  }

  parse(input: SalaryReceiptParserInput): SalaryReceiptParseResult {
    const startedAt = Date.now();
    const lines = splitSalaryReceiptLines(input.rawText);

    const employerLine = findLine(lines, /EMPLEADOR:.*N\s*TT\s+DATA\s+ARGENTINA/i);
    const employerName = employerLine
      ? employerLine
          .replace(/^.*?EMPLEADOR:\s*/i, "")
          .replace(/\s+EMPLEADOR:.*$/i, "")
          .replace(/N\s+TT/i, "NTT")
          .trim()
      : "NTT DATA ARGENTINA S.A.";
    const employerTaxId = normalizeReceiptTaxId(
      capture(findLine(lines, /C\.?U\.?I\.?T\.?\s*N?[°º]?:?/i), /([\d-]{11,15})/),
    );

    const employeeLine = findLine(lines, /^\d+\s+.+\s+[\d-]{11,15}\s+(?:DU|DNI)\s+\d+/i);
    const employeeMatch = employeeLine?.match(
      /^\d+\s+(.+?)\s+([\d-]{11,15})\s+(?:DU|DNI)\s+\d+/i,
    );
    const employeeName = employeeMatch?.[1]?.trim() ?? "Empleado";
    const employeeTaxId = normalizeReceiptTaxId(employeeMatch?.[2] ?? null);

    const liquidationLine = findLine(lines, /\bMEN\s+0?\d\s+20\d{2}\b/i);
    const liquidation = liquidationLine?.match(/\bMEN\s+(0?\d|1[0-2])\s+(20\d{2})\b/i);
    const periodMonthKey = liquidation
      ? `${liquidation[2]}-${liquidation[1].padStart(2, "0")}`
      : null;

    const netLine = findLine(lines, /NETO\s+A\s+COBRAR\s+[-\d.,]+/i);
    const netValue = capture(netLine, /NETO\s+A\s+COBRAR\s+([-\d.,]+)/i);
    const payDate = localDateToIso(
      capture(netLine, /LUGAR Y FECHA DE PAGO\s+.*?\s+(\d{1,2}[/.-]\d{1,2}[/.-]20\d{2})/i),
    );

    const totalsLine = findLine(lines, /T\s*O\s*TALES\s+[-\d.,]+\s+[-\d.,]+\s+[-\d.,]+/i);
    const totals = totalsLine?.match(
      /T\s*O\s*TALES\s+([-\d.,]+)\s+([-\d.,]+)\s+([-\d.,]+)/i,
    );

    if (!periodMonthKey || !netValue) {
      throw new Error("El recibo NTT Data no contiene período o neto inequívoco.");
    }

    const remunerativeCents = totals ? parseSalaryAmountToCents(totals[1]) : undefined;
    const nonRemunerativeCents = totals ? parseSalaryAmountToCents(totals[2]) : undefined;
    const grossCents =
      remunerativeCents !== undefined && nonRemunerativeCents !== undefined
        ? remunerativeCents + nonRemunerativeCents
        : undefined;
    const deductionsCents = totals ? parseSalaryAmountToCents(totals[3]) : undefined;

    const sacLine = findLine(
      lines,
      /\b(?:S\.?\s*A\.?\s*C\.?|SUELDO\s+ANUAL\s+COMPLEMENTARIO|AGUINALDO)\b/i,
    );
    const sacValue = lastMonetaryValue(sacLine);
    const extraItems: NetOnlySalaryReceiptExtraItem[] = sacValue
      ? [
          {
            id: `${this.id}-sac`,
            code: "SAC",
            label: "Sueldo anual complementario (SAC)",
            amountCents: parseSalaryAmountToCents(sacValue),
            originalText: sacLine ?? `SAC ${sacValue}`,
          },
        ]
      : [];

    return buildNetOnlySalaryReceiptResult({
      parserId: this.id,
      parserVersion: this.version,
      employerName,
      employerTaxId,
      employeeName,
      employeeTaxId,
      periodMonthKey,
      payDate,
      grossCents,
      deductionsCents,
      netCents: parseSalaryAmountToCents(netValue),
      pageCount: input.pageCount,
      sourceLineCount: lines.length,
      durationMs: Date.now() - startedAt,
      netOriginalText: netLine ?? `NETO A COBRAR ${netValue}`,
      extraItems,
      warnings: [
        "El PDF original se conserva como fuente para futuros cálculos y parsers de conceptos detallados.",
      ],
    });
  }
}

export const nttDataSalaryReceiptParser = new NttDataSalaryReceiptParser();
