import { createHash } from "node:crypto";
import { ValidationError } from "../../shared/errors.js";
import {
  formatMovementAmount,
  parseMovementAmount,
} from "../movements/movements.service.js";

export type DebitCsvCurrency = "ARS" | "USD";
export type DebitCsvMovementType = "income" | "expense";

export interface DebitCsvMapping {
  date: number;
  description: number;
  amount: number | null;
  debit: number | null;
  credit: number | null;
  currency: number | null;
  reference: number | null;
}

export interface ParsedDebitCsvRow {
  rowNumber: number;
  occurredOn: string | null;
  description: string;
  reference: string | null;
  movementType: DebitCsvMovementType;
  currency: DebitCsvCurrency;
  amount: string;
  fingerprint: string;
  duplicateOrdinal: number;
  included: boolean;
  validationError: string | null;
  original: string[];
}

export interface ParsedDebitCsv {
  encoding: "utf8" | "latin1";
  delimiter: "," | ";" | "\t";
  headerRow: number;
  headers: string[];
  mapping: DebitCsvMapping;
  rows: ParsedDebitCsvRow[];
}

const ALIASES = {
  date: [
    "fecha",
    "fecha movimiento",
    "fecha de movimiento",
    "fecha transaccion",
    "fecha de transaccion",
    "date",
  ],
  description: [
    "descripcion",
    "detalle",
    "concepto",
    "movimiento",
    "comercio",
    "merchant",
    "description",
  ],
  amount: ["importe", "monto", "amount", "valor"],
  debit: ["debito", "debe", "egreso", "cargo", "salida", "debit"],
  credit: ["credito", "haber", "ingreso", "abono", "entrada", "credit"],
  currency: ["moneda", "currency", "divisa"],
  reference: [
    "referencia",
    "comprobante",
    "numero",
    "nro",
    "id",
    "reference",
  ],
} as const;

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function aliasScore(header: string, aliases: readonly string[]): number {
  const normalized = normalizeHeader(header);
  let score = 0;
  for (const alias of aliases) {
    if (normalized === alias) score = Math.max(score, 6);
    else if (normalized.includes(alias)) score = Math.max(score, 3);
  }
  return score;
}

function findColumn(headers: string[], aliases: readonly string[]): number | null {
  let bestIndex: number | null = null;
  let bestScore = 0;
  headers.forEach((header, index) => {
    const score = aliasScore(header, aliases);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function parseMatrix(content: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === delimiter) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function mappingForHeaders(headers: string[]): DebitCsvMapping {
  return {
    date: findColumn(headers, ALIASES.date) ?? -1,
    description: findColumn(headers, ALIASES.description) ?? -1,
    amount: findColumn(headers, ALIASES.amount),
    debit: findColumn(headers, ALIASES.debit),
    credit: findColumn(headers, ALIASES.credit),
    currency: findColumn(headers, ALIASES.currency),
    reference: findColumn(headers, ALIASES.reference),
  };
}

function mappingScore(mapping: DebitCsvMapping): number {
  let score = 0;
  if (mapping.date >= 0) score += 8;
  if (mapping.description >= 0) score += 8;
  if (mapping.amount !== null) score += 6;
  if (mapping.debit !== null) score += 5;
  if (mapping.credit !== null) score += 5;
  if (mapping.currency !== null) score += 1;
  if (mapping.reference !== null) score += 1;
  if (
    mapping.date < 0 ||
    mapping.description < 0 ||
    (mapping.amount === null && mapping.debit === null && mapping.credit === null)
  ) {
    score -= 20;
  }
  return score;
}

function detectLayout(content: string): {
  delimiter: "," | ";" | "\t";
  matrix: string[][];
  headerRow: number;
  headers: string[];
  mapping: DebitCsvMapping;
} {
  const delimiters = [",", ";", "\t"] as const;
  let best:
    | {
        delimiter: "," | ";" | "\t";
        matrix: string[][];
        headerRow: number;
        headers: string[];
        mapping: DebitCsvMapping;
        score: number;
      }
    | undefined;

  for (const delimiter of delimiters) {
    const matrix = parseMatrix(content, delimiter);
    const maxHeader = Math.min(matrix.length, 25);
    for (let headerRow = 0; headerRow < maxHeader; headerRow += 1) {
      const headers = matrix[headerRow] ?? [];
      if (headers.length < 2) continue;
      const mapping = mappingForHeaders(headers);
      const score = mappingScore(mapping) + Math.min(headers.length, 10);
      if (!best || score > best.score) {
        best = { delimiter, matrix, headerRow, headers, mapping, score };
      }
    }
  }

  if (!best || best.score < 1) {
    throw new ValidationError(
      "No se pudieron detectar las columnas de fecha, descripción e importe del CSV.",
    );
  }

  return best;
}

function decodeCsvBuffer(buffer: Buffer): {
  content: string;
  encoding: "utf8" | "latin1";
} {
  const utf8 = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const replacementCount = (utf8.match(/\uFFFD/g) ?? []).length;
  if (replacementCount === 0) return { content: utf8, encoding: "utf8" };
  return {
    content: buffer.toString("latin1").replace(/^\uFEFF/, ""),
    encoding: "latin1",
  };
}

export function normalizeCsvDate(value: string): string | null {
  const clean = value.trim().split(/[ T]/)[0] ?? "";
  let match = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const [, year, month, day] = match;
    return validIsoDate(Number(year), Number(month), Number(day));
  }

  match = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/);
  if (match) {
    const [, day, month, rawYear] = match;
    const yearNumber = Number(rawYear);
    const year =
      rawYear.length === 2 ? (yearNumber >= 70 ? 1900 + yearNumber : 2000 + yearNumber) : yearNumber;
    return validIsoDate(year, Number(month), Number(day));
  }

  return null;
}

function validIsoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function detectCurrency(
  row: string[],
  headers: string[],
  mapping: DebitCsvMapping,
): DebitCsvCurrency {
  const explicit =
    mapping.currency !== null ? normalizeHeader(row[mapping.currency] ?? "") : "";
  if (/(usd|dolar|dollar|u\$s)/i.test(explicit)) return "USD";

  const relevantHeaders = [
    mapping.amount,
    mapping.debit,
    mapping.credit,
  ]
    .filter((index): index is number => index !== null)
    .map((index) => normalizeHeader(headers[index] ?? ""))
    .join(" ");

  return /(usd|dolar|dollar|u\$s)/i.test(relevantHeaders) ? "USD" : "ARS";
}

function cleanAmountCell(value: string): string {
  return value
    .trim()
    .replace(/\(([^)]+)\)/, "-$1")
    .replace(/\s+/g, "")
    .replace(/ARS|USD|U\$S|\$/gi, "");
}

