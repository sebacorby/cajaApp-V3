import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import type {
  AcceptedCardStatement,
  CardStatementGroup,
  CardStatementPreview,
  CardStatementRow,
} from "@/lib/finance/card-statements-api";
import type { RowEdit } from "./types";

/**
 * Helpers puros de formateo y transformación de datos usados por los
 * distintos módulos de la sección Tarjetas.
 */

export function cleanText(value: string | null | undefined): string {
  return typeof value === "string" && value.trim() ? value.trim() : "—";
}

export function formatMoney(value: string | null, currency: "ARS" | "USD"): string {
  return formatFinancialAmount(value, currency);
}

export function todayIsoDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Tucuman",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function isPositiveExchangeRate(value: string): boolean {
  const compact = value.trim().replace(/\s/g, "");
  const normalized = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact;
  return /^\d+(?:\.\d{1,2})?$/.test(normalized) && Number(normalized) > 0;
}

export function exchangeRateSourceLabel(source: string | null): string {
  if (source === "manual") return "Carga manual";
  return source?.trim() || "Sin origen registrado";
}

export function formatDateLabel(value: string | null): string {
  if (!value) return "—";

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function acceptedStatementToPreview(
  statement: AcceptedCardStatement,
): CardStatementPreview {
  return {
    statementId: statement.id,
    source: statement.source,
    summary: statement.summary,
    sections: statement.sections,
    groups: statement.groups,
    rows: statement.rows,
    futureInstallmentsBlock: [],
  };
}

export function formatSavedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function getProjectionRange(): { from: string; to: string } {
  const current = new Date();
  const from = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
  const future = new Date(current.getFullYear(), current.getMonth() + 12, 1);
  const to = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}`;
  return { from, to };
}

export function createEditedPreview(
  preview: CardStatementPreview,
  edits: ReadonlyMap<string, RowEdit>,
): CardStatementPreview {
  if (edits.size === 0) return preview;

  return {
    ...preview,
    rows: preview.rows.map((row) => {
      const rowEdit = edits.get(row.id);
      return rowEdit ? { ...row, ...rowEdit } : row;
    }),
    futureInstallmentsBlock: preview.futureInstallmentsBlock.map((row) => {
      const rowEdit = edits.get(row.id);
      return rowEdit ? { ...row, ...rowEdit } : row;
    }),
  };
}

export function groupDescriptor(group: CardStatementGroup): string {
  const details = [
    group.cardLast4 ? `•••• ${group.cardLast4}` : null,
    group.holderName,
  ].filter(Boolean);

  return details.length > 0 ? details.join(" · ") : group.label;
}

export function rowTone(row: CardStatementRow): string {
  switch (row.rowType) {
    case "statement_total":
      return "bg-emerald-50/80 font-semibold dark:bg-emerald-950/20";
    case "group_total":
      return "bg-slate-50/90 font-medium dark:bg-slate-900/60";
    case "tax":
    case "charge":
      return "bg-amber-50/45 dark:bg-amber-950/10";
    case "future_installment_reference":
      return "bg-blue-50/40 dark:bg-blue-950/10";
    default:
      return "hover:bg-muted/35";
  }
}

export function statementStatusLabel(status: string): string {
  if (status === "accepted") return "Activo";
  if (status === "superseded") return "Versión anterior";
  if (status === "archived") return "Archivado";
  return status;
}

export function statementStatusTone(status: string): string {
  if (status === "accepted") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300";
  }
  if (status === "archived") {
    return "border-border bg-muted text-muted-foreground";
  }
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300";
}
