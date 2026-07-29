import type { FutureCurrency } from "../future.types.js";

export function isSupportedCurrency(value: unknown): value is FutureCurrency {
  return value === "ARS" || value === "USD";
}

export function requireCurrency(value: unknown): FutureCurrency {
  if (!isSupportedCurrency(value)) throw new Error("Currency must be ARS or USD");
  return value;
}

export function currencyBucketKey(currency: FutureCurrency): "ars" | "usd" {
  return currency === "ARS" ? "ars" : "usd";
}
