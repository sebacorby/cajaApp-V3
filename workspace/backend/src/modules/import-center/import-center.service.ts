import { prisma } from "../../db/prisma.js";
import { NotFoundError } from "../../shared/errors.js";

export type ImportCenterKind =
  | "card_statement"
  | "salary_receipt"
  | "debit_csv";

export type ImportCenterStatus =
  | "processing"
  | "needs_review"
  | "accepted"
  | "failed"
  | "superseded"
  | "reversed"
  | "archived";

export interface ImportCenterQuery {
  kind: "all" | ImportCenterKind;
  status: "all" | ImportCenterStatus;
  search: string;
  limit: number;
  offset: number;
}

export interface ImportCenterError {
  message: string;
  stage: string | null;
  details: string[];
}

export interface ImportCenterAiInfo {
  status: string;
  provider: string;
  model: string;
  completedAt: string | null;
  warnings: string[];
}

export interface ImportCenterNavigation {
  section: "tarjetas" | "ingresos" | "movimientos";
  label: string;
}

export interface ImportCenterItem {
  id: string;
  kind: ImportCenterKind;
  entityId: string;
  documentId: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number | null;
  sha256: string;
  pageCount: number | null;
  status: ImportCenterStatus;
  title: string;
  subtitle: string;
  periodKey: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  requiresAction: boolean;
  correctionCount: number;
  version: number | null;
  active: boolean;
  error: ImportCenterError | null;
  issues: string[];
  ai: ImportCenterAiInfo | null;
  navigation: ImportCenterNavigation;
  metadata: Record<string, string | number | boolean | null>;
}

export interface ImportCenterSummary {
  total: number;
  processing: number;
  needsReview: number;
  accepted: number;
  failed: number;
  corrected: number;
  reversed: number;
}

function asIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function uniqueMessages(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter(
    (value): value is string => Boolean(value),
  ))];
}

