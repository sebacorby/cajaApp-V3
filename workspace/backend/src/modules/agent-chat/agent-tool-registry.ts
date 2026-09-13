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
import { exchangeRateUpdateSchema, manualPurchaseSchema } from "../cards/cards.schemas.js";
import { manualPurchasesService } from "../manual-purchases/manual-purchases.service.js";
import { importsService } from "../imports/imports.service.js";
import { importCenterService } from "../import-center/import-center.service.js";
import { debitImportsService } from "../debit-imports/debit-imports.service.js";
import { salaryReceiptsService } from "../salary-receipts/salary-receipts.service.js";
import { incomesService } from "../incomes/incomes.service.js";
import { createIncomeEventSchema, createIncomeSourceSchema, updateIncomeSourceSchema } from "../incomes/incomes.schemas.js";
import { budgetsService } from "../budgets/budgets.service.js";
import { changeBudgetStatusSchema, createBudgetSchema, updateBudgetSchema } from "../budgets/budgets.schemas.js";
import { goalsService } from "../goals/goals.service.js";
import { changeGoalStatusSchema, createGoalContributionSchema, createGoalSchema, updateGoalSchema } from "../goals/goals.schemas.js";
import { futureService } from "../future/future.service.js";
import { reportsService } from "../reports/reports.service.js";
import { reconciliationService } from "../reconciliation/reconciliation.service.js";
import { financialHealthService } from "../financial-health/financial-health.service.js";
import { monthCloseService } from "../month-close/month-close.service.js";
import { backupRestoreService } from "../backup-restore/backup-restore.service.js";
import { settingsService } from "../settings/settings.service.js";
import { updateSettingsSchema } from "../settings/settings.schemas.js";

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
  "settings.update",
] as const;

export const AGENT_TOOL_NAMES = [...AGENT_READ_TOOL_NAMES, ...AGENT_R2_TOOL_NAMES] as const;

export interface AgentToolRegistryEntry {
  name: string;
  description: string;
  inputSchema: ZodTypeAny;
  riskClass: AgentRiskClass;
  parallelSafe: boolean;
  requiresExplicitIntent: boolean;
  handler: (args: unknown) => Promise<unknown>;
  resultProjector: (result: unknown) => AgentJsonValue;
  auditEntityRefs: (result: unknown, args: unknown) => AgentEntityRef[];
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
  handler: (args: any) => Promise<unknown>,
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

function csvArtifactProjector(result: unknown): AgentJsonValue {
  const row = result as { fileName?: unknown; records?: unknown; csv?: unknown };
  return projectAgentResult({
    fileName: row?.fileName,
    records: row?.records,
    sizeBytes: typeof row?.csv === "string" ? Buffer.byteLength(row.csv, "utf8") : undefined,
  });
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
  makeWriteTool("settings.update", "Actualiza preferencias locales de CajaApp.", updateSettingsSchema,
    (args) => settingsService.updateSettings(args)),
];

export const agentToolRegistry = new AgentToolRegistry(entries);
