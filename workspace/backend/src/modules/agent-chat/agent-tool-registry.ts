import { z, type ZodTypeAny } from "zod";
import type { AgentToolDefinition, AgentJsonValue } from "../ai/agent/agent-chat-provider.js";
import type { AgentEntityRef, AgentRiskClass, AgentToolPublicDefinition } from "./agent-types.js";
import { globalSearchService } from "../global-search/global-search.service.js";
import { globalSearchQuerySchema } from "../global-search/global-search.schemas.js";
import { dashboardService } from "../dashboard/dashboard.service.js";
import { dashboardQuerySchema } from "../dashboard/dashboard.schemas.js";
import { movementsService } from "../movements/movements.service.js";
import { movementCategoriesService } from "../movements/categories.service.js";
import {
  assignMovementCategorySchema,
  createManualMovementSchema,
  createMovementCategorySchema,
  movementQuerySchema,
  suggestMovementCategorySchema,
  updateManualMovementSchema,
  updateMovementCategorySchema,
} from "../movements/movements.schemas.js";
import { cardsService } from "../cards/cards.service.js";
import { cardStatementPreviewSchema, exchangeRateUpdateSchema, manualPurchaseSchema } from "../cards/cards.schemas.js";
import { manualPurchasesService } from "../manual-purchases/manual-purchases.service.js";
import { importsService } from "../imports/imports.service.js";
import { importCenterService } from "../import-center/import-center.service.js";
import { debitImportsService } from "../debit-imports/debit-imports.service.js";
import { debitImportRowUpdateSchema } from "../debit-imports/debit-imports.schemas.js";
import { salaryReceiptsService } from "../salary-receipts/salary-receipts.service.js";
import { salaryReceiptPreviewSchema } from "../salary-receipts/salary-receipts.schemas.js";
import { incomesService } from "../incomes/incomes.service.js";
import { createIncomeEventSchema, createIncomeSourceSchema, updateIncomeSourceSchema } from "../incomes/incomes.schemas.js";
import { budgetsService } from "../budgets/budgets.service.js";
import { changeBudgetStatusSchema, createBudgetSchema, updateBudgetSchema } from "../budgets/budgets.schemas.js";
import { goalsService } from "../goals/goals.service.js";
import { changeGoalStatusSchema, createGoalContributionSchema, createGoalSchema, updateGoalSchema } from "../goals/goals.schemas.js";
import { futureService } from "../future/future.service.js";
import { reportsService } from "../reports/reports.service.js";
import { reconciliationService } from "../reconciliation/reconciliation.service.js";
import { resolveReconciliationSchema, scanReconciliationSchema } from "../reconciliation/reconciliation.schemas.js";
import { financialHealthService } from "../financial-health/financial-health.service.js";
import { monthCloseService } from "../month-close/month-close.service.js";
import { backupRestoreService } from "../backup-restore/backup-restore.service.js";
import { settingsService } from "../settings/settings.service.js";
import { updateSettingsSchema } from "../settings/settings.schemas.js";
import { agentChatService } from "./agent-chat.service.js";

export const AGENT_READ_TOOL_NAMES = [
  "app.search",
  "dashboard.get_overview",
  "movements.list",
  "movements.export_csv",
  "categories.list",
  "categories.suggest",
  "cards.list_statements",
  "cards.get_latest",
  "cards.get_statement",
  "cards.get_traceability",
  "cards.get_exchange_rate",
  "cards.get_updated_values",
  "card_import.get_status",
  "card_import.get_draft",
  "import_center.list",
  "import_center.get",
  "debit_import.list",
  "debit_import.get",
  "salary_receipt.list",
  "salary_receipt.get",
  "salary_receipt.get_draft",
  "incomes.get_overview",
  "budgets.get_overview",
  "budgets.list",
  "goals.get_overview",
  "goals.list",
  "goals.get",
  "future.get_overview",
  "reports.get",
  "reports.export_csv",
  "reconciliation.list",
  "reconciliation.get",
  "financial_health.get",
  "financial_health.history",
  "month_close.list",
  "month_close.get",
  "backup.list",
  "backup.download",
  "settings.get",
  "settings.get_system",
  "ui.navigate",
] as const;

export const AGENT_R2_TOOL_NAMES = [
  "movements.create_manual",
  "movements.update_manual",
  "categories.create",
  "categories.update",
  "categories.assign",
  "incomes.create_source",
  "incomes.update_source",
  "incomes.create_event",
  "budgets.create",
  "budgets.update",
  "budgets.set_status",
  "goals.create",
  "goals.update",
  "goals.set_status",
  "goals.add_contribution",
  "cards.set_exchange_rate",
  "cards.create_manual_purchase",
  "backup.create",
  "card_import.upload_attachment",
  "card_import.update_draft",
  "debit_import.preview_attachment",
  "debit_import.update_row",
  "salary_receipt.import_attachment",
  "salary_receipt.update_draft",
  "backup.validate",
  "reconciliation.scan",
  "financial_health.create_snapshot",
  "settings.update",
] as const;

export const AGENT_R3_TOOL_NAMES = [
  "card_import.accept_draft",
  "cards.archive_statement",
  "cards.activate_statement",
  "debit_import.accept",
  "debit_import.delete",
  "debit_import.reverse",
  "salary_receipt.accept_draft",
  "salary_receipt.reverse",
  "movements.void_manual",
  "cards.delete_manual_purchase",
  "categories.archive",
  "categories.restore",
  "incomes.delete_source",
  "incomes.delete_event",
  "budgets.delete",
  "goals.delete",
  "goals.delete_contribution",
  "reconciliation.resolve",
  "reconciliation.reopen",
  "month_close.create",
  "month_close.reopen",
  "financial_health.delete_snapshot",
] as const;

