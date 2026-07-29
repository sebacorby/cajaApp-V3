import { prisma } from "../../db/prisma.js";
import { NotFoundError, ValidationError } from "../../shared/errors.js";
import { incomesService } from "../incomes/incomes.service.js";
import { movementCategoriesService } from "./categories.service.js";
import type {
  CreateManualMovementInput,
  MovementQueryInput,
  UpdateManualMovementInput,
} from "./movements.schemas.js";

type MovementCurrency = "ARS" | "USD";
type MovementType = "income" | "expense";
type MovementStatus = "actual" | "pending" | "projected" | "voided";

export type NormalizedMovement = {
  id: string;
  occurredOn: string;
  effectiveMonthKey: string;
  type: MovementType;
  sourceType: string;
  sourceId: string;
  description: string;
  category: { id: string | null; name: string };
  currency: MovementCurrency;
  amount: string;
  status: MovementStatus;
  notes: string | null;
  editable: boolean;
  categoryEditable: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  trace: {
    sourceLabel: string;
    statementId?: string;
    incomeSourceId?: string;
    debitImportId?: string;
  };
};

export interface MovementReadOptions {
  includeReconciledExcluded?: boolean;
}

export function filterReconciledMovements(
  movements: NormalizedMovement[],
  excludedMovementIds: ReadonlySet<string>,
): NormalizedMovement[] {
  if (excludedMovementIds.size === 0) return movements;
  return movements.filter((movement) => !excludedMovementIds.has(movement.id));
}

function monthKeyFromDate(date: string): string {
  return date.slice(0, 7);
}

function monthKeyRange(from: string, to: string): { from: string; to: string } {
  return { from: monthKeyFromDate(from), to: monthKeyFromDate(to) };
}

function dateForMonth(monthKey: string, requestedDay: number | null | undefined): string {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.max(1, Math.min(requestedDay ?? 1, lastDay));
  return `${monthKey}-${String(day).padStart(2, "0")}`;
}

function normalizeCurrency(value: string): MovementCurrency {
  if (value === "ARS" || value === "USD") return value;
  throw new ValidationError(`Unsupported movement currency: ${value}`);
}

export function parseMovementAmount(
  value: string,
  currency: MovementCurrency,
  allowNegative = true,
): bigint {
  const compact = value
    .trim()
    .replace(/\s/g, "")
    .replace(/[$€£]/g, "");
  const match = compact.match(/^([+-]?)([0-9.,]+)$/);
  if (!match) throw new ValidationError(`Invalid ${currency} amount: ${value}`);

  const negative = match[1] === "-";
  if (negative && !allowNegative) {
    throw new ValidationError("Movement amount must be greater than zero");
  }

  let body = match[2];
  let decimalSeparator: "." | "," | null = null;

  if (body.includes(".") && body.includes(",")) {
    decimalSeparator = currency === "ARS" ? "," : ".";
  } else if (body.includes(",")) {
    const parts = body.split(",");
    if (parts.length > 2) {
      if (currency === "USD") body = parts.join("");
      else throw new ValidationError(`Invalid ${currency} amount: ${value}`);
    } else if ((parts[1] ?? "").length <= 2) {
      decimalSeparator = ",";
    }
  } else if (body.includes(".")) {
    const parts = body.split(".");
    if (parts.length > 2) {
      if (currency === "ARS") body = parts.join("");
      else throw new ValidationError(`Invalid ${currency} amount: ${value}`);
    } else if ((parts[1] ?? "").length <= 2) {
      decimalSeparator = ".";
    }
  }

  let integerPart = body;
  let fractionPart = "";
  if (decimalSeparator) {
    const index = body.lastIndexOf(decimalSeparator);
    integerPart = body.slice(0, index);
    fractionPart = body.slice(index + 1);
  }

  integerPart = integerPart.replace(/[.,]/g, "");
  if (!/^\d+$/.test(integerPart) || !/^\d{0,2}$/.test(fractionPart)) {
    throw new ValidationError(`Invalid ${currency} amount: ${value}`);
  }

  const cents =
    BigInt(integerPart || "0") * 100n +
    BigInt((fractionPart || "").padEnd(2, "0") || "0");

  return negative ? -cents : cents;
}

export function formatMovementAmount(cents: bigint, currency: MovementCurrency): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const integer = (absolute / 100n).toString();
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  const groupSeparator = currency === "ARS" ? "." : ",";
  const decimalSeparator = currency === "ARS" ? "," : ".";
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator);
  return `${negative ? "-" : ""}${grouped}${decimalSeparator}${fraction}`;
}

function absolute(value: bigint): bigint {
  return value < 0n ? -value : value;
}