function deriveAmount(
  row: string[],
  mapping: DebitCsvMapping,
  currency: DebitCsvCurrency,
): {
  movementType: DebitCsvMovementType;
  amount: string;
  validationError: string | null;
} {
  try {
    const debitValue =
      mapping.debit !== null ? cleanAmountCell(row[mapping.debit] ?? "") : "";
    const creditValue =
      mapping.credit !== null ? cleanAmountCell(row[mapping.credit] ?? "") : "";

    if (debitValue) {
      const cents = parseMovementAmount(debitValue, currency, true);
      if (cents !== 0n) {
        return {
          movementType: "expense",
          amount: formatMovementAmount(cents < 0n ? -cents : cents, currency),
          validationError: null,
        };
      }
    }

    if (creditValue) {
      const cents = parseMovementAmount(creditValue, currency, true);
      if (cents !== 0n) {
        return {
          movementType: "income",
          amount: formatMovementAmount(cents < 0n ? -cents : cents, currency),
          validationError: null,
        };
      }
    }

    if (mapping.amount !== null) {
      const raw = cleanAmountCell(row[mapping.amount] ?? "");
      if (!raw) throw new ValidationError("Importe vacío");
      const cents = parseMovementAmount(raw, currency, true);
      if (cents === 0n) throw new ValidationError("Importe igual a cero");
      return {
        movementType: cents < 0n ? "expense" : "income",
        amount: formatMovementAmount(cents < 0n ? -cents : cents, currency),
        validationError: null,
      };
    }

    throw new ValidationError("No hay una columna de importe utilizable");
  } catch (error) {
    return {
      movementType: "expense",
      amount: currency === "USD" ? "0.00" : "0,00",
      validationError:
        error instanceof Error ? error.message : "Importe inválido",
    };
  }
}

export function buildDebitRowFingerprint(input: {
  occurredOn: string;
  description: string;
  reference: string | null;
  movementType: DebitCsvMovementType;
  currency: DebitCsvCurrency;
  amount: string;
}): string {
  const normalized = [
    input.occurredOn,
    normalizeHeader(input.description),
    normalizeHeader(input.reference ?? ""),
    input.movementType,
    input.currency,
    input.amount.replace(/\s/g, ""),
  ].join("|");

  return createHash("sha256").update(normalized).digest("hex");
}

export function parseDebitCsv(buffer: Buffer): ParsedDebitCsv {
  if (buffer.length === 0) throw new ValidationError("El archivo CSV está vacío.");
  const { content, encoding } = decodeCsvBuffer(buffer);
  const { delimiter, matrix, headerRow, headers, mapping } = detectLayout(content);
  const rows: ParsedDebitCsvRow[] = [];
  const ordinals = new Map<string, number>();

  for (let index = headerRow + 1; index < matrix.length; index += 1) {
    const original = matrix[index] ?? [];
    if (!original.some((value) => value.trim())) continue;

    const dateRaw = original[mapping.date] ?? "";
    const descriptionRaw = original[mapping.description] ?? "";
    const referenceRaw =
      mapping.reference !== null ? original[mapping.reference] ?? "" : "";
    const occurredOn = normalizeCsvDate(dateRaw);
    const description = descriptionRaw.trim() || referenceRaw.trim();
    const reference = referenceRaw.trim() || null;
    const currency = detectCurrency(original, headers, mapping);
    const derived = deriveAmount(original, mapping, currency);

    const errors: string[] = [];
    if (!occurredOn) errors.push(`Fecha inválida: ${dateRaw || "vacía"}`);
    if (!description) errors.push("Descripción vacía");
    if (derived.validationError) errors.push(derived.validationError);

    const validDate = occurredOn ?? "1900-01-01";
    const fingerprint = buildDebitRowFingerprint({
      occurredOn: validDate,
      description: description || "Sin descripción",
      reference,
      movementType: derived.movementType,
      currency,
      amount: derived.amount,
    });
    const duplicateOrdinal = (ordinals.get(fingerprint) ?? 0) + 1;
    ordinals.set(fingerprint, duplicateOrdinal);

    rows.push({
      rowNumber: index + 1,
      occurredOn,
      description: description || "Sin descripción",
      reference,
      movementType: derived.movementType,
      currency,
      amount: derived.amount,
      fingerprint,
      duplicateOrdinal,
      included: errors.length === 0,
      validationError: errors.length > 0 ? errors.join(". ") : null,
      original,
    });
  }

  if (rows.length === 0) {
    throw new ValidationError("El CSV no contiene movimientos para previsualizar.");
  }
  if (rows.length > 5000) {
    throw new ValidationError("El CSV supera el máximo de 5000 filas.");
  }

  return {
    encoding,
    delimiter,
    headerRow: headerRow + 1,
    headers,
    mapping,
    rows,
  };
}
