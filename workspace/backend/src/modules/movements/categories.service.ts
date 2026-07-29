import { prisma } from "../../db/prisma.js";
import { NotFoundError, ValidationError } from "../../shared/errors.js";
import type {
  ArchiveMovementCategoryInput,
  AssignMovementCategoryInput,
  CreateMovementCategoryInput,
  SuggestMovementCategoryInput,
  UpdateMovementCategoryInput,
} from "./movements.schemas.js";

export type CategorySuggestionRule = {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  keyword: string;
  normalizedKeyword: string;
  priority: number;
};

export type CategorySuggestion = {
  id: string;
  name: string;
  color: string;
  icon: string;
  matchedKeyword: string;
};

const DEFAULT_CATEGORIES = [
  {
    name: "Sin clasificar",
    color: "#64748b",
    icon: "circle-help",
    isSystem: true,
    keywords: [],
  },
  {
    name: "Ingresos",
    color: "#059669",
    icon: "banknote",
    isSystem: true,
    keywords: ["sueldo", "haberes", "acreditacion de haberes"],
  },
  {
    name: "Tarjetas",
    color: "#2563eb",
    icon: "credit-card",
    isSystem: true,
    keywords: [],
  },
  {
    name: "Impuestos y percepciones",
    color: "#dc2626",
    icon: "landmark",
    isSystem: true,
    keywords: ["impuesto", "percepcion", "retencion", "iva rg"],
  },
  {
    name: "Cargos de tarjeta",
    color: "#9333ea",
    icon: "receipt-text",
    isSystem: true,
    keywords: ["comision", "mantenimiento", "cargo de tarjeta"],
  },
  {
    name: "Hogar y servicios",
    color: "#0d9488",
    icon: "house",
    isSystem: false,
    keywords: ["edet", "gasnor", "telecom", "personal", "movistar", "claro", "internet"],
  },
  {
    name: "Supermercado",
    color: "#10b981",
    icon: "shopping-cart",
    isSystem: false,
    keywords: ["supermercado", "carrefour", "coto", "jumbo", "vea", "changomas"],
  },
  {
    name: "Transporte",
    color: "#f59e0b",
    icon: "car",
    isSystem: false,
    keywords: ["uber", "cabify", "sube", "ypf", "shell", "estacion de servicio"],
  },
  {
    name: "Salud",
    color: "#ef4444",
    icon: "heart-pulse",
    isSystem: false,
    keywords: ["farmacia", "sanatorio", "clinica", "laboratorio", "obra social"],
  },
  {
    name: "Ocio",
    color: "#ec4899",
    icon: "utensils",
    isSystem: false,
    keywords: ["netflix", "spotify", "cinemark", "restaurant", "restaurante", "bar"],
  },
  {
    name: "Efectivo",
    color: "#7c3aed",
    icon: "wallet",
    isSystem: false,
    keywords: ["extraccion", "cajero automatico"],
  },
] as const;

const ASSIGNABLE_MANUAL_SOURCES = new Set([
  "manual_cash",
  "manual_income",
  "manual_unexpected",
  "manual_transfer",
  "manual_adjustment",
]);

export function normalizeCategoryText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function uniqueKeywords(keywords: string[]): Array<{ keyword: string; normalizedKeyword: string }> {
  const seen = new Set<string>();
  const result: Array<{ keyword: string; normalizedKeyword: string }> = [];

  for (const rawKeyword of keywords) {
    const keyword = rawKeyword.trim();
    const normalizedKeyword = normalizeCategoryText(keyword);
    if (normalizedKeyword.length < 2 || seen.has(normalizedKeyword)) continue;
    seen.add(normalizedKeyword);
    result.push({ keyword, normalizedKeyword });
  }

  return result;
}

export function pickCategorySuggestion(
  rules: CategorySuggestionRule[],
  input: SuggestMovementCategoryInput,
): CategorySuggestion | null {
  const haystack = normalizeCategoryText(
    [input.description, input.reference ?? "", input.sourceType ?? ""].join(" "),
  );
  if (!haystack) return null;

  const matches = rules
    .filter((rule) => haystack.includes(rule.normalizedKeyword))
    .sort((left, right) => {
      const priorityOrder = left.priority - right.priority;
      if (priorityOrder !== 0) return priorityOrder;
      const lengthOrder = right.normalizedKeyword.length - left.normalizedKeyword.length;
      if (lengthOrder !== 0) return lengthOrder;
      return left.categoryName.localeCompare(right.categoryName, "es");
    });

  const best = matches[0];
  if (!best) return null;
  return {
    id: best.categoryId,
    name: best.categoryName,
    color: best.categoryColor,
    icon: best.categoryIcon,
    matchedKeyword: best.keyword,
  };
}

export class MovementCategoriesService {
  private defaultsReady = false;
  private defaultsInitialization: Promise<void> | null = null;

  async ensureDefaults(): Promise<void> {
    if (this.defaultsReady) return;

    if (!this.defaultsInitialization) {
      this.defaultsInitialization = this.initializeDefaults()
        .then(() => {
          this.defaultsReady = true;
        })
        .catch((error: unknown) => {
          this.defaultsInitialization = null;
          throw error;
        });
    }

    await this.defaultsInitialization;
  }