function reverseType(type: MovementType): MovementType {
  return type === "income" ? "expense" : "income";
}

function movementFromSignedAmount(
  base: Omit<NormalizedMovement, "type" | "amount"> & { type: MovementType },
  signedAmount: bigint,
): NormalizedMovement | null {
  if (signedAmount === 0n) return null;
  return {
    ...base,
    type: signedAmount < 0n ? reverseType(base.type) : base.type,
    amount: formatMovementAmount(absolute(signedAmount), base.currency),
  };
}

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function categoryNameForCardRow(rowType: string): string {
  if (rowType === "tax") return "Impuestos y percepciones";
  if (rowType === "charge") return "Cargos de tarjeta";
  return "Tarjetas";
}



function csvValue(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildMovementsCsv(movements: NormalizedMovement[]): string {
  const header = [
    "Fecha",
    "Mes de impacto",
    "Tipo",
    "Fuente técnica",
    "Origen",
    "Descripción",
    "Categoría",
    "Moneda",
    "Importe",
    "Estado",
    "Notas",
    "ID de origen",
    "ID de resumen",
    "ID de ingreso",
    "ID de importación CSV",
  ];
  const lines = [`\uFEFF${header.map(csvValue).join(";")}`];
  for (const movement of movements) {
    lines.push([
      movement.occurredOn,
      movement.effectiveMonthKey,
      movement.type === "income" ? "Ingreso" : "Egreso",
      movement.sourceType,
      movement.trace.sourceLabel,
      movement.description,
      movement.category.name,
      movement.currency,
      movement.amount,
      movement.status,
      movement.notes,
      movement.sourceId,
      movement.trace.statementId ?? "",
      movement.trace.incomeSourceId ?? "",
      movement.trace.debitImportId ?? "",
    ].map(csvValue).join(";"));
  }
  return lines.join("\r\n");
}

export class MovementsService {
  async createManualMovement(input: CreateManualMovementInput) {
    await movementCategoriesService.ensureDefaults();
    const category = await movementCategoriesService.requireActiveCategory(input.categoryId);
    const currency = normalizeCurrency(input.currency);
    const cents = parseMovementAmount(input.amount, currency, false);
    if (cents <= 0n) throw new ValidationError("Movement amount must be greater than zero");

    const movement = await prisma.manualMovement.create({
      data: {
        occurredOn: input.occurredOn,
        effectiveMonthKey: monthKeyFromDate(input.occurredOn),
        type: input.type,
        sourceType: input.sourceType,
        description: input.description,
        categoryId: category?.id ?? null,
        currency,
        amountRaw: formatMovementAmount(cents, currency),
        status: input.status,
        notes: input.notes || null,
      },
      include: { category: true },
    });

    return this.mapManualMovement(movement);
  }

  async updateManualMovement(movementId: string, input: UpdateManualMovementInput) {
    const existing = await prisma.manualMovement.findFirst({
      where: { id: movementId, voidedAt: null },
      include: { category: true },
    });
    if (!existing) throw new NotFoundError("Manual movement");

    const currency = normalizeCurrency(input.currency ?? existing.currency);
    const category = input.categoryId !== undefined
      ? await movementCategoriesService.requireActiveCategory(input.categoryId)
      : existing.category;
    let amountRaw = existing.amountRaw;
    if (input.amount !== undefined) {
      const cents = parseMovementAmount(input.amount, currency, false);
      if (cents <= 0n) throw new ValidationError("Movement amount must be greater than zero");
      amountRaw = formatMovementAmount(cents, currency);
    } else if (input.currency && input.currency !== existing.currency) {
      const cents = parseMovementAmount(existing.amountRaw, normalizeCurrency(existing.currency), false);
      amountRaw = formatMovementAmount(cents, currency);
    }

    const occurredOn = input.occurredOn ?? existing.occurredOn;
    const movement = await prisma.manualMovement.update({
      where: { id: movementId },
      data: {
        occurredOn,
        effectiveMonthKey: monthKeyFromDate(occurredOn),
        type: input.type,
        sourceType: input.sourceType,
        description: input.description,
        categoryId: input.categoryId !== undefined ? category?.id ?? null : undefined,
        currency,
        amountRaw,
        status: input.status,
        notes: input.notes === undefined ? undefined : input.notes || null,
      },
      include: { category: true },
    });

    return this.mapManualMovement(movement);
  }

  async voidManualMovement(movementId: string) {
    const existing = await prisma.manualMovement.findFirst({
      where: { id: movementId, voidedAt: null },
    });
    if (!existing) throw new NotFoundError("Manual movement");

    await prisma.manualMovement.update({
      where: { id: movementId },
      data: { status: "voided", voidedAt: new Date() },
    });
    return { success: true };
  }

  private mapManualMovement(movement: any): NormalizedMovement {
    return {
      id: `manual:${movement.id}`,
      occurredOn: movement.occurredOn,
      effectiveMonthKey: movement.effectiveMonthKey,
      type: movement.type === "income" ? "income" : "expense",
      sourceType: movement.sourceType,
      sourceId: movement.id,
      description: movement.description,
      category: {
        id: movement.category?.id ?? null,
        name: movement.category?.name ?? "Sin clasificar",
      },
      currency: normalizeCurrency(movement.currency),
      amount: movement.amountRaw,
      status: movement.status === "pending" ? "pending" : movement.status === "voided" ? "voided" : "actual",
      notes: movement.notes,
      editable: true,
      categoryEditable: true,
      createdAt: iso(movement.createdAt),
      updatedAt: iso(movement.updatedAt),
      trace: { sourceLabel: "Carga manual" },
    };
  }

  async getMovements(
    query: MovementQueryInput,
    options: MovementReadOptions = {},
  ) {
    await movementCategoriesService.ensureDefaults();
    const range = monthKeyRange(query.from, query.to);
    const movements: NormalizedMovement[] = [];

    const manualMovements = await prisma.manualMovement.findMany({
      where: {
        occurredOn: { gte: query.from, lte: query.to },
        voidedAt: null,
      },
      include: { category: true },
    });
    movements.push(...manualMovements.map((movement: any) => this.mapManualMovement(movement)));

    const debitRows = await (prisma as any).debitCsvRow.findMany({
      where: {
        occurredOn: { gte: query.from, lte: query.to },
        status: "accepted",
        import: { status: "accepted" },
      },
      include: {
        category: true,
        import: true,
      },
    });

    for (const row of debitRows as any[]) {
      movements.push({
        id: `debit-csv:${row.id}`,
        occurredOn: row.occurredOn,
        effectiveMonthKey: monthKeyFromDate(row.occurredOn),
        type: row.movementType === "income" ? "income" : "expense",
        sourceType: "debit_csv",
        sourceId: row.id,
        description: row.description,
        category: {
          id: row.category?.id ?? null,
          name: row.category?.name ?? "Sin clasificar",
        },
        currency: normalizeCurrency(row.currency),
        amount: row.amountRaw,
        status: "actual",
        notes: row.reference,
        editable: false,
        categoryEditable: true,
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
        trace: {
          sourceLabel: row.import.bankName
            ? `${row.import.bankName} · ${row.import.fileName}`
            : `CSV débito · ${row.import.fileName}`,
          debitImportId: row.importId,
        },
      });
    }

    const incomeOverview = await incomesService.getOverview(range.from, range.to);
    const incomeSources = new Map(
      incomeOverview.sources.map((source: any) => [source.id, source]),
    );

    for (const month of incomeOverview.months) {
      for (const recurring of month.recurring) {
        const source = incomeSources.get(recurring.sourceId) as any;
        movements.push({
          id: `income-recurring:${recurring.sourceId}:${month.monthKey}`,
          occurredOn: dateForMonth(month.monthKey, source?.paymentDay),
          effectiveMonthKey: month.monthKey,
          type: "income",
          sourceType: "income_recurring",
          sourceId: recurring.sourceId,
          description: recurring.name,
          category: { id: null, name: "Ingresos" },
          currency: recurring.currency,
          amount: recurring.amount,
          status: recurring.status,
          notes: recurring.employer,
          editable: false,
          categoryEditable: false,
          createdAt: null,
          updatedAt: null,
          trace: {
            sourceLabel: recurring.employer || recurring.name,
            incomeSourceId: recurring.sourceId,
          },
        });
      }

      for (const oneOff of month.oneOffs) {
        movements.push({
          id: `income-one-off:${oneOff.id}`,
          occurredOn: dateForMonth(month.monthKey, 1),
          effectiveMonthKey: month.monthKey,
          type: "income",
          sourceType: "income_one_off",
          sourceId: oneOff.id,
          description: oneOff.label,
          category: { id: null, name: "Ingresos" },
          currency: oneOff.currency,
          amount: oneOff.amount,
          status: oneOff.status === "actual" ? "actual" : "projected",
          notes: oneOff.notes,
          editable: false,
          categoryEditable: false,
          createdAt: null,
          updatedAt: null,
          trace: { sourceLabel: "Ingreso extraordinario" },
        });
      }
    }

    const cardRows = await prisma.cardStatementRow.findMany({
      where: {
        dateIso: { gte: query.from, lte: query.to },
        rowType: { in: ["transaction", "tax", "charge"] },
        statement: { status: "accepted", isActiveForPeriod: true },
      },
      include: { statement: true },
    });

    for (const row of cardRows as any[]) {
      const description = row.referenceRaw || row.originalText || "Consumo de tarjeta";
      const sourceLabel = [row.statement.bankName, row.statement.brand, row.statement.holderName]
        .filter(Boolean)
        .join(" · ") || "Resumen de tarjeta";

      for (const currency of ["ARS", "USD"] as const) {
        const raw = currency === "ARS" ? row.amountPesosRaw : row.amountDollarsRaw;
        if (!raw) continue;
        const signed = parseMovementAmount(raw, currency, true);
        const movement = movementFromSignedAmount({
          id: `card-row:${row.id}:${currency}`,
          occurredOn: row.dateIso,
          effectiveMonthKey: monthKeyFromDate(row.dateIso),
          type: "expense",
          sourceType: "card_statement",
          sourceId: row.id,
          description,
          category: { id: null, name: categoryNameForCardRow(row.rowType) },
          currency,
          status: "actual",
          notes: row.installmentRaw || null,
          editable: false,
          categoryEditable: false,
          createdAt: iso(row.statement.createdAt),
          updatedAt: iso(row.statement.updatedAt),
          trace: { sourceLabel, statementId: row.statementId },
        }, signed);
        if (movement) movements.push(movement);
      }
    }

    const manualCardPurchases = await prisma.manualCardPurchase.findMany({
      where: {
        purchaseDate: { gte: query.from, lte: query.to },
        statement: { status: "accepted", isActiveForPeriod: true },
      },
      include: { statement: true },
    });

    for (const purchase of manualCardPurchases as any[]) {
      const currency = normalizeCurrency(purchase.currency);
      const cents = parseMovementAmount(purchase.amountRaw, currency, true);
      const movement = movementFromSignedAmount({
        id: `card-manual:${purchase.id}`,
        occurredOn: purchase.purchaseDate,
        effectiveMonthKey: monthKeyFromDate(purchase.purchaseDate),
        type: "expense",
        sourceType: "card_manual_purchase",
        sourceId: purchase.id,
        description: purchase.description,
        category: { id: null, name: "Tarjetas" },
        currency,
        status: "actual",
        notes: purchase.notes,
        editable: false,
        categoryEditable: false,
        createdAt: iso(purchase.createdAt),
        updatedAt: null,
        trace: {
          sourceLabel: `${purchase.holderName} · •••• ${purchase.cardLast4}`,
          statementId: purchase.statementId,
        },
      }, cents);
      if (movement) movements.push(movement);
    }

    if (query.includeProjected) {
      const projections = await prisma.cardInstallmentProjection.findMany({
        where: {
          monthKey: { gte: range.from, lte: range.to },
          statement: { status: "accepted", isActiveForPeriod: true },
        },
        include: { statement: true },
      });

      for (const projection of projections as any[]) {
        for (const currency of ["ARS", "USD"] as const) {
          const raw = currency === "ARS" ? projection.amountPesosRaw : projection.amountDollarsRaw;
          if (!raw) continue;
          const signed = parseMovementAmount(raw, currency, true);
          const movement = movementFromSignedAmount({
            id: `card-installment:${projection.id}:${currency}`,
            occurredOn: dateForMonth(projection.monthKey, 1),
            effectiveMonthKey: projection.monthKey,
            type: "expense",
            sourceType: "card_installment",
            sourceId: projection.id,
            description: projection.label,
            category: { id: null, name: "Tarjetas" },
            currency,
            status: "projected",
            notes: projection.installmentCurrent && projection.installmentTotal
              ? `Cuota ${projection.installmentCurrent}/${projection.installmentTotal}`
              : null,
            editable: false,
            categoryEditable: false,
            createdAt: iso(projection.createdAt),
            updatedAt: null,
            trace: {
              sourceLabel: projection.statement.bankName || projection.statement.brand || "Cuota de tarjeta",
              statementId: projection.statementId,
            },
          }, signed);
          if (movement) movements.push(movement);
        }
      }
    }

    const excludedMovementIds = options.includeReconciledExcluded
      ? new Set<string>()
      : await this.getReconciliationExcludedMovementIds();
    const visibleMovements = filterReconciledMovements(
      movements,
      excludedMovementIds,
    );

    const minByCurrency = new Map<MovementCurrency, bigint>();
    const maxByCurrency = new Map<MovementCurrency, bigint>();
    if (query.minAmount) {
      minByCurrency.set("ARS", parseMovementAmount(query.minAmount, "ARS", false));
      minByCurrency.set("USD", parseMovementAmount(query.minAmount, "USD", false));
    }
    if (query.maxAmount) {
      maxByCurrency.set("ARS", parseMovementAmount(query.maxAmount, "ARS", false));
      maxByCurrency.set("USD", parseMovementAmount(query.maxAmount, "USD", false));
    }

    const text = query.q?.toLocaleLowerCase("es");
    const category = query.category?.toLocaleLowerCase("es");
    const source = query.source?.toLocaleLowerCase("es");

    const filtered = visibleMovements.filter((movement) => {
      if (movement.occurredOn < query.from || movement.occurredOn > query.to) return false;
      if (!query.includeProjected && movement.status === "projected") return false;
      if (query.type && movement.type !== query.type) return false;
      if (query.status && movement.status !== query.status) return false;
      if (query.currency && movement.currency !== query.currency) return false;
      if (source && !movement.sourceType.toLocaleLowerCase("es").includes(source) && !movement.trace.sourceLabel.toLocaleLowerCase("es").includes(source)) return false;
      if (category && movement.category.id !== query.category && !movement.category.name.toLocaleLowerCase("es").includes(category)) return false;
      if (text) {
        const haystack = [
          movement.description,
          movement.category.name,
          movement.trace.sourceLabel,
          movement.notes || "",
        ].join(" ").toLocaleLowerCase("es");
        if (!haystack.includes(text)) return false;
      }

      const cents = parseMovementAmount(movement.amount, movement.currency, false);
      const minimum = minByCurrency.get(movement.currency);
      const maximum = maxByCurrency.get(movement.currency);
      if (minimum !== undefined && cents < minimum) return false;
      if (maximum !== undefined && cents > maximum) return false;
      return true;
    });

    filtered.sort((left, right) => {
      const dateOrder = right.occurredOn.localeCompare(left.occurredOn);
      return dateOrder !== 0 ? dateOrder : right.id.localeCompare(left.id);
    });

    let incomeArs = 0n;
    let expenseArs = 0n;
    let incomeUsd = 0n;
    let expenseUsd = 0n;
    for (const movement of filtered) {
      const cents = parseMovementAmount(movement.amount, movement.currency, false);
      if (movement.currency === "ARS") {
        if (movement.type === "income") incomeArs += cents;
        else expenseArs += cents;
      } else if (movement.type === "income") incomeUsd += cents;
      else expenseUsd += cents;
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const offset = (page - 1) * query.pageSize;

    return {
      range: { from: query.from, to: query.to },
      filters: {
        type: query.type ?? null,
        source: query.source ?? null,
        category: query.category ?? null,
        status: query.status ?? null,
        currency: query.currency ?? null,
        q: query.q ?? null,
        includeProjected: query.includeProjected,
      },
      summary: {
        incomeArs: formatMovementAmount(incomeArs, "ARS"),
        expenseArs: formatMovementAmount(expenseArs, "ARS"),
        balanceArs: formatMovementAmount(incomeArs - expenseArs, "ARS"),
        incomeUsd: formatMovementAmount(incomeUsd, "USD"),
        expenseUsd: formatMovementAmount(expenseUsd, "USD"),
        balanceUsd: formatMovementAmount(incomeUsd - expenseUsd, "USD"),
        records: total,
      },
      pagination: {
        page,
        pageSize: query.pageSize,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
      items: filtered.slice(offset, offset + query.pageSize),
    };
  }

  async exportCsv(query: MovementQueryInput): Promise<{ csv: string; fileName: string; records: number }> {
    const movements = await this.getAllMovements(query);
    return {
      csv: buildMovementsCsv(movements),
      fileName: `cajaapp-movimientos-${query.from}-${query.to}.csv`,
      records: movements.length,
    };
  }

  async getAllMovements(
    input: Omit<MovementQueryInput, "page" | "pageSize">,
    options: MovementReadOptions = {},
  ): Promise<NormalizedMovement[]> {
    const result = await this.getMovements(
      {
        ...input,
        page: 1,
        pageSize: Number.MAX_SAFE_INTEGER,
      },
      options,
    );
    return result.items;
  }

  private async getReconciliationExcludedMovementIds(): Promise<Set<string>> {
    const resolved = await prisma.reconciliationCase.findMany({
      where: {
        status: "resolved",
        excludedMovementId: { not: null },
      },
      select: { excludedMovementId: true },
    });
    return new Set(
      resolved
        .map((item: { excludedMovementId: string | null }) =>
          item.excludedMovementId,
        )
        .filter((value: string | null): value is string => Boolean(value)),
    );
  }

}

export const movementsService = new MovementsService();
