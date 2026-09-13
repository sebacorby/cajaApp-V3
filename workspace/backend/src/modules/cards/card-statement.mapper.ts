import type { CardStatementPreview, CardStatementRow } from "./cards.types.js";
import type { MonthlyProjection } from "./cards.types.js";
import { centsToString, parseArgentinePesos, parseDollars } from "../../shared/money.js";

export interface DraftPrismaResult {
  id: string;
  status: string;
  previewJson: string | null;
  sections: Array<{
    id: string;
    sectionKey: string;
    label: string;
    displayOrder: number;
  }>;
  groups: Array<{
    id: string;
    groupKey: string;
    sectionKey: string;
    label: string;
    displayOrder: number;
    cardLast4: string | null;
    holderName: string | null;
  }>;
  rows: Array<{
    id: string;
    sectionKey: string;
    groupKey: string | null;
    displayOrder: number;
    sourcePage: number | null;
    rowType: string;
    editable: boolean;
    dateRaw: string | null;
    dateIso: string | null;
    markerRaw: string | null;
    referenceRaw: string | null;
    installmentRaw: string | null;
    receiptRaw: string | null;
    amountPesosRaw: string | null;
    amountDollarsRaw: string | null;
    currencyOriginal: string | null;
    originalText: string;
    confidence: number | null;
  }>;
}

export interface StatementPrismaResult {
  id: string;
  status: string;
  periodKey: string | null;
  historyKey: string | null;
  version: number;
  isActiveForPeriod: boolean;
  archivedAt: Date | null;
  archivedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  document: {
    fileName: string;
    pageCount: number | null;
  };
  bankName: string | null;
  brand: string | null;
  statementNumber: string | null;
  holderName: string | null;
  periodLabel: string | null;
  totalPesosRaw: string | null;
  totalDollarsRaw: string | null;
  minimumPaymentPesosRaw: string | null;
  currentDueDate: string | null;
  nextClosingDate: string | null;
  nextDueDate: string | null;
  sections: Array<{
    id: string;
    sectionKey: string;
    label: string;
    displayOrder: number;
  }>;
  groups: Array<{
    id: string;
    groupKey: string;
    sectionKey: string;
    label: string;
    displayOrder: number;
    cardLast4: string | null;
    holderName: string | null;
    totalPesosRaw: string | null;
    totalDollarsRaw: string | null;
  }>;
  rows: Array<{
    id: string;
    sectionKey: string;
    groupKey: string | null;
    displayOrder: number;
    sourcePage: number | null;
    rowType: string;
    editable: boolean;
    dateRaw: string | null;
    dateIso: string | null;
    markerRaw: string | null;
    referenceRaw: string | null;
    installmentRaw: string | null;
    receiptRaw: string | null;
    amountPesosRaw: string | null;
    amountDollarsRaw: string | null;
    currencyOriginal: string | null;
    originalText: string;
    confidence: number | null;
  }>;
  projections: Array<{
    id: string;
    rowId: string;
    monthKey: string;
    label: string;
    installmentCurrent: number | null;
    installmentTotal: number | null;
    amountPesosRaw: string | null;
    amountDollarsRaw: string | null;
    currencyOriginal: string | null;
  }>;
  manualPurchases: Array<{
    id: string;
    cardLast4: string;
    holderName: string;
    purchaseDate: string;
    description: string;
    currency: string;
    amountRaw: string;
    installments: number;
    notes: string | null;
    createdAt: Date;
  }>;
}

export class CardStatementMapper {
  draftToPreview(draft: DraftPrismaResult): CardStatementPreview {
    const preview = draft.previewJson
      ? JSON.parse(draft.previewJson)
      : this.draftSectionsToPreview(draft);

    return preview as CardStatementPreview;
  }

  draftToApiResponse(draft: DraftPrismaResult): {
    draftId: string;
    status: string;
    preview: CardStatementPreview;
    warnings: string[];
  } {
    const preview = this.draftToPreview(draft);
    return {
      draftId: draft.id,
      status: draft.status,
      preview,
      warnings: [],
    };
  }

