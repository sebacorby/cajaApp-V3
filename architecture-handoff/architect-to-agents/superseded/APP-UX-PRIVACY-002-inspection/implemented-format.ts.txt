import { protectFormattedAmount } from "@/lib/finance/amount-privacy";

/**
 * Utilidades de formato centralizadas para el dominio financiero.
 * Toda la UI debe usar estas funciones para mantener consistencia.
 */

const ARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const PERCENT = new Intl.NumberFormat("es-AR", {
  style: "percent",
  maximumFractionDigits: 1,
});

/** Formatea un monto como moneda argentina sin decimales. */
export function formatCurrency(value: number): string {
  return protectFormattedAmount(ARS.format(value), "ARS");
}

/** Versión compacta (ej: $1,2 M) para espacios reducidos. */
export function formatCurrencyCompact(value: number): string {
  let formatted: string;
  if (value === 0) {
    formatted = ARS.format(0);
  } else if (value >= 1_000_000) {
    formatted =
      "$ " +
      (value / 1_000_000).toLocaleString("es-AR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }) +
      " M";
  } else if (value >= 1_000) {
    formatted =
      "$ " +
      (value / 1_000).toLocaleString("es-AR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }) +
      " K";
  } else {
    formatted = ARS.format(value);
  }
  return protectFormattedAmount(formatted, "ARS");
}

/** Formatea un porcentaje. Recibe un valor 0..1. */
export function formatPercent(value: number): string {
  return PERCENT.format(value);
}

/** Formatea una variación porcentual con signo, ej: +8,4 %. */
export function formatVariation(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${PERCENT.format(value / 100)}`;
}

/** Convierte una fecha ISO a una etiqueta legible en español. */
export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Etiqueta corta de fecha, ej: "12 mar". */
export function formatDateShort(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

/** Calcula el porcentaje de avance de un objetivo o presupuesto (0..1). */
export function computeProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(Math.max(current / target, 0), 1);
}

/** Devuelve un tono semántico según el valor de variación. */
export function variationTone(
  value: number,
): "positive" | "negative" | "neutral" {
  if (value > 0.5) return "positive";
  if (value < -0.5) return "negative";
  return "neutral";
}

/** Saludo dinámico según la hora local del usuario. */
export function greetingByHour(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

const ARS_DECIMALS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const USD_DECIMALS = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export function formatCurrencyARSWithDecimals(value: number): string {
  return protectFormattedAmount(ARS_DECIMALS.format(value), "ARS");
}

export function formatCurrencyUSD(value: number): string {
  return protectFormattedAmount(USD_DECIMALS.format(value), "USD");
}

export function formatCurrencyUSDPlain(value: number): string {
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return protectFormattedAmount(formatted, "USD");
}