  private async initializeDefaults(): Promise<void> {
    for (const category of DEFAULT_CATEGORIES) {
      const existing = await prisma.movementCategory.findUnique({
        where: { name: category.name },
      });

      const record = existing
        ? category.isSystem
          ? await prisma.movementCategory.update({
              where: { id: existing.id },
              data: {
                color: category.color,
                icon: category.icon,
                isSystem: true,
                active: true,
              },
            })
          : existing
        : await prisma.movementCategory.create({
            data: {
              name: category.name,
              color: category.color,
              icon: category.icon,
              isSystem: category.isSystem,
              active: true,
            },
          });

      const keywords = uniqueKeywords([...category.keywords]);
      for (const [index, rule] of keywords.entries()) {
        await (prisma as any).movementCategoryRule.upsert({
          where: {
            categoryId_normalizedKeyword: {
              categoryId: record.id,
              normalizedKeyword: rule.normalizedKeyword,
            },
          },
          update: {
            keyword: rule.keyword,
            priority: 100 + index,
            active: true,
          },
          create: {
            categoryId: record.id,
            keyword: rule.keyword,
            normalizedKeyword: rule.normalizedKeyword,
            priority: 100 + index,
            active: true,
          },
        });
      }
    }
  }

  async requireActiveCategory(categoryId: string | null | undefined) {
    if (!categoryId) return null;
    const category = await prisma.movementCategory.findFirst({
      where: { id: categoryId, active: true },
    });
    if (!category) throw new NotFoundError("Movement category");
    return category;
  }

  private async assertUniqueName(name: string, excludedId?: string): Promise<void> {
    const normalized = name.toLocaleLowerCase("es");
    const categories = await prisma.movementCategory.findMany({
      where: excludedId ? { id: { not: excludedId } } : undefined,
      select: { name: true },
    });
    if (categories.some((item) => item.name.toLocaleLowerCase("es") === normalized)) {
      throw new ValidationError("Ya existe una categoría con ese nombre.");
    }
  }

  private async replaceRules(tx: any, categoryId: string, keywords: string[]): Promise<void> {
    const normalized = uniqueKeywords(keywords);
    await tx.movementCategoryRule.deleteMany({ where: { categoryId } });
    if (normalized.length === 0) return;
    await tx.movementCategoryRule.createMany({
      data: normalized.map((rule, index) => ({
        categoryId,
        keyword: rule.keyword,
        normalizedKeyword: rule.normalizedKeyword,
        priority: 100 + index,
        active: true,
      })),
    });
  }

  private mapCategory(category: any) {
    const manualMovementCount = category._count?.manualMovements ?? 0;
    const debitCsvRowCount = category._count?.debitCsvRows ?? 0;
    return {
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      isSystem: category.isSystem,
      active: category.active,
      keywords: (category.rules ?? []).map((rule: any) => rule.keyword),
      manualMovementCount,
      debitCsvRowCount,
      usageCount: manualMovementCount + debitCsvRowCount,
      createdAt: category.createdAt?.toISOString?.() ?? null,
      updatedAt: category.updatedAt?.toISOString?.() ?? null,
    };
  }

