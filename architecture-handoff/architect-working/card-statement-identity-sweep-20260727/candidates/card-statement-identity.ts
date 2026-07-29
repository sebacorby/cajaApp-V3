export interface CardStatementIdentityInput {
  id: string;
  bankName: string | null;
  brand: string | null;
  accountNumber?: string | null;
  statementNumber: string | null;
  periodKey: string | null;
  currentDueDate: string | null;
  nextClosingDate: string | null;
  nextDueDate: string | null;
  createdAt?: Date;
}

function normalizePart(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ");
}

export function normalizeStatementAccountNumber(
  value: string | null | undefined,
): string | null {
  const normalized = normalizePart(value).replace(/[^a-z0-9]/g, "");
  return normalized || null;
}

export function resolveSummaryIdentityDate(
  statement: Pick<
    CardStatementIdentityInput,
    "currentDueDate" | "nextClosingDate" | "nextDueDate"
  >,
): string | null {
  for (const value of [
    statement.currentDueDate,
    statement.nextClosingDate,
    statement.nextDueDate,
  ]) {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  }
  return null;
}

function issuerNamespace(statement: CardStatementIdentityInput): string {
  return [
    normalizePart(statement.bankName) || "unknown-bank",
    normalizePart(statement.brand) || "unknown-brand",
  ].join("|");
}

/**
 * Canonical identity of one concrete statement/invoice.
 * It intentionally does NOT use card plastics, holder/additional names, totals,
 * or account-series identity. The SSOT is statement number + period + exact
 * statement date, namespaced by issuer/brand only to avoid collisions.
 */
export function buildStatementSummaryKey(
  statement: CardStatementIdentityInput,
): string {
  const statementNumber = normalizePart(statement.statementNumber);
  const periodKey = normalizePart(statement.periodKey);
  const identityDate = resolveSummaryIdentityDate(statement);

  if (!statementNumber || !periodKey || !identityDate) {
    return `${issuerNamespace(statement)}|statement-id:${statement.id}`;
  }

  return [
    issuerNamespace(statement),
    `statement:${statementNumber}`,
    `period:${periodKey}`,
    `date:${identityDate}`,
  ].join("|");
}

/**
 * Identity of a card account across monthly statements. This is separate from
 * statement identity. Only a stable issuer account identifier may bridge months.
 * If it is missing, fall back to the concrete summary key instead of guessing
 * from titular/adicional plastics.
 */
export function buildAccountSeriesKey(
  statement: CardStatementIdentityInput,
): string {
  const account = normalizeStatementAccountNumber(statement.accountNumber);
  if (!account) return `summary:${buildStatementSummaryKey(statement)}`;
  return `${issuerNamespace(statement)}|account:${account}`;
}

export function compareStatementRecency(
  left: CardStatementIdentityInput,
  right: CardStatementIdentityInput,
): number {
  const period = (right.periodKey ?? "").localeCompare(left.periodKey ?? "");
  if (period !== 0) return period;

  const rightDate = resolveSummaryIdentityDate(right) ?? "";
  const leftDate = resolveSummaryIdentityDate(left) ?? "";
  const date = rightDate.localeCompare(leftDate);
  if (date !== 0) return date;

  return (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0);
}
