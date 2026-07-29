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

const MONEY = "-?\\d{1,3}(?:\\.\\d{3})*,\\d{2}|-?\\d+,\\d{2}";
const NUMERIC_DATE = "\\d{1,2}-\\d{1,2}-\\d{2}";
const TEXT_DATE = "\\d{1,2}-[A-Za-zÁÉÍÓÚáéíóú]{3}-\\d{2}";
const installmentSlashPattern = /\b(\d{1,2})\s*\/\s*(\d{1,2})\b/;
const planVInstallmentPattern = /\bPLAN\s+V\s+(\d{1,2})\s*-\s*(\d{1,2})\b/i;

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

function parseNumericDate(value: string | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{1,2})-(\d{1,2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]) + 2000;
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function parseTextDate(value: string | undefined): string | null {
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
  return value.replace(/\s+/g, "").replace(/^\$/, "").trim();
}

function parseInstallment(text: string): {
  raw: string | null;
  current: number | null;
  total: number | null;
  cleanedText: string;
} {
  const slashMatch = installmentSlashPattern.exec(text);
  if (slashMatch) {
    const current = Number(slashMatch[1]);
    const total = Number(slashMatch[2]);
    return {
      raw: `${current.toString().padStart(2, "0")}/${total.toString().padStart(2, "0")}`,
      current,
      total,
      cleanedText: text.replace(installmentSlashPattern, " ").replace(/\s+/g, " ").trim(),
    };
  }

  const planMatch = planVInstallmentPattern.exec(text);
  if (planMatch) {
    const current = Number(planMatch[1]);
    const total = Number(planMatch[2]);
    return {
      raw: `${current.toString().padStart(2, "0")}/${total.toString().padStart(2, "0")}`,
      current,
      total,
      cleanedText: text
        .replace(/(PLAN\s+V\s+)\d{1,2}\s*-\s*\d{1,2}/i, `$1${current.toString().padStart(2, "0")}/${total.toString().padStart(2, "0")}`)
        .replace(/\s+/g, " ")
        .trim(),
    };
  }

  return { raw: null, current: null, total: null, cleanedText: text };
}

function rowId(prefix: string, order: number): string {
  return `visa-${prefix}-${order.toString().padStart(4, "0")}`;
}

