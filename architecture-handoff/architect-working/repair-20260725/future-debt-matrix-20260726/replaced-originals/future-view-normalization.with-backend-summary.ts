import type { FutureDebtResponse } from "../future.types.js";

const ZERO_MONEY = { ars: "0.00", usd: "0.00" } as const;

function monthKeyWithOffset(monthKey: string, offset: number): string {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const absoluteMonth = year * 12 + (month - 1) + offset;
  const resultYear = Math.floor(absoluteMonth / 12);
  const resultMonth = (absoluteMonth % 12) + 1;
  return `${resultYear}-${String(resultMonth).padStart(2, "0")}`;
}

function cleanMovementDescription(value: string): string {
  const original = value.trim();
  if (!original) return value;

  const withoutLeadingDate = original.replace(
    /^\d{1,2}[-/](?:[A-Za-zÁÉÍÓÚáéíóúÑñ]{3}|\d{1,2})[-/]\d{2,4}\s+/, 
    "",
  );

  const withoutTrailingAmount = withoutLeadingDate.replace(
    /\s+(?:(?:ARS|USD|U\$S|\$)\s*)?-?(?:(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}|(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})\s*$/i,
    "",
  );

  return withoutTrailingAmount.trim() || original;
}

export function normalizeFutureDebtView(
  response: FutureDebtResponse,
  fromMonthKey: string,
): FutureDebtResponse {
  const months = response.months.map((month) => ({
    ...month,
    cards: month.cards.map((card) => ({
      ...card,
      rows: card.rows.map((row) => ({
        ...row,
        description: cleanMovementDescription(row.description),
      })),
    })),
  }));

  const pendientes = {
    ...response.pendientes,
    rows: response.pendientes.rows.map((row) => ({
      ...row,
      description: cleanMovementDescription(row.description),
    })),
  };

  const nextMonthKey = monthKeyWithOffset(fromMonthKey, 1);
  const nextMonth = months.find((month) => month.monthKey === nextMonthKey);

  return {
    ...response,
    months,
    pendientes,
    summary: nextMonth?.totals ?? { ...ZERO_MONEY },
  };
}
