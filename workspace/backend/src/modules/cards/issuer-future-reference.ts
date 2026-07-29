import { randomUUID } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import type {
  CardStatementPreview,
  CardStatementRow,
  CurrencyOriginal,
} from "./cards.types.js";

export type IssuerFuturePeriodBasis =
  | "unknown"
  | "next_statement_sequence"
  | "explicit_future_month";

export interface NormalizedIssuerFutureReference {
  id: string;
  sourceRowId: string;
  displayOrder: number;
  sourceLabel: string | null;
  sourcePage: number | null;
  periodLabelRaw: string;
  issuerPeriodKey: string | null;
  targetPaymentMonthKey: string | null;
  periodBasis: IssuerFuturePeriodBasis;
  amountPesosRaw: string | null;
  amountDollarsRaw: string | null;
  currencyOriginal: CurrencyOriginal;
  originalText: string;
  confidence: number | null;
}

const MONTH_BY_TOKEN: Record<string, number> = {
  enero: 1,
  ene: 1,
  febrero: 2,
  feb: 2,
  marzo: 3,
  mar: 3,
  abril: 4,
  abr: 4,
  mayo: 5,
  may: 5,
  junio: 6,
  jun: 6,
  julio: 7,
  jul: 7,
  agosto: 8,
  ago: 8,
  septiembre: 9,
  setiembre: 9,
  sept: 9,
  sep: 9,
  set: 9,
  octubre: 10,
  oct: 10,
  noviembre: 11,
  nov: 11,
  diciembre: 12,
  dic: 12,
};

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

function normalizeYear(rawYear: string): number | null {
  const numeric = Number.parseInt(rawYear, 10);
  if (!Number.isFinite(numeric)) return null;
  if (rawYear.length === 2) return 2000 + numeric;
  return numeric >= 1900 && numeric <= 2200 ? numeric : null;
}

function monthKeyWithOffset(monthKey: string, offset: number): string {
  const [yearText, monthText] = monthKey.split("-");
  const absolute = Number(yearText) * 12 + Number(monthText) - 1 + offset;
  return `${Math.floor(absolute / 12)}-${String((absolute % 12) + 1).padStart(2, "0")}`;
}

