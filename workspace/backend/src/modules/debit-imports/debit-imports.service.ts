import { createHash } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import {
  NotFoundError,
  UnsupportedMediaTypeError,
  ValidationError,
} from "../../shared/errors.js";
import {
  formatMovementAmount,
  parseMovementAmount,
} from "../movements/movements.service.js";
import { movementCategoriesService } from "../movements/categories.service.js";
import {
  buildDebitRowFingerprint,
  parseDebitCsv,
  type DebitCsvCurrency,
  type DebitCsvMovementType,
} from "./debit-imports.parser.js";
import type {
  AcceptDebitImportInput,
  DebitImportRowUpdateInput,
  ListDebitImportsQueryInput,
} from "./debit-imports.schemas.js";

const SUPPORTED_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "text/plain",
  "application/octet-stream",
]);

function asIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function normalizeCurrency(value: string): DebitCsvCurrency {
  if (value === "ARS" || value === "USD") return value;
  throw new ValidationError(`Moneda no soportada: ${value}`);
}

function normalizeMovementType(value: string): DebitCsvMovementType {
  if (value === "income" || value === "expense") return value;
  throw new ValidationError(`Tipo de movimiento no soportado: ${value}`);
}

function rowDedupeKey(row: {
  fingerprint: string;
  duplicateOrdinal: number;
}): string {
  return `${row.fingerprint}:${row.duplicateOrdinal}`;
}

export class DebitImportsService {
  async createPreview(input: {
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  }) {
    const extension = input.fileName.toLocaleLowerCase("es").split(".").pop();
    if (extension !== "csv" && !SUPPORTED_MIME_TYPES.has(input.mimeType)) {
      throw new UnsupportedMediaTypeError(input.mimeType);
    }

    const sha256 = createHash("sha256").update(input.buffer).digest("hex");
    const existing = await (prisma as any).debitCsvImport.findUnique({
      where: { sha256 },
      include: {
        rows: {
          include: { category: true },
          orderBy: { rowNumber: "asc" },
        },
      },
    });

    if (existing) {
      return this.mapImport(existing, true);
    }

    const parsed = parseDebitCsv(input.buffer);
    const resolveCategory = await movementCategoriesService.createSuggestionResolver();
    const created = await (prisma as any).debitCsvImport.create({
      data: {
        fileName: input.fileName,
        sha256,
        status: "draft",
        delimiter: parsed.delimiter === "\t" ? "\\t" : parsed.delimiter,
        encoding: parsed.encoding,
        headerRow: parsed.headerRow,
        headersJson: JSON.stringify(parsed.headers),
        mappingJson: JSON.stringify(parsed.mapping),
        rowCount: parsed.rows.length,
        rows: {
          create: parsed.rows.map((row) => ({
            rowNumber: row.rowNumber,
            occurredOn: row.occurredOn,
            description: row.description,
            reference: row.reference,
            movementType: row.movementType,
            currency: row.currency,
            amountRaw: row.amount,
            categoryId: resolveCategory({
              description: row.description,
              reference: row.reference,
              sourceType: "debit_csv",
            })?.id ?? null,
            fingerprint: row.fingerprint,
            duplicateOrdinal: row.duplicateOrdinal,
            included: row.included,
            status: row.validationError ? "rejected" : "draft",
            validationError: row.validationError,
            originalJson: JSON.stringify(row.original),
          })),
        },
      },
      include: {
        rows: {
          include: { category: true },
          orderBy: { rowNumber: "asc" },
        },
      },
    });

    return this.mapImport(created, false);
  }

  async listImports(query: ListDebitImportsQueryInput) {
    const imports = await (prisma as any).debitCsvImport.findMany({
      take: query.limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        sha256: true,
        bankName: true,
        status: true,
        rowCount: true,
        acceptedCount: true,
        omittedCount: true,
        rejectedCount: true,
        createdAt: true,
        acceptedAt: true,
        reversedAt: true,
      },
    });