export const AGENT_R4_TOOL_NAMES = ["backup.restore"] as const;

export const AGENT_TOOL_NAMES = [...AGENT_READ_TOOL_NAMES, ...AGENT_R2_TOOL_NAMES, ...AGENT_R3_TOOL_NAMES, ...AGENT_R4_TOOL_NAMES] as const;

export interface AgentToolContext {
  conversationId?: string;
}

export interface AgentToolRegistryEntry {
  name: string;
  description: string;
  inputSchema: ZodTypeAny;
  riskClass: AgentRiskClass;
  parallelSafe: boolean;
  requiresExplicitIntent: boolean;
  handler: (args: unknown, context: AgentToolContext) => Promise<unknown>;
  resultProjector: (result: unknown) => AgentJsonValue;
  auditEntityRefs: (result: unknown, args: unknown) => AgentEntityRef[];
  impactSummary?: (args: unknown) => unknown | Promise<unknown>;
}

const emptySchema = z.object({});
const uuidSchema = z.string().uuid();
const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const rangeSchema = z.object({ from: isoDateSchema, to: isoDateSchema });
const monthRangeSchema = z.object({ from: monthKeySchema, to: monthKeySchema });
const idSchema = z.object({ id: uuidSchema });
const statementIdSchema = z.object({ statementId: uuidSchema });
const draftIdSchema = z.object({ draftId: uuidSchema });
const restoreSchema = z.object({ backupId: uuidSchema });

const SECRET_KEYS = /(?:api[_-]?key|token|secret|password|storagepath|filepath|promptfilepath|rawresponsepath|databaseurl|authorization|cookie)/i;

function projectValue(value: unknown): AgentJsonValue | undefined {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return undefined;
  if (Array.isArray(value)) {
    return value.map(projectValue).filter((item): item is AgentJsonValue => item !== undefined);
  }
  if (value && typeof value === "object") {
    const projected: Record<string, AgentJsonValue> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (SECRET_KEYS.test(key)) continue;
      const safe = projectValue(nested);
      if (safe !== undefined) projected[key] = safe;
    }
    return projected;
  }
  return String(value);
}

export function projectAgentResult(result: unknown): AgentJsonValue {
  return projectValue(result) ?? null;
}

function providerSchema(schema: ZodTypeAny): Record<string, AgentJsonValue> {
  const def = (schema as any)._def;
  const typeName = def?.typeName as string | undefined;
  if (["ZodOptional", "ZodNullable", "ZodDefault", "ZodCatch", "ZodBranded"].includes(typeName ?? "")) {
    return providerSchema(def.innerType ?? def.type);
  }
  if (typeName === "ZodEffects") return providerSchema(def.schema);
  if (typeName === "ZodString") return { type: "string" };
  if (typeName === "ZodNumber") return { type: "number" };
  if (typeName === "ZodBoolean") return { type: "boolean" };
  if (typeName === "ZodLiteral") return { enum: [projectAgentResult(def.value)] };
  if (typeName === "ZodEnum") return { type: "string", enum: def.values };
  if (typeName === "ZodArray") return { type: "array", items: providerSchema(def.type) };
  if (typeName === "ZodUnion") return { anyOf: def.options.map((item: ZodTypeAny) => providerSchema(item)) };
  if (typeName === "ZodObject") {
    const shape = typeof def.shape === "function" ? def.shape() : def.shape;
    const properties: Record<string, AgentJsonValue> = {};
    const required: string[] = [];
    for (const [key, child] of Object.entries(shape) as Array<[string, ZodTypeAny]>) {
      properties[key] = providerSchema(child) as AgentJsonValue;
      if (!child.isOptional()) required.push(key);
    }
    return { type: "object", properties, additionalProperties: false, ...(required.length ? { required } : {}) };
  }
  return {};
}

function refsNone(): AgentEntityRef[] { return []; }

function refFromArg(entityType: string, section: string, key: string) {
  return (_result: unknown, args: unknown): AgentEntityRef[] => {
    const value = (args as Record<string, unknown> | null)?.[key];
    return typeof value === "string" ? [{ entityType, entityId: value, section }] : [];
  };
}

function refFromResult(entityType: string, section: string, key = "id") {
  return (result: unknown): AgentEntityRef[] => {
    const value = (result as Record<string, unknown> | null)?.[key];
    return typeof value === "string" ? [{ entityType, entityId: value, section }] : [];
  };
}

function makeReadTool(
  name: string,
  description: string,
  inputSchema: ZodTypeAny,
  handler: (args: any) => Promise<unknown>,
  auditEntityRefs: AgentToolRegistryEntry["auditEntityRefs"] = refsNone,
  resultProjector: AgentToolRegistryEntry["resultProjector"] = projectAgentResult,
): AgentToolRegistryEntry {
  return {
    name, description, inputSchema,
    riskClass: "R0",
    parallelSafe: true,
    requiresExplicitIntent: false,
    handler,
    resultProjector,
    auditEntityRefs,
  };
}

