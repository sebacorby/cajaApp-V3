import type {
  CardStatementGroup,
  CardStatementPreview,
  CardStatementRow,
  CardStatementRowType,
} from "../cards/cards.types.js";
import type {
  CardStatementParseDiagnostics,
  CardStatementParseResult,
  ParserDiagnosticLine,
} from "./card-statement-parser.types.js";
import { StatementParseCompletenessError } from "./card-statement-parser.types.js";

type RawLine = {
  pageNumber: number;
  lineNumber: number;
  text: string;
};

type RawPage = {
  pageNumber: number;
  lines: RawLine[];
};

const MONTHS: Record<string, string> = {
  ene: "01",
  feb: "02",
  mar: "03",
  abr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  sep: "09",
  set: "09",
  oct: "10",
  nov: "11",
  dic: "12",
};

const MONEY = "-?\\d{1,3}(?:\\.\\d{3})*,\\d{2}|-?\\d+,\\d{2}";
const TRANSACTION_DATE = "\\d{1,2}-[A-Za-zÁÉÍÓÚáéíóú]{3}-\\d{2}";
const installmentPattern = /\b(\d{1,2})\s*\/\s*(\d{1,2})\b/;

function normalizeLine(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function splitPages(rawText: string): RawPage[] {
  const marker = /--- PAGE (\d+) \/ \d+ ---\n([\s\S]*?)(?=\n--- PAGE \d+ \/ \d+ ---|$)/g;
  const pages: RawPage[] = [];
  let match: RegExpExecArray | null;
  while ((match = marker.exec(rawText)) !== null) {
    const pageNumber = Number(match[1]);
    const lines = match[2]
      .split(/\r?\n/)
      .map(normalizeLine)
      .map((text, index) => ({ pageNumber, lineNumber: index + 1, text }))
      .filter((line) => line.text.length > 0);
    pages.push({ pageNumber, lines });
  }

  if (pages.length === 0) {
    const lines = rawText
      .split(/\r?\n/)
      .map(normalizeLine)
      .map((text, index) => ({ pageNumber: 1, lineNumber: index + 1, text }))
      .filter((line) => line.text.length > 0);
    pages.push({ pageNumber: 1, lines });
  }
  return pages;
}

function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{1,2})-([A-Za-zÁÉÍÓÚáéíóú]{3})-(\d{2})$/i.exec(value.trim());
  if (!match) return null;
  const month = MONTHS[match[2].toLocaleLowerCase("es")];
  if (!month) return null;
  const year = Number(match[3]) + 2000;
  return `${year.toString().padStart(4, "0")}-${month}-${match[1].padStart(2, "0")}`;
}

function normalizeAmount(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/\s+/g, "").trim();
}

function parseInstallment(text: string): {
  raw: string | null;
  current: number | null;
  total: number | null;
} {
  const match = installmentPattern.exec(text);
  if (!match) return { raw: null, current: null, total: null };
  return {
    raw: `${Number(match[1]).toString().padStart(2, "0")}/${Number(match[2]).toString().padStart(2, "0")}`,
    current: Number(match[1]),
    total: Number(match[2]),
  };
}

function rowId(prefix: string, order: number): string {
  return `${prefix}-${order.toString().padStart(4, "0")}`;
}

function createRow(input: {
  order: number;
  sourcePage: number | null;
  sectionId: string;
  sectionLabel: string;
  group?: CardStatementGroup | null;
  rowType: CardStatementRowType;
  dateRaw?: string | null;
  referenceRaw?: string | null;
  installmentRaw?: string | null;
  installmentCurrent?: number | null;
  installmentTotal?: number | null;
  receiptRaw?: string | null;
  amountPesos?: string | null;
  amountDollars?: string | null;
  originalText: string;
  warnings?: string[];
}): CardStatementRow {
  const amountPesos = normalizeAmount(input.amountPesos);
  const amountDollars = normalizeAmount(input.amountDollars);
  return {
    id: rowId(input.rowType, input.order),
    displayOrder: input.order,
    sourcePage: input.sourcePage,
    sectionId: input.sectionId,
    sectionLabel: input.sectionLabel,
    groupId: input.group?.id ?? null,
    groupLabel: input.group?.label ?? null,
    groupOrder: input.group?.displayOrder ?? null,
    rowType: input.rowType,
    editable: input.rowType === "transaction",
    dateRaw: input.dateRaw ?? null,
    dateIso: parseDate(input.dateRaw ?? undefined),
    markerRaw: null,
    referenceRaw: input.referenceRaw ?? null,
    installmentRaw: input.installmentRaw ?? null,
    installmentCurrent: input.installmentCurrent ?? null,
    installmentTotal: input.installmentTotal ?? null,
    receiptRaw: input.receiptRaw ?? null,
    amountPesos,
    amountDollars,
    currencyOriginal:
      amountPesos && amountDollars
        ? "MIXED"
        : amountDollars
          ? "USD"
          : amountPesos
            ? "ARS"
            : "UNKNOWN",
    originalText: input.originalText,
    confidence: 1,
    warnings: input.warnings ?? [],
  };
}