  statementToApiResponse(statement: StatementPrismaResult): {
    id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    history: {
      periodKey: string | null;
      historyKey: string | null;
      version: number;
      isActiveForPeriod: boolean;
      archivedAt: string | null;
      archivedReason: string | null;
    };
    document: {
      fileName: string;
      pageCount: number;
    };
    source: {
      bankName: string | null;
      brand: string | null;
      statementNumber: string | null;
      pageCount: number;
    };
    summary: {
      totalPesos: string | null;
      totalDollars: string | null;
      minimumPaymentPesos: string | null;
      currentDueDate: string | null;
      nextClosingDate: string | null;
      nextDueDate: string | null;
    };
    sections: Array<{
      id: string;
      displayOrder: number;
      label: string;
    }>;
    groups: Array<{
      id: string;
      displayOrder: number;
      label: string;
      cardLast4: string | null;
      holderName: string | null;
    }>;
    rows: CardStatementRow[];
    projections: Array<{
      monthKey: string;
      label: string;
      totalPesos: string;
      totalDollars: string;
    }>;
    manualPurchases: Array<{
      id: string;
      cardLast4: string;
      holderName: string;
      purchaseDate: string;
      description: string;
      currency: string;
      amount: string;
      installments: number;
      notes: string | null;
      createdAt: string;
    }>;
  } {
    const sectionMap = new Map(statement.sections.map(s => [s.sectionKey, s]));
    const groupMap = new Map(statement.groups.map(g => [g.groupKey, g]));

    return {
      id: statement.id,
      status: statement.status,
      createdAt: statement.createdAt.toISOString(),
      updatedAt: statement.updatedAt.toISOString(),
      history: {
        periodKey: statement.periodKey,
        historyKey: statement.historyKey,
        version: statement.version,
        isActiveForPeriod: statement.isActiveForPeriod,
        archivedAt: statement.archivedAt?.toISOString() ?? null,
        archivedReason: statement.archivedReason,
      },
      document: {
        fileName: statement.document.fileName,
        pageCount: statement.document.pageCount ?? 0,
      },
      source: {
        bankName: statement.bankName,
        brand: statement.brand,
        statementNumber: statement.statementNumber,
        pageCount: statement.document.pageCount ?? 0,
      },
      summary: {
        totalPesos: statement.totalPesosRaw,
        totalDollars: statement.totalDollarsRaw,
        minimumPaymentPesos: statement.minimumPaymentPesosRaw,
        currentDueDate: statement.currentDueDate,
        nextClosingDate: statement.nextClosingDate,
        nextDueDate: statement.nextDueDate,
      },
      sections: statement.sections.map(s => ({
        id: s.sectionKey,
        displayOrder: s.displayOrder,
        label: s.label,
      })),
      groups: statement.groups.map(g => ({
        id: g.groupKey,
        displayOrder: g.displayOrder,
        label: g.label,
        cardLast4: g.cardLast4,
        holderName: g.holderName,
      })),
      rows: statement.rows.map(r => {
        const section = sectionMap.get(r.sectionKey);
        const group = r.groupKey ? groupMap.get(r.groupKey) : null;
        return {
          id: r.id,
          displayOrder: r.displayOrder,
          sourcePage: r.sourcePage,
          sectionId: r.sectionKey,
          sectionLabel: section?.label || "",
          groupId: r.groupKey,
          groupLabel: group?.label || null,
          groupOrder: group ? group.displayOrder : null,
          rowType: r.rowType as CardStatementRow["rowType"],
          editable: r.editable,
          dateRaw: r.dateRaw,
          dateIso: r.dateIso,
          markerRaw: r.markerRaw,
          referenceRaw: r.referenceRaw,
          installmentRaw: r.installmentRaw,
          installmentCurrent: this.parseInstallment(r.installmentRaw).current,
          installmentTotal: this.parseInstallment(r.installmentRaw).total,
          receiptRaw: r.receiptRaw,
          amountPesos: r.amountPesosRaw,
          amountDollars: r.amountDollarsRaw,
          currencyOriginal: r.currencyOriginal as CardStatementRow["currencyOriginal"],
          originalText: r.originalText,
          confidence: r.confidence,
          warnings: [],
        };
      }),
      projections: this.aggregateProjections(statement.projections),
      manualPurchases: statement.manualPurchases.map((purchase) => ({
        id: purchase.id,
        cardLast4: purchase.cardLast4,
        holderName: purchase.holderName,
        purchaseDate: purchase.purchaseDate,
        description: purchase.description,
        currency: purchase.currency,
        amount: purchase.amountRaw,
        installments: purchase.installments,
        notes: purchase.notes,
        createdAt: purchase.createdAt.toISOString(),
      })),
    };
  }

