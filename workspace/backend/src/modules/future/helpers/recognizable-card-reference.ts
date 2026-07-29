import type {
  FutureDebtResponse,
  FutureDebtRow,
  FutureMonth,
  FuturePendingRow,
} from "../future.types.js";

type SerializedMoney = { ars: string; usd: string };

const GENERIC_CARD_LABELS = new Set([
  "TARJETA",
  "VISA",
  "MASTERCARD",
  "MASTER CARD",
  "AMEX",
  "AMERICAN EXPRESS",
]);

function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function recognizableCardLabel(sourceLabel: string): string | null {
  const label = normalizeLabel(
    sourceLabel.replace(/\s+sin referencia\s*$/i, ""),
  );
  if (!label) return null;
  const upper = label.toLocaleUpperCase("es");
  if (GENERIC_CARD_LABELS.has(upper)) return null;
  return label;
}

function parseCents(value: string): bigint {
  const match = /^(-?)(\d+)\.(\d{2})$/.exec(value);
  if (!match) return 0n;
  const sign = match[1] === "-" ? -1n : 1n;
  return sign * (BigInt(match[2]) * 100n + BigInt(match[3]));
}

function centsToString(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / 100n;
  const fraction = String(absolute % 100n).padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

function moneyForRows(rows: readonly FutureDebtRow[]): SerializedMoney {
  let ars = 0n;
  let usd = 0n;
  for (const row of rows) {
    const cents = parseCents(row.amount);
    if (row.currency === "ARS") ars += cents;
    else usd += cents;
  }
  return { ars: centsToString(ars), usd: centsToString(usd) };
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const names = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  return `${names[(month ?? 1) - 1] ?? monthKey} ${year}`;
}

function promote(row: FuturePendingRow, label: string): FutureDebtRow | null {
  if (
    row.diagnostic !== "missing_card_reference" ||
    row.originType !== "card_statement" ||
    row.currency === null ||
    row.installmentNumber === null ||
    row.installmentTotal === null
  ) {
    return null;
  }

  const normalized = label
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const cardId = `${row.originReference}:label:${normalized}`;

  return {
    id: row.id,
    sourceId: row.sourceId ?? row.id,
    dateIso: row.dateIso ?? null,
    monthKey: row.monthKey,
    description: row.description,
    installmentNumber: row.installmentNumber,
    installmentTotal: row.installmentTotal,
    installmentLabel: row.installmentLabel,
    amount: row.amount,
    currency: row.currency,
    originType: row.originType,
    originReference: row.originReference,
    sourceLabel: label,
    cardId,
    cardLast4: row.cardLast4 ?? "",
    holderName: row.holderName ?? "Sin titular",
    cardLabel: label,
    status: row.status,
    rowType: row.rowType,
  };
}

export function resolveRecognizableCardReferences(
  response: FutureDebtResponse,
): FutureDebtResponse {
  const remainingPending: FuturePendingRow[] = [];
  const promotedRows: FutureDebtRow[] = [];

  for (const row of response.pendientes.rows) {
    const label = recognizableCardLabel(row.sourceLabel);
    const promoted = label ? promote(row, label) : null;
    if (promoted) promotedRows.push(promoted);
    else remainingPending.push(row);
  }

  if (promotedRows.length === 0) return response;

  const months = new Map<string, FutureMonth>();
  for (const month of response.months) {
    months.set(month.monthKey, {
      ...month,
      cards: month.cards.map((card) => ({
        ...card,
        rows: [...card.rows],
        totals: { ...card.totals },
      })),
      totals: { ...month.totals },
      dataQuality: {
        ...month.dataQuality,
        warnings: [...month.dataQuality.warnings],
      },
    });
  }

  for (const row of promotedRows) {
    let month = months.get(row.monthKey);
    if (!month) {
      month = {
        monthKey: row.monthKey,
        label: monthLabel(row.monthKey),
        totals: { ars: "0.00", usd: "0.00" },
        cards: [],
        dataQuality: { status: "complete", warnings: [] },
      };
      months.set(row.monthKey, month);
    }

    let card = month.cards.find((candidate) => candidate.cardId === row.cardId);
    if (!card) {
      card = {
        cardId: row.cardId,
        cardLast4: row.cardLast4,
        holderName: row.holderName,
        cardLabel: row.cardLabel,
        rows: [],
        totals: { ars: "0.00", usd: "0.00" },
      };
      month.cards.push(card);
    }
    card.rows.push(row);
  }

  const remainingByMonth = new Map<string, string[]>();
  for (const row of remainingPending) {
    const diagnostics = remainingByMonth.get(row.monthKey) ?? [];
    diagnostics.push(row.diagnostic);
    remainingByMonth.set(row.monthKey, diagnostics);
  }

  const normalizedMonths = Array.from(months.values())
    .sort((left, right) => left.monthKey.localeCompare(right.monthKey))
    .map((month) => {
      const cards = month.cards
        .map((card) => {
          const rows = [...card.rows].sort((a, b) => a.id.localeCompare(b.id));
          return {
            ...card,
            rows,
            totals: moneyForRows(rows),
          };
        })
        .sort((a, b) => a.cardLabel.localeCompare(b.cardLabel, "es"));
      const rows = cards.flatMap((card) => card.rows);
      const warnings = Array.from(
        new Set(remainingByMonth.get(month.monthKey) ?? []),
      );
      return {
        ...month,
        cards,
        totals: moneyForRows(rows),
        dataQuality: {
          status: warnings.length === 0 ? "complete" : "partial",
          warnings,
        },
      } as FutureMonth;
    });

  const allIncludedRows = normalizedMonths.flatMap((month) =>
    month.cards.flatMap((card) => card.rows),
  );
  const remainingMissingCards = remainingPending.filter(
    (row) => row.diagnostic === "missing_card_reference",
  ).length;
  const pendingCounts = new Map<string, number>();
  for (const row of remainingPending) {
    pendingCounts.set(
      row.diagnostic,
      (pendingCounts.get(row.diagnostic) ?? 0) + 1,
    );
  }

  const warnings = response.diagnostics.warnings.filter(
    (warning) => warning !== "missing_card_reference",
  );
  if (remainingMissingCards > 0) warnings.push("missing_card_reference");

  return {
    ...response,
    summary: moneyForRows(allIncludedRows),
    months: normalizedMonths,
    pendientes: {
      rows: remainingPending,
      diagnostics: Array.from(pendingCounts.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([diagnostic, count]) => `${diagnostic}:${count}`),
    },
    diagnostics: {
      ...response.diagnostics,
      missingCardRows: remainingMissingCards,
      warnings,
    },
  };
}