function makeArtifactTool(
  name: string,
  description: string,
  inputSchema: ZodTypeAny,
  handler: (args: any) => Promise<unknown>,
  resultProjector: AgentToolRegistryEntry["resultProjector"],
): AgentToolRegistryEntry {
  return {
    name, description, inputSchema,
    riskClass: "R1",
    parallelSafe: false,
    requiresExplicitIntent: true,
    handler,
    resultProjector,
    auditEntityRefs: refsNone,
  };
}

function makeWriteTool(
  name: string,
  description: string,
  inputSchema: ZodTypeAny,
  handler: (args: any, context: AgentToolContext) => Promise<unknown>,
  auditEntityRefs: AgentToolRegistryEntry["auditEntityRefs"] = refsNone,
): AgentToolRegistryEntry {
  return {
    name, description, inputSchema,
    riskClass: "R2",
    parallelSafe: false,
    requiresExplicitIntent: true,
    handler,
    resultProjector: projectAgentResult,
    auditEntityRefs,
  };
}

function defaultCriticalImpact(name: string, riskClass: "R3" | "R4") {
  return (args: unknown) => ({
    tool: name,
    riskClass,
    arguments: projectAgentResult(args),
    reversible: riskClass === "R3",
    warning:
      riskClass === "R4"
        ? "Restaurar la base de datos reemplaza TODOS los datos actuales por el contenido del backup."
        : "Acción crítica: materializa, revierte o elimina datos reales de CajaApp.",
  });
}

function makeCriticalTool(
  name: string,
  description: string,
  inputSchema: ZodTypeAny,
  handler: (args: any) => Promise<unknown>,
  riskClass: "R3" | "R4",
  auditEntityRefs: AgentToolRegistryEntry["auditEntityRefs"] = refsNone,
  impactSummary?: AgentToolRegistryEntry["impactSummary"],
): AgentToolRegistryEntry {
  return {
    name, description, inputSchema,
    riskClass,
    parallelSafe: false,
    requiresExplicitIntent: false,
    handler,
    resultProjector: projectAgentResult,
    auditEntityRefs,
    impactSummary: impactSummary ?? defaultCriticalImpact(name, riskClass),
  };
}

export class AgentToolRegistry {
  private readonly byName: Map<string, AgentToolRegistryEntry>;

  constructor(entries: AgentToolRegistryEntry[]) {
    this.byName = new Map();
    for (const entry of entries) {
      if (this.byName.has(entry.name)) throw new Error(`Duplicate agent tool: ${entry.name}`);
      this.byName.set(entry.name, Object.freeze({ ...entry }));
    }
  }

  lookup(name: string): AgentToolRegistryEntry | undefined { return this.byName.get(name); }

  require(name: string): AgentToolRegistryEntry {
    const tool = this.lookup(name);
    if (!tool) throw Object.assign(new Error(`Unknown agent tool: ${name}`), { code: "UNKNOWN_TOOL" });
    return tool;
  }

  listPublic(): AgentToolPublicDefinition[] {
    return [...this.byName.values()].map(({ name, description, riskClass, parallelSafe, requiresExplicitIntent }) => ({
      name, description, riskClass, parallelSafe, requiresExplicitIntent,
    }));
  }

  listProviderTools(): AgentToolDefinition[] {
    return [...this.byName.values()].map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: providerSchema(tool.inputSchema) as Record<string, AgentJsonValue>,
    }));
  }
}

const cardsListSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(160).optional(),
  status: z.string().trim().max(40).optional(),
  includeArchived: z.boolean().default(false),
});
const importCenterListSchema = z.object({
  kind: z.enum(["all", "card_statement", "salary_receipt", "debit_csv"]).optional(),
  status: z.enum(["all", "processing", "needs_review", "accepted", "failed", "superseded", "reversed", "archived"]).optional(),
  search: z.string().max(160).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).max(999999).optional(),
});
const importCenterGetSchema = z.object({
  kind: z.enum(["card_statement", "salary_receipt", "debit_csv"]),
  id: uuidSchema,
});
const salaryListSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  includeReversed: z.boolean().default(false),
});
const incomesOverviewSchema = monthRangeSchema;
const budgetQuerySchema = z.object({
  from: monthKeySchema.optional(),
  to: monthKeySchema.optional(),
  status: z.enum(["active", "paused", "closed"]).optional(),
});
const goalsOverviewSchema = z.object({
  status: z.enum(["active", "paused", "completed", "closed"]).optional(),
  limit: z.number().int().min(1).max(20).optional(),
});
const goalsListSchema = z.object({
  status: z.enum(["active", "paused", "completed", "closed"]).optional(),
});
const goalGetSchema = z.object({ goalId: uuidSchema });
const futureSchema = z.object({
  from: monthKeySchema,
  months: z.number().int().min(1).max(36).default(12),
});
const reconciliationListSchema = z.object({
  status: z.enum(["all", "open", "resolved", "dismissed"]).optional(),
  relationType: z.enum(["all", "duplicate_movement", "salary_deposit", "card_payment"]).optional(),
  scope: z.enum(["all", "current", "historical"]).optional(),
  search: z.string().max(160).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).max(999999).optional(),
});
const historySchema = z.object({ limit: z.number().int().min(1).max(50).default(12) });
const monthCloseListSchema = z.object({
  monthKey: monthKeySchema.optional(),
  status: z.enum(["all", "closed", "reopened"]).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).max(999999).optional(),
});
const uiNavigateSchema = z.object({
  section: z.enum([
    "dashboard", "movimientos", "ingresos", "tarjetas", "importaciones", "conciliacion",
    "cierres", "respaldo", "deuda", "presupuestos", "objetivos", "reportes", "salud", "configuracion",
  ]),
  recordId: z.string().uuid().optional(),
  recordType: z.enum(["movement", "card_statement", "income_source", "budget", "goal"]).optional(),
  module: z.string().max(80).optional(),
  typeLabel: z.string().max(80).optional(),
  title: z.string().max(240).optional(),
  context: z.string().max(500).optional(),
});