  async listCategories(includeInactive = false) {
    await this.ensureDefaults();
    const categories = await (prisma as any).movementCategory.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: [{ active: "desc" }, { isSystem: "desc" }, { name: "asc" }],
      include: {
        rules: {
          where: { active: true },
          orderBy: [{ priority: "asc" }, { keyword: "asc" }],
        },
        _count: {
          select: { manualMovements: true, debitCsvRows: true },
        },
      },
    });
    return categories.map((category: any) => this.mapCategory(category));
  }

  async createCategory(input: CreateMovementCategoryInput) {
    await this.ensureDefaults();
    await this.assertUniqueName(input.name);

    const created = await (prisma as any).$transaction(async (tx: any) => {
      const category = await tx.movementCategory.create({
        data: {
          name: input.name,
          color: input.color,
          icon: input.icon,
          isSystem: false,
          active: true,
        },
      });
      await this.replaceRules(tx, category.id, input.keywords);
      return category;
    });

    return this.getCategory(created.id);
  }

  async getCategory(categoryId: string) {
    const category = await (prisma as any).movementCategory.findUnique({
      where: { id: categoryId },
      include: {
        rules: {
          where: { active: true },
          orderBy: [{ priority: "asc" }, { keyword: "asc" }],
        },
        _count: { select: { manualMovements: true, debitCsvRows: true } },
      },
    });
    if (!category) throw new NotFoundError("Movement category");
    return this.mapCategory(category);
  }

  async updateCategory(categoryId: string, input: UpdateMovementCategoryInput) {
    const existing = await prisma.movementCategory.findUnique({ where: { id: categoryId } });
    if (!existing) throw new NotFoundError("Movement category");

    if (existing.isSystem && input.name && input.name !== existing.name) {
      throw new ValidationError("Las categorías del sistema no pueden cambiar de nombre.");
    }
    if (input.name && input.name.toLocaleLowerCase("es") !== existing.name.toLocaleLowerCase("es")) {
      await this.assertUniqueName(input.name, categoryId);
    }

    await (prisma as any).$transaction(async (tx: any) => {
      await tx.movementCategory.update({
        where: { id: categoryId },
        data: {
          name: input.name,
          color: input.color,
          icon: input.icon,
        },
      });
      if (input.keywords !== undefined) {
        await this.replaceRules(tx, categoryId, input.keywords);
      }
    });

    return this.getCategory(categoryId);
  }

  async archiveCategory(categoryId: string, input: ArchiveMovementCategoryInput) {
    await this.ensureDefaults();
    const existing = await prisma.movementCategory.findUnique({ where: { id: categoryId } });
    if (!existing) throw new NotFoundError("Movement category");
    if (existing.isSystem) {
      throw new ValidationError("Las categorías del sistema no pueden archivarse.");
    }
    if (!existing.active) {
      throw new ValidationError("La categoría ya está archivada.");
    }

    const fallback = input.replacementCategoryId
      ? await this.requireActiveCategory(input.replacementCategoryId)
      : await prisma.movementCategory.findFirst({
          where: { name: "Sin clasificar", active: true, isSystem: true },
        });
    if (!fallback) throw new NotFoundError("Fallback movement category");
    if (fallback.id === categoryId) {
      throw new ValidationError("La categoría de reemplazo debe ser distinta.");
    }

    const result = await (prisma as any).$transaction(async (tx: any) => {
      const manual = await tx.manualMovement.updateMany({
        where: { categoryId },
        data: { categoryId: fallback.id },
      });
      const debit = await tx.debitCsvRow.updateMany({
        where: { categoryId },
        data: { categoryId: fallback.id },
      });
      await tx.movementCategoryRule.updateMany({
        where: { categoryId },
        data: { active: false },
      });
      await tx.movementCategory.update({
        where: { id: categoryId },
        data: { active: false },
      });
      return {
        reassignedManualMovements: manual.count,
        reassignedDebitRows: debit.count,
      };
    });

    return {
      success: true,
      replacementCategory: {
        id: fallback.id,
        name: fallback.name,
      },
      ...result,
    };
  }

  async restoreCategory(categoryId: string) {
    const existing = await prisma.movementCategory.findUnique({ where: { id: categoryId } });
    if (!existing) throw new NotFoundError("Movement category");
    if (existing.active) return this.getCategory(categoryId);

    await (prisma as any).$transaction(async (tx: any) => {
      await tx.movementCategory.update({
        where: { id: categoryId },
        data: { active: true },
      });
      await tx.movementCategoryRule.updateMany({
        where: { categoryId },
        data: { active: true },
      });
    });
    return this.getCategory(categoryId);
  }

  async assignCategory(input: AssignMovementCategoryInput) {
    await this.ensureDefaults();
    const category = await this.requireActiveCategory(input.categoryId);

    if (input.sourceType === "debit_csv") {
      const row = await (prisma as any).debitCsvRow.findUnique({
        where: { id: input.sourceId },
        include: { import: true },
      });
      if (!row) throw new NotFoundError("Debit CSV row");
      if (row.status !== "accepted" || row.import?.status !== "accepted") {
        throw new ValidationError("Sólo se pueden recategorizar filas CSV aceptadas.");
      }
      await (prisma as any).debitCsvRow.update({
        where: { id: input.sourceId },
        data: { categoryId: category?.id ?? null },
      });
    } else if (ASSIGNABLE_MANUAL_SOURCES.has(input.sourceType)) {
      const movement = await prisma.manualMovement.findFirst({
        where: { id: input.sourceId, voidedAt: null },
      });
      if (!movement) throw new NotFoundError("Manual movement");
      await prisma.manualMovement.update({
        where: { id: input.sourceId },
        data: { categoryId: category?.id ?? null },
      });
    } else {
      throw new ValidationError("El origen no admite recategorización.");
    }

    return {
      success: true,
      category: category
        ? { id: category.id, name: category.name, color: category.color, icon: category.icon }
        : { id: null, name: "Sin clasificar", color: "#64748b", icon: "circle-help" },
    };
  }

  async createSuggestionResolver() {
    await this.ensureDefaults();
    const storedRules = await (prisma as any).movementCategoryRule.findMany({
      where: {
        active: true,
        category: { active: true },
      },
      include: { category: true },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });

    const rules: CategorySuggestionRule[] = storedRules.map((rule: any) => ({
      categoryId: rule.categoryId,
      categoryName: rule.category.name,
      categoryColor: rule.category.color,
      categoryIcon: rule.category.icon,
      keyword: rule.keyword,
      normalizedKeyword: rule.normalizedKeyword,
      priority: rule.priority,
    }));

    return (input: SuggestMovementCategoryInput) => pickCategorySuggestion(rules, input);
  }

  async suggestCategory(input: SuggestMovementCategoryInput) {
    const resolve = await this.createSuggestionResolver();
    return { suggestion: resolve(input) };
  }
}

export const movementCategoriesService = new MovementCategoriesService();
