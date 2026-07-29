import { prisma } from "../../db/prisma.js";
import { NotFoundError, ValidationError } from "../../shared/errors.js";
import type {
  CreateIncomeEventInput,
  CreateIncomeSourceInput,
  UpdateIncomeSourceInput,
} from "./incomes.schemas.js";

type IncomeCurrency = "ARS" | "USD";
type IncomeEventStatus = "actual" | "projected";
type IncomeProjectionOrigin =
  | "base"
  | "automatic_increase"
  | "permanent_adjustment"
  | "monthly_override";

interface ProjectionEventLike {
  id: string;
  monthKey: string;
  kind: string;
  amountRaw: string;
  status: string;
}

interface PersistedIncomeEvent {
  id: string;
  sourceId: string | null;
  monthKey: string;
  kind: string;
  currency: string;
  amountRaw: string;
  label: string;
  status: string;
  notes: string | null;
}

interface PersistedIncomeSource {
  id: string;
  name: string;
  employer: string | null;
  kind: string;
  currency: string;
  baseAmountRaw: string;
  startMonthKey: string;
  paymentDay: number | null;
  increaseEveryMonths: number;
  increasePercentRaw: string;
  active: boolean;
  events: PersistedIncomeEvent[];
}

interface ProjectionSourceLike {
  id: string;
  name: string;
  employer: string | null;
  kind: string;
  currency: string;
  baseAmountRaw: string;
  startMonthKey: string;
  increaseEveryMonths: number;
  increasePercentRaw: string;
  events: ProjectionEventLike[];
}

const SOURCE_BOUND_EVENT_KINDS = new Set([
  "monthly_override",
  "permanent_adjustment",
]);

const ONE_OFF_EVENT_KINDS = new Set(["bonus", "aguinaldo", "extra", "other"]);

export function incomeMonthIndex(monthKey: string): number {
  const [year, month] = monthKey.split("-").map(Number);
  return year * 12 + month - 1;
}

function monthKeyFromIndex(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function enumerateIncomeMonths(from: string, to: string): string[] {
  const start = incomeMonthIndex(from);
  const end = incomeMonthIndex(to);

  if (end < start) {
    throw new ValidationError("Income range end must be equal to or after its start");
  }

  if (end - start > 35) {
    throw new ValidationError("Income range cannot exceed 36 months");
  }

  return Array.from(
    { length: end - start + 1 },
    (_, offset) => monthKeyFromIndex(start + offset),
  );
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function normalizeCurrency(currency: string): IncomeCurrency {
  if (currency === "ARS" || currency === "USD") return currency;
  throw new ValidationError(`Unsupported income currency: ${currency}`);
}

function normalizeIncomeDecimal(value: string, currency: IncomeCurrency): {
  negative: boolean;
  integerDigits: string;
  fractionDigits: string;
} {
  const compact = value.trim().replace(/\s/g, "");
  const match = compact.match(/^([+-]?)([0-9.,]+)$/);
  if (!match) {
    throw new ValidationError(`Invalid ${currency} income amount: ${value}`);
  }

  const negative = match[1] === "-";
  let body = match[2];
  let decimalSeparator: "." | "," | null = null;

  if (body.includes(".") && body.includes(",")) {
    decimalSeparator = currency === "ARS" ? "," : ".";
  } else if (body.includes(",")) {
    const parts = body.split(",");
    if (parts.length > 2) {
      if (currency === "USD") body = parts.join("");
      else throw new ValidationError(`Invalid ${currency} income amount: ${value}`);
    } else {
      const tail = parts[1] ?? "";
      decimalSeparator = tail.length <= 2 ? "," : null;
    }
  } else if (body.includes(".")) {
    const parts = body.split(".");
    if (parts.length > 2) {
      if (currency === "ARS") body = parts.join("");
      else throw new ValidationError(`Invalid ${currency} income amount: ${value}`);
    } else {
      const tail = parts[1] ?? "";
      decimalSeparator = tail.length <= 2 ? "." : null;
    }
  }

  let integerPart = body;
  let fractionPart = "";
  if (decimalSeparator) {
    const separatorIndex = body.lastIndexOf(decimalSeparator);
    integerPart = body.slice(0, separatorIndex);
    fractionPart = body.slice(separatorIndex + 1);
  }

  const groupingSeparator = decimalSeparator
    ? decimalSeparator === ","
      ? "."
      : ","
    : currency === "ARS"
      ? "."
      : ",";
  integerPart = integerPart.split(groupingSeparator).join("");

  if (!/^\d+$/.test(integerPart) || !/^\d{0,2}$/.test(fractionPart)) {
    throw new ValidationError(`Invalid ${currency} income amount: ${value}`);
  }

  return {
    negative,
    integerDigits: integerPart.replace(/^0+(?=\d)/, ""),
    fractionDigits: fractionPart.padEnd(2, "0"),
  };
}

export function parseIncomeAmount(value: string, currency: string): bigint {
  const normalizedCurrency = normalizeCurrency(currency);
  const normalized = normalizeIncomeDecimal(value, normalizedCurrency);
  const cents =
    BigInt(normalized.integerDigits || "0") * 100n +
    BigInt(normalized.fractionDigits || "0");

  if (normalized.negative) {
    throw new ValidationError("Income amounts cannot be negative");
  }

  return cents;
}

export function parseIncomeBasisPoints(value: string): number {
  const normalized = value.trim().replace(",", ".");
  const match = normalized.match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    throw new ValidationError(`Invalid income increase percentage: ${value}`);
  }

  const sign = match[1] === "-" ? -1n : 1n;
  const whole = BigInt(match[2]);
  const fraction = BigInt((match[3] ?? "").padEnd(2, "0") || "0");
  const basisPoints = sign * (whole * 100n + fraction);

  if (basisPoints <= -10_000n || basisPoints > 100_000n) {
    throw new ValidationError(`Invalid income increase percentage: ${value}`);
  }

  return Number(basisPoints);
}

export function formatIncomeCents(cents: bigint, currency: IncomeCurrency): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const integerPart = (absolute / 100n).toString();
  const fractionPart = (absolute % 100n).toString().padStart(2, "0");
  const groupSeparator = currency === "ARS" ? "." : ",";
  const decimalSeparator = currency === "ARS" ? "," : ".";
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator);
  return `${negative ? "-" : ""}${grouped}${decimalSeparator}${fractionPart}`;
}