  private draftSectionsToPreview(draft: DraftPrismaResult): CardStatementPreview {
    const sectionMap = new Map(draft.sections.map(s => [s.sectionKey, s]));
    const groupMap = new Map(draft.groups.map(g => [g.groupKey, g]));

    return {
      statementId: draft.id,
      source: {
        bankName: null,
        brand: null,
        statementNumber: null,
        pageCount: 0,
      },
      summary: {
        totalPesos: null,
        totalDollars: null,
        minimumPaymentPesos: null,
        currentDueDate: null,
        nextClosingDate: null,
        nextDueDate: null,
      },
      sections: draft.sections.map(s => ({
        id: s.sectionKey,
        displayOrder: s.displayOrder,
        label: s.label,
      })),
      groups: draft.groups.map(g => ({
        id: g.groupKey,
        displayOrder: g.displayOrder,
        label: g.label,
        cardLast4: g.cardLast4,
        holderName: g.holderName,
      })),
      rows: draft.rows.map(r => {
        const section = sectionMap.get(r.sectionKey);
        const group = r.groupKey ? groupMap.get(r.groupKey) : null;
        return {
          id: r.id,
          displayOrder: r.displayOrder,
          sourcePage: r.sourcePage,
          sectionId: r.sectionKey,
          sectionLabel: section?.label || "",
          groupId: r.groupKey,
          groupLabel: group?.label || null,
          groupOrder: group ? group.displayOrder : null,
          rowType: r.rowType as CardStatementRow["rowType"],
          editable: r.editable,
          dateRaw: r.dateRaw,
          dateIso: r.dateIso,
          markerRaw: r.markerRaw,
          referenceRaw: r.referenceRaw,
          installmentRaw: r.installmentRaw,
          installmentCurrent: null,
          installmentTotal: null,
          receiptRaw: r.receiptRaw,
          amountPesos: r.amountPesosRaw,
          amountDollars: r.amountDollarsRaw,
          currencyOriginal: r.currencyOriginal as CardStatementRow["currencyOriginal"],
          originalText: r.originalText,
          confidence: r.confidence,
          warnings: [],
        };
      }),
      futureInstallmentsBlock: [],
    };
  }

  private parseInstallment(value: string | null): {
    current: number | null;
    total: number | null;
  } {
    if (!value) return { current: null, total: null };

    const match = value.match(/(\d+)\s*\/\s*(\d+)/);
    if (!match) return { current: null, total: null };

    return {
      current: Number.parseInt(match[1], 10),
      total: Number.parseInt(match[2], 10),
    };
  }

  private aggregateProjections(
    projections: Array<{
      monthKey: string;
      label: string;
      amountPesosRaw: string | null;
      amountDollarsRaw: string | null;
      currencyOriginal: string | null;
    }>
  ): Array<{ monthKey: string; label: string; totalPesos: string; totalDollars: string }> {
    const monthMap = new Map<string, { label: string; totalPesos: bigint; totalDollars: bigint }>();

    for (const p of projections) {
      if (!monthMap.has(p.monthKey)) {
        monthMap.set(p.monthKey, {
          label: p.label,
          totalPesos: 0n,
          totalDollars: 0n,
        });
      }
      const entry = monthMap.get(p.monthKey)!;

      if (p.currencyOriginal === "ARS" || p.currencyOriginal === "MIXED") {
        if (p.amountPesosRaw) {
          try {
            entry.totalPesos += parseArgentinePesos(p.amountPesosRaw);
          } catch {
            // Ignore malformed persisted values instead of corrupting the month total.
          }
        }
      }
      if (p.currencyOriginal === "USD" || p.currencyOriginal === "MIXED") {
        if (p.amountDollarsRaw) {
          try {
            entry.totalDollars += parseDollars(p.amountDollarsRaw);
          } catch {
            // Ignore malformed persisted values instead of corrupting the month total.
          }
        }
      }
    }

    return Array.from(monthMap.entries())
      .map(([monthKey, data]) => ({
        monthKey,
        label: data.label,
        totalPesos: centsToString(data.totalPesos, "ARS"),
        totalDollars: centsToString(data.totalDollars, "USD"),
      }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }

}

export const cardStatementMapper = new CardStatementMapper();
