import { parseSalaryAmountToCents } from "./salary-receipt-parser.utils.js";
import type { SalaryReceiptItem } from "./salary-receipts.types.js";

const SAC_PATTERN = /\b(?:s\.?\s*a\.?\s*c\.?|sueldo\s+anual\s+complementario|aguinaldo)\b/i;

export interface SalaryReceiptExtraAnalysisInput {
  grossAmount: string;
  netAmount: string;
  items: Array<Pick<SalaryReceiptItem, "label" | "amount" | "originalText">>;
}

export interface SalaryReceiptExtraAnalysis {
  hasSac: boolean;
  sacOnly: boolean;
  sacGrossAmount: string;
  sacNetEstimate: string;
  recurringNetAmount: string;
  strategy: "none" | "gross-ratio" | "sac-only";
}

function formatCents(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}

function roundDivide(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) return 0n;
  return (numerator + denominator / 2n) / denominator;
}

export function isSacConcept(value: string): boolean {
  return SAC_PATTERN.test(value);
}

export function analyzeSalaryReceiptExtras(
  input: SalaryReceiptExtraAnalysisInput,
): SalaryReceiptExtraAnalysis {
  const netCents = BigInt(parseSalaryAmountToCents(input.netAmount));
  const grossCents = BigInt(parseSalaryAmountToCents(input.grossAmount));
  const sacItems = input.items.filter(
    (item) => isSacConcept(item.label) || isSacConcept(item.originalText),
  );
  const sacGrossCents = sacItems.reduce(
    (total, item) => total + BigInt(parseSalaryAmountToCents(item.amount)),
    0n,
  );

  if (sacItems.length === 0 || sacGrossCents <= 0n) {
    return {
      hasSac: false,
      sacOnly: false,
      sacGrossAmount: "0.00",
      sacNetEstimate: "0.00",
      recurringNetAmount: formatCents(netCents),
      strategy: "none",
    };
  }

  if (grossCents <= 0n || sacGrossCents >= grossCents) {
    return {
      hasSac: true,
      sacOnly: true,
      sacGrossAmount: formatCents(sacGrossCents),
      sacNetEstimate: formatCents(netCents),
      recurringNetAmount: "0.00",
      strategy: "sac-only",
    };
  }

  const recurringNetCents = roundDivide(
    netCents * (grossCents - sacGrossCents),
    grossCents,
  );
  const sacNetEstimateCents = netCents - recurringNetCents;

  return {
    hasSac: true,
    sacOnly: false,
    sacGrossAmount: formatCents(sacGrossCents),
    sacNetEstimate: formatCents(sacNetEstimateCents),
    recurringNetAmount: formatCents(recurringNetCents),
    strategy: "gross-ratio",
  };
}