export function applyIncomeIncrease(
  amount: bigint,
  basisPoints: number,
  times: number,
): bigint {
  let result = amount;
  const factor = BigInt(10_000 + basisPoints);

  for (let index = 0; index < times; index += 1) {
    const numerator = result * factor;
    result = numerator >= 0n
      ? (numerator + 5_000n) / 10_000n
      : (numerator - 5_000n) / 10_000n;
  }

  return result;
}

export function calculateRecurringIncomeProjection(
  source: ProjectionSourceLike,
  monthKey: string,
): {
  amount: bigint;
  status: IncomeEventStatus;
  origin: IncomeProjectionOrigin;
  eventId: string | null;
} {
  const adjustments = source.events.filter(
    (event) => event.kind === "permanent_adjustment" && event.monthKey <= monthKey,
  );
  const latestAdjustment = adjustments.at(-1);
  const anchorMonth = latestAdjustment?.monthKey ?? source.startMonthKey;
  const anchorAmountRaw = latestAdjustment?.amountRaw ?? source.baseAmountRaw;
  const anchorAmount = parseIncomeAmount(anchorAmountRaw, source.currency);
  const elapsedMonths = Math.max(
    0,
    incomeMonthIndex(monthKey) - incomeMonthIndex(anchorMonth),
  );
  const increaseCount = Math.floor(elapsedMonths / source.increaseEveryMonths);
  const projectedAmount = applyIncomeIncrease(
    anchorAmount,
    parseIncomeBasisPoints(source.increasePercentRaw),
    increaseCount,
  );
  const monthlyOverride = source.events.find(
    (event) => event.kind === "monthly_override" && event.monthKey === monthKey,
  );

  if (monthlyOverride) {
    return {
      amount: parseIncomeAmount(monthlyOverride.amountRaw, source.currency),
      status: monthlyOverride.status === "actual" ? "actual" : "projected",
      origin: "monthly_override",
      eventId: monthlyOverride.id,
    };
  }

  return {
    amount: projectedAmount,
    status: latestAdjustment?.status === "actual" ? "actual" : "projected",
    origin: latestAdjustment
      ? "permanent_adjustment"
      : increaseCount > 0
        ? "automatic_increase"
        : "base",
    eventId: latestAdjustment?.id ?? null,
  };
}

function isoNowMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function mapIncomeEvent(event: PersistedIncomeEvent) {
  return {
    id: event.id,
    sourceId: event.sourceId,
    monthKey: event.monthKey,
    kind: event.kind,
    currency: normalizeCurrency(event.currency),
    amount: event.amountRaw,
    label: event.label,
    status: event.status === "actual" ? "actual" : "projected",
    notes: event.notes,
  };
}

function mapIncomeSource(source: PersistedIncomeSource) {
  return {
    id: source.id,
    name: source.name,
    employer: source.employer,
    kind: source.kind,
    currency: normalizeCurrency(source.currency),
    baseAmount: source.baseAmountRaw,
    startMonthKey: source.startMonthKey,
    paymentDay: source.paymentDay,
    increaseEveryMonths: source.increaseEveryMonths,
    increasePercent: source.increasePercentRaw,
    active: source.active,
    events: source.events.map(mapIncomeEvent),
  };
}