    return imports.map((item: any) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      acceptedAt: asIso(item.acceptedAt),
      reversedAt: asIso(item.reversedAt),
    }));
  }

  async getImport(importId: string) {
    const item = await (prisma as any).debitCsvImport.findUnique({
      where: { id: importId },
      include: {
        rows: {
          include: { category: true },
          orderBy: { rowNumber: "asc" },
        },
      },
    });
    if (!item) throw new NotFoundError("Debit CSV import");
    return this.mapImport(item, false);
  }

  async updateRow(
    importId: string,
    rowId: string,
    input: DebitImportRowUpdateInput,
  ) {
    const importRecord = await (prisma as any).debitCsvImport.findUnique({
      where: { id: importId },
    });
    if (!importRecord) throw new NotFoundError("Debit CSV import");
    if (importRecord.status !== "draft") {
      throw new ValidationError("Sólo se pueden editar importaciones en borrador.");
    }

    const row = await (prisma as any).debitCsvRow.findFirst({
      where: { id: rowId, importId },
    });
    if (!row) throw new NotFoundError("Debit CSV row");

    const currency = normalizeCurrency(input.currency);
    const movementType = normalizeMovementType(input.movementType);
    const cents = parseMovementAmount(input.amount, currency, false);
    if (cents <= 0n) throw new ValidationError("El importe debe ser mayor a cero.");

    if (input.categoryId) {
      const category = await (prisma as any).movementCategory.findFirst({
        where: { id: input.categoryId, active: true },
      });
      if (!category) throw new NotFoundError("Movement category");
    }

    const amountRaw = formatMovementAmount(cents, currency);
    const fingerprint = buildDebitRowFingerprint({
      occurredOn: input.occurredOn,
      description: input.description,
      reference: input.reference ?? null,
      movementType,
      currency,
      amount: amountRaw,
    });

    await (prisma as any).debitCsvRow.update({
      where: { id: rowId },
      data: {
        occurredOn: input.occurredOn,
        description: input.description,
        reference: input.reference ?? null,
        movementType,
        currency,
        amountRaw,
        categoryId: input.categoryId ?? null,
        included: input.included ?? row.included,
        fingerprint,
        status: "draft",
        validationError: null,
      },
    });

    await this.recalculateOrdinals(importId);
    return this.getImport(importId);
  }

  async acceptImport(importId: string, input: AcceptDebitImportInput) {
    const importRecord = await (prisma as any).debitCsvImport.findUnique({
      where: { id: importId },
      include: {
        rows: {
          orderBy: { rowNumber: "asc" },
        },
      },
    });
    if (!importRecord) throw new NotFoundError("Debit CSV import");
    if (importRecord.status !== "draft") {
      throw new ValidationError("La importación ya fue procesada.");
    }

    const selected = input.rowIds ? new Set(input.rowIds) : null;
    const now = new Date();

    const counts = await (prisma as any).$transaction(async (tx: any) => {
      let acceptedCount = 0;
      let omittedCount = 0;
      let rejectedCount = 0;

      for (const row of importRecord.rows as any[]) {
        if (row.validationError || !row.occurredOn) {
          rejectedCount += 1;
          await tx.debitCsvRow.update({
            where: { id: row.id },
            data: {
              status: "rejected",
              included: false,
            },
          });
          continue;
        }

        const shouldInclude = row.included && (!selected || selected.has(row.id));
        if (!shouldInclude) {
          omittedCount += 1;
          await tx.debitCsvRow.update({
            where: { id: row.id },
            data: {
              status: "omitted",
              included: false,
            },
          });
          continue;
        }

        const dedupeKey = rowDedupeKey(row);
        const duplicate = await tx.debitCsvRow.findUnique({
          where: { dedupeKey },
        });
        if (duplicate) {
          omittedCount += 1;
          await tx.debitCsvRow.update({
            where: { id: row.id },
            data: {
              status: "omitted",
              included: false,
              validationError: "Movimiento ya importado anteriormente.",
            },
          });
          continue;
        }

        acceptedCount += 1;
        await tx.debitCsvRow.update({
          where: { id: row.id },
          data: {
            status: "accepted",
            included: true,
            dedupeKey,
            acceptedAt: now,
          },
        });
      }

      await tx.debitCsvImport.update({
        where: { id: importId },
        data: {
          status: "accepted",
          acceptedCount,
          omittedCount,
          rejectedCount,
          acceptedAt: now,
        },
      });

      return { acceptedCount, omittedCount, rejectedCount };
    });

    return {
      ...(await this.getImport(importId)),
      result: counts,
    };
  }

  async deleteDraft(importId: string) {
    const existing = await (prisma as any).debitCsvImport.findUnique({
      where: { id: importId },
    });
    if (!existing) throw new NotFoundError("Debit CSV import");
    if (existing.status !== "draft") {
      throw new ValidationError("Sólo se pueden eliminar borradores.");
    }
    await (prisma as any).debitCsvImport.delete({ where: { id: importId } });
    return { success: true };
  }

  async reverseImport(importId: string) {
    const existing = await (prisma as any).debitCsvImport.findUnique({
      where: { id: importId },
    });
    if (!existing) throw new NotFoundError("Debit CSV import");
    if (existing.status !== "accepted") {
      throw new ValidationError("Sólo se pueden revertir importaciones aceptadas.");
    }
    await (prisma as any).debitCsvImport.update({
      where: { id: importId },
      data: {
        status: "reversed",
        reversedAt: new Date(),
      },
    });
    return { success: true };
  }

  private async recalculateOrdinals(importId: string) {
    const rows = await (prisma as any).debitCsvRow.findMany({
      where: { importId },
      orderBy: { rowNumber: "asc" },
    });
    const counts = new Map<string, number>();
    for (const row of rows as any[]) {
      const ordinal = (counts.get(row.fingerprint) ?? 0) + 1;
      counts.set(row.fingerprint, ordinal);
      if (row.duplicateOrdinal !== ordinal) {
        await (prisma as any).debitCsvRow.update({
          where: { id: row.id },
          data: { duplicateOrdinal: ordinal },
        });
      }
    }
  }

  private async mapImport(item: any, duplicateFile: boolean) {
    const draftKeys = (item.rows as any[])
      .filter((row) => row.status === "draft" && !row.validationError)
      .map(rowDedupeKey);
    const existingKeys = new Set<string>();

    if (draftKeys.length > 0) {
      const duplicates = await (prisma as any).debitCsvRow.findMany({
        where: {
          dedupeKey: { in: draftKeys },
          import: { status: "accepted" },
        },
        select: { dedupeKey: true },
      });
      for (const duplicate of duplicates as any[]) {
        if (duplicate.dedupeKey) existingKeys.add(duplicate.dedupeKey);
      }
    }

    return {
      id: item.id,
      fileName: item.fileName,
      sha256: item.sha256,
      bankName: item.bankName,
      status: item.status,
      delimiter: item.delimiter === "\\t" ? "\t" : item.delimiter,
      encoding: item.encoding,
      headerRow: item.headerRow,
      headers: JSON.parse(item.headersJson),
      mapping: JSON.parse(item.mappingJson),
      rowCount: item.rowCount,
      acceptedCount: item.acceptedCount,
      omittedCount: item.omittedCount,
      rejectedCount: item.rejectedCount,
      createdAt: item.createdAt.toISOString(),
      acceptedAt: asIso(item.acceptedAt),
      reversedAt: asIso(item.reversedAt),
      duplicateFile,
      rows: (item.rows as any[]).map((row) => {
        const key = rowDedupeKey(row);
        const duplicateExisting =
          row.status === "omitted" &&
          row.validationError === "Movimiento ya importado anteriormente."
            ? true
            : row.status === "draft" && existingKeys.has(key);
        return {
          id: row.id,
          rowNumber: row.rowNumber,
          occurredOn: row.occurredOn,
          description: row.description,
          reference: row.reference,
          movementType: row.movementType,
          currency: row.currency,
          amount: row.amountRaw,
          category: row.category
            ? {
                id: row.category.id,
                name: row.category.name,
              }
            : { id: null, name: "Sin clasificar" },
          included: row.included && !duplicateExisting,
          status: row.status,
          validationError: duplicateExisting
            ? "Movimiento ya importado anteriormente."
            : row.validationError,
          duplicateExisting,
          editable: item.status === "draft",
          original: JSON.parse(row.originalJson),
        };
      }),
    };
  }
}

export const debitImportsService = new DebitImportsService();
