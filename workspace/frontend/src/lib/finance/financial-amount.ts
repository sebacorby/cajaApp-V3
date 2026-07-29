import { protectFormattedAmount } from "@/lib/finance/amount-privacy";

export function parseFinancialAmount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim().replace(/[^0-9,.-]/g, "");

  if (!cleaned) {
    return null;
  }

  const negative = cleaned.startsWith("-");
  const unsigned = cleaned.replace(/-/g, "");
  const lastComma = unsigned.lastIndexOf(",");
  const lastDot = unsigned.lastIndexOf(".");

  let decimalSeparator: "," | "." | null = null;

  if (lastComma >= 0 && lastDot >= 0) {
    decimalSeparator = lastComma > lastDot ? "," : ".";
  } else {
    const separatorIndex = Math.max(lastComma, lastDot);

    if (separatorIndex >= 0) {
      const digitsAfter = unsigned.length - separatorIndex - 1;

      if (digitsAfter === 1 || digitsAfter === 2) {
        decimalSeparator = unsigned[separatorIndex] as "," | ".";
      }
    }
  }

  let normalized: string;

  if (decimalSeparator) {
    const decimalIndex = unsigned.lastIndexOf(decimalSeparator);
    const integerPart = unsigned
      .slice(0, decimalIndex)
      .replace(/[.,]/g, "");
    const fractionalPart = unsigned
      .slice(decimalIndex + 1)
      .replace(/[.,]/g, "");

    normalized = `${integerPart || "0"}.${fractionalPart}`;
  } else {
    normalized = unsigned.replace(/[.,]/g, "");
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return negative ? -parsed : parsed;
}

export function formatFinancialAmount(
  value: unknown,
  currency: "ARS" | "USD",
): string {
  const parsed = parseFinancialAmount(value);

  if (parsed === null) {
    return "—";
  }

  const formatted = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);

  return protectFormattedAmount(formatted, currency);
}
