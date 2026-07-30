import { prisma } from "../../db/prisma.js";
import {
  IncomesService as BaseIncomesService,
  formatIncomeCents,
  parseIncomeAmount,
} from "./incomes.service.base.js";
import { analyzeSalaryReceiptExtras } from "../salary-receipts/salary-receipt-extras.js";

export * from "./incomes.service.base.js";

type Currency = "ARS" | "USD";

interface OverviewRecurringItem {
  sourceId: string;
  name: string;
  employer: string | null;
  kind: string;
  currency: Currency;
  amount: string;
  status: "actual" | "projected";
  origin: string;
  eventId: string | null;
}

interface OverviewOneOffItem {
  id: string;
  kind: string;
  label: string;
  currency: Currency;
  amount: string;
  status: "actual" | "projected";
  notes: string | null;
}

interface OverviewMonth {
  monthKey: string;
  label: string;
  totalArs: string;
  totalUsd: string;
  recurringArs: string;
  recurringUsd: string;
  oneOffArs: string;
  oneOffUsd: string;
  recurring: OverviewRecurringItem[];
  oneOffs: OverviewOneOffItem[];
}

interface OverviewSource {
  id: string;
  kind: string;
  currency: Currency;
  baseAmount: string;
}

interface IncomeOverviewShape {
  range: { from: string; to: string };
  currentMonthKey: string;
  summary: {
    totalArs: string;
    totalUsd: string;
    recurringArs: string;
    recurringUsd: string;
    oneOffArs: string;
    oneOffUsd: string;
    recurringSources: number;
    oneOffCount: number;
  };
  sources: OverviewSource[];
  months: OverviewMonth[];
}

function cents(value: string, currency: Currency): bigint {
  return parseIncomeAmount(value, currency);
}

function ratioAmount(
  projected: bigint,
  recurringBase: bigint,
  receiptNet: bigint,
): bigint {
  if (receiptNet <= 0n) return projected;
  return (projected * recurringBase + receiptNet / 2n) / receiptNet;
}

function monthNumber(monthKey: string): number {
  return Number(monthKey.slice(5, 7));
}

function isSacMonth(monthKey: string): boolean {
  const month = monthNumber(monthKey);
  return month === 6 || month === 12;
}

function semesterBounds(monthKey: string): [string, string] {
  const year = monthKey.slice(0, 4);
  return monthNumber(monthKey) === 6
    ? [`${year}-01`, `${year}-06`]
    : [`${year}-07`, `${year}-12`];
}

function recomputeMonth(month: OverviewMonth): void {
  const recurringArs = month.recurring
    .filter((item) => item.currency === "ARS")
    .reduce((total, item) => total + cents(item.amount, "ARS"), 0n);
  const recurringUsd = month.recurring
    .filter((item) => item.currency === "USD")
    .reduce((total, item) => total + cents(item.amount, "USD"), 0n);
  const oneOffArs = month.oneOffs
    .filter((item) => item.currency === "ARS")
    .reduce((total, item) => total + cents(item.amount, "ARS"), 0n);
  const oneOffUsd = month.oneOffs
    .filter((item) => item.currency === "USD")
    .reduce((total, item) => total + cents(item.amount, "USD"), 0n);

  month.recurringArs = formatIncomeCents(recurringArs, "ARS");
  month.recurringUsd = formatIncomeCents(recurringUsd, "USD");
  month.oneOffArs = formatIncomeCents(oneOffArs, "ARS");
  month.oneOffUsd = formatIncomeCents(oneOffUsd, "USD");
  month.totalArs = formatIncomeCents(recurringArs + oneOffArs, "ARS");
  month.totalUsd = formatIncomeCents(recurringUsd + oneOffUsd, "USD");
}

