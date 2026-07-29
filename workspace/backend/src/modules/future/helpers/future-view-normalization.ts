import type { FutureDebtResponse } from "../future.types.js";

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
): FutureDebtResponse {
  return {
    ...response,
    months: response.months.map((month) => ({
      ...month,
      cards: month.cards.map((card) => ({
        ...card,
        rows: card.rows.map((row) => ({
          ...row,
          description: cleanMovementDescription(row.description),
        })),
      })),
    })),
    pendientes: {
      ...response.pendientes,
      rows: response.pendientes.rows.map((row) => ({
        ...row,
        description: cleanMovementDescription(row.description),
      })),
    },
  };
}