export class IncomesService {
  async createSource(input: CreateIncomeSourceInput) {
    parseIncomeAmount(input.baseAmount, input.currency);
    parseIncomeBasisPoints(input.increasePercent);

    const source = (await prisma.incomeSource.create({
      data: {
        name: input.name,
        employer: input.employer || null,
        kind: input.kind,
        currency: input.currency,
        baseAmountRaw: input.baseAmount,
        startMonthKey: input.startMonthKey,
        paymentDay: input.paymentDay ?? null,
        increaseEveryMonths: input.increaseEveryMonths,
        increasePercentRaw: input.increasePercent,
        active: input.active,
      },
      include: { events: true },
    })) as PersistedIncomeSource;

    return mapIncomeSource(source);
  }

  async updateSource(sourceId: string, input: UpdateIncomeSourceInput) {
    const existing = await prisma.incomeSource.findUnique({
      where: { id: sourceId },
      include: {
        events: {
          select: { monthKey: true },
        },
      },
    });
    if (!existing) throw new NotFoundError("Income source");

    if (
      input.currency !== undefined &&
      input.currency !== existing.currency &&
      existing.events.length > 0
    ) {
      throw new ValidationError(
        "Remove the source adjustments before changing its currency",
      );
    }

    const resultingStartMonth = input.startMonthKey ?? existing.startMonthKey;
    if (existing.events.some((event: { monthKey: string }) => event.monthKey < resultingStartMonth)) {
      throw new ValidationError(
        "The source start month cannot be later than an existing adjustment",
      );
    }

    const currency = input.currency ?? existing.currency;
    if (input.baseAmount !== undefined) {
      parseIncomeAmount(input.baseAmount, currency);
    }
    if (input.increasePercent !== undefined) {
      parseIncomeBasisPoints(input.increasePercent);
    }

    const source = (await prisma.incomeSource.update({
      where: { id: sourceId },
      data: {
        name: input.name,
        employer: input.employer === undefined ? undefined : input.employer || null,
        kind: input.kind,
        currency: input.currency,
        baseAmountRaw: input.baseAmount,
        startMonthKey: input.startMonthKey,
        paymentDay: input.paymentDay === undefined ? undefined : input.paymentDay ?? null,
        increaseEveryMonths: input.increaseEveryMonths,
        increasePercentRaw: input.increasePercent,
        active: input.active,
      },
      include: {
        events: {
          orderBy: [{ monthKey: "asc" }, { createdAt: "asc" }],
        },
      },
    })) as PersistedIncomeSource;

    return mapIncomeSource(source);
  }

  async deleteSource(sourceId: string) {
    const existing = await prisma.incomeSource.findUnique({ where: { id: sourceId } });
    if (!existing) throw new NotFoundError("Income source");

    await prisma.incomeSource.delete({ where: { id: sourceId } });
    return { success: true };
  }

  async createEvent(input: CreateIncomeEventInput) {
    const sourceBound = SOURCE_BOUND_EVENT_KINDS.has(input.kind);
    const oneOff = ONE_OFF_EVENT_KINDS.has(input.kind);

    if (!sourceBound && !oneOff) {
      throw new ValidationError(`Unsupported income event kind: ${input.kind}`);
    }

    let currency: IncomeCurrency;
    if (sourceBound) {
      if (!input.sourceId) {
        throw new ValidationError(`${input.kind} requires sourceId`);
      }
      const source = await prisma.incomeSource.findUnique({
        where: { id: input.sourceId },
      });
      if (!source) throw new NotFoundError("Income source");
      if (input.monthKey < source.startMonthKey) {
        throw new ValidationError(
          "An income adjustment cannot be earlier than its source start month",
        );
      }
      currency = normalizeCurrency(source.currency);
    } else {
      if (input.sourceId) {
        throw new ValidationError(`${input.kind} must not include sourceId`);
      }
      if (!input.currency) {
        throw new ValidationError("Currency is required for one-off income events");
      }
      currency = input.currency;
    }

    parseIncomeAmount(input.amount, currency);

    const event = (sourceBound && input.sourceId
      ? await prisma.incomeEvent.upsert({
          where: {
            dedupeKey: `${input.sourceId}:${input.monthKey}:${input.kind}`,
          },
          update: {
            currency,
            amountRaw: input.amount,
            label: input.label,
            status: input.status,
            notes: input.notes || null,
          },
          create: {
            sourceId: input.sourceId,
            dedupeKey: `${input.sourceId}:${input.monthKey}:${input.kind}`,
            monthKey: input.monthKey,
            kind: input.kind,
            currency,
            amountRaw: input.amount,
            label: input.label,
            status: input.status,
            notes: input.notes || null,
          },
        })
      : await prisma.incomeEvent.create({
          data: {
            sourceId: null,
            dedupeKey: null,
            monthKey: input.monthKey,
            kind: input.kind,
            currency,
            amountRaw: input.amount,
            label: input.label,
            status: input.status,
            notes: input.notes || null,
          },
        })) as PersistedIncomeEvent;

    return mapIncomeEvent(event);
  }