function extractSummary(lines: RawLine[]) {
  const text = lines.map((line) => line.text).join("\n");
  const statementNumber = /Resumen\s+N[°º]?\s*([0-9]+)/i.exec(text)?.[1] ?? null;
  const brand = /Tarjeta\s+Cr[eé]dito\s+(.+)/i.exec(text)?.[1]?.trim() ?? "MASTERCARD BLACK";

  const totalMatch = /TOTAL A PAGAR\s+(-?[\d.]+,\d{2})(?:\s+(-?[\d.]+,\d{2}))?/i.exec(text);
  const minimumMatch = /PAGO MINIMO[\s\S]{0,80}?\$\s*([\d.]+,\d{2})/i.exec(text);
  const sixDates = new RegExp(
    `(${TRANSACTION_DATE})\\s+(${TRANSACTION_DATE})\\s+(${TRANSACTION_DATE})\\s+(${TRANSACTION_DATE})\\s+(${TRANSACTION_DATE})\\s+(${TRANSACTION_DATE})`,
    "i",
  ).exec(text);

  return {
    statementNumber,
    brand,
    totalPesos: normalizeAmount(totalMatch?.[1]),
    totalDollars: normalizeAmount(totalMatch?.[2]),
    minimumPaymentPesos: normalizeAmount(minimumMatch?.[1]),
    currentDueDate: parseDate(sixDates?.[4]),
    nextClosingDate: parseDate(sixDates?.[5]),
    nextDueDate: parseDate(sixDates?.[6]),
  };
}

function parseTransactionLine(
  line: RawLine,
  order: number,
  group: CardStatementGroup,
): CardStatementRow | null {
  const dateMatch = new RegExp(`^(${TRANSACTION_DATE})\\s+(.+)$`, "i").exec(line.text);
  if (!dateMatch) return null;

  const dateRaw = dateMatch[1];
  let rest = dateMatch[2].trim();
  const amounts: string[] = [];
  const trailingMoney = new RegExp(`(?:^|\\s)(${MONEY})\\s*$`);
  while (amounts.length < 2) {
    const match = trailingMoney.exec(rest);
    if (!match) break;
    amounts.unshift(match[1]);
    rest = rest.slice(0, match.index).trim();
  }
  if (amounts.length === 0) return null;

  const installment = parseInstallment(rest);
  if (installment.raw) {
    rest = rest.replace(installmentPattern, " ").replace(/\s+/g, " ").trim();
  }

  let receiptRaw: string | null = null;
  const receiptMatches = [...rest.matchAll(/\b(\d{4,6})\b/g)];
  if (receiptMatches.length > 0) {
    const last = receiptMatches[receiptMatches.length - 1];
    const candidate = last[1];
    if (last.index !== undefined && last.index + candidate.length >= rest.length - 1) {
      receiptRaw = candidate;
      rest = rest.slice(0, last.index).trim();
    }
  }

  const referenceRaw = rest.trim() || null;
  const isInterest = /\bINTERESES\b/i.test(referenceRaw ?? "");
  const rowType: CardStatementRowType = isInterest ? "charge" : "transaction";

  return createRow({
    order,
    sourcePage: line.pageNumber,
    sectionId: "detail",
    sectionLabel: "Detalle del consumo",
    group,
    rowType,
    dateRaw,
    referenceRaw,
    installmentRaw: installment.raw,
    installmentCurrent: installment.current,
    installmentTotal: installment.total,
    receiptRaw,
    amountPesos: amounts[0] ?? null,
    amountDollars: amounts[1] ?? null,
    originalText: line.text,
  });
}

