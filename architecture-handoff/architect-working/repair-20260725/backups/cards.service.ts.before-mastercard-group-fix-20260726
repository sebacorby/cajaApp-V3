import { prisma } from "../../db/prisma.js";
import {
  CardStatementHistoryConflictError,
  NotFoundError,
} from "../../shared/errors.js";
import type {
  CardStatementPreview,
  AcceptResult,
  MonthlyProjection,
  CardExchangeRate,
  CardMoneyEquivalents,
} from "./cards.types.js";
import { cardStatementDraftSummarySchema } from "./cards.schemas.js";
import { logger } from "../../shared/logger.js";
import { installmentProjectionService } from "../projections/installment-projection.service.js";
import {
  centsToString,
  parseArgentinePesos,
  parseDollars,
} from "../../shared/money.js";

const USD_ARS_PAIR = "USD_ARS" as const;

function normalizeHistoryPart(value: string | null | undefined): string {
  return (value ?? "unknown").trim().toLocaleLowerCase("es") || "unknown";
}

function resolveCardStatementIdentityKey(
  preview: CardStatementPreview,
): string {
  const statementNumber = normalizeHistoryPart(preview.source.statementNumber);
  return statementNumber === "unknown"
    ? "unknown"
    : `statement:${statementNumber}`;
}

export function resolveCardStatementPeriodKey(
  preview: CardStatementPreview,
): string | null {
  const candidates = [
    preview.summary.currentDueDate,
    preview.summary.nextClosingDate,
    preview.summary.nextDueDate,
  ];
  for (const candidate of candidates) {
    if (candidate && /^\d{4}-\d{2}-\d{2}$/.test(candidate))
      return candidate.slice(0, 7);
  }
  return null;
}

export function buildCardStatementHistoryKey(
  preview: CardStatementPreview,
  periodKey: string | null,
): string | null {
  if (!periodKey) return null;
  return [
    normalizeHistoryPart(preview.source.bankName),
    normalizeHistoryPart(preview.source.brand),
    resolveCardStatementIdentityKey(preview),
    periodKey,
  ].join("|");
}

function missingExchangeRate(): CardExchangeRate {
  return {
    configured: false,
    pair: USD_ARS_PAIR,
    rate: null,
    effectiveDate: null,
    source: null,
    status: "missing",
    updatedAt: null,
  };
}

function safeParseAmount(
  value: string | null,
  currency: "ARS" | "USD",
): bigint | null {
  if (!value || !value.trim()) return null;
  try {
    return currency === "ARS"
      ? parseArgentinePesos(value)
      : parseDollars(value);
  } catch {
    return null;
  }
}

function parseExchangeRateToCents(value: string): bigint {
  const compact = value.trim().replace(/\s/g, "");
  if (!compact) throw new Error("Exchange rate is required");

  let normalized: string;
  if (compact.includes(",")) {
    normalized = compact.replace(/\./g, "").replace(",", ".");
  } else {
    const dotCount = (compact.match(/\./g) ?? []).length;
    const lastDot = compact.lastIndexOf(".");
    const decimalDigits = lastDot >= 0 ? compact.length - lastDot - 1 : 0;
    normalized =
      dotCount === 1 && decimalDigits > 0 && decimalDigits <= 2
        ? compact
        : compact.replace(/\./g, "");
  }

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Invalid exchange rate");
  }

  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function divideRoundHalfUp(value: bigint, divisor: bigint): bigint {
  return (value + divisor / 2n) / divisor;
}

export function calculateCardMoneyEquivalents(
  totalPesos: string | null,
  totalDollars: string | null,
  exchangeRate: CardExchangeRate,
): CardMoneyEquivalents {
  if (!exchangeRate.configured || !exchangeRate.rate) {
    return { usdEquivalentPesos: null, combinedTotalPesos: null };
  }

  let rateCents: bigint | null = null;
  try {
    rateCents = parseExchangeRateToCents(exchangeRate.rate);
  } catch {
    rateCents = null;
  }
  if (rateCents === null || rateCents <= 0n) {
    return { usdEquivalentPesos: null, combinedTotalPesos: null };
  }

  const pesoCents = safeParseAmount(totalPesos, "ARS");
  const dollarCents = safeParseAmount(totalDollars, "USD");
  const usdEquivalentCents =
    dollarCents === null
      ? null
      : divideRoundHalfUp(dollarCents * rateCents, 100n);

  const combinedCents =
    pesoCents === null && usdEquivalentCents === null
      ? null
      : (pesoCents ?? 0n) + (usdEquivalentCents ?? 0n);

  return {
    usdEquivalentPesos:
      usdEquivalentCents === null
        ? null
        : centsToString(usdEquivalentCents, "ARS"),
    combinedTotalPesos:
      combinedCents === null ? null : centsToString(combinedCents, "ARS"),
  };
}

