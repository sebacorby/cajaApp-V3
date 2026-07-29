export type Currency = "ARS" | "USD";

function normalizeMoneyInput(value: string): string {
  const compact = value.trim().replace(/\s/g, "");
  if (!compact || !/^[+-]?[0-9.,]+$/.test(compact)) {
    throw new Error(`Invalid money amount: ${value}`);
  }

  const negative = compact.startsWith("-");
  const unsigned = compact.replace(/^[+-]/, "");
  const lastComma = unsigned.lastIndexOf(",");
  const lastDot = unsigned.lastIndexOf(".");

  let decimalSeparator: "," | "." | null = null;

  if (lastComma >= 0 && lastDot >= 0) {
    // When both separators are present, the rightmost one is the decimal separator.
    decimalSeparator = lastComma > lastDot ? "," : ".";
  } else {
    const separatorIndex = Math.max(lastComma, lastDot);
    if (separatorIndex >= 0) {
      const digitsAfter = unsigned.length - separatorIndex - 1;
      // Financial values use one or two decimal digits. Three digits are treated as
      // a thousands group (e.g. 268.333 -> 268333).
      if (digitsAfter === 1 || digitsAfter === 2) {
        decimalSeparator = unsigned[separatorIndex] as "," | ".";
      }
    }
  }

  let normalized: string;
  if (decimalSeparator) {
    const decimalIndex = unsigned.lastIndexOf(decimalSeparator);
    const integerPart = unsigned.slice(0, decimalIndex).replace(/[.,]/g, "");
    const fractionalPart = unsigned.slice(decimalIndex + 1).replace(/[.,]/g, "");
    normalized = `${integerPart || "0"}.${fractionalPart}`;
  } else {
    normalized = unsigned.replace(/[.,]/g, "");
  }

  return negative ? `-${normalized}` : normalized;
}

function parseMoneyToCents(value: string, label: string): bigint {
  let normalized: string;
  try {
    normalized = normalizeMoneyInput(value);
  } catch {
    throw new Error(`Invalid ${label} amount: ${value}`);
  }

  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  if (!/^\d+(?:\.\d{1,2})?$/.test(unsigned)) {
    throw new Error(`Invalid ${label} amount: ${value}`);
  }

  const [whole, fraction = ""] = unsigned.split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return negative ? -cents : cents;
}

export function parseArgentinePesos(value: string): bigint {
  return parseMoneyToCents(value, "peso");
}

export function parseDollars(value: string): bigint {
  return parseMoneyToCents(value, "dollar");
}

export function centsToString(cents: bigint, currency: Currency): string {
  const num = Number(cents) / 100;
  if (currency === "USD") {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return num.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatArgentinePesos(cents: bigint): string {
  const num = Number(cents) / 100;
  return num.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDollars(cents: bigint): string {
  const num = Number(cents) / 100;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function isValidArgentineAmount(value: string): boolean {
  try {
    return parseArgentinePesos(value) >= 0n;
  } catch {
    return false;
  }
}

export function isValidDollarAmount(value: string): boolean {
  try {
    return parseDollars(value) >= 0n;
  } catch {
    return false;
  }
}
