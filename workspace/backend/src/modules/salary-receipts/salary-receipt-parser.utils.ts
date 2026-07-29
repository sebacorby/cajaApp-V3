const ARGENTINE_AMOUNT_PATTERN = /^-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/;
const DECIMAL_AMOUNT_PATTERN = /^-?\d+(?:\.\d{1,2})?$/;

export function normalizeSalaryReceiptText(rawText: string): string {
  return rawText
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .trim();
}

export function splitSalaryReceiptLines(rawText: string): string[] {
  return normalizeSalaryReceiptText(rawText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseSalaryAmountToCents(value: string): number {
  const compact = value.replace(/\s/g, "").replace(/[^\d,.-]/g, "");
  if (!compact) {
    throw new Error("Importe vacío.");
  }

  let normalized: string;
  if (ARGENTINE_AMOUNT_PATTERN.test(compact)) {
    normalized = compact.replace(/\./g, "").replace(",", ".");
  } else if (DECIMAL_AMOUNT_PATTERN.test(compact)) {
    normalized = compact;
  } else {
    throw new Error(`Importe no reconocido: ${value}`);
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) {
    throw new Error(`Importe inválido: ${value}`);
  }
  return Math.round(amount * 100);
}

export function formatSalaryAmountFromCents(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new Error("Los centavos deben ser un entero seguro.");
  }
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

export function assertExactSalaryTotal(
  printedCents: number | undefined,
  calculatedCents: number,
): boolean {
  return printedCents === undefined || printedCents === calculatedCents;
}
