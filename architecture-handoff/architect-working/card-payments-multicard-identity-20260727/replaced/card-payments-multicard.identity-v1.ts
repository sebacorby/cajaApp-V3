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
  statementNumber: string | null;
  groups: Array<{ cardLast4: string | null }>;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ");
}

function last4Set(statement: CardStatementIdentityCandidate): Set<string> {
  return new Set(
    statement.groups
      .map((group) => group.cardLast4?.trim())
      .filter((value): value is string => Boolean(value)),
  );
}

export function sameCardAccount(
  left: CardStatementIdentityCandidate,
  right: CardStatementIdentityCandidate,
): boolean {
  if (normalize(left.bankName) !== normalize(right.bankName)) return false;
  if (normalize(left.brand) !== normalize(right.brand)) return false;

  const leftStatement = normalize(left.statementNumber);
  const rightStatement = normalize(right.statementNumber);
  if (leftStatement && rightStatement && leftStatement === rightStatement) return true;

  const leftLast4 = last4Set(left);
  const rightLast4 = last4Set(right);
  if ([...leftLast4].some((value) => rightLast4.has(value))) return true;

  const leftHasIdentity = Boolean(leftStatement) || leftLast4.size > 0;
  const rightHasIdentity = Boolean(rightStatement) || rightLast4.size > 0;
  if (leftHasIdentity && rightHasIdentity) return false;

  return true;
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
