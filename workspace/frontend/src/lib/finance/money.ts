export type MoneyMinorUnits = number;

export function backendDecimalToMinorUnits(
  value: string | number | null | undefined,
): MoneyMinorUnits | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const raw = String(value).trim();
  if (!/^-?\d+(?:.\d{1,2})?$/.test(raw)) {
    throw new Error(`Invalid backend money value: ${raw}`);
  }
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [wholePart, fractionPart = ""] = unsigned.split(".");
  const fraction = fractionPart.padEnd(2, "0").slice(0, 2);
  const minorUnits =
    Number.parseInt(wholePart, 10) * 100 +
    Number.parseInt(fraction || "0", 10);
  if (!Number.isSafeInteger(minorUnits)) {
    throw new Error(`Money value exceeds safe range: ${raw}`);
  }
  return negative ? -minorUnits : minorUnits;
}

export function formatMinorUnits(
  value: MoneyMinorUnits | null | undefined,
  currency: "ARS" | "USD",
): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return new Intl.NumberFormat(
    currency === "ARS" ? "es-AR" : "en-US",
    {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value / 100);
}

export function minorUnitsToEditableValue(
  value: MoneyMinorUnits | null | undefined,
): string {
  if (value === null || value === undefined) {
    return "";
  }
  return (value / 100).toFixed(2);
}

export function editableValueToMinorUnits(
  input: string,
): MoneyMinorUnits | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  let normalized = trimmed
    .replace(/\s/g, "")
    .replace(/$/g, "")
    .replace(/USD/gi, "")
    .replace(/U$D/gi, "");
  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  if (lastComma > lastDot) {
    normalized = normalized
      .replace(/./g, "")
      .replace(",", ".");
  } else if (lastDot > lastComma && lastComma >= 0) {
    normalized = normalized.replace(/,/g, "");
  }
  return backendDecimalToMinorUnits(normalized);
}