const updateManualToolSchema = z.object({ movementId: uuidSchema, changes: updateManualMovementSchema });
const updateCategoryToolSchema = z.object({ categoryId: uuidSchema, changes: updateMovementCategorySchema });
const updateIncomeSourceToolSchema = z.object({ sourceId: uuidSchema, changes: updateIncomeSourceSchema });
const updateBudgetToolSchema = z.object({ budgetId: uuidSchema, changes: updateBudgetSchema });
const budgetStatusToolSchema = z.object({ budgetId: uuidSchema, change: changeBudgetStatusSchema });
const updateGoalToolSchema = z.object({ goalId: uuidSchema, changes: updateGoalSchema });
const goalStatusToolSchema = z.object({ goalId: uuidSchema, change: changeGoalStatusSchema });
const goalContributionToolSchema = z.object({ goalId: uuidSchema, contribution: createGoalContributionSchema });
const manualPurchaseToolSchema = z.object({ statementId: uuidSchema, purchase: manualPurchaseSchema });
const backupCreateSchema = z.object({ label: z.string().trim().min(1).max(80).optional() });
const attachmentIdToolSchema = z.object({ attachmentId: uuidSchema }).strict();
const cardUpdateDraftToolSchema = z.object({ draftId: uuidSchema, preview: cardStatementPreviewSchema }).strict();
const debitUpdateRowToolSchema = z.object({ importId: uuidSchema, rowId: uuidSchema, changes: debitImportRowUpdateSchema }).strict();
const salaryUpdateDraftToolSchema = z.object({ draftId: uuidSchema, preview: salaryReceiptPreviewSchema }).strict();
const backupValidateToolSchema = z.object({ backupId: uuidSchema }).strict();

function csvArtifactProjector(result: unknown): AgentJsonValue {
  const row = result as { fileName?: unknown; records?: unknown; csv?: unknown };
  return projectAgentResult({
    fileName: row?.fileName,
    records: row?.records,
    sizeBytes: typeof row?.csv === "string" ? Buffer.byteLength(row.csv, "utf8") : undefined,
  });
}

function requireConversationContext(context: AgentToolContext): string {
  if (!context.conversationId) {
    throw Object.assign(new Error("Agent tool requires conversation ownership context"), {
      code: "AGENT_TOOL_CONTEXT_REQUIRED",
    });
  }
  return context.conversationId;
}

async function consumeAfterSuccess<T>(
  conversationId: string,
  attachmentId: string,
  action: () => Promise<T>,
): Promise<T> {
  const result = await action();
  await agentChatService.consumeAttachment(conversationId, attachmentId);
  return result;
}
function backupArtifactProjector(result: unknown): AgentJsonValue {
  const row = result as { fileName?: unknown; buffer?: unknown };
  return projectAgentResult({
    fileName: row?.fileName,
    sizeBytes: Buffer.isBuffer(row?.buffer) ? row.buffer.length : undefined,
  });
}

