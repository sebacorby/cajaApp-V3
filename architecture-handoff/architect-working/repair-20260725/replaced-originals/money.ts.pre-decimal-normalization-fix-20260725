export type Currency = "ARS" | "USD";

export function parseArgentinePesos(value: string): bigint {
  const cleaned = value
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const num = parseFloat(cleaned);
  if (isNaN(num)) {
    throw new Error(`Invalid peso amount: ${value}`);
  }

  return BigInt(Math.round(num * 100));
}

export function parseDollars(value: string): bigint {
  const cleaned = value
    .replace(/\s/g, "")
    .replace(",", ".");

  const num = parseFloat(cleaned);
  if (isNaN(num)) {
    throw new Error(`Invalid dollar amount: ${value}`);
  }

  return BigInt(Math.round(num * 100));
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
  const cleaned = value.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return !isNaN(num) && num >= 0;
}

export function isValidDollarAmount(value: string): boolean {
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return !isNaN(num) && num >= 0;
}
