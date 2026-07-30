import type {
  SalaryReceiptParseDiagnostics,
  SalaryReceiptParseResult,
} from "./salary-receipt-parser.types.js";
import { formatSalaryAmountFromCents } from "./salary-receipt-parser.utils.js";
import type { SalaryReceiptItem } from "./salary-receipts.types.js";

export interface NetOnlySalaryReceiptData {
  parserId: string;
  parserVersion: string;
  employerName: string;
  employerTaxId: string | null;
  employeeName: string;
  employeeTaxId: string | null;
  periodMonthKey: string;
  payDate: string | null;
  grossCents?: number;
  deductionsCents?: number;
  netCents: number;
  pageCount: number;
  sourceLineCount: number;
  durationMs: number;
  warnings?: string[];
  netOriginalText: string;
}

function informationItem(
  id: string,
  displayOrder: number,
  label: string,
  cents: number,
  originalText: string,
): SalaryReceiptItem {
  return {
    id,
    displayOrder,
    kind: "information",
    code: null,
    label,
    amount: formatSalaryAmountFromCents(cents),
    sourcePage: 1,
    originalText,
    confidence: null,
  };
}

export function buildNetOnlySalaryReceiptResult(
  data: NetOnlySalaryReceiptData,
): SalaryReceiptParseResult {
  const grossCents = data.grossCents ?? 0;
  const deductionsCents = data.deductionsCents ?? 0;
  const warnings = [...(data.warnings ?? [])];
  const items: SalaryReceiptItem[] = [];

  if (data.grossCents !== undefined) {
    items.push(
      informationItem(
        `${data.parserId}-gross`,
        items.length + 1,
        "Total haberes informado",
        grossCents,
        "Total de haberes extraído del recibo.",
      ),
    );
  }
  if (data.deductionsCents !== undefined) {
    items.push(
      informationItem(
        `${data.parserId}-deductions`,
        items.length + 1,
        "Total descuentos informado",
        deductionsCents,
        "Total de descuentos extraído del recibo.",
      ),
    );
  }
  items.push(
    informationItem(
      `${data.parserId}-net`,
      items.length + 1,
      "Neto en mano",
      data.netCents,
      data.netOriginalText,
    ),
  );

  if (data.grossCents === undefined || data.deductionsCents === undefined) {
    warnings.push(
      "El recibo se importó por neto en mano. El detalle de haberes y descuentos quedó pendiente para una evolución futura del parser.",
    );
  }

  const diagnostics: SalaryReceiptParseDiagnostics = {
    parserId: data.parserId,
    parserVersion: data.parserVersion,
    pageCount: data.pageCount,
    sourceLineCount: data.sourceLineCount,
    candidateConceptLineCount: items.length,
    parsedConceptCount: items.length,
    unexplainedMonetaryLineCount: 0,
    requiredFieldsFound: [
      "employerName",
      "employeeName",
      "periodMonthKey",
      "netAmount",
    ],
    requiredFieldsMissing: [],
    warnings: warnings.map((message) => ({
      code: "NET_ONLY_IMPORT",
      message,
    })),
    totals: {
      printedGrossCents: data.grossCents,
      calculatedGrossCents: grossCents,
      printedDeductionsCents: data.deductionsCents,
      calculatedDeductionsCents: deductionsCents,
      printedNetCents: data.netCents,
      calculatedNetCents: data.netCents,
    },
    durationMs: data.durationMs,
  };

  return {
    preview: {
      version: "salary-receipt-v1",
      documentType: "salary_receipt_pdf",
      source: {
        employerName: data.employerName,
        employerTaxId: data.employerTaxId,
        employeeName: data.employeeName,
        employeeTaxId: data.employeeTaxId,
        periodMonthKey: data.periodMonthKey,
        payDate: data.payDate,
        currency: "ARS",
      },
      summary: {
        grossAmount: formatSalaryAmountFromCents(grossCents),
        deductionsAmount: formatSalaryAmountFromCents(deductionsCents),
        netAmount: formatSalaryAmountFromCents(data.netCents),
      },
      items,
      warnings,
    },
    diagnostics,
    parser: {
      id: data.parserId,
      version: data.parserVersion,
    },
  };
}

export function normalizeReceiptTaxId(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 ? digits : null;
}

export function localDateToIso(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/\b([0-2]?\d|3[01])[/-](0?\d|1[0-2])[/-](20\d{2})\b/);
  return match
    ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`
    : null;
}