const entries: AgentToolRegistryEntry[] = [
  makeReadTool("app.search", "Busca registros financieros reales de CajaApp por texto.", globalSearchQuerySchema,
    (args) => globalSearchService.search(args)),
  makeReadTool("dashboard.get_overview", "Obtiene el resumen determinístico del dashboard para un rango de fechas.", dashboardQuerySchema,
    (args) => dashboardService.getOverview(args)),
  makeReadTool("movements.list", "Lista movimientos reales con filtros y paginación.", movementQuerySchema,
    (args) => movementsService.getMovements(args)),
  makeArtifactTool("movements.export_csv", "Genera el CSV del ledger para el rango y filtros indicados.", movementQuerySchema,
    (args) => movementsService.exportCsv(args), csvArtifactProjector),
  makeReadTool("categories.list", "Lista categorías de movimientos.", z.object({ includeInactive: z.boolean().default(false) }),
    (args) => movementCategoriesService.listCategories(args.includeInactive)),
  makeReadTool("categories.suggest", "Sugiere una categoría existente según descripción y referencia.", suggestMovementCategorySchema,
    (args) => movementCategoriesService.suggestCategory(args)),
  makeReadTool("cards.list_statements", "Lista resúmenes de tarjeta persistidos.", cardsListSchema,
    (args) => cardsService.listStatements(args)),
  makeReadTool("cards.get_latest", "Obtiene el resumen de tarjeta aceptado más reciente.", emptySchema,
    async () => cardsService.getLatestStatement()),
  makeReadTool("cards.get_statement", "Obtiene un resumen de tarjeta por identificador.", statementIdSchema,
    (args) => cardsService.getStatement(args.statementId), refFromArg("card_statement", "tarjetas", "statementId")),
  makeReadTool("cards.get_traceability", "Obtiene trazabilidad de un resumen de tarjeta.", statementIdSchema,
    (args) => cardsService.getStatementTraceability(args.statementId), refFromArg("card_statement", "tarjetas", "statementId")),
  makeReadTool("cards.get_exchange_rate", "Obtiene la cotización USD/ARS configurada para tarjetas.", emptySchema,
    async () => cardsService.getExchangeRate()),
  makeReadTool("cards.get_updated_values", "Obtiene valores actualizados de tarjetas y proyecciones para un rango mensual.", monthRangeSchema,
    (args) => cardsService.getUpdatedValues(args.from, args.to)),
  makeReadTool("card_import.get_status", "Consulta el estado actual de un draft de importación de tarjeta.", draftIdSchema,
    (args) => importsService.getImportStatus(args.draftId, Date.now()), refFromArg("card_import_draft", "tarjetas", "draftId")),
  makeReadTool("card_import.get_draft", "Obtiene un draft de resumen de tarjeta sin aceptarlo.", draftIdSchema,
    (args) => cardsService.getDraft(args.draftId), refFromArg("card_import_draft", "tarjetas", "draftId")),
  makeReadTool("import_center.list", "Lista importaciones normalizadas del centro de importaciones.", importCenterListSchema,
    (args) => importCenterService.list({ ...args, limit: args.limit?.toString(), offset: args.offset?.toString() } as never)),
  makeReadTool("import_center.get", "Obtiene el detalle de una importación por tipo e identificador.", importCenterGetSchema,
    (args) => importCenterService.detail(args.kind, args.id), refFromArg("import", "importaciones", "id")),
  makeReadTool("debit_import.list", "Lista importaciones de débito CSV.", z.object({ limit: z.number().int().min(1).max(100).default(20) }),
    (args) => debitImportsService.listImports({ limit: args.limit })),
  makeReadTool("debit_import.get", "Obtiene una importación de débito CSV por identificador.", idSchema,
    (args) => debitImportsService.getImport(args.id), refFromArg("debit_import", "importaciones", "id")),
  makeReadTool("salary_receipt.list", "Lista recibos de sueldo persistidos.", salaryListSchema,
    (args) => salaryReceiptsService.list(args)),
  makeReadTool("salary_receipt.get", "Obtiene un recibo de sueldo por identificador.", idSchema,
    (args) => salaryReceiptsService.get(args.id), refFromArg("salary_receipt", "ingresos", "id")),
  makeReadTool("salary_receipt.get_draft", "Obtiene un draft de recibo de sueldo sin aceptarlo.", draftIdSchema,
    (args) => salaryReceiptsService.getDraft(args.draftId), refFromArg("salary_receipt_draft", "ingresos", "draftId")),
  makeReadTool("incomes.get_overview", "Obtiene ingresos reales y proyectados para un rango mensual.", incomesOverviewSchema,
    (args) => incomesService.getOverview(args.from, args.to)),
  makeReadTool("budgets.get_overview", "Obtiene resumen agregado de presupuestos.", budgetQuerySchema,
    (args) => budgetsService.overview(args)),
  makeReadTool("budgets.list", "Lista presupuestos reales con filtros opcionales.", budgetQuerySchema,
    (args) => budgetsService.list(args)),
  makeReadTool("goals.get_overview", "Obtiene resumen agregado de objetivos de ahorro.", goalsOverviewSchema,
    (args) => goalsService.overview(args)),
  makeReadTool("goals.list", "Lista objetivos de ahorro.", goalsListSchema,
    (args) => goalsService.listGoals(args.status)),
  makeReadTool("goals.get", "Obtiene un objetivo por identificador.", goalGetSchema,
    (args) => goalsService.getGoal(args.goalId), refFromArg("goal", "objetivos", "goalId")),
  makeReadTool("future.get_overview", "Obtiene deuda futura y proyecciones desde un mes inicial.", futureSchema,
    (args) => futureService.getOverview(args)),
  makeReadTool("reports.get", "Obtiene el reporte financiero determinístico para un rango.", rangeSchema,
    (args) => reportsService.getOverview(args)),
  makeArtifactTool("reports.export_csv", "Genera el CSV del reporte financiero solicitado.", rangeSchema,
    (args) => reportsService.exportCsv(args), csvArtifactProjector),
  makeReadTool("reconciliation.list", "Lista casos de conciliación existentes sin modificarlos.", reconciliationListSchema,
    (args) => reconciliationService.list({ ...args, limit: args.limit?.toString(), offset: args.offset?.toString() } as never)),
  makeReadTool("reconciliation.get", "Obtiene un caso de conciliación por identificador.", idSchema,
    (args) => reconciliationService.detail(args.id), refFromArg("reconciliation", "conciliacion", "id")),
  makeReadTool("financial_health.get", "Calcula salud financiera determinística para un rango sin crear snapshot.", rangeSchema,
    (args) => financialHealthService.evaluate(args)),
  makeReadTool("financial_health.history", "Lista historial de snapshots de salud financiera.", historySchema,
    (args) => financialHealthService.history(args.limit)),
  makeReadTool("month_close.list", "Lista cierres mensuales existentes.", monthCloseListSchema,
    (args) => monthCloseService.list({ ...args, limit: args.limit?.toString(), offset: args.offset?.toString() } as never)),
  makeReadTool("month_close.get", "Obtiene un cierre mensual por identificador.", idSchema,
    (args) => monthCloseService.detail(args.id), refFromArg("month_close", "cierres", "id")),
  makeReadTool("backup.list", "Lista backups disponibles sin abrir archivos arbitrarios.", emptySchema,
    async () => backupRestoreService.list()),
  makeArtifactTool("backup.download", "Prepara la descarga de un backup existente por identificador.", idSchema,
    (args) => backupRestoreService.download(args.id), backupArtifactProjector),
  makeReadTool("settings.get", "Obtiene configuración local de CajaApp sin secretos.", emptySchema,
    async () => settingsService.getSettings()),
  makeReadTool("settings.get_system", "Obtiene estado técnico público del sistema sin secretos.", emptySchema,
    async () => settingsService.getSystemStatus()),
  makeReadTool("ui.navigate", "Solicita navegar la interfaz de CajaApp a una sección o registro validado.", uiNavigateSchema,
    async (args) => args,
    (_result, args) => {
      const row = args as { recordId?: string; recordType?: string; section?: string; title?: string };
      return row.recordId && row.recordType ? [{ entityType: row.recordType, entityId: row.recordId, section: row.section, label: row.title }] : [];
    }),
  makeWriteTool("movements.create_manual", "Crea un movimiento manual cuando el usuario lo pide explícitamente.", createManualMovementSchema,
    (args) => movementsService.createManualMovement(args), refFromResult("movement", "movimientos")),
  makeWriteTool("movements.update_manual", "Actualiza un movimiento manual identificado de forma inequívoca.", updateManualToolSchema,
    (args) => movementsService.updateManualMovement(args.movementId, args.changes), refFromArg("movement", "movimientos", "movementId")),
  makeWriteTool("categories.create", "Crea una categoría de movimientos.", createMovementCategorySchema,
    (args) => movementCategoriesService.createCategory(args), refFromResult("category", "movimientos")),
  makeWriteTool("categories.update", "Actualiza una categoría identificada.", updateCategoryToolSchema,
    (args) => movementCategoriesService.updateCategory(args.categoryId, args.changes), refFromArg("category", "movimientos", "categoryId")),
  makeWriteTool("categories.assign", "Asigna o quita una categoría a un movimiento compatible.", assignMovementCategorySchema,
    (args) => movementCategoriesService.assignCategory(args), refFromArg("movement", "movimientos", "sourceId")),
  makeWriteTool("incomes.create_source", "Crea una fuente de ingreso.", createIncomeSourceSchema,
    (args) => incomesService.createSource(args), refFromResult("income_source", "ingresos")),
  makeWriteTool("incomes.update_source", "Actualiza una fuente de ingreso identificada.", updateIncomeSourceToolSchema,
    (args) => incomesService.updateSource(args.sourceId, args.changes), refFromArg("income_source", "ingresos", "sourceId")),
  makeWriteTool("incomes.create_event", "Registra un evento de ingreso.", createIncomeEventSchema,
    (args) => incomesService.createEvent(args), refFromResult("income_event", "ingresos")),
  makeWriteTool("budgets.create", "Crea un presupuesto por categoría y período.", createBudgetSchema,
    (args) => budgetsService.create(args), refFromResult("budget", "presupuestos")),
  makeWriteTool("budgets.update", "Actualiza un presupuesto identificado.", updateBudgetToolSchema,
    (args) => budgetsService.update(args.budgetId, args.changes), refFromArg("budget", "presupuestos", "budgetId")),
  makeWriteTool("budgets.set_status", "Cambia el estado de un presupuesto identificado.", budgetStatusToolSchema,
    (args) => budgetsService.changeStatus(args.budgetId, args.change.status), refFromArg("budget", "presupuestos", "budgetId")),
  makeWriteTool("goals.create", "Crea un objetivo de ahorro.", createGoalSchema,
    (args) => goalsService.createGoal(args), refFromResult("goal", "objetivos")),
  makeWriteTool("goals.update", "Actualiza un objetivo identificado.", updateGoalToolSchema,
    (args) => goalsService.updateGoal(args.goalId, args.changes), refFromArg("goal", "objetivos", "goalId")),
  makeWriteTool("goals.set_status", "Cambia el estado de un objetivo identificado.", goalStatusToolSchema,
    (args) => goalsService.changeStatus(args.goalId, args.change), refFromArg("goal", "objetivos", "goalId")),
  makeWriteTool("goals.add_contribution", "Registra un aporte en un objetivo identificado.", goalContributionToolSchema,
    (args) => goalsService.addContribution(args.goalId, args.contribution), refFromArg("goal", "objetivos", "goalId")),
  makeWriteTool("cards.set_exchange_rate", "Actualiza la cotización USD/ARS usada por Tarjetas.", exchangeRateUpdateSchema,
    (args) => cardsService.updateExchangeRate(args)),
  makeWriteTool("cards.create_manual_purchase", "Registra una compra manual en un resumen de tarjeta activo.", manualPurchaseToolSchema,
    (args) => manualPurchasesService.createPurchase(args.statementId, args.purchase), refFromArg("card_statement", "tarjetas", "statementId")),
  makeWriteTool("backup.create", "Crea un backup manual mediante el servicio gobernado de CajaApp.", backupCreateSchema,
    (args) => backupRestoreService.create(args.label), refFromResult("backup", "respaldo")),
  makeWriteTool("card_import.upload_attachment", "Prepara un draft de resumen de tarjeta desde un attachment de esta conversación.", attachmentIdToolSchema,
    async (args, context) => {
      const conversationId = requireConversationContext(context);
      const attachment = await agentChatService.resolveAttachment(conversationId, args.attachmentId);
      return consumeAfterSuccess(conversationId, args.attachmentId, () => importsService.startImport({
        filename: attachment.fileName,
        mimetype: attachment.mimeType,
        file: attachment.buffer,
      }));
    }, refFromResult("card_import_draft", "tarjetas", "draftId")),
  makeWriteTool("card_import.update_draft", "Actualiza un draft de tarjeta sin aceptarlo definitivamente.", cardUpdateDraftToolSchema,
    (args) => cardsService.updateDraft(args.draftId, args.preview), refFromArg("card_import_draft", "tarjetas", "draftId")),
  makeWriteTool("debit_import.preview_attachment", "Crea un preview de débito CSV desde un attachment de esta conversación.", attachmentIdToolSchema,
    async (args, context) => {
      const conversationId = requireConversationContext(context);
      const attachment = await agentChatService.resolveAttachment(conversationId, args.attachmentId);
      return consumeAfterSuccess(conversationId, args.attachmentId, () => debitImportsService.createPreview({
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        buffer: attachment.buffer,
      }));
    }, refFromResult("debit_import", "importaciones")),
  makeWriteTool("debit_import.update_row", "Actualiza una fila de un draft de débito sin aceptarlo.", debitUpdateRowToolSchema,
    (args) => debitImportsService.updateRow(args.importId, args.rowId, args.changes), refFromArg("debit_import", "importaciones", "importId")),
  makeWriteTool("salary_receipt.import_attachment", "Prepara un draft de recibo de sueldo desde un attachment PDF de esta conversación.", attachmentIdToolSchema,
    async (args, context) => {
      const conversationId = requireConversationContext(context);
      const attachment = await agentChatService.resolveAttachment(conversationId, args.attachmentId);
      return consumeAfterSuccess(conversationId, args.attachmentId, () => salaryReceiptsService.importPdf({
        filename: attachment.fileName,
        mimetype: attachment.mimeType,
        file: attachment.buffer,
      }));
    }, refFromResult("salary_receipt_draft", "ingresos")),
  makeWriteTool("salary_receipt.update_draft", "Actualiza un draft de recibo de sueldo sin aceptarlo definitivamente.", salaryUpdateDraftToolSchema,
    (args) => salaryReceiptsService.updateDraft(args.draftId, args.preview), refFromArg("salary_receipt_draft", "ingresos", "draftId")),
  makeWriteTool("backup.validate", "Valida un backup persistido por identificador sin aceptar paths arbitrarios.", backupValidateToolSchema,
    (args) => backupRestoreService.validateStored(args.backupId), refFromArg("backup", "respaldo", "backupId")),
  makeWriteTool("reconciliation.scan", "Ejecuta el escaneo determinístico de conciliación solicitado.", scanReconciliationSchema.strict(),
    (args) => reconciliationService.scan(args)),
  makeWriteTool("financial_health.create_snapshot", "Crea un snapshot persistido de salud financiera para un rango solicitado.", rangeSchema.strict(),
    (args) => financialHealthService.saveSnapshot(args), refFromResult("financial_health_snapshot", "salud", "snapshotId")),  makeWriteTool("settings.update", "Actualiza preferencias locales de CajaApp.", updateSettingsSchema,
    (args) => settingsService.updateSettings(args)),
  makeCriticalTool("card_import.accept_draft", "Acepta definitivamente un borrador de resumen de tarjeta revisado.", z.object({ draftId: uuidSchema, preview: cardStatementPreviewSchema }),
    (args) => cardsService.acceptDraft(args.draftId, args.preview), "R3", refFromArg("card_statement", "tarjetas", "draftId")),
  makeCriticalTool("cards.archive_statement", "Archiva un resumen de tarjeta activo.", z.object({ statementId: uuidSchema, reason: z.string().trim().max(500).optional() }),
    (args) => cardsService.archiveStatement(args.statementId, args.reason), "R3", refFromArg("card_statement", "tarjetas", "statementId")),
  makeCriticalTool("cards.activate_statement", "Activa un resumen de tarjeta archivado.", z.object({ statementId: uuidSchema }),
    (args) => cardsService.activateStatement(args.statementId), "R3", refFromArg("card_statement", "tarjetas", "statementId")),
  makeCriticalTool("debit_import.accept", "Materializa definitivamente una importación débito aceptada.", z.object({ importId: uuidSchema, rowIds: z.array(uuidSchema).max(5000).optional() }),
    (args) => debitImportsService.acceptImport(args.importId, { rowIds: args.rowIds }), "R3", refFromArg("debit_import", "importaciones", "importId")),
  makeCriticalTool("debit_import.delete", "Elimina una importación/borrador débito identificado.", z.object({ importId: uuidSchema }),
    (args) => debitImportsService.deleteDraft(args.importId), "R3", refFromArg("debit_import", "importaciones", "importId")),
  makeCriticalTool("debit_import.reverse", "Revierte una importación débito ya materializada.", z.object({ importId: uuidSchema }),
    (args) => debitImportsService.reverseImport(args.importId), "R3", refFromArg("debit_import", "importaciones", "importId")),
  makeCriticalTool("salary_receipt.accept_draft", "Acepta definitivamente un borrador de recibo de sueldo revisado.", z.object({ draftId: uuidSchema, sourceId: z.string().uuid().optional().nullable(), useAsFutureBase: z.boolean().optional() }),
    (args) => salaryReceiptsService.acceptDraft(args.draftId, { sourceId: args.sourceId, useAsFutureBase: args.useAsFutureBase }), "R3", refFromArg("salary_receipt", "ingresos", "draftId")),
  makeCriticalTool("salary_receipt.reverse", "Revierte un recibo de sueldo ya aceptado.", z.object({ receiptId: uuidSchema }),
    (args) => salaryReceiptsService.reverse(args.receiptId), "R3", refFromArg("salary_receipt", "ingresos", "receiptId")),
  makeCriticalTool("movements.void_manual", "Anula un movimiento manual identificado.", z.object({ movementId: uuidSchema }),
    (args) => movementsService.voidManualMovement(args.movementId), "R3", refFromArg("movement", "movimientos", "movementId")),
  makeCriticalTool("cards.delete_manual_purchase", "Elimina una compra manual de tarjeta identificada.", z.object({ purchaseId: uuidSchema }),
    (args) => manualPurchasesService.deletePurchase(args.purchaseId), "R3", refFromArg("card_purchase", "tarjetas", "purchaseId")),
  makeCriticalTool("categories.archive", "Archiva una categoría de movimientos.", z.object({ categoryId: uuidSchema, replacementCategoryId: z.string().uuid().optional().nullable() }),
    (args) => movementCategoriesService.archiveCategory(args.categoryId, { replacementCategoryId: args.replacementCategoryId }), "R3", refFromArg("movement_category", "movimientos", "categoryId")),
  makeCriticalTool("categories.restore", "Restaura una categoría archivada.", z.object({ categoryId: uuidSchema }),
    (args) => movementCategoriesService.restoreCategory(args.categoryId), "R3", refFromArg("movement_category", "movimientos", "categoryId")),
  makeCriticalTool("incomes.delete_source", "Elimina una fuente de ingreso identificada.", z.object({ sourceId: uuidSchema }),
    (args) => incomesService.deleteSource(args.sourceId), "R3", refFromArg("income_source", "ingresos", "sourceId")),
  makeCriticalTool("incomes.delete_event", "Elimina un evento de ingreso identificado.", z.object({ eventId: uuidSchema }),
    (args) => incomesService.deleteEvent(args.eventId), "R3", refFromArg("income_event", "ingresos", "eventId")),
  makeCriticalTool("budgets.delete", "Elimina un presupuesto identificado.", z.object({ budgetId: uuidSchema }),
    (args) => budgetsService.delete(args.budgetId), "R3", refFromArg("budget", "presupuestos", "budgetId")),
  makeCriticalTool("goals.delete", "Elimina un objetivo de ahorro identificado.", z.object({ goalId: uuidSchema }),
    (args) => goalsService.deleteGoal(args.goalId), "R3", refFromArg("goal", "objetivos", "goalId")),
  makeCriticalTool("goals.delete_contribution", "Elimina un aporte de un objetivo identificado.", z.object({ goalId: uuidSchema, contributionId: uuidSchema }),
    (args) => goalsService.deleteContribution(args.goalId, args.contributionId), "R3", refFromArg("goal", "objetivos", "goalId")),
  makeCriticalTool("reconciliation.resolve", "Resuelve un caso de conciliación con una acción determinística.", z.object({ caseId: uuidSchema, action: resolveReconciliationSchema.shape.action }),
    (args) => reconciliationService.resolve(args.caseId, args.action), "R3", refFromArg("reconciliation", "conciliacion", "caseId")),
  makeCriticalTool("reconciliation.reopen", "Reabre un caso de conciliación resuelto.", z.object({ caseId: uuidSchema }),
    (args) => reconciliationService.reopen(args.caseId), "R3", refFromArg("reconciliation", "conciliacion", "caseId")),
  makeCriticalTool("month_close.create", "Crea el cierre mensual de un período.", z.object({ monthKey: monthKeySchema }),
    (args) => monthCloseService.create(args.monthKey), "R3", refFromArg("month_close", "cierres", "monthKey")),
  makeCriticalTool("month_close.reopen", "Reabre un cierre mensual identificado.", z.object({ closeId: uuidSchema }),
    (args) => monthCloseService.reopen(args.closeId), "R3", refFromArg("month_close", "cierres", "closeId")),
  makeCriticalTool("financial_health.delete_snapshot", "Elimina un snapshot de salud financiera.", z.object({ snapshotId: uuidSchema }),
    (args) => financialHealthService.deleteSnapshot(args.snapshotId), "R3", refFromArg("financial_health_snapshot", "salud", "snapshotId")),
  makeCriticalTool("backup.restore", "Restaura la base de datos de CajaApp desde un backup validado; exige validación previa y aprobación explícita.", restoreSchema,
    (args) => backupRestoreService.restoreStored(args.backupId), "R4", refsNone, async (args) => {
      const validation = await backupRestoreService.validateStored((args as { backupId: string }).backupId);
      return {
        tool: "backup.restore",
        riskClass: "R4",
        reversible: false,
        valid: validation.valid,
        packageSha256: validation.packageSha256,
        backup: {
          createdAt: validation.manifest.createdAt,
          databaseSha256: validation.manifest.database.sha256,
          sizeBytes: validation.manifest.database.sizeBytes,
          integrityCheck: validation.manifest.database.integrityCheck,
          tables: validation.manifest.database.tables.length,
          migrations: validation.manifest.database.migrations.length,
        },
        warning: "Restaurar reemplaza TODOS los datos actuales por el contenido del backup.",
      };
    }),
];

export const agentToolRegistry = new AgentToolRegistry(entries);