function parseJson(value: string | null | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export function parseValidationMessages(
  value: string | null | undefined,
): string[] {
  const parsed = parseJson(value);
  if (!parsed) return [];
  if (typeof parsed === "string") return [parsed];
  if (Array.isArray(parsed)) {
    return uniqueMessages(
      parsed.flatMap((entry) => {
        if (typeof entry === "string") return [entry];
        if (entry && typeof entry === "object") {
          const candidate = entry as {
            message?: unknown;
            error?: unknown;
          };
          return [
            typeof candidate.message === "string" ? candidate.message : null,
            typeof candidate.error === "string" ? candidate.error : null,
          ];
        }
        return [];
      }),
    );
  }
  if (typeof parsed === "object") {
    const candidate = parsed as {
      message?: unknown;
      error?: unknown;
      errors?: unknown;
    };
    const messages: Array<string | null> = [
      typeof candidate.message === "string" ? candidate.message : null,
      typeof candidate.error === "string" ? candidate.error : null,
    ];
    if (Array.isArray(candidate.errors)) {
      messages.push(
        ...candidate.errors.map((entry) =>
          typeof entry === "string"
            ? entry
            : entry && typeof entry === "object" &&
                typeof (entry as { message?: unknown }).message === "string"
              ? String((entry as { message: string }).message)
              : null,
        ),
      );
    }
    return uniqueMessages(messages);
  }
  return [];
}

export function parsePreviewError(
  value: string | null | undefined,
): ImportCenterError | null {
  const parsed = parseJson(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const candidate = parsed as {
    error?: unknown;
    errorStage?: unknown;
    stage?: unknown;
  };
  if (!candidate.error) return null;

  if (typeof candidate.error === "string") {
    return {
      message: candidate.error,
      stage:
        typeof candidate.errorStage === "string"
          ? candidate.errorStage
          : typeof candidate.stage === "string"
            ? candidate.stage
            : null,
      details: [],
    };
  }

  if (typeof candidate.error === "object") {
    const error = candidate.error as {
      message?: unknown;
      code?: unknown;
      stage?: unknown;
    };
    const message =
      typeof error.message === "string"
        ? error.message
        : "La importación terminó con un error.";
    return {
      message,
      stage:
        typeof error.stage === "string"
          ? error.stage
          : typeof candidate.errorStage === "string"
            ? candidate.errorStage
            : typeof candidate.stage === "string"
              ? candidate.stage
              : null,
      details:
        typeof error.code === "string"
          ? [`Código: ${error.code}`]
          : [],
    };
  }

  return null;
}

export function normalizeImportCenterStatus(
  kind: ImportCenterKind,
  status: string,
  archivedAt?: Date | string | null,
): ImportCenterStatus {
  if (archivedAt) return "archived";
  if (
    status === "processing" ||
    status === "started" ||
    status === "recovering" ||
    status === "imported" ||
    status === "queued"
  ) {
    return "processing";
  }
  if (status === "preview_ready" || status === "draft") {
    return "needs_review";
  }
  if (status === "accepted") return "accepted";
  if (status === "failed" || status === "rejected") return "failed";
  if (status === "superseded") return "superseded";
  if (status === "reversed") return "reversed";
  if (status === "archived") return "archived";
  return "failed";
}

export function buildImportCenterSummary(
  items: ImportCenterItem[],
): ImportCenterSummary {
  return {
    total: items.length,
    processing: items.filter((item) => item.status === "processing").length,
    needsReview: items.filter((item) => item.status === "needs_review").length,
    accepted: items.filter((item) => item.status === "accepted").length,
    failed: items.filter((item) => item.status === "failed").length,
    corrected: items.filter(
      (item) =>
        item.correctionCount > 0 ||
        item.status === "superseded",
    ).length,
    reversed: items.filter((item) => item.status === "reversed").length,
  };
}

function searchableText(item: ImportCenterItem): string {
  return [
    item.title,
    item.subtitle,
    item.fileName,
    item.periodKey,
    item.status,
    item.kind,
    ...Object.values(item.metadata),
    item.error?.message,
    ...item.issues,
  ]
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export function applyImportCenterFilters(
  items: ImportCenterItem[],
  query: ImportCenterQuery,
): ImportCenterItem[] {
  const needle = query.search
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();

  return items
    .filter((item) => query.kind === "all" || item.kind === query.kind)
    .filter((item) => query.status === "all" || item.status === query.status)
    .filter((item) => !needle || searchableText(item).includes(needle))
    .sort(
      (left, right) =>
        Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
    );
}

function aiInfo(aiRun: {
  status: string;
  modelProvider: string;
  modelName: string;
  completedAt: Date | null;
  validationErrors: string | null;
} | null): ImportCenterAiInfo | null {
  if (!aiRun) return null;
  return {
    status: aiRun.status,
    provider: aiRun.modelProvider,
    model: aiRun.modelName,
    completedAt: asIso(aiRun.completedAt),
    warnings: parseValidationMessages(aiRun.validationErrors),
  };
}

function requiresAction(status: ImportCenterStatus): boolean {
  return status === "needs_review" || status === "failed";
}

async function loadCardItems(): Promise<ImportCenterItem[]> {
  const [drafts, standaloneStatements] = await Promise.all([
    prisma.cardStatementDraft.findMany({
      take: 500,
      orderBy: { updatedAt: "desc" },
      include: {
        document: true,
        aiRun: true,
        acceptedStatement: true,
      },
    }),
    prisma.cardStatement.findMany({
      where: { draftId: null },
      take: 500,
      orderBy: { updatedAt: "desc" },
      include: { document: true },
    }),
  ]);

  const draftItems = drafts.map((draft) => {
    const statement = draft.acceptedStatement;
    const rawStatus = statement?.status ?? draft.status;
    const status = normalizeImportCenterStatus(
      "card_statement",
      rawStatus,
      statement?.archivedAt,
    );
    const previewError = parsePreviewError(draft.previewJson);
    const aiWarnings = parseValidationMessages(draft.aiRun?.validationErrors);
    const error =
      status === "failed"
        ? previewError ?? {
            message: aiWarnings[0] ?? "La importación del resumen falló.",
            stage: null,
            details: aiWarnings.slice(1),
          }
        : null;
    const title = statement
      ? [statement.bankName, statement.brand].filter(Boolean).join(" · ") ||
        "Resumen de tarjeta"
      : "Resumen de tarjeta pendiente";

    return {
      id: `card_statement:${statement?.id ?? draft.id}`,
      kind: "card_statement" as const,
      entityId: statement?.id ?? draft.id,
      documentId: draft.document.id,
      fileName: draft.document.fileName,
      mimeType: draft.document.mimeType,
      sizeBytes: draft.document.sizeBytes,
      sha256: draft.document.sha256,
      pageCount: draft.document.pageCount,
      status,
      title,
      subtitle: statement?.holderName
        ? `${statement.holderName} · ${draft.document.fileName}`
        : draft.document.fileName,
      periodKey: statement?.periodKey ?? null,
      createdAt: draft.createdAt.toISOString(),
      updatedAt: (statement?.updatedAt ?? draft.updatedAt).toISOString(),
      completedAt:
        asIso(draft.aiRun?.completedAt) ??
        (statement ? statement.createdAt.toISOString() : null),
      requiresAction: requiresAction(status),
      correctionCount: Math.max((statement?.version ?? 1) - 1, 0),
      version: statement?.version ?? null,
      active: statement?.isActiveForPeriod ?? status !== "failed",
      error,
      issues: status === "failed" ? [] : aiWarnings,
      ai: aiInfo(draft.aiRun),
      navigation: {
        section: "tarjetas" as const,
        label: "Abrir en Tarjetas",
      },
      metadata: {
        banco: statement?.bankName ?? null,
        marca: statement?.brand ?? null,
        titular: statement?.holderName ?? null,
        periodo: statement?.periodKey ?? null,
        totalPesos: statement?.totalPesosRaw ?? null,
        totalDolares: statement?.totalDollarsRaw ?? null,
      },
    };
  });

  const standaloneItems = standaloneStatements.map((statement) => {
    const status = normalizeImportCenterStatus(
      "card_statement",
      statement.status,
      statement.archivedAt,
    );
    return {
      id: `card_statement:${statement.id}`,
      kind: "card_statement" as const,
      entityId: statement.id,
      documentId: statement.document.id,
      fileName: statement.document.fileName,
      mimeType: statement.document.mimeType,
      sizeBytes: statement.document.sizeBytes,
      sha256: statement.document.sha256,
      pageCount: statement.document.pageCount,
      status,
      title:
        [statement.bankName, statement.brand].filter(Boolean).join(" · ") ||
        "Resumen de tarjeta",
      subtitle: statement.holderName
        ? `${statement.holderName} · ${statement.document.fileName}`
        : statement.document.fileName,
      periodKey: statement.periodKey,
      createdAt: statement.createdAt.toISOString(),
      updatedAt: statement.updatedAt.toISOString(),
      completedAt: statement.createdAt.toISOString(),
      requiresAction: requiresAction(status),
      correctionCount: Math.max(statement.version - 1, 0),
      version: statement.version,
      active: statement.isActiveForPeriod,
      error: null,
      issues: [],
      ai: null,
      navigation: {
        section: "tarjetas" as const,
        label: "Abrir en Tarjetas",
      },
      metadata: {
        banco: statement.bankName,
        marca: statement.brand,
        titular: statement.holderName,
        periodo: statement.periodKey,
        totalPesos: statement.totalPesosRaw,
        totalDolares: statement.totalDollarsRaw,
      },
    };
  });

  return [...draftItems, ...standaloneItems];
}

function readSalarySource(
  previewJson: string | null,
): {
  employerName?: string;
  employeeName?: string;
  periodMonthKey?: string;
  netAmount?: string;
} {
  const parsed = parseJson(previewJson);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const preview = parsed as {
    source?: {
      employerName?: unknown;
      employeeName?: unknown;
      periodMonthKey?: unknown;
    };
    summary?: { netAmount?: unknown };
  };
  return {
    employerName:
      typeof preview.source?.employerName === "string"
        ? preview.source.employerName
        : undefined,
    employeeName:
      typeof preview.source?.employeeName === "string"
        ? preview.source.employeeName
        : undefined,
    periodMonthKey:
      typeof preview.source?.periodMonthKey === "string"
        ? preview.source.periodMonthKey
        : undefined,
    netAmount:
      typeof preview.summary?.netAmount === "string"
        ? preview.summary.netAmount
        : undefined,
  };
}

async function loadSalaryItems(): Promise<ImportCenterItem[]> {
  const [drafts, standaloneReceipts] = await Promise.all([
    prisma.salaryReceiptDraft.findMany({
      take: 500,
      orderBy: { updatedAt: "desc" },
      include: {
        document: true,
        aiRun: true,
        acceptedReceipt: true,
      },
    }),
    prisma.salaryReceipt.findMany({
      where: { draftId: null },
      take: 500,
      orderBy: { updatedAt: "desc" },
      include: { document: true },
    }),
  ]);

  const draftItems = drafts.map((draft) => {
    const receipt = draft.acceptedReceipt;
    const preview = readSalarySource(draft.previewJson);
    const status = normalizeImportCenterStatus(
      "salary_receipt",
      receipt?.status ?? draft.status,
    );
    const previewError = parsePreviewError(draft.previewJson);
    const aiWarnings = parseValidationMessages(draft.aiRun?.validationErrors);
    const employer = receipt?.employerName ?? preview.employerName;
    const employee = receipt?.employeeName ?? preview.employeeName;
    const period = receipt?.periodMonthKey ?? preview.periodMonthKey ?? null;
    const error =
      status === "failed"
        ? previewError ?? {
            message: aiWarnings[0] ?? "La importación del recibo falló.",
            stage: null,
            details: aiWarnings.slice(1),
          }
        : null;

    return {
      id: `salary_receipt:${receipt?.id ?? draft.id}`,
      kind: "salary_receipt" as const,
      entityId: receipt?.id ?? draft.id,
      documentId: draft.document.id,
      fileName: draft.document.fileName,
      mimeType: draft.document.mimeType,
      sizeBytes: draft.document.sizeBytes,
      sha256: draft.document.sha256,
      pageCount: draft.document.pageCount,
      status,
      title: period
        ? `Recibo ${period}${employer ? ` · ${employer}` : ""}`
        : "Recibo de sueldo pendiente",
      subtitle: employee
        ? `${employee} · ${draft.document.fileName}`
        : draft.document.fileName,
      periodKey: period,
      createdAt: draft.createdAt.toISOString(),
      updatedAt: (receipt?.updatedAt ?? draft.updatedAt).toISOString(),
      completedAt:
        receipt?.acceptedAt.toISOString() ??
        asIso(draft.aiRun?.completedAt),
      requiresAction: requiresAction(status),
      correctionCount: Math.max((receipt?.version ?? 1) - 1, 0),
      version: receipt?.version ?? null,
      active: receipt?.isActiveForPeriod ?? status !== "failed",
      error,
      issues: status === "failed" ? [] : aiWarnings,
      ai: aiInfo(draft.aiRun),
      navigation: {
        section: "ingresos" as const,
        label: "Abrir en Ingresos",
      },
      metadata: {
        empleador: employer ?? null,
        empleado: employee ?? null,
        periodo: period,
        neto: receipt?.netAmountRaw ?? preview.netAmount ?? null,
        ingresoReal: Boolean(receipt?.actualIncomeEventId),
        baseFutura: Boolean(receipt?.projectionIncomeEventId),
      },
    };
  });

  const standaloneItems = standaloneReceipts.map((receipt) => {
    const status = normalizeImportCenterStatus(
      "salary_receipt",
      receipt.status,
    );
    return {
      id: `salary_receipt:${receipt.id}`,
      kind: "salary_receipt" as const,
      entityId: receipt.id,
      documentId: receipt.document.id,
      fileName: receipt.document.fileName,
      mimeType: receipt.document.mimeType,
      sizeBytes: receipt.document.sizeBytes,
      sha256: receipt.document.sha256,
      pageCount: receipt.document.pageCount,
      status,
      title: `Recibo ${receipt.periodMonthKey} · ${receipt.employerName}`,
      subtitle: `${receipt.employeeName} · ${receipt.document.fileName}`,
      periodKey: receipt.periodMonthKey,
      createdAt: receipt.createdAt.toISOString(),
      updatedAt: receipt.updatedAt.toISOString(),
      completedAt: receipt.acceptedAt.toISOString(),
      requiresAction: requiresAction(status),
      correctionCount: Math.max(receipt.version - 1, 0),
      version: receipt.version,
      active: receipt.isActiveForPeriod,
      error: null,
      issues: [],
      ai: null,
      navigation: {
        section: "ingresos" as const,
        label: "Abrir en Ingresos",
      },
      metadata: {
        empleador: receipt.employerName,
        empleado: receipt.employeeName,
        periodo: receipt.periodMonthKey,
        neto: receipt.netAmountRaw,
        ingresoReal: Boolean(receipt.actualIncomeEventId),
        baseFutura: Boolean(receipt.projectionIncomeEventId),
      },
    };
  });

  return [...draftItems, ...standaloneItems];
}

async function loadDebitItems(): Promise<ImportCenterItem[]> {
  const imports = await (prisma as any).debitCsvImport.findMany({
    take: 500,
    orderBy: { updatedAt: "desc" },
    include: {
      rows: {
        select: {
          status: true,
          validationError: true,
        },
      },
    },
  });

  return imports.map((item: any) => {
    const status = normalizeImportCenterStatus("debit_csv", item.status);
    const rowIssues = uniqueMessages(
      (item.rows as Array<{ validationError: string | null }>).map(
        (row) => row.validationError,
      ),
    );
    const error =
      status === "failed"
        ? {
            message:
              rowIssues[0] ?? "La importación del CSV terminó con errores.",
            stage: "csv_validation",
            details: rowIssues.slice(1),
          }
        : null;

    return {
      id: `debit_csv:${item.id}`,
      kind: "debit_csv" as const,
      entityId: item.id,
      documentId: null,
      fileName: item.fileName,
      mimeType: "text/csv",
      sizeBytes: null,
      sha256: item.sha256,
      pageCount: null,
      status,
      title: item.bankName
        ? `Movimientos débito · ${item.bankName}`
        : "Movimientos débito",
      subtitle: item.fileName,
      periodKey: null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      completedAt:
        asIso(item.reversedAt) ??
        asIso(item.acceptedAt),
      requiresAction: requiresAction(status),
      correctionCount: 0,
      version: null,
      active: status !== "reversed" && status !== "failed",
      error,
      issues: status === "failed" ? [] : rowIssues,
      ai: null,
      navigation: {
        section: "movimientos" as const,
        label: "Abrir en Movimientos",
      },
      metadata: {
        banco: item.bankName,
        filas: item.rowCount,
        aceptadas: item.acceptedCount,
        omitidas: item.omittedCount,
        rechazadas: item.rejectedCount,
        delimitador: item.delimiter,
        codificacion: item.encoding,
      },
    };
  });
}

export class ImportCenterService {
  private async loadItems(): Promise<ImportCenterItem[]> {
    const [cards, salaryReceipts, debitImports] = await Promise.all([
      loadCardItems(),
      loadSalaryItems(),
      loadDebitItems(),
    ]);
    return [...cards, ...salaryReceipts, ...debitImports];
  }

  async list(query: ImportCenterQuery) {
    const allItems = await this.loadItems();
    const filteredItems = applyImportCenterFilters(allItems, query);
    const paginatedItems = filteredItems.slice(
      query.offset,
      query.offset + query.limit,
    );

    return {
      items: paginatedItems,
      summary: buildImportCenterSummary(allItems),
      pagination: {
        limit: query.limit,
        offset: query.offset,
        total: filteredItems.length,
        hasMore: query.offset + paginatedItems.length < filteredItems.length,
      },
    };
  }

  async detail(kind: ImportCenterKind, id: string) {
    const allItems = await this.loadItems();
    const item = allItems.find(
      (candidate) =>
        candidate.kind === kind &&
        candidate.entityId === id,
    );
    if (!item) throw new NotFoundError("Import center item");
    return item;
  }
}

export const importCenterService = new ImportCenterService();