export class CardsService {
  async getExchangeRate(): Promise<CardExchangeRate> {
    const record = await prisma.currencyExchangeRate.findUnique({
      where: { pair: USD_ARS_PAIR },
    });

    if (!record) return missingExchangeRate();

    return {
      configured: true,
      pair: USD_ARS_PAIR,
      rate: record.rateRaw,
      effectiveDate: record.effectiveDate,
      source: record.source,
      status: record.status,
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async updateExchangeRate(input: {
    rate: string;
    effectiveDate: string;
  }): Promise<CardExchangeRate> {
    const rateCents = parseExchangeRateToCents(input.rate);
    if (rateCents <= 0n)
      throw new Error("Exchange rate must be greater than zero");

    const normalizedRate = centsToString(rateCents, "ARS");
    const record = await prisma.currencyExchangeRate.upsert({
      where: { pair: USD_ARS_PAIR },
      create: {
        pair: USD_ARS_PAIR,
        rateRaw: normalizedRate,
        effectiveDate: input.effectiveDate,
        source: "manual",
        status: "active",
      },
      update: {
        rateRaw: normalizedRate,
        effectiveDate: input.effectiveDate,
        source: "manual",
        status: "active",
      },
    });

    logger.info(
      { pair: USD_ARS_PAIR, effectiveDate: record.effectiveDate },
      "Card exchange rate updated",
    );

    return {
      configured: true,
      pair: USD_ARS_PAIR,
      rate: record.rateRaw,
      effectiveDate: record.effectiveDate,
      source: record.source,
      status: record.status,
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async getPricing(
    totalPesos: string | null,
    totalDollars: string | null,
    months: MonthlyProjection[] = [],
  ): Promise<{
    exchangeRate: CardExchangeRate;
    equivalents: CardMoneyEquivalents;
    months: MonthlyProjection[];
  }> {
    const exchangeRate = await this.getExchangeRate();
    return {
      exchangeRate,
      equivalents: calculateCardMoneyEquivalents(
        totalPesos,
        totalDollars,
        exchangeRate,
      ),
      months: months.map((month) => ({
        ...month,
        ...calculateCardMoneyEquivalents(
          month.totalPesos,
          month.totalDollars,
          exchangeRate,
        ),
      })),
    };
  }

  async getDraft(draftId: string) {
    const draft = await prisma.cardStatementDraft.findUnique({
      where: { id: draftId },
      include: {
        document: true,
        aiRun: true,
        sections: {
          orderBy: { displayOrder: "asc" },
        },
        groups: {
          orderBy: { displayOrder: "asc" },
        },
        rows: {
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    if (!draft) {
      throw new NotFoundError("Draft");
    }

    return draft;
  }

  async getStatement(statementId: string) {
    const statement = await prisma.cardStatement.findUnique({
      where: { id: statementId },
      include: {
        document: true,
        draft: { include: { aiRun: true } },
        sections: { orderBy: { displayOrder: "asc" } },
        groups: { orderBy: { displayOrder: "asc" } },
        rows: { orderBy: { displayOrder: "asc" } },
        projections: { orderBy: { monthKey: "asc" } },
        manualPurchases: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!statement) throw new NotFoundError("Statement");
    return statement;
  }

  async getLatestStatement() {
    return prisma.cardStatement.findFirst({
      where: { status: "accepted", isActiveForPeriod: true },
      orderBy: { createdAt: "desc" },
      include: {
        document: true,
        draft: { include: { aiRun: true } },
        sections: { orderBy: { displayOrder: "asc" } },
        groups: { orderBy: { displayOrder: "asc" } },
        rows: { orderBy: { displayOrder: "asc" } },
        projections: { orderBy: { monthKey: "asc" } },
        manualPurchases: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async listStatements(
    input: {
      limit?: number;
      search?: string;
      status?: string;
      includeArchived?: boolean;
    } = {},
  ) {
    const take = Math.min(
      Math.max(Math.trunc(input.limit ?? 50) || 50, 1),
      100,
    );
    const records = await prisma.cardStatement.findMany({
      where: input.includeArchived
        ? undefined
        : { status: { not: "archived" } },
      orderBy: [{ createdAt: "desc" }, { version: "desc" }],
      take: 100,
      select: {
        id: true,
        status: true,
        periodKey: true,
        historyKey: true,
        version: true,
        isActiveForPeriod: true,
        archivedAt: true,
        archivedReason: true,
        bankName: true,
        brand: true,
        statementNumber: true,
        totalPesosRaw: true,
        totalDollarsRaw: true,
        minimumPaymentPesosRaw: true,
        currentDueDate: true,
        nextClosingDate: true,
        nextDueDate: true,
        createdAt: true,
        updatedAt: true,
        groups: {
          select: { cardLast4: true, holderName: true },
          orderBy: { displayOrder: "asc" },
        },
        document: {
          select: { id: true, fileName: true, pageCount: true, sha256: true },
        },
      },
    });

    const status = input.status?.trim().toLocaleLowerCase("es");
    const search = input.search?.trim().toLocaleLowerCase("es");
    return records
      .filter((record) => {
        if (
          status &&
          status !== "all" &&
          record.status.toLocaleLowerCase("es") !== status
        )
          return false;
        if (!search) return true;
        const haystack = [
          record.bankName,
          record.brand,
          record.statementNumber,
          record.periodKey,
          record.currentDueDate,
          record.document.fileName,
          record.document.sha256,
          ...record.groups.flatMap((group) => [
            group.cardLast4,
            group.holderName,
          ]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("es");
        return haystack.includes(search);
      })
      .slice(0, take);
  }

  async getStatementTraceability(statementId: string) {
    const statement = await prisma.cardStatement.findUnique({
      where: { id: statementId },
      include: {
        document: true,
        draft: { include: { aiRun: true } },
      },
    });
    if (!statement) throw new NotFoundError("Statement");

    const versions = statement.historyKey
      ? await prisma.cardStatement.findMany({
          where: { historyKey: statement.historyKey },
          orderBy: { version: "desc" },
          select: {
            id: true,
            status: true,
            version: true,
            isActiveForPeriod: true,
            createdAt: true,
            archivedAt: true,
            archivedReason: true,
            document: { select: { fileName: true, sha256: true } },
          },
        })
      : [
          {
            id: statement.id,
            status: statement.status,
            version: statement.version,
            isActiveForPeriod: statement.isActiveForPeriod,
            createdAt: statement.createdAt,
            archivedAt: statement.archivedAt,
            archivedReason: statement.archivedReason,
            document: {
              fileName: statement.document.fileName,
              sha256: statement.document.sha256,
            },
          },
        ];

    return {
      statement: {
        id: statement.id,
        status: statement.status,
        periodKey: statement.periodKey,
        version: statement.version,
        isActiveForPeriod: statement.isActiveForPeriod,
        archivedAt: statement.archivedAt?.toISOString() ?? null,
        archivedReason: statement.archivedReason,
        createdAt: statement.createdAt.toISOString(),
        updatedAt: statement.updatedAt.toISOString(),
      },
      document: {
        id: statement.document.id,
        fileName: statement.document.fileName,
        mimeType: statement.document.mimeType,
        sizeBytes: statement.document.sizeBytes,
        sha256: statement.document.sha256,
        pageCount: statement.document.pageCount,
        createdAt: statement.document.createdAt.toISOString(),
      },
      draft: statement.draft
        ? {
            id: statement.draft.id,
            status: statement.draft.status,
            createdAt: statement.draft.createdAt.toISOString(),
            updatedAt: statement.draft.updatedAt.toISOString(),
          }
        : null,
      aiRun: statement.draft?.aiRun
        ? {
            id: statement.draft.aiRun.id,
            status: statement.draft.aiRun.status,
            provider: statement.draft.aiRun.modelProvider,
            model: statement.draft.aiRun.modelName,
            promptHash: statement.draft.aiRun.promptHash,
            promptVersion: statement.draft.aiRun.promptVersion,
            rawResponseHash: statement.draft.aiRun.rawResponseHash,
            validationErrors: statement.draft.aiRun.validationErrors,
            retries: statement.draft.aiRun.retries,
            createdAt: statement.draft.aiRun.createdAt.toISOString(),
            completedAt:
              statement.draft.aiRun.completedAt?.toISOString() ?? null,
          }
        : null,
      versions: versions.map((version) => ({
        id: version.id,
        status: version.status,
        version: version.version,
        isActiveForPeriod: version.isActiveForPeriod,
        createdAt: version.createdAt.toISOString(),
        archivedAt: version.archivedAt?.toISOString() ?? null,
        archivedReason: version.archivedReason ?? null,
        document: version.document,
      })),
    };
  }

  private async moveManualCommitments(
    tx: any,
    fromStatementId: string,
    toStatementId: string,
  ): Promise<void> {
    if (fromStatementId === toStatementId) return;
    await tx.manualCardPurchase.updateMany({
      where: { statementId: fromStatementId },
      data: { statementId: toStatementId },
    });
    await tx.cardInstallmentProjection.updateMany({
      where: { statementId: fromStatementId, isManual: true },
      data: { statementId: toStatementId },
    });
  }

  async activateStatement(statementId: string) {
    await prisma.$transaction(async (tx) => {
      const target = await tx.cardStatement.findUnique({
        where: { id: statementId },
      });
      if (!target) throw new NotFoundError("Statement");

      const active = target.historyKey
        ? await tx.cardStatement.findFirst({
            where: {
              historyKey: target.historyKey,
              status: "accepted",
              isActiveForPeriod: true,
              id: { not: target.id },
            },
          })
        : null;

      if (target.historyKey) {
        await tx.cardStatement.updateMany({
          where: {
            historyKey: target.historyKey,
            id: { not: target.id },
            status: "accepted",
          },
          data: { status: "superseded", isActiveForPeriod: false },
        });
      }

      if (active) await this.moveManualCommitments(tx, active.id, target.id);

      await tx.cardStatement.update({
        where: { id: target.id },
        data: {
          status: "accepted",
          isActiveForPeriod: true,
          archivedAt: null,
          archivedReason: null,
        },
      });
    });

    logger.info({ statementId }, "Card statement version activated");
    return this.getStatement(statementId);
  }

  async archiveStatement(statementId: string, reason?: string) {
    await prisma.$transaction(async (tx) => {
      const target = await tx.cardStatement.findUnique({
        where: { id: statementId },
        include: { _count: { select: { manualPurchases: true } } },
      });
      if (!target) throw new NotFoundError("Statement");
      if (target.status === "archived") return;

      const replacement =
        target.isActiveForPeriod && target.historyKey
          ? await tx.cardStatement.findFirst({
              where: {
                historyKey: target.historyKey,
                id: { not: target.id },
                status: { in: ["accepted", "superseded"] },
                archivedAt: null,
              },
              orderBy: [{ version: "desc" }, { createdAt: "desc" }],
            })
          : null;

      if (
        target.isActiveForPeriod &&
        target._count.manualPurchases > 0 &&
        !replacement
      ) {
        throw new CardStatementHistoryConflictError(
          "No se puede archivar el único resumen activo mientras tenga compras manuales. Eliminá esas compras o activá otra versión primero.",
        );
      }

      // Deactivate the target before promoting a replacement. The database enforces
      // a single accepted active statement per history key. Reversing this order can
      // violate the partial unique index even though the whole operation is transactional.
      await tx.cardStatement.update({
        where: { id: target.id },
        data: {
          status: "archived",
          isActiveForPeriod: false,
          archivedAt: new Date(),
          archivedReason: reason?.trim() || null,
        },
      });

      if (replacement) {
        await this.moveManualCommitments(tx, target.id, replacement.id);
        await tx.cardStatement.update({
          where: { id: replacement.id },
          data: {
            status: "accepted",
            isActiveForPeriod: true,
            archivedAt: null,
            archivedReason: null,
          },
        });
      }
    });

    logger.info(
      { statementId },
      "Card statement archived without deleting traceability",
    );
    return { success: true, statementId };
  }

  async updateDraft(
    draftId: string,
    preview: CardStatementPreview,
  ): Promise<{ success: boolean; warnings: string[] }> {
    const draft = await this.getDraft(draftId);

    if (draft.status !== "preview_ready") {
      throw new Error(`Cannot update draft in status: ${draft.status}`);
    }

    const warnings: string[] = [];

    const displayOrders = preview.rows.map((r) => r.displayOrder);
    const uniqueOrders = new Set(displayOrders);
    if (uniqueOrders.size !== displayOrders.length) {
      throw new Error("Duplicate displayOrder found in preview");
    }

    for (const row of preview.rows) {
      if (!row.originalText || row.originalText.trim() === "") {
        throw new Error(`Row ${row.id} is missing originalText`);
      }
    }

    const sectionKeys = new Set(preview.sections.map((s) => s.id));
    const groupKeys = new Set(preview.groups.map((g) => g.id));

    for (const row of preview.rows) {
      if (row.sectionId && !sectionKeys.has(row.sectionId)) {
        throw new Error(`Row references unknown sectionId: ${row.sectionId}`);
      }
      if (row.groupId && !groupKeys.has(row.groupId)) {
        throw new Error(`Row references unknown groupId: ${row.groupId}`);
      }
    }

    const groupSectionMap = new Map<string, string>();
    for (const row of preview.rows) {
      if (row.groupId && row.sectionId && !groupSectionMap.has(row.groupId)) {
        groupSectionMap.set(row.groupId, row.sectionId);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.cardStatementDraftSection.deleteMany({ where: { draftId } });
      await tx.cardStatementDraftGroup.deleteMany({ where: { draftId } });
      await tx.cardStatementDraftRow.deleteMany({ where: { draftId } });

      await tx.cardStatementDraftSection.createMany({
        data: preview.sections.map((s) => ({
          draftId,
          sectionKey: s.id,
          label: s.label,
          displayOrder: s.displayOrder,
        })),
      });

      await tx.cardStatementDraftGroup.createMany({
        data: preview.groups.map((g) => ({
          draftId,
          groupKey: g.id,
          sectionKey:
            groupSectionMap.get(g.id) || preview.sections[0]?.id || "",
          label: g.label,
          displayOrder: g.displayOrder,
          cardLast4: g.cardLast4,
          holderName: g.holderName,
        })),
      });

      await tx.cardStatementDraftRow.createMany({
        data: preview.rows.map((r) => ({
          draftId,
          sectionKey: r.sectionId,
          groupKey: r.groupId,
          displayOrder: r.displayOrder,
          sourcePage: r.sourcePage,
          rowType: r.rowType,
          editable: r.editable,
          dateRaw: r.dateRaw,
          dateIso: r.dateIso,
          markerRaw: r.markerRaw,
          referenceRaw: r.referenceRaw,
          installmentRaw: r.installmentRaw,
          receiptRaw: r.receiptRaw,
          amountPesosRaw: r.amountPesos,
          amountDollarsRaw: r.amountDollars,
          currencyOriginal: r.currencyOriginal,
          originalText: r.originalText,
          confidence: r.confidence,
        })),
      });

      await tx.cardStatementDraft.update({
        where: { id: draftId },
        data: {
          previewJson: JSON.stringify(preview),
        },
      });
    });

    logger.info({ draftId }, "Draft updated");

    return { success: true, warnings };
  }

  async acceptDraft(
    draftId: string,
    preview: CardStatementPreview,
  ): Promise<AcceptResult> {
    const draft = await this.getDraft(draftId);

    if (draft.status !== "preview_ready") {
      throw new Error(`Cannot accept draft in status: ${draft.status}`);
    }

    const groupSectionMap = new Map<string, string>();
    for (const row of preview.rows) {
      if (row.groupId && row.sectionId && !groupSectionMap.has(row.groupId)) {
        groupSectionMap.set(row.groupId, row.sectionId);
      }
    }

    const periodKey =
      resolveCardStatementPeriodKey(preview) ??
      installmentProjectionService.getStatementMonthKey(preview.rows);
    const historyKey = buildCardStatementHistoryKey(preview, periodKey);

    const projectionRows = preview.rows.map((r) => ({
      id: r.id,
      rowType:
        r.rowType as import("../cards/cards.types.js").CardStatementRowType,
      installmentRaw: r.installmentRaw,
      installmentCurrent: r.installmentCurrent,
      installmentTotal: r.installmentTotal,
      amountPesos: r.amountPesos,
      amountDollars: r.amountDollars,
      currencyOriginal:
        r.currencyOriginal as import("../cards/cards.types.js").CurrencyOriginal,
      dateIso: r.dateIso,
      displayOrder: r.displayOrder,
      sectionId: r.sectionId,
      // NOTE: r.id is the group key (per acceptDraft: groupKey: r.id)
      groupId: r.id,
    }));

    const projections = installmentProjectionService.calculateProjections(
      projectionRows as any,
      periodKey,
    );

    const result = await prisma.$transaction(async (tx) => {
      const versions = historyKey
        ? await tx.cardStatement.findMany({
            where: { historyKey },
            select: {
              id: true,
              status: true,
              version: true,
              isActiveForPeriod: true,
            },
            orderBy: { version: "desc" },
          })
        : [];
      const activeVersion = versions.find(
        (version) => version.status === "accepted" && version.isActiveForPeriod,
      );
      const nextVersion = (versions[0]?.version ?? 0) + 1;

      // Release the one-active-version constraint before inserting the replacement.
      // If any later operation fails, the surrounding transaction restores the prior state.
      if (activeVersion) {
        await tx.cardStatement.update({
          where: { id: activeVersion.id },
          data: { status: "superseded", isActiveForPeriod: false },
        });
      }

      const statement = await tx.cardStatement.create({
        data: {
          documentId: draft.documentId,
          draftId: draft.id,
          periodKey,
          historyKey,
          version: nextVersion,
          isActiveForPeriod: true,
          bankName: preview.source.bankName,
          brand: preview.source.brand,
          statementNumber: preview.source.statementNumber,
          periodLabel: preview.summary.currentDueDate || null,
          totalPesosRaw: preview.summary.totalPesos,
          totalDollarsRaw: preview.summary.totalDollars,
          minimumPaymentPesosRaw: preview.summary.minimumPaymentPesos,
          currentDueDate: preview.summary.currentDueDate,
          nextClosingDate: preview.summary.nextClosingDate,
          nextDueDate: preview.summary.nextDueDate,
          status: "accepted",
          sections: {
            create: preview.sections.map((s) => ({
              sectionKey: s.id,
              label: s.label,
              displayOrder: s.displayOrder,
            })),
          },
          groups: {
            create: preview.groups.map((g) => ({
              groupKey: g.id,
              sectionKey:
                groupSectionMap.get(g.id) || preview.sections[0]?.id || "",
              label: g.label,
              displayOrder: g.displayOrder,
              cardLast4: g.cardLast4,
              holderName: g.holderName,
            })),
          },
          rows: {
            create: preview.rows.map((r) => ({
              sectionKey: r.sectionId,
              groupKey: r.id, // was: r.groupId (stored section ID — bug; r.id is the group key)
              displayOrder: r.displayOrder,
              sourcePage: r.sourcePage,
              rowType: r.rowType,
              editable: r.editable,
              dateRaw: r.dateRaw,
              dateIso: r.dateIso,
              markerRaw: r.markerRaw,
              referenceRaw: r.referenceRaw,
              installmentRaw: r.installmentRaw,
              receiptRaw: r.receiptRaw,
              amountPesosRaw: r.amountPesos,
              amountDollarsRaw: r.amountDollars,
              currencyOriginal: r.currencyOriginal,
              originalText: r.originalText,
              confidence: r.confidence,
            })),
          },
        },
      });

      if (activeVersion) {
        await this.moveManualCommitments(tx, activeVersion.id, statement.id);
      }

      if (projections.length > 0) {
        await tx.cardInstallmentProjection.createMany({
          data: projections.map((p) => ({
            statementId: statement.id,
            rowId: p.rowId,
            monthKey: p.monthKey,
            label: p.label,
            installmentCurrent: p.installmentCurrent,
            installmentTotal: p.installmentTotal,
            amountPesosRaw: p.amountPesos,
            amountDollarsRaw: p.amountDollars,
            currencyOriginal: p.currencyOriginal,
            isManual: false,
          })),
        });

        // FIX: Update projection rowId values from preview IDs to actual persisted UUIDs.
        // After inserting rows we query them back, build a displayOrder+sectionKey+groupKey
        // composite-key map, then update each projection.rowId to the real UUID — all inside
        // the same transaction. This fixes missing_card_reference diagnostics in the future
        // debt view.
        const persistedRows = await tx.cardStatementRow.findMany({
          where: { statementId: statement.id },
          orderBy: { displayOrder: "asc" },
        });

        // Build composite-key map from persisted rows
        const rowIdMap = new Map<string, string>();
        for (const row of persistedRows) {
          const key = `${row.displayOrder}:${row.sectionKey}:${row.groupKey}`;
          rowIdMap.set(key, row.id);
        }

        // Fetch the just-inserted projections and update their rowId values
        const insertedProjections = await tx.cardInstallmentProjection.findMany({
          where: { statementId: statement.id, isManual: false },
          orderBy: { id: "asc" },
        });

        // projections[] and insertedProjections[] are positionally 1:1 because:
        // - projections[] is ordered by displayOrder (from calculateProjections which iterates rows in order)
        // - insertedProjections[] is ordered by id (all inserted in createMany in the same order)
        // Both correspond to the same set of preview rows that had installments.
        for (let i = 0; i < projections.length; i++) {
          const previewProj = projections[i];
          const dbProj = insertedProjections[i];
          // Build the composite key using the preview projection's fields
          // (these match the persisted row's sectionKey/groupKey because acceptDraft
          // maps preview row.sectionId → sectionKey and preview row.id → groupKey)
          const key = `${previewProj.displayOrder}:${previewProj.sectionKey}:${previewProj.groupKey}`;
          const actualRowId = rowIdMap.get(key);
          if (actualRowId && actualRowId !== dbProj.rowId) {
            await tx.cardInstallmentProjection.updateMany({
              where: { id: dbProj.id, rowId: dbProj.rowId },
              data: { rowId: actualRowId },
            });
          }
        }
      }

      await tx.cardStatementDraft.update({
        where: { id: draftId },
        data: { status: "accepted" },
      });

      const persistedProjections = await tx.cardInstallmentProjection.findMany({
        where: { statementId: statement.id },
        orderBy: { monthKey: "asc" },
      });

      const monthMap = new Map<string, MonthlyProjection>();

      for (const projection of persistedProjections) {
        if (!monthMap.has(projection.monthKey)) {
          monthMap.set(projection.monthKey, {
            monthKey: projection.monthKey,
            label: projection.label,
            totalPesos: "0.00",
            totalDollars: "0.00",
            usdEquivalentPesos: null,
            combinedTotalPesos: null,
          });
        }
        const existing = monthMap.get(projection.monthKey)!;

        if (
          projection.currencyOriginal === "ARS" ||
          projection.currencyOriginal === "MIXED"
        ) {
          if (projection.amountPesosRaw) {
            try {
              const existingCents = parseArgentinePesos(existing.totalPesos);
              const addCents = parseArgentinePesos(projection.amountPesosRaw);
              const newTotal = existingCents + addCents;
              existing.totalPesos = centsToString(newTotal, "ARS");
            } catch {
              // skip invalid amounts
            }
          }
        }

        if (
          projection.currencyOriginal === "USD" ||
          projection.currencyOriginal === "MIXED"
        ) {
          if (projection.amountDollarsRaw) {
            try {
              const existingCents = parseDollars(existing.totalDollars);
              const addCents = parseDollars(projection.amountDollarsRaw);
              const newTotal = existingCents + addCents;
              existing.totalDollars = centsToString(newTotal, "USD");
            } catch {
              // skip invalid amounts
            }
          }
        }
      }

      const months = Array.from(monthMap.values()).sort((a, b) =>
        a.monthKey.localeCompare(b.monthKey),
      );

      const acceptedRows = await tx.cardStatementRow.findMany({
        where: { statementId: statement.id },
        orderBy: { displayOrder: "asc" },
      });

      return {
        statementId: statement.id,
        status: "accepted" as const,
        updatedValues: {
          months,
          rows: acceptedRows,
        },
        warnings: [] as string[],
      };
    });

    const pricing = await this.getPricing(
      null,
      null,
      result.updatedValues.months,
    );
    return {
      ...result,
      exchangeRate: pricing.exchangeRate,
      updatedValues: {
        ...result.updatedValues,
        months: pricing.months,
      },
    };
  }

  async getUpdatedValues(
    fromMonth: string,
    toMonth: string,
  ): Promise<{ exchangeRate: CardExchangeRate; months: MonthlyProjection[] }> {
    const statements = await prisma.cardStatement.findMany({
      where: {
        status: "accepted",
        isActiveForPeriod: true,
      },
      include: {
        projections: {
          where: {
            monthKey: {
              gte: fromMonth,
              lte: toMonth,
            },
          },
          orderBy: { monthKey: "asc" },
        },
        manualPurchases: true,
      },
    });

    const monthMap = new Map<string, MonthlyProjection>();

    for (const stmt of statements) {
      for (const projection of stmt.projections) {
        if (!monthMap.has(projection.monthKey)) {
          monthMap.set(projection.monthKey, {
            monthKey: projection.monthKey,
            label: projection.label,
            totalPesos: "0.00",
            totalDollars: "0.00",
            usdEquivalentPesos: null,
            combinedTotalPesos: null,
          });
        }
        const existing = monthMap.get(projection.monthKey)!;

        if (
          projection.currencyOriginal === "ARS" ||
          projection.currencyOriginal === "MIXED"
        ) {
          if (projection.amountPesosRaw) {
            try {
              const existingCents = parseArgentinePesos(existing.totalPesos);
              const addCents = parseArgentinePesos(projection.amountPesosRaw);
              const newTotal = existingCents + addCents;
              existing.totalPesos = centsToString(newTotal, "ARS");
            } catch {
              // skip invalid amounts
            }
          }
        }

        if (
          projection.currencyOriginal === "USD" ||
          projection.currencyOriginal === "MIXED"
        ) {
          if (projection.amountDollarsRaw) {
            try {
              const existingCents = parseDollars(existing.totalDollars);
              const addCents = parseDollars(projection.amountDollarsRaw);
              const newTotal = existingCents + addCents;
              existing.totalDollars = centsToString(newTotal, "USD");
            } catch {
              // skip invalid amounts
            }
          }
        }
      }
    }

    const months = Array.from(monthMap.values()).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey),
    );

    const pricing = await this.getPricing(null, null, months);

    logger.info(
      { fromMonth, toMonth, monthsCount: months.length },
      "Updated values retrieved",
    );

    return { exchangeRate: pricing.exchangeRate, months: pricing.months };
  }

  async listPendingDraftSummaries(input: {
    status?: "preview_ready" | "failed" | "all";
    limit?: number;
    offset?: number;
  }): Promise<CardStatementDraftSummary[]> {
    const { status = "all", limit = 50, offset = 0 } = input;

    // Determine which statuses to include
    const statusWhere =
      status === "all"
        ? { status: { in: ["preview_ready", "failed"] } }
        : { status };

    const take = Math.min(Math.max(Math.trunc(limit) || 50, 1), 100);
    const skip = Math.max(Math.trunc(offset) || 0, 0);

    const records = await prisma.cardStatementDraft.findMany({
      where: statusWhere,
      select: {
        id: true,
        status: true,
        createdAt: true,
        document: {
          select: { fileName: true },
        },
        aiRun: {
          select: { validationErrors: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });

    // Map to summary shape
    const summaries: CardStatementDraftSummary[] = records.map((record) => {
      let errorMessage: string | undefined;
      if (record.status === "failed" && record.aiRun?.validationErrors) {
        errorMessage = record.aiRun.validationErrors;
      }

      return {
        id: record.id,
        status: record.status as "preview_ready" | "failed",
        createdAt: record.createdAt.toISOString(),
        fileName: record.document.fileName,
        errorMessage,
      };
    });

    return summaries;
  }

  async discardDraft(draftId: string): Promise<{ ok: true; deletedId: string }> {
    // Resolve the draft first to verify it exists
    const draft = await prisma.cardStatementDraft.findUnique({
      where: { id: draftId },
      include: { document: true },
    });

    if (!draft) {
      throw new NotFoundError("Draft");
    }

    const documentId = draft.documentId;

    // Delete in a transaction: draft first (cascade removes sections/groups/rows),
    // then delete the uploaded document
    await prisma.$transaction(async (tx) => {
      // Delete the draft first (children are cascade-deleted via existing Prisma relations)
      await tx.cardStatementDraft.delete({ where: { id: draftId } });
      // Delete the uploaded document
      await tx.uploadedDocument.delete({ where: { id: documentId } });
    });

    logger.info({ draftId }, "Draft discarded");

    return { ok: true, deletedId: draftId };
  }

  async deleteStatement(statementId: string): Promise<{ success: true; deletedId: string }> {
    const statement = await prisma.cardStatement.findUnique({
      where: { id: statementId },
    });
    if (!statement) {
      throw new NotFoundError("Statement");
    }
    if (statement.status !== "accepted") {
      throw new Error(
        "Only accepted statements can be deleted via this endpoint. Use discardDraft() for drafts.",
      );
    }

    await prisma.cardStatement.delete({ where: { id: statementId } });
    logger.info({ statementId }, "Card statement hard-deleted");
    return { success: true, deletedId: statementId };
  }
}

type CardStatementDraftSummary = {
  id: string;
  status: "preview_ready" | "failed";
  createdAt: string;
  fileName: string;
  errorMessage?: string;
};

export const cardsService = new CardsService();