function parseNamedCharge(line: RawLine, order: number): CardStatementRow | null {
  const match = new RegExp(`^(IMPUESTO DE SELLOS|I\\.V\\.A\\.[^0-9]*[0-9.,% ]*)\\s+(${MONEY})$`, "i").exec(line.text);
  if (!match) return null;
  return createRow({
    order,
    sourcePage: line.pageNumber,
    sectionId: "summary",
    sectionLabel: "Resumen",
    rowType: "tax",
    referenceRaw: match[1].trim(),
    amountPesos: match[2],
    originalText: line.text,
  });
}

function parseStatementTotal(line: RawLine, order: number): CardStatementRow | null {
  const match = new RegExp(`^TOTAL A PAGAR\\s+(${MONEY})(?:\\s+(${MONEY}))?$`, "i").exec(line.text);
  if (!match) return null;
  return createRow({
    order,
    sourcePage: line.pageNumber,
    sectionId: "summary",
    sectionLabel: "Resumen",
    rowType: "statement_total",
    referenceRaw: "TOTAL A PAGAR",
    amountPesos: match[1],
    amountDollars: match[2] ?? null,
    originalText: line.text,
  });
}

function parseGroupTotal(line: RawLine, order: number): CardStatementRow | null {
  const match = new RegExp(`^(SUBTOTAL|TOTAL ADICIONAL DE .+?)\\s+(${MONEY})(?:\\s+(${MONEY}))?$`, "i").exec(line.text);
  if (!match) return null;
  return createRow({
    order,
    sourcePage: line.pageNumber,
    sectionId: "detail",
    sectionLabel: "Detalle del consumo",
    rowType: "group_total",
    referenceRaw: match[1].trim(),
    amountPesos: match[2],
    amountDollars: match[3] ?? null,
    originalText: line.text,
  });
}

function parseFutureInstallments(pages: RawPage[], startOrder: number): CardStatementRow[] {
  const flat = pages.flatMap((page) => page.lines);
  const headerIndex = flat.findIndex((line) => /^Cuotas a vencer$/i.test(line.text));
  if (headerIndex < 0) return [];
  const monthsLine = flat.slice(headerIndex + 1).find((line) => /[A-Za-z]+-\d{2}/.test(line.text));
  if (!monthsLine) return [];
  const amountsLine = flat
    .slice(flat.indexOf(monthsLine) + 1)
    .find((line) => /\$\s*[\d.]+,\d{2}/.test(line.text));
  if (!amountsLine) return [];

  const months = [...monthsLine.text.matchAll(/([A-Za-zÁÉÍÓÚáéíóú]+)-(\d{2})/g)].map((match) => `${match[1]}-${match[2]}`);
  const amounts = [...amountsLine.text.matchAll(/\$\s*(-?[\d.]+,\d{2})/g)].map((match) => match[1]);
  return months.slice(0, amounts.length).map((month, index) =>
    createRow({
      order: startOrder + index,
      sourcePage: amountsLine.pageNumber,
      sectionId: "future-installments",
      sectionLabel: "Cuotas a vencer",
      rowType: "future_installment_reference",
      referenceRaw: month,
      amountPesos: amounts[index],
      originalText: `${month} $ ${amounts[index]}`,
    }),
  );
}

export function isGaliciaMastercardStatement(rawText: string): boolean {
  const normalized = normalizeLine(rawText).toLocaleUpperCase("es");
  return (
    normalized.includes("MASTERCARD") &&
    normalized.includes("TOTAL A PAGAR") &&
    normalized.includes("DETALLE DEL CONSUMO") &&
    normalized.includes("FECHA REFERENCIA COMPROBANTE PESOS DÓLARES")
  );
}