export async function ensureIssuerFutureReferenceStorage(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CardIssuerFutureReference" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "statementId" TEXT NOT NULL,
      "sourceRowId" TEXT NOT NULL,
      "displayOrder" INTEGER NOT NULL,
      "sourceLabel" TEXT,
      "sourcePage" INTEGER,
      "periodLabelRaw" TEXT NOT NULL,
      "issuerPeriodKey" TEXT,
      "targetPaymentMonthKey" TEXT,
      "periodBasis" TEXT NOT NULL DEFAULT 'unknown',
      "amountPesosRaw" TEXT,
      "amountDollarsRaw" TEXT,
      "currencyOriginal" TEXT NOT NULL DEFAULT 'UNKNOWN',
      "originalText" TEXT NOT NULL,
      "confidence" REAL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CardIssuerFutureReference_statementId_fkey"
        FOREIGN KEY ("statementId") REFERENCES "CardStatement" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "CardIssuerFutureReference_statementId_idx"
      ON "CardIssuerFutureReference"("statementId")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "CardIssuerFutureReference_statementId_issuerPeriodKey_idx"
      ON "CardIssuerFutureReference"("statementId", "issuerPeriodKey")
  `);
}

export function parseIssuerPeriodLabel(
  value: string | null | undefined,
): { periodLabelRaw: string; issuerPeriodKey: string } | null {
  const text = value?.trim();
  if (!text) return null;

  const namedMatch = text.match(
    /\b(enero|ene|febrero|feb|marzo|mar|abril|abr|mayo|may|junio|jun|julio|jul|agosto|ago|septiembre|setiembre|sept|sep|set|octubre|oct|noviembre|nov|diciembre|dic)\s*[-/.]?\s*(\d{2}|\d{4})\b/i,
  );
  if (namedMatch) {
    const month = MONTH_BY_TOKEN[normalizeToken(namedMatch[1])];
    const year = normalizeYear(namedMatch[2]);
    if (month && year) {
      return {
        periodLabelRaw: namedMatch[0],
        issuerPeriodKey: `${year}-${String(month).padStart(2, "0")}`,
      };
    }
  }

  const numericMatch = text.match(/\b(0?[1-9]|1[0-2])\s*[-/]\s*(\d{2}|\d{4})\b/);
  if (numericMatch) {
    const month = Number.parseInt(numericMatch[1], 10);
    const year = normalizeYear(numericMatch[2]);
    if (year) {
      return {
        periodLabelRaw: numericMatch[0],
        issuerPeriodKey: `${year}-${String(month).padStart(2, "0")}`,
      };
    }
  }

  return null;
}

function deriveCurrency(row: CardStatementRow): CurrencyOriginal {
  if (row.currencyOriginal && row.currencyOriginal !== "UNKNOWN") {
    return row.currencyOriginal;
  }
  if (row.amountPesos && row.amountDollars) return "MIXED";
  if (row.amountPesos) return "ARS";
  if (row.amountDollars) return "USD";
  return "UNKNOWN";
}

function normalizeFutureRow(
  row: CardStatementRow,
): NormalizedIssuerFutureReference | null {
  if (row.rowType !== "future_installment_reference") return null;
  if (!row.amountPesos && !row.amountDollars) return null;

  const period =
    parseIssuerPeriodLabel(row.referenceRaw) ??
    parseIssuerPeriodLabel(row.dateRaw) ??
    parseIssuerPeriodLabel(row.originalText);

  const fallbackLabel =
    row.referenceRaw?.trim() || row.dateRaw?.trim() || row.originalText.trim();

  if (!fallbackLabel) return null;

  return {
    id: randomUUID(),
    sourceRowId: row.id,
    displayOrder: row.displayOrder,
    sourceLabel: row.sectionLabel?.trim() || null,
    sourcePage: row.sourcePage,
    periodLabelRaw: period?.periodLabelRaw ?? fallbackLabel,
    issuerPeriodKey: period?.issuerPeriodKey ?? null,
    targetPaymentMonthKey: null,
    periodBasis: "unknown",
    amountPesosRaw: row.amountPesos,
    amountDollarsRaw: row.amountDollars,
    currencyOriginal: deriveCurrency(row),
    originalText: row.originalText,
    confidence: row.confidence,
  };
}

export function normalizeIssuerFutureReferences(
  preview: Pick<CardStatementPreview, "futureInstallmentsBlock">,
): NormalizedIssuerFutureReference[] {
  return preview.futureInstallmentsBlock
    .map(normalizeFutureRow)
    .filter((item): item is NormalizedIssuerFutureReference => item !== null)
    .sort((left, right) => left.displayOrder - right.displayOrder);
}

export function resolveIssuerReferenceTargets(
  references: NormalizedIssuerFutureReference[],
  statementPeriodKey: string | null,
): NormalizedIssuerFutureReference[] {
  if (!statementPeriodKey || references.length === 0) return references;

  const keyed = references.filter((reference) => reference.issuerPeriodKey);
  const firstKey = keyed[0]?.issuerPeriodKey ?? null;
  if (!firstKey) return references;

  let offset: number | null = null;
  let basis: IssuerFuturePeriodBasis = "unknown";

  if (firstKey === statementPeriodKey) {
    offset = 1;
    basis = "next_statement_sequence";
  } else if (firstKey === monthKeyWithOffset(statementPeriodKey, 1)) {
    offset = 0;
    basis = "explicit_future_month";
  }

  if (offset === null) return references;

  return references.map((reference) => ({
    ...reference,
    targetPaymentMonthKey: reference.issuerPeriodKey
      ? monthKeyWithOffset(reference.issuerPeriodKey, offset)
      : null,
    periodBasis: reference.issuerPeriodKey ? basis : "unknown",
  }));
}

export async function persistIssuerFutureReferences(
  statementId: string,
  preview: Pick<CardStatementPreview, "futureInstallmentsBlock">,
): Promise<{ persisted: number; references: NormalizedIssuerFutureReference[] }> {
  await ensureIssuerFutureReferenceStorage();

  const statement = await prisma.cardStatement.findUnique({
    where: { id: statementId },
    select: { periodKey: true },
  });
  const references = resolveIssuerReferenceTargets(
    normalizeIssuerFutureReferences(preview),
    statement?.periodKey ?? null,
  );

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`DELETE FROM "CardIssuerFutureReference" WHERE "statementId" = ${statementId}`;

    for (const reference of references) {
      await tx.$executeRaw`
        INSERT INTO "CardIssuerFutureReference" (
          "id",
          "statementId",
          "sourceRowId",
          "displayOrder",
          "sourceLabel",
          "sourcePage",
          "periodLabelRaw",
          "issuerPeriodKey",
          "targetPaymentMonthKey",
          "periodBasis",
          "amountPesosRaw",
          "amountDollarsRaw",
          "currencyOriginal",
          "originalText",
          "confidence"
        ) VALUES (
          ${reference.id},
          ${statementId},
          ${reference.sourceRowId},
          ${reference.displayOrder},
          ${reference.sourceLabel},
          ${reference.sourcePage},
          ${reference.periodLabelRaw},
          ${reference.issuerPeriodKey},
          ${reference.targetPaymentMonthKey},
          ${reference.periodBasis},
          ${reference.amountPesosRaw},
          ${reference.amountDollarsRaw},
          ${reference.currencyOriginal},
          ${reference.originalText},
          ${reference.confidence}
        )
      `;
    }
  });

  return { persisted: references.length, references };
}
