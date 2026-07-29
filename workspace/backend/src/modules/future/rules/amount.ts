import {
  centsToString,
  parseArgentinePesos,
  parseDollars,
} from "../../../shared/money.js";
import type { FutureCurrency, FutureOccurrence, MoneyBucket } from "../future.types.js";

export interface AmountSource {
  currency: FutureCurrency;
  amountPesosRaw: string | null;
  amountDollarsRaw: string | null;
}

export function emptyMoneyBucket(): MoneyBucket {
  return { ars: 0n, usd: 0n };
}

export function addCents(bucket: MoneyBucket, currency: FutureCurrency, cents: bigint): void {
  if (currency === "ARS") bucket.ars += cents;
  else bucket.usd += cents;
}

function canonicalNumeric(value: string): string {
  const compact = value.trim().replace(/\s/g, "");
  if (!compact) throw new Error("Amount is required");
  if (!/^[+-]?[\d.,]+$/.test(compact)) throw new Error(`Invalid amount: ${value}`);

  const sign = compact.startsWith("-") || compact.startsWith("+") ? compact[0] : "";
  const unsigned = sign ? compact.slice(1) : compact;
  const lastComma = unsigned.lastIndexOf(",");
  const lastDot = unsigned.lastIndexOf(".");
  let whole: string;
  let fraction = "";

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const decimalIndex = unsigned.lastIndexOf(decimalSeparator);
    const candidateFraction = unsigned.slice(decimalIndex + 1);
    if (candidateFraction.length > 0 && candidateFraction.length <= 2) {
      whole = unsigned.slice(0, decimalIndex).replace(/[.,]/g, "");
      fraction = candidateFraction;
    } else {
      whole = unsigned.replace(/[.,]/g, "");
    }
  } else if (lastComma >= 0) {
    const candidateFraction = unsigned.slice(lastComma + 1);
    if (candidateFraction.length > 0 && candidateFraction.length <= 2) {
      whole = unsigned.slice(0, lastComma).replace(/\./g, "");
      fraction = candidateFraction;
    } else {
      whole = unsigned.replace(/,/g, "");
    }
  } else if (lastDot >= 0) {
    const candidateFraction = unsigned.slice(lastDot + 1);
    if (candidateFraction.length > 0 && candidateFraction.length <= 2) {
      whole = unsigned.slice(0, lastDot).replace(/\./g, "");
      fraction = candidateFraction;
    } else {
      whole = unsigned.replace(/\./g, "");
    }
  } else {
    whole = unsigned;
  }

  if (!/^\d+$/.test(whole) || !/^\d{0,2}$/.test(fraction)) {
    throw new Error(`Invalid amount: ${value}`);
  }
  return `${sign}${whole}.${fraction.padEnd(2, "0")}`;
}

export function parseAmountCents(value: string, currency: FutureCurrency): bigint {
  const canonical = canonicalNumeric(value);
  if (canonical.startsWith("-")) throw new Error("Future debt amounts cannot be negative");

  const compact = value.trim().replace(/\s/g, "");
  const commaIndex = compact.lastIndexOf(",");
  const dotIndex = compact.lastIndexOf(".");
  const commaFractionLength = commaIndex >= 0 ? compact.length - commaIndex - 1 : 0;
  const hasArgentineSeparators = commaIndex >= 0
    && ((dotIndex >= 0 && dotIndex < commaIndex)
      || (dotIndex < 0 && commaFractionLength <= 2));
  if (currency === "ARS" && hasArgentineSeparators) {
    return parseArgentinePesos(value);
  }
  return parseDollars(canonical);
}

export function normalizeOriginalAmount(source: AmountSource): {
  currency: FutureCurrency;
  cents: bigint;
} {
  const raw = source.currency === "ARS" ? source.amountPesosRaw : source.amountDollarsRaw;
  if (!raw || !raw.trim()) throw new Error(`Missing ${source.currency} amount`);
  return { currency: source.currency, cents: parseAmountCents(raw, source.currency) };
}

export function centsToDecimalString(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}

export function serializeCents(cents: bigint, currency: FutureCurrency): string {
  // Call the shared serializer at the boundary, then normalize its locale
  // separators to the wire contract's invariant decimal-string form.
  const localized = centsToString(cents, currency);
  if (currency === "USD") return localized.replace(/,/g, "");
  if (localized.includes(",")) return localized.replace(/\./g, "").replace(",", ".");
  return localized;
}

export function serializeMoneyBucket(bucket: MoneyBucket): { ars: string; usd: string } {
  return {
    ars: centsToDecimalString(bucket.ars),
    usd: centsToDecimalString(bucket.usd),
  };
}

export function amountCentsForOccurrence(occurrence: Pick<FutureOccurrence, "currencyOriginal" | "amountPesosRaw" | "amountDollarsRaw">): { currency: FutureCurrency; cents: bigint } {
  if (occurrence.currencyOriginal !== "ARS" && occurrence.currencyOriginal !== "USD") {
    throw new Error("Unsupported currency");
  }
  return normalizeOriginalAmount({
    currency: occurrence.currencyOriginal,
    amountPesosRaw: occurrence.amountPesosRaw,
    amountDollarsRaw: occurrence.amountDollarsRaw,
  });
}

export function preserveOriginalAmount(occurrence: Pick<FutureOccurrence, "currencyOriginal" | "amountPesosRaw" | "amountDollarsRaw">): string {
  const amount = amountCentsForOccurrence(occurrence);
  return centsToDecimalString(amount.cents);
}

export function aggregateOccurrences(occurrences: readonly FutureOccurrence[]): MoneyBucket {
  const bucket = emptyMoneyBucket();
  for (const occurrence of occurrences) {
    try {
      const amount = amountCentsForOccurrence(occurrence);
      addCents(bucket, amount.currency, amount.cents);
    } catch {
      // Invalid rows are partitioned by diagnostics before aggregation.
    }
  }
  return bucket;
}
