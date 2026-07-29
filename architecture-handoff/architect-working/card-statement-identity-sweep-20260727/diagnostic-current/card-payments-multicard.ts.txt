import type {
  CardPaymentCard,
  CardPaymentMoney,
  CardPaymentsResponse,
} from "./card-payments.service.js";
import {
  buildAccountSeriesKey,
  buildStatementSummaryKey,
  compareStatementRecency,
  normalizeStatementAccountNumber,
  type CardStatementIdentityInput,
} from "./card-statement-identity.js";

export interface CardStatementIdentityCandidate
  extends CardStatementIdentityInput {
  createdAt: Date;
  groups?: Array<{ cardLast4: string | null; holderName?: string | null }>;
}

export function selectCurrentStatementsForPayments<
  T extends CardStatementIdentityCandidate,
>(statements: T[]): T[] {
  const ordered = [...statements].sort(compareStatementRecency);

  const latestBySummary = new Map<string, T>();
  for (const statement of ordered) {
    const summaryKey = buildStatementSummaryKey(statement);
    if (!latestBySummary.has(summaryKey)) latestBySummary.set(summaryKey, statement);
  }

  const selected: T[] = [];
  const seenSeries = new Set<string>();
  for (const statement of [...latestBySummary.values()].sort(compareStatementRecency)) {
    const seriesKey = buildAccountSeriesKey(statement);
    if (seenSeries.has(seriesKey)) continue;
    seenSeries.add(seriesKey);
    selected.push(statement);
  }

  return selected;
}

export const selectLatestStatementPerCard = selectCurrentStatementsForPayments;

export function cardIdentityDisplaySuffix(
  statement: CardStatementIdentityCandidate,
): string | null {
  const account = normalizeStatementAccountNumber(statement.accountNumber);
  if (account) return `Cuenta •••• ${account.slice(-4)}`;
  if (statement.statementNumber?.trim()) {
    return `Resumen ${statement.statementNumber.trim()}`;
  }
  return null;
}

export const buildCardIdentityKey = buildAccountSeriesKey;
export const buildStatementVersionKey = buildStatementSummaryKey;

export function sameCardAccount(
  left: CardStatementIdentityCandidate,
  right: CardStatementIdentityCandidate,
): boolean {
  const leftAccount = normalizeStatementAccountNumber(left.accountNumber);
  const rightAccount = normalizeStatementAccountNumber(right.accountNumber);
  return Boolean(
    leftAccount &&
      rightAccount &&
      buildAccountSeriesKey(left) === buildAccountSeriesKey(right),
  );
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
      const cardMonth = card.totalsByMonth.find(
        (item) => item.monthKey === month.monthKey,
      );
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