  async deleteEvent(eventId: string) {
    const existing = await prisma.incomeEvent.findUnique({ where: { id: eventId } });
    if (!existing) throw new NotFoundError("Income event");

    await prisma.incomeEvent.delete({ where: { id: eventId } });
    return { success: true };
  }

  async getOverview(from: string, to: string) {
    const months = enumerateIncomeMonths(from, to);
    const sources = (await prisma.incomeSource.findMany({
      where: { startMonthKey: { lte: to } },
      orderBy: [{ active: "desc" }, { createdAt: "asc" }],
      include: {
        events: {
          where: { monthKey: { lte: to } },
          orderBy: [{ monthKey: "asc" }, { createdAt: "asc" }],
        },
      },
    })) as PersistedIncomeSource[];

    const oneOffEvents = (await prisma.incomeEvent.findMany({
      where: {
        sourceId: null,
        monthKey: { gte: from, lte: to },
      },
      orderBy: [{ monthKey: "asc" }, { createdAt: "asc" }],
    })) as PersistedIncomeEvent[];

    const monthResults = months.map((monthKey) => {
      let recurringArs = 0n;
      let recurringUsd = 0n;
      let oneOffArs = 0n;
      let oneOffUsd = 0n;

      const recurring = sources
        .filter((source) => source.active && source.startMonthKey <= monthKey)
        .map((source) => {
          const currency = normalizeCurrency(source.currency);
          const projection = calculateRecurringIncomeProjection(source, monthKey);

          if (currency === "USD") recurringUsd += projection.amount;
          else recurringArs += projection.amount;

          return {
            sourceId: source.id,
            name: source.name,
            employer: source.employer,
            kind: source.kind,
            currency,
            amount: formatIncomeCents(projection.amount, currency),
            status: projection.status,
            origin: projection.origin,
            eventId: projection.eventId,
          };
        });

      const monthOneOffs = oneOffEvents
        .filter((event) => event.monthKey === monthKey)
        .map((event) => {
          const currency = normalizeCurrency(event.currency);
          const amount = parseIncomeAmount(event.amountRaw, currency);

          if (currency === "USD") oneOffUsd += amount;
          else oneOffArs += amount;

          return {
            id: event.id,
            kind: event.kind,
            label: event.label,
            currency,
            amount: formatIncomeCents(amount, currency),
            status: event.status === "actual" ? "actual" : "projected",
            notes: event.notes,
          };
        });

      const totalArs = recurringArs + oneOffArs;
      const totalUsd = recurringUsd + oneOffUsd;

      return {
        monthKey,
        label: monthLabel(monthKey),
        totalArs: formatIncomeCents(totalArs, "ARS"),
        totalUsd: formatIncomeCents(totalUsd, "USD"),
        recurringArs: formatIncomeCents(recurringArs, "ARS"),
        recurringUsd: formatIncomeCents(recurringUsd, "USD"),
        oneOffArs: formatIncomeCents(oneOffArs, "ARS"),
        oneOffUsd: formatIncomeCents(oneOffUsd, "USD"),
        recurring,
        oneOffs: monthOneOffs,
      };
    });

    const currentMonthKey = isoNowMonth();
    const currentMonth =
      monthResults.find((item) => item.monthKey === currentMonthKey) ?? monthResults[0];

    return {
      range: { from, to },
      currentMonthKey,
      summary: {
        totalArs: currentMonth?.totalArs ?? "0,00",
        totalUsd: currentMonth?.totalUsd ?? "0.00",
        recurringArs: currentMonth?.recurringArs ?? "0,00",
        recurringUsd: currentMonth?.recurringUsd ?? "0.00",
        oneOffArs: currentMonth?.oneOffArs ?? "0,00",
        oneOffUsd: currentMonth?.oneOffUsd ?? "0.00",
        recurringSources: currentMonth?.recurring.length ?? 0,
        oneOffCount: currentMonth?.oneOffs.length ?? 0,
      },
      sources: sources.map(mapIncomeSource),
      months: monthResults,
    };
  }
}

export const incomesService = new IncomesService();
