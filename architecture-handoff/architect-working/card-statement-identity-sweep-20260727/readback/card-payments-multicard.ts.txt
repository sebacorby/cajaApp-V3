import type {
  CardPaymentCard,
  CardPaymentMoney,
  CardPaymentsResponse,
} from "./card-payments.service.js";

export interface CardStatementIdentityCandidate {
  id: string;
  periodKey: string | null;
  createdAt: Date;
  bankName: string | null;
  brand: string | null;
  accountNumber: string | null;
  holderName: string | null;
  statementNumber: string | null;
  groups: Array<{ cardLast4: string | null; holderName?: string | null }>;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ");
}

function normalizeAccountNumber(value: string | null | undefined): string {
  return normalize(value).replace(/[^a-z0-9]/g, "");
}

function normalizeLast4(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

export function cardLast4Values(
  statement: CardStatementIdentityCandidate,
): string[] {
  return [...new Set(
    statement.groups
      .map((group) => normalizeLast4(group.cardLast4))
      .filter((value): value is string => Boolean(value)),
  )].sort();
}

function sameStringArray(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function issuerKey(statement: CardStatementIdentityCandidate): string {
  return `${normalize(statement.bankName) || "unknown-bank"}|${normalize(statement.brand) || "unknown-brand"}`;
}

export function buildCardIdentityKey(
  statement: CardStatementIdentityCandidate,
): string {
  const issuer = issuerKey(statement);
  const account = normalizeAccountNumber(statement.accountNumber);
  if (account) return `${issuer}|account:${account}`;

  const last4 = cardLast4Values(statement);
  if (last4.length > 0) return `${issuer}|plastics:${last4.join("+")}`;

  const statementNumber = normalize(statement.statementNumber);
  if (statementNumber) return `${issuer}|statement-fallback:${statementNumber}`;

  return `${issuer}|statement-id:${statement.id}`;
}

export function buildStatementVersionKey(
  statement: CardStatementIdentityCandidate,
): string {
  return [
    buildCardIdentityKey(statement),
    `period:${normalize(statement.periodKey) || "unknown"}`,
    `statement:${normalize(statement.statementNumber) || statement.id}`,
  ].join("|");
}

export function cardIdentityDisplaySuffix(
  statement: CardStatementIdentityCandidate,
): string | null {
  const last4 = cardLast4Values(statement);
  if (last4.length > 0) {
    return last4.map((value) => `•••• ${value}`).join(" / ");
  }

  const account = normalizeAccountNumber(statement.accountNumber);
  if (account.length >= 4) return `•••• ${account.slice(-4)}`;
  return null;
}

export function sameCardAccount(
  left: CardStatementIdentityCandidate,
  right: CardStatementIdentityCandidate,
): boolean {
  if (issuerKey(left) !== issuerKey(right)) return false;

  const leftAccount = normalizeAccountNumber(left.accountNumber);
  const rightAccount = normalizeAccountNumber(right.accountNumber);

  // Account number is the strongest identifier. Two different account numbers
  // can never represent the same card account, even if a plastic happens to overlap.
  if (leftAccount && rightAccount) return leftAccount === rightAccount;

  const leftLast4 = cardLast4Values(left);
  const rightLast4 = cardLast4Values(right);

  // Exact plastic-set equality is intentionally required. Partial overlap is not
  // enough: two Visa accounts can share an additional/renewed plastic in source data.
  if (leftLast4.length > 0 && rightLast4.length > 0) {
    return sameStringArray(leftLast4, rightLast4);
  }

  // Bridge metadata enrichment safely: if only one side has accountNumber but
  // both sides expose the exact same plastic set, the branch above already matched.
  // Without matching plastics there is not enough evidence to merge.
  if (leftAccount || rightAccount) return false;

  // statementNumber is statement metadata, not a preferred card identifier.
  // It is only a conservative fallback when no account/plastic identity exists.
  const leftStatement = normalize(left.statementNumber);
  const rightStatement = normalize(right.statementNumber);
  return Boolean(leftStatement && rightStatement && leftStatement === rightStatement);
}

function compareRecency(
  left: CardStatementIdentityCandidate,
  right: CardStatementIdentityCandidate,
): number {
  const period = (right.periodKey ?? "").localeCompare(left.periodKey ?? "");
  if (period !== 0) return period;
  return right.createdAt.getTime() - left.createdAt.getTime();
}

export function selectLatestStatementPerCard<
  T extends CardStatementIdentityCandidate,
>(statements: T[]): T[] {
  const ordered = [...statements].sort(compareRecency);
  const selected: T[] = [];

  for (const statement of ordered) {
    if (selected.some((current) => sameCardAccount(current, statement))) continue;
    selected.push(statement);
  }

  return selected;
}

function apiCents(value: string): bigint {
  const trimmed = value.trim();
  if (!/^[+-]?\d+(?:\.\d{1,2})?$/.test(trimmed)) return 0n;
  const sign = trimmed.startsWith("-") ? -1n : 1n;
  const unsigned = trimmed.replace(/^[+-]/, "");
  const [whole = "0", fraction = ""] = unsigned.split(".");
  return sign * (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")));
}

function fromCents(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}

function addMoney(left: CardPaymentMoney, right: CardPaymentMoney): CardPaymentMoney {
  return {
    ars: fromCents(apiCents(left.ars) + apiCents(right.ars)),
    usd: fromCents(apiCents(left.usd) + apiCents(right.usd)),
  };
}

export function mergePresentedCards(
  response: CardPaymentsResponse,
  cards: CardPaymentCard[],
  warnings: string[],
): CardPaymentsResponse {
  const months = response.months.map((month) => {
    let totals: CardPaymentMoney = { ars: "0.00", usd: "0.00" };
    for (const card of cards) {
      const cardMonth = card.totalsByMonth.find((item) => item.monthKey === month.monthKey);
      if (cardMonth) totals = addMoney(totals, cardMonth.totals);
    }
    return { ...month, totals };
  });

  return {
    ...response,
    months,
    cards,
    warnings: [...new Set([...response.warnings, ...warnings])],
  };
}