export class SacAwareIncomesService extends BaseIncomesService {
  override async getOverview(from: string, to: string) {
    const overview = (await super.getOverview(from, to)) as IncomeOverviewShape;
    const receipts = await prisma.salaryReceipt.findMany({
      where: {
        sourceId: { not: null },
        status: "accepted",
        isActiveForPeriod: true,
        periodMonthKey: { lte: to },
      },
      orderBy: [{ periodMonthKey: "asc" }, { version: "asc" }],
      include: {
        items: {
          orderBy: { displayOrder: "asc" },
          select: {
            label: true,
            amountRaw: true,
            originalText: true,
          },
        },
      },
    });

    const receiptsBySource = new Map<string, typeof receipts>();
    for (const receipt of receipts) {
      if (!receipt.sourceId) continue;
      const current = receiptsBySource.get(receipt.sourceId) ?? [];
      current.push(receipt);
      receiptsBySource.set(receipt.sourceId, current);
    }

    for (const source of overview.sources) {
      if (source.kind !== "salary") continue;
      const sourceReceipts = receiptsBySource.get(source.id) ?? [];
      const analyzedReceipts = sourceReceipts.map((receipt) => ({
        receipt,
        analysis: analyzeSalaryReceiptExtras({
          grossAmount: receipt.grossAmountRaw,
          netAmount: receipt.netAmountRaw,
          items: receipt.items.map((item) => ({
            label: item.label,
            amount: item.amountRaw,
            originalText: item.originalText,
          })),
        }),
      }));
      const recurringAnchor = [...analyzedReceipts]
        .reverse()
        .find(({ analysis }) => !analysis.sacOnly);
      if (!recurringAnchor) continue;

      const { receipt: anchorReceipt, analysis: anchorAnalysis } = recurringAnchor;
      const currency = source.currency;
      const anchorNet = cents(anchorReceipt.netAmountRaw, currency);
      const recurringBase = cents(anchorAnalysis.recurringNetAmount, currency);
      source.baseAmount = anchorAnalysis.recurringNetAmount;

      if (anchorAnalysis.hasSac) {
        for (const month of overview.months) {
          if (month.monthKey <= anchorReceipt.periodMonthKey) continue;
          const item = month.recurring.find(
            (candidate) => candidate.sourceId === source.id,
          );
          if (!item || item.status === "actual") continue;
          item.amount = formatIncomeCents(
            ratioAmount(cents(item.amount, currency), recurringBase, anchorNet),
            currency,
          );
          item.origin = "permanent_adjustment";
        }
      }

      for (const { receipt, analysis } of analyzedReceipts.filter(
        ({ analysis }) => analysis.sacOnly,
      )) {
        const month = overview.months.find(
          (candidate) => candidate.monthKey === receipt.periodMonthKey,
        );
        if (!month) continue;
        const recurringItem = month.recurring.find(
          (item) => item.sourceId === source.id && item.status === "actual",
        );
        if (recurringItem) {
          recurringItem.amount = formatIncomeCents(recurringBase, currency);
          recurringItem.status = "projected";
        }
        month.oneOffs.push({
          id: `sac-actual:${receipt.id}`,
          kind: "aguinaldo",
          label: "SAC real",
          currency,
          amount: receipt.netAmountRaw,
          status: "actual",
          notes: "Importe real tomado de un recibo exclusivo de SAC.",
        });
      }

      for (const month of overview.months.filter((candidate) =>
        isSacMonth(candidate.monthKey),
      )) {
        const exactReceipt = analyzedReceipts.find(
          ({ receipt }) => receipt.periodMonthKey === month.monthKey,
        );
        if (exactReceipt?.analysis.hasSac) continue;

        const [semesterFrom, semesterTo] = semesterBounds(month.monthKey);
        const semesterAmounts = overview.months
          .filter(
            (candidate) =>
              candidate.monthKey >= semesterFrom &&
              candidate.monthKey <= semesterTo,
          )
          .map((candidate) =>
            candidate.recurring.find((item) => item.sourceId === source.id),
          )
          .filter((item): item is OverviewRecurringItem => Boolean(item))
          .map((item) => cents(item.amount, currency));
        const highestMonthlyNet = semesterAmounts.reduce(
          (highest, value) => (value > highest ? value : highest),
          0n,
        );
        if (highestMonthlyNet <= 0n) continue;

        const sacEstimate = (highestMonthlyNet + 1n) / 2n;
        month.oneOffs = month.oneOffs.filter(
          (item) => item.id !== `sac-estimate:${source.id}:${month.monthKey}`,
        );
        month.oneOffs.push({
          id: `sac-estimate:${source.id}:${month.monthKey}`,
          kind: "aguinaldo",
          label: "SAC estimado",
          currency,
          amount: formatIncomeCents(sacEstimate, currency),
          status: "projected",
          notes:
            "Estimación financiera del neto: 50% del mayor neto mensual proyectado del semestre. La liquidación laboral real puede diferir.",
        });
      }
    }

    for (const month of overview.months) recomputeMonth(month);
    const current = overview.months.find(
      (month) => month.monthKey === overview.currentMonthKey,
    );
    if (current) {
      overview.summary = {
        totalArs: current.totalArs,
        totalUsd: current.totalUsd,
        recurringArs: current.recurringArs,
        recurringUsd: current.recurringUsd,
        oneOffArs: current.oneOffArs,
        oneOffUsd: current.oneOffUsd,
        recurringSources: current.recurring.length,
        oneOffCount: current.oneOffs.length,
      };
    }

    return overview;
  }
}

export const incomesService = new SacAwareIncomesService();