function createRow(input: {
  order: number;
  sourcePage: number | null;
  sectionId: string;
  sectionLabel: string;
  group?: CardStatementGroup | null;
  rowType: CardStatementRowType;
  dateRaw?: string | null;
  markerRaw?: string | null;
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
    dateIso: parseNumericDate(input.dateRaw ?? undefined),
    markerRaw: input.markerRaw ?? null,
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

function assignGroup(row: CardStatementRow, group: CardStatementGroup): void {
  row.groupId = group.id;
  row.groupLabel = group.label;
  row.groupOrder = group.displayOrder;
}

function extractSummary(lines: RawLine[]) {
  const text = lines.map((line) => line.text).join("\n");
  const statementNumber = /Resumen\s+N[°º]?\s*(VI[0-9]+)/i.exec(text)?.[1] ?? null;
  const totalMatch = /TOTAL A PAGAR\s+(-?[\d.]+,\d{2})(?:\s+(-?[\d.]+,\d{2}))?/i.exec(text);
  const minimumMatch = /PAGO MINIMO[\s\S]{0,120}?\$\s*([\d.]+,\d{2})/i.exec(text);
  const sixDates = new RegExp(
    `(${TEXT_DATE})\\s+(${TEXT_DATE})\\s+(${TEXT_DATE})\\s+(${TEXT_DATE})\\s+(${TEXT_DATE})\\s+(${TEXT_DATE})`,
    "i",
  ).exec(text);

  return {
    statementNumber,
    totalPesos: normalizeAmount(totalMatch?.[1]),
    totalDollars: normalizeAmount(totalMatch?.[2]),
    minimumPaymentPesos: normalizeAmount(minimumMatch?.[1]),
    currentDueDate: parseTextDate(sixDates?.[4]),
    nextClosingDate: parseTextDate(sixDates?.[5]),
    nextDueDate: parseTextDate(sixDates?.[6]),
  };
}

function parseConsolidatedLine(line: RawLine, order: number): CardStatementRow | null {
  const saldo = new RegExp(`^SALDO ANTERIOR\\s+(${MONEY})(?:\\s+(${MONEY}))?$`, "i").exec(line.text);
  if (saldo) {
    return createRow({
      order,
      sourcePage: line.pageNumber,
      sectionId: "summary",
      sectionLabel: "Resumen",
      rowType: "consolidated_row",
      referenceRaw: "SALDO ANTERIOR",
      amountPesos: saldo[1],
      amountDollars: saldo[2] ?? null,
      originalText: line.text,
    });
  }

  const payment = new RegExp(`^(${NUMERIC_DATE})\\s+SU PAGO EN (PESOS|USD)\\s+(${MONEY})$`, "i").exec(line.text);
  if (!payment) return null;
  const isUsd = payment[2].toUpperCase() === "USD";
  return createRow({
    order,
    sourcePage: line.pageNumber,
    sectionId: "summary",
    sectionLabel: "Resumen",
    rowType: "consolidated_row",
    dateRaw: payment[1],
    referenceRaw: `SU PAGO EN ${payment[2].toUpperCase()}`,
    amountPesos: isUsd ? null : payment[3],
    amountDollars: isUsd ? payment[3] : null,
    originalText: line.text,
  });
}

function parseGroupTotal(
  line: RawLine,
  order: number,
  groupOrder: number,
): { group: CardStatementGroup; row: CardStatementRow } | null {
  const match = new RegExp(
    `^TARJETA\\s+(\\d{4})\\s+Total Consumos de\\s+(.+?)\\s+(${MONEY})(?:\\s+(${MONEY}))?$`,
    "i",
  ).exec(line.text);
  if (!match) return null;

  const group: CardStatementGroup = {
    id: `visa-card-${match[1]}`,
    displayOrder: groupOrder,
    label: `TARJETA ${match[1]} · ${match[2].trim()}`,
    cardLast4: match[1],
    holderName: match[2].trim(),
  };

  const row = createRow({
    order,
    sourcePage: line.pageNumber,
    sectionId: "detail",
    sectionLabel: "Detalle del consumo",
    group,
    rowType: "group_total",
    referenceRaw: `Total Consumos de ${match[2].trim()}`,
    amountPesos: match[3],
    amountDollars: match[4] ?? null,
    originalText: line.text,
  });

  return { group, row };
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

function parseDatedFinancialLine(line: RawLine, order: number): CardStatementRow | null {
  const dateMatch = new RegExp(`^(${NUMERIC_DATE})\\s+(.+)$`, "i").exec(line.text);
  if (!dateMatch) return null;

  const dateRaw = dateMatch[1];
  let rest = dateMatch[2].trim();
  let markerRaw: string | null = null;
  const markerMatch = /^([*K])\s+(.+)$/i.exec(rest);
  if (markerMatch) {
    markerRaw = markerMatch[1];
    rest = markerMatch[2].trim();
  }

  const ivaPlanMatch = new RegExp(
    `^DB IVA \\$\\s+PLAN\\s+V\\s+(\\d{4,6})\\s+(${MONEY})\\s+(${MONEY})$`,
    "i",
  ).exec(rest);
  if (ivaPlanMatch) {
    return createRow({
      order,
      sourcePage: line.pageNumber,
      sectionId: "detail",
      sectionLabel: "Detalle del consumo",
      rowType: "tax",
      dateRaw,
      markerRaw,
      referenceRaw: `DB IVA $ PLAN V (base ${ivaPlanMatch[2]})`,
      receiptRaw: ivaPlanMatch[1],
      amountPesos: ivaPlanMatch[3],
      originalText: line.text,
    });
  }

  const amounts: string[] = [];
  const trailingMoney = new RegExp(`(?:^|\\s)(${MONEY})\\s*$`);
  while (amounts.length < 2) {
    const match = trailingMoney.exec(rest);
    if (!match) break;
    amounts.unshift(match[1]);
    rest = rest.slice(0, match.index).trim();
  }
  if (amounts.length === 0) return null;

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

  const installment = parseInstallment(rest);
  rest = installment.cleanedText;

  const referenceRaw = rest.trim() || null;
  const isTax = /\bIVA\b|IMPUESTO DE SELLOS|DB IVA/i.test(referenceRaw ?? "");
  const isCharge = /COM MANT|BONI MANT/i.test(referenceRaw ?? "");
  const isUsd = /\bUSD\b|D[ÓO]LAR/i.test(referenceRaw ?? "");
  const rowType: CardStatementRowType = isTax ? "tax" : isCharge ? "charge" : "transaction";

  let amountPesos: string | null = null;
  let amountDollars: string | null = null;
  if (amounts.length >= 2) {
    amountPesos = amounts[0];
    amountDollars = amounts[1];
  } else if (isUsd) {
    amountDollars = amounts[0];
  } else {
    amountPesos = amounts[0];
  }

  return createRow({
    order,
    sourcePage: line.pageNumber,
    sectionId: "detail",
    sectionLabel: "Detalle del consumo",
    rowType,
    dateRaw,
    markerRaw,
    referenceRaw,
    installmentRaw: installment.raw,
    installmentCurrent: installment.current,
    installmentTotal: installment.total,
    receiptRaw,
    amountPesos,
    amountDollars,
    originalText: line.text,
  });
}

function parseFutureInstallments(pages: RawPage[], startOrder: number): CardStatementRow[] {
  const flat = pages.flatMap((page) => page.lines);
  const headerIndex = flat.findIndex((line) => /^Cuotas a vencer:?$/i.test(line.text));
  if (headerIndex < 0) return [];

  const monthsLine = flat
    .slice(headerIndex + 1)
    .find((line) => /(?:Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Setiembre|Septiembre|Octubre|Noviembre|Diciembre)[\/-]\d{2}/i.test(line.text));
  if (!monthsLine) return [];

  const monthsIndex = flat.indexOf(monthsLine);
  const amountsLine = flat
    .slice(monthsIndex + 1)
    .find((line) => /\$\s*-?[\d.]+,\d{2}/.test(line.text));
  if (!amountsLine) return [];

  const months = [
    ...monthsLine.text.matchAll(
      /(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Setiembre|Septiembre|Octubre|Noviembre|Diciembre)[\/-](\d{2})/gi,
    ),
  ].map((match) => `${match[1]}/${match[2]}`);
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

export function isGaliciaVisaStatement(rawText: string): boolean {
  const normalized = rawText.normalize("NFKC");
  return (
    /Resumen de tarjeta de credito VISA/i.test(normalized) &&
    /Tarjeta Cr[eé]dito VISA/i.test(normalized) &&
    /FECHA REFERENCIA CUOTA COMPROBANTE PESOS D[ÓO]LARES/i.test(normalized)
  );
}

export function parseGaliciaVisaStatement(
  rawText: string,
  pageCount: number,
): CardStatementParseResult {
  const startedAt = Date.now();
  const pages = splitPages(rawText);
  const flat = pages.flatMap((page) => page.lines);
  const summary = extractSummary(flat);
  const groups: CardStatementGroup[] = [];
  const rows: CardStatementRow[] = [];
  const unexplained: ParserDiagnosticLine[] = [];
  let order = 1;
  let candidateTransactionLines = 0;
  let parsedTransactionLines = 0;
  let pendingGroupRows: CardStatementRow[] = [];

  for (const page of pages) {
    let inDetail = false;

    for (const line of page.lines) {
      if (/^DETALLE DEL CONSUMO:?$/i.test(line.text)) {
        inDetail = true;
        continue;
      }
      if (/^FECHA REFERENCIA CUOTA COMPROBANTE PESOS D[ÓO]LARES$/i.test(line.text)) {
        continue;
      }

      const consolidated = parseConsolidatedLine(line, order);
      if (consolidated) {
        rows.push(consolidated);
        order += 1;
        continue;
      }

      if (!inDetail) continue;

      const groupTotal = parseGroupTotal(line, order, groups.length + 1);
      if (groupTotal) {
        candidateTransactionLines += 1;
        parsedTransactionLines += 1;
        for (const pending of pendingGroupRows) {
          assignGroup(pending, groupTotal.group);
        }
        pendingGroupRows = [];
        groups.push(groupTotal.group);
        rows.push(groupTotal.row);
        order += 1;
        continue;
      }

      const statementTotal = parseStatementTotal(line, order);
      if (statementTotal) {
        candidateTransactionLines += 1;
        parsedTransactionLines += 1;
        rows.push(statementTotal);
        order += 1;
        continue;
      }

      if (new RegExp(`^${NUMERIC_DATE}\\s+`, "i").test(line.text)) {
        candidateTransactionLines += 1;
        const parsed = parseDatedFinancialLine(line, order);
        if (!parsed) {
          unexplained.push({
            pageNumber: line.pageNumber,
            lineNumber: line.lineNumber,
            text: line.text,
            reason: "dated_financial_line_not_parsed",
          });
          continue;
        }

        parsedTransactionLines += 1;
        rows.push(parsed);
        if (parsed.rowType === "transaction") {
          pendingGroupRows.push(parsed);
        }
        order += 1;
      }
    }
  }

  if (pendingGroupRows.length > 0) {
    for (const row of pendingGroupRows) {
      row.warnings = [...row.warnings, "No se encontró un total TARJETA posterior para asociar la operación."];
    }
  }

  const futureInstallmentsBlock = parseFutureInstallments(pages, order);
  rows.push(...futureInstallmentsBlock);

  const diagnostics: CardStatementParseDiagnostics = {
    layout: "galicia-visa",
    sourcePageCount: pageCount,
    sourceLineCount: flat.length,
    candidateTransactionLines,
    parsedTransactionLines,
    unexplainedTransactionLines: unexplained,
    parsedRows: rows.length,
    futureReferenceRows: futureInstallmentsBlock.length,
    warnings: pendingGroupRows.length > 0 ? ["Hay operaciones sin grupo TARJETA asociado."] : [],
    durationMs: Date.now() - startedAt,
  };

  if (unexplained.length > 0) {
    throw new StatementParseCompletenessError(diagnostics);
  }

  const preview: CardStatementPreview = {
    statementId: null,
    source: {
      bankName: "Banco Galicia",
      brand: "VISA",
      statementNumber: summary.statementNumber,
      pageCount,
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
    groups,
    rows,
    futureInstallmentsBlock,
  };

  return { preview, diagnostics };
}
