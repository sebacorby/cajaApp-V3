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
  StatementLayout,
} from "./card-statement-parser.types.js";
import {
  StatementParseCompletenessError,
  UnsupportedStatementLayoutError,
} from "./card-statement-parser.types.js";

type RawLine = { pageNumber: number; lineNumber: number; text: string };

const MONEY_SOURCE = "-?(?:\\d{1,3}(?:[. ]\\d{3})+|\\d+)(?:,\\d{2}|\\.\\d{2})";
const DATE_SOURCE = "(?:\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{1,2}-[A-Za-zÁÉÍÓÚáéíóú]{3}-\\d{2,4})";
const MONEY = new RegExp(MONEY_SOURCE, "g");
const DATE_AT_START = new RegExp(`^(${DATE_SOURCE})\\s+(.+)$`, "i");
const INSTALLMENT = /\b(\d{1,2})\s*(?:\/|-)\s*(\d{1,2})\b/;
const MONTHS: Record<string, string> = {
  ene: "01", enero: "01", feb: "02", febrero: "02", mar: "03", marzo: "03",
  abr: "04", abril: "04", may: "05", mayo: "05", jun: "06", junio: "06",
  jul: "07", julio: "07", ago: "08", agosto: "08", sep: "09", set: "09",
  septiembre: "09", setiembre: "09", oct: "10", octubre: "10", nov: "11",
  noviembre: "11", dic: "12", diciembre: "12",
};

function normalize(value: string): string {
  return value.normalize("NFKC").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
}

function linesOf(rawText: string): RawLine[] {
  const pageMarker = /--- PAGE (\d+) \/ \d+ ---\n([\s\S]*?)(?=\n--- PAGE \d+ \/ \d+ ---|$)/g;
  const result: RawLine[] = [];
  let pageMatch: RegExpExecArray | null;
  while ((pageMatch = pageMarker.exec(rawText)) !== null) {
    pageMatch[2].split(/\r?\n/).map(normalize).forEach((text, index) => {
      if (text) result.push({ pageNumber: Number(pageMatch![1]), lineNumber: index + 1, text });
    });
  }
  if (result.length === 0) {
    rawText.split(/\r?\n/).map(normalize).forEach((text, index) => {
      if (text) result.push({ pageNumber: 1, lineNumber: index + 1, text });
    });
  }
  return result;
}

function parseDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const numeric = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/.exec(raw);
  if (numeric) {
    const year = numeric[3].length === 2 ? 2000 + Number(numeric[3]) : Number(numeric[3]);
    const month = Number(numeric[2]);
    const day = Number(numeric[1]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const textual = /^(\d{1,2})-([A-Za-zÁÉÍÓÚáéíóú]+)-(\d{2}|\d{4})$/i.exec(raw);
  if (!textual) return null;
  const key = textual[2].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const month = MONTHS[key] ?? MONTHS[key.slice(0, 3)];
  if (!month) return null;
  const year = textual[3].length === 2 ? 2000 + Number(textual[3]) : Number(textual[3]);
  return `${year}-${month}-${String(Number(textual[1])).padStart(2, "0")}`;
}

function normalizedAmount(value: string | null | undefined): string | null {
  return value ? value.replace(/\s/g, "") : null;
}

function evidence(rawText: string) {
  const text = normalize(rawText).toLowerCase();
  const signals: string[] = [];
  let score = 0;
  const add = (points: number, name: string, pattern: RegExp) => {
    if (pattern.test(text)) { score += points; signals.push(name); }
  };
  add(3, "statement-total", /total\s+a\s+pagar|saldo\s+actual|total\s+adeudado|tu\s+total\s+a\s+pagar/);
  add(2, "due-date", /vencimiento|vence\s+el|fecha\s+de\s+pago/);
  add(2, "closing-cycle", /cierre|estado\s+de\s+cuenta\s+al|emitido\s+el/);
  add(3, "transaction-detail", /detalle\s+(?:del\s+)?(?:consumo|mes)|detalle\s+de\s+consumos|compras\s+del\s+mes|fecha\s+.*(?:detalle|referencia)/);
  add(1, "minimum-payment", /pago\s+m[ií]nimo|menor\s+entrega/);
  add(1, "financing", /cuotas?\s+a\s+vencer|plan\s+de\s+financiaci[oó]n|saldo\s+financiable/);
  const datedAmounts = (rawText.match(new RegExp(`${DATE_SOURCE}[^\\n]{0,180}${MONEY_SOURCE}`, "gi")) ?? []).length;
  if (datedAmounts >= 1) { score += Math.min(3, datedAmounts); signals.push(`dated-financial-lines:${datedAmounts}`); }
  const layout: StatementLayout = /tu\s+total\s+a\s+pagar|cu[aá]nto\s+quer[eé]s\s+pagar|detalle\s+de\s+consumos/.test(text)
    ? "adaptive-narrative"
    : "adaptive-tabular";
  return { score, signals, layout };
}

export function scoreAdaptiveCardStatement(rawText: string) {
  return evidence(rawText);
}

function makeRow(input: {
  order: number; line: RawLine; rowType: CardStatementRowType; reference: string | null;
  dateRaw?: string | null; installmentRaw?: string | null; installmentCurrent?: number | null;
  installmentTotal?: number | null; receiptRaw?: string | null; amountPesos?: string | null;
  amountDollars?: string | null; group?: CardStatementGroup | null; sectionId?: string;
  sectionLabel?: string; warnings?: string[];
}): CardStatementRow {
  const pesos = normalizedAmount(input.amountPesos);
  const dollars = normalizedAmount(input.amountDollars);
  return {
    id: `adaptive-${input.rowType}-${String(input.order).padStart(4, "0")}`,
    displayOrder: input.order,
    sourcePage: input.line.pageNumber,
    sectionId: input.sectionId ?? "detail",
    sectionLabel: input.sectionLabel ?? "Detalle",
    groupId: input.group?.id ?? null,
    groupLabel: input.group?.label ?? null,
    groupOrder: input.group?.displayOrder ?? null,
    rowType: input.rowType,
    editable: input.rowType === "transaction",
    dateRaw: input.dateRaw ?? null,
    dateIso: parseDate(input.dateRaw),
    markerRaw: null,
    referenceRaw: input.reference,
    installmentRaw: input.installmentRaw ?? null,
    installmentCurrent: input.installmentCurrent ?? null,
    installmentTotal: input.installmentTotal ?? null,
    receiptRaw: input.receiptRaw ?? null,
    amountPesos: pesos,
    amountDollars: dollars,
    currencyOriginal: pesos && dollars ? "MIXED" : dollars ? "USD" : pesos ? "ARS" : "UNKNOWN",
    originalText: input.line.text,
    confidence: 0.9,
    warnings: input.warnings ?? [],
  };
}

function trailingAmounts(text: string): { rest: string; values: string[] } {
  let rest = text.trim();
  const values: string[] = [];
  const trailing = new RegExp(`(?:^|\\s)(${MONEY_SOURCE})\\s*$`);
  while (values.length < 2) {
    const match = trailing.exec(rest);
    if (!match) break;
    values.unshift(match[1]);
    rest = rest.slice(0, match.index).trim();
  }
  return { rest, values };
}

function summaryValue(text: string, patterns: RegExp[]): string[] | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) return match.slice(1).filter((value): value is string => Boolean(value));
  }
  return null;
}

function findDate(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    const parsed = parseDate(match?.[1]);
    if (parsed) return parsed;
  }
  return null;
}

function parseFuture(lines: RawLine[], startOrder: number): CardStatementRow[] {
  const rows: CardStatementRow[] = [];
  let order = startOrder;
  const futureStart = lines.findIndex((line) => /cuotas?\s+(?:a\s+vencer|futuras)|pr[oó]ximos\s+res[uú]menes/i.test(line.text));
  if (futureStart < 0) return rows;
  const scope = lines.slice(futureStart, futureStart + 12);
  for (const line of scope) {
    const pairs = [...line.text.matchAll(/([A-Za-zÁÉÍÓÚáéíóú]+)[/-](\d{2,4})\s+\$?\s*([\d.]+,\d{2})/g)];
    for (const pair of pairs) {
      const year = pair[2].length === 2 ? 2000 + Number(pair[2]) : Number(pair[2]);
      const key = pair[1].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const month = MONTHS[key] ?? MONTHS[key.slice(0, 3)];
      rows.push(makeRow({ order: order++, line, rowType: "future_installment_reference", reference: month ? `${year}-${month}` : pair[0], amountPesos: pair[3], sectionId: "future", sectionLabel: "Cuotas futuras" }));
    }
  }
  return rows;
}