export function parseGaliciaMastercardStatement(
  rawText: string,
  pageCount: number,
): CardStatementParseResult {
  const startedAt = Date.now();
  const pages = splitPages(rawText);
  const flat = pages.flatMap((page) => page.lines);
  const summary = extractSummary(flat);
  const holderMatch = flat
    .map((line) => line.text)
    .map((text) => /^(.+?)\s+CONSUMIDOR FINAL\b/i.exec(text))
    .find(Boolean);
  const holderName = holderMatch?.[1]?.trim() ?? null;

  const group: CardStatementGroup = {
    id: "mastercard-black",
    displayOrder: 1,
    label: summary.brand ?? "MASTERCARD BLACK",
    cardLast4: null,
    holderName,
  };

  const rows: CardStatementRow[] = [];
  const unexplainedTransactionLines: ParserDiagnosticLine[] = [];
  let candidateTransactionLines = 0;
  let parsedTransactionLines = 0;
  let order = 1;
  let inDetail = false;
  let stopFinancialDetail = false;

  for (const line of flat) {
    if (/^DETALLE DEL CONSUMO$/i.test(line.text)) {
      inDetail = true;
      stopFinancialDetail = false;
      continue;
    }
    if (/^OPCIONES DE FINANCIACION$/i.test(line.text)) {
      stopFinancialDetail = true;
      inDetail = false;
      continue;
    }
    if (/^Cuotas a vencer$/i.test(line.text)) {
      inDetail = false;
      continue;
    }

    if (inDetail && !stopFinancialDetail && new RegExp(`^${TRANSACTION_DATE}\\b`, "i").test(line.text)) {
      candidateTransactionLines += 1;
      const parsed = parseTransactionLine(line, order, group);
      if (parsed) {
        rows.push(parsed);
        order += 1;
        parsedTransactionLines += 1;
      } else {
        unexplainedTransactionLines.push({
          pageNumber: line.pageNumber,
          lineNumber: line.lineNumber,
          text: line.text,
          reason: "dated_detail_line_not_parsed",
        });
      }
      continue;
    }

    const charge = parseNamedCharge(line, order);
    if (charge) {
      rows.push(charge);
      order += 1;
      continue;
    }

    const groupTotal = parseGroupTotal(line, order);
    if (groupTotal) {
      rows.push(groupTotal);
      order += 1;
      continue;
    }

    const statementTotal = parseStatementTotal(line, order);
    if (statementTotal) {
      rows.push(statementTotal);
      order += 1;
      continue;
    }
  }

  const futureInstallmentsBlock = parseFutureInstallments(pages, order);
  const diagnostics: CardStatementParseDiagnostics = {
    layout: "galicia-mastercard",
    sourcePageCount: pageCount || pages.length,
    sourceLineCount: flat.length,
    candidateTransactionLines,
    parsedTransactionLines,
    unexplainedTransactionLines,
    parsedRows: rows.length,
    futureReferenceRows: futureInstallmentsBlock.length,
    warnings: [],
    durationMs: Date.now() - startedAt,
  };

  if (!summary.totalPesos) diagnostics.warnings.push("statement_total_not_found");
  if (!summary.currentDueDate) diagnostics.warnings.push("current_due_date_not_found");
  if (futureInstallmentsBlock.length === 0) diagnostics.warnings.push("future_installments_reference_not_found");

  const preview: CardStatementPreview = {
    statementId: null,
    source: {
      bankName: "Banco Galicia",
      brand: summary.brand,
      statementNumber: summary.statementNumber,
      pageCount: pageCount || pages.length,
    },
    summary: {
      totalPesos: summary.totalPesos,
      totalDollars: summary.totalDollars,
      minimumPaymentPesos: summary.minimumPaymentPesos,
      currentDueDate: summary.currentDueDate,
      nextClosingDate: summary.nextClosingDate,
      nextDueDate: summary.nextDueDate,
    },
    sections: [
      { id: "summary", displayOrder: 1, label: "Resumen" },
      { id: "detail", displayOrder: 2, label: "Detalle del consumo" },
      { id: "future-installments", displayOrder: 3, label: "Cuotas a vencer" },
    ],
    groups: [group],
    rows,
    futureInstallmentsBlock,
  };

  if (unexplainedTransactionLines.length > 0) {
    throw new StatementParseCompletenessError(diagnostics);
  }

  return { preview, diagnostics };
}