export function parseAdaptiveCardStatement(rawText: string, pageCount: number): CardStatementParseResult {
  const started = Date.now();
  const detected = evidence(rawText);
  if (detected.score < 8) throw new UnsupportedStatementLayoutError(rawText.slice(0, 500));
  const lines = linesOf(rawText);
  const text = lines.map((line) => line.text).join("\n");
  const amounts = summaryValue(text, [
    new RegExp(`TOTAL\\s+A\\s+PAGAR\\s+\\$?\\s*(${MONEY_SOURCE})(?:\\s+(?:U\\$S|USD)?\\s*(${MONEY_SOURCE}))?`, "i"),
    new RegExp(`SALDO\\s+ACTUAL\\s+\\$?\\s*(${MONEY_SOURCE})(?:\\s+(?:U\\$S|USD)\\s*(${MONEY_SOURCE}))?`, "i"),
    new RegExp(`TU\\s+TOTAL\\s+A\\s+PAGAR\\s+ES\\s+\\$?\\s*(${MONEY_SOURCE})`, "i"),
    new RegExp(`TOTAL\\s+ADEUDADO\\s+\\$?\\s*(${MONEY_SOURCE})`, "i"),
  ]);
  const minimum = summaryValue(text, [
    new RegExp(`PAGO\\s+M[IÍ]NIMO(?:\\s+ACTUAL)?[^\\d]{0,30}\\$?\\s*(${MONEY_SOURCE})`, "i"),
    new RegExp(`LA\\s+MENOR\\s+ENTREGA[^\\d]{0,30}\\$?\\s*(${MONEY_SOURCE})`, "i"),
  ]);
  const currentDueDate = findDate(text, [
    new RegExp(`VENCIMIENTO\\s+ACTUAL\\s+(${DATE_SOURCE})`, "i"),
    new RegExp(`VENCE(?:\\s+EL)?\\s+(${DATE_SOURCE})`, "i"),
    new RegExp(`VENCIMIENTO[^\\n]{0,30}(${DATE_SOURCE})`, "i"),
  ]);
  const nextClosingDate = findDate(text, [new RegExp(`PR[ÓO]XIMO\\s+CIERRE:?\\s+(${DATE_SOURCE})`, "i"), new RegExp(`PR[ÓO]XIMO\\s+RESUMEN\\s+CIERRA\\s+EL\\s+(${DATE_SOURCE})`, "i")]);
  const nextDueDate = findDate(text, [new RegExp(`PR[ÓO]XIMO\\s+VENCIMIENTO:?\\s+(${DATE_SOURCE})`, "i"), new RegExp(`Y\\s+VENCE\\s+EL\\s+(${DATE_SOURCE})`, "i")]);
  const statementNumber = summaryValue(text, [/(?:RESUMEN|ESTADO)\s+N[°º]?\s*([A-Z0-9-]+)/i, /N[°º]\s+DE\s+CUENTA:?\s*([A-Z0-9-]+)/i])?.[0] ?? null;

  const group: CardStatementGroup = { id: "adaptive-default", displayOrder: 1, label: "Consumos", cardLast4: null, holderName: null };
  const rows: CardStatementRow[] = [];
  const unexplained: ParserDiagnosticLine[] = [];
  let order = 1;
  let inDetail = false;
  let candidates = 0;
  let parsed = 0;

  for (const line of lines) {
    if (/detalle\s+(?:del\s+)?(?:consumo|mes)|detalle\s+de\s+consumos|compras\s+del\s+mes|fecha\s+.*(?:detalle|referencia)/i.test(line.text)) { inDetail = true; continue; }
    if (/informaci[oó]n\s+(?:institucional|legal)|opciones\s+de\s+financiaci[oó]n|tasas?\s+de\s+inter[eé]s/i.test(line.text)) inDetail = false;

    const dated = DATE_AT_START.exec(line.text);
    if (dated) {
      const extracted = trailingAmounts(dated[2]);
      if (extracted.values.length === 0) {
        if (inDetail) { candidates++; unexplained.push({ pageNumber: line.pageNumber, lineNumber: line.lineNumber, text: line.text, reason: "Línea fechada sin importe final reconocible" }); }
        continue;
      }
      candidates++;
      const upper = extracted.rest.toUpperCase();
      const installment = INSTALLMENT.exec(extracted.rest);
      const receiptMatches = [...extracted.rest.matchAll(/\b(\d{4,8})\b/g)];
      const receipt = receiptMatches.at(-1)?.[1] ?? null;
      const isPayment = /PAGO\s+EN|SU\s+PAGO|PAGO\s+RESUMEN/.test(upper);
      const isTax = /IVA|IMPUESTO|PERCEP|RETENC/.test(upper);
      const isCharge = /COMISI[ÓO]N|INTER[EÉ]S|MANTENIMIENTO|RENOVACI[ÓO]N/.test(upper);
      rows.push(makeRow({
        order: order++, line, group: isPayment ? null : group,
        rowType: isPayment ? "consolidated_row" : isTax ? "tax" : isCharge ? "charge" : "transaction",
        reference: extracted.rest,
        dateRaw: dated[1],
        installmentRaw: installment ? `${String(Number(installment[1])).padStart(2, "0")}/${String(Number(installment[2])).padStart(2, "0")}` : null,
        installmentCurrent: installment ? Number(installment[1]) : null,
        installmentTotal: installment ? Number(installment[2]) : null,
        receiptRaw: receipt,
        amountPesos: extracted.values[0] ?? null,
        amountDollars: extracted.values[1] ?? null,
        sectionId: isPayment ? "summary" : "detail",
        sectionLabel: isPayment ? "Resumen" : "Detalle",
      }));
      parsed++;
      continue;
    }

    if (inDetail && /(?:IVA|IMPUESTO|PERCEP|COMISI[ÓO]N|INTER[EÉ]S|MANTENIMIENTO|RENOVACI[ÓO]N)/i.test(line.text)) {
      const extracted = trailingAmounts(line.text);
      if (extracted.values.length > 0) {
        candidates++;
        rows.push(makeRow({ order: order++, line, rowType: /IVA|IMPUESTO|PERCEP/i.test(extracted.rest) ? "tax" : "charge", reference: extracted.rest, amountPesos: extracted.values[0], amountDollars: extracted.values[1] ?? null, sectionId: "summary", sectionLabel: "Cargos e impuestos" }));
        parsed++;
      }
    }
  }

  if (amounts?.[0]) {
    const line = lines.find((candidate) => /TOTAL\s+A\s+PAGAR|SALDO\s+ACTUAL|TU\s+TOTAL\s+A\s+PAGAR/i.test(candidate.text)) ?? lines[0];
    rows.push(makeRow({ order: order++, line, rowType: "statement_total", reference: "Total del resumen", amountPesos: amounts[0], amountDollars: amounts[1] ?? null, sectionId: "summary", sectionLabel: "Resumen" }));
  }

  const future = parseFuture(lines, order);
  const diagnostics: CardStatementParseDiagnostics = {
    layout: detected.layout,
    parserId: "adaptive-structural-card-statement",
    parserVersion: "1.0.0",
    detectionScore: detected.score,
    detectionSignals: detected.signals,
    sourcePageCount: pageCount,
    sourceLineCount: lines.length,
    candidateTransactionLines: candidates,
    parsedTransactionLines: parsed,
    unexplainedTransactionLines: unexplained,
    parsedRows: rows.length,
    futureReferenceRows: future.length,
    warnings: [],
    durationMs: Date.now() - started,
  };
  if (!amounts?.[0] || !currentDueDate || parsed === 0) {
    diagnostics.warnings.push("Faltan invariantes obligatorios: total, vencimiento o movimientos.");
    throw new StatementParseCompletenessError(diagnostics);
  }
  if (unexplained.length > 0) throw new StatementParseCompletenessError(diagnostics);

  const preview: CardStatementPreview = {
    statementId: null,
    source: { bankName: null, brand: null, statementNumber, pageCount },
    summary: {
      totalPesos: normalizedAmount(amounts[0]),
      totalDollars: normalizedAmount(amounts[1]),
      minimumPaymentPesos: normalizedAmount(minimum?.[0]),
      currentDueDate,
      nextClosingDate,
      nextDueDate,
    },
    sections: [
      { id: "summary", displayOrder: 1, label: "Resumen" },
      { id: "detail", displayOrder: 2, label: "Detalle" },
      { id: "future", displayOrder: 3, label: "Cuotas futuras" },
    ],
    groups: [group],
    rows,
    futureInstallmentsBlock: future,
  };
  return { preview, diagnostics };
}
