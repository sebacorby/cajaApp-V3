import { prisma } from "../../db/prisma.js";
import type {
  GlobalSearchQuery,
  GlobalSearchResultType,
  GlobalSearchSection,
} from "./global-search.schemas.js";


const SOURCE_WINDOW = 250;
const CONTEXT_LIMIT = 140;


export interface GlobalSearchDestination {
  section: GlobalSearchSection;
  recordId: string;
  recordType: GlobalSearchResultType;
}


export interface GlobalSearchResult {
  id: string;
  recordId: string;
  module: string;
  type: GlobalSearchResultType;
  typeLabel: string;
  title: string;
  context: string;
  matchedField: string;
  destination: GlobalSearchDestination;
  score: number;
  updatedAt: string;
}


interface SearchField {
  label: string;
  value: string | null | undefined;
  weight: number;
}


export interface SearchCandidate {
  recordId: string;
  module: string;
  type: GlobalSearchResultType;
  typeLabel: string;
  title: string;
  context: string;
  destination: GlobalSearchDestination;
  updatedAt: Date;
  fields: SearchField[];
}


interface RankedField {
  score: number;
  label: string;
}


export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();
}


function compactContext(parts: Array<string | null | undefined>): string {
  const text = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" · ");


  if (text.length <= CONTEXT_LIMIT) return text;
  return `${text.slice(0, CONTEXT_LIMIT - 1).trimEnd()}…`;
}


function rankField(query: string, field: SearchField): RankedField | null {
  const normalizedValue = normalizeSearchText(field.value ?? "");
  if (!normalizedValue) return null;


  let matchScore = 0;
  if (normalizedValue === query) matchScore = 1000;
  else if (normalizedValue.startsWith(query)) matchScore = 850;
  else if (normalizedValue.split(" ").some((token) => token.startsWith(query))) matchScore = 725;
  else if (normalizedValue.includes(query)) matchScore = 600;
  else return null;


  return {
    score: matchScore + field.weight,
    label: field.label,
  };
}


export function rankSearchCandidate(
  candidate: SearchCandidate,
  rawQuery: string,
): GlobalSearchResult | null {
  const query = normalizeSearchText(rawQuery);
  const rankedFields = candidate.fields
    .map((field) => rankField(query, field))
    .filter((field): field is RankedField => field !== null)
    .sort((left, right) => right.score - left.score);


  const best = rankedFields[0];
  if (!best) return null;


  return {
    id: `${candidate.type}:${candidate.recordId}`,
    recordId: candidate.recordId,
    module: candidate.module,
    type: candidate.type,
    typeLabel: candidate.typeLabel,
    title: candidate.title,
    context: candidate.context,
    matchedField: best.label,
    destination: candidate.destination,
    score: best.score,
    updatedAt: candidate.updatedAt.toISOString(),
  };
}


export function paginateSearchResults(
  results: GlobalSearchResult[],
  page: number,
  limit: number,
) {
  const start = (page - 1) * limit;
  const items = results.slice(start, start + limit);
  return {
    items,
    page,
    limit,
    total: results.length,
    hasMore: start + items.length < results.length,
  };
}


function sortResults(left: GlobalSearchResult, right: GlobalSearchResult): number {
  if (left.score !== right.score) return right.score - left.score;
  const byDate = right.updatedAt.localeCompare(left.updatedAt);
  if (byDate !== 0) return byDate;
  const byTitle = left.title.localeCompare(right.title, "es");
  if (byTitle !== 0) return byTitle;
  return left.id.localeCompare(right.id);
}


function movementCandidate(input: {
  id: string;
  title: string;
  category: string | null;
  source: string | null;
  notes: string | null;
  occurredOn: string | null;
  updatedAt: Date;
}): SearchCandidate {
  return {
    recordId: input.id,
    module: "Movimientos",
    type: "movement",
    typeLabel: "Movimiento",
    title: input.title,
    context: compactContext([input.category, input.source, input.occurredOn]),
    destination: {
      section: "movimientos",
      recordId: input.id,
      recordType: "movement",
    },
    updatedAt: input.updatedAt,
    fields: [
      { label: "Descripción", value: input.title, weight: 120 },
      { label: "Categoría", value: input.category, weight: 85 },
      { label: "Fuente", value: input.source, weight: 70 },
      { label: "Notas", value: input.notes, weight: 45 },
    ],
  };
}


export class GlobalSearchService {
  async search(query: GlobalSearchQuery) {
    const [
      manualCount,
      debitCount,
      statementCount,
      incomeCount,
      budgetCount,
      goalCount,
      manualMovements,
      debitRows,
      statements,
      incomeSources,
      budgets,
      goals,
    ] = await Promise.all([
      prisma.manualMovement.count({ where: { voidedAt: null } }),
      prisma.debitCsvRow.count({ where: { status: "accepted", included: true, import: { status: "accepted" } } }),
      prisma.cardStatement.count({ where: { status: "accepted" } }),
      prisma.incomeSource.count(),
      prisma.categoryBudget.count(),
      prisma.savingsGoal.count(),
      prisma.manualMovement.findMany({
        where: { voidedAt: null },
        include: { category: true },
        orderBy: { updatedAt: "desc" },
        take: SOURCE_WINDOW,
      }),
      prisma.debitCsvRow.findMany({
        where: { status: "accepted", included: true, import: { status: "accepted" } },
        include: { category: true, import: true },
        orderBy: { updatedAt: "desc" },
        take: SOURCE_WINDOW,
      }),
      prisma.cardStatement.findMany({
        where: { status: "accepted" },
        include: {
          document: true,
          groups: {
            orderBy: { displayOrder: "asc" },
            take: 4,
          },
        },
        orderBy: { updatedAt: "desc" },
        take: SOURCE_WINDOW,
      }),
      prisma.incomeSource.findMany({
        orderBy: { updatedAt: "desc" },
        take: SOURCE_WINDOW,
      }),
      prisma.categoryBudget.findMany({
        include: { category: true },
        orderBy: { updatedAt: "desc" },
        take: SOURCE_WINDOW,
      }),
      prisma.savingsGoal.findMany({
        orderBy: { updatedAt: "desc" },
        take: SOURCE_WINDOW,
      }),
    ]);


    const candidates: SearchCandidate[] = [
      ...manualMovements.map((movement) => movementCandidate({
        id: movement.id,
        title: movement.description,
        category: movement.category?.name ?? null,
        source: movement.sourceType,
        notes: movement.notes,
        occurredOn: movement.occurredOn,
        updatedAt: movement.updatedAt,
      })),
      ...debitRows.map((row) => movementCandidate({
        id: row.id,
        title: row.description,
        category: row.category?.name ?? null,
        source: compactContext([row.import.bankName, row.import.fileName, row.reference]),
        notes: null,
        occurredOn: row.occurredOn,
        updatedAt: row.updatedAt,
      })),
      ...statements.map((statement): SearchCandidate => {
        const cardReferences = statement.groups
          .map((group) => compactContext([
            group.label,
            group.cardLast4 ? `•••• ${group.cardLast4}` : null,
            group.holderName,
          ]))
          .filter(Boolean);
        const title = compactContext([
          statement.bankName,
          statement.brand,
        ]) || "Resumen de tarjeta";


        return {
          recordId: statement.id,
          module: "Tarjetas",
          type: "card_statement",
          typeLabel: "Resumen",
          title,
          context: compactContext([
            statement.periodLabel ?? statement.periodKey,
            cardReferences.join(", "),
            statement.document.fileName,
            statement.isActiveForPeriod ? null : `Versión ${statement.version}`,
          ]),
          destination: {
            section: "tarjetas",
            recordId: statement.id,
            recordType: "card_statement",
          },
          updatedAt: statement.updatedAt,
          fields: [
            { label: "Banco", value: statement.bankName, weight: 120 },
            { label: "Tarjeta", value: statement.brand, weight: 105 },
            { label: "Tarjeta", value: cardReferences.join(" "), weight: 100 },
            { label: "Período", value: statement.periodLabel, weight: 90 },
            { label: "Período", value: statement.periodKey, weight: 85 },
            { label: "Archivo", value: statement.document.fileName, weight: 70 },
          ],
        };
      }),
      ...incomeSources.map((source): SearchCandidate => ({
        recordId: source.id,
        module: "Ingresos",
        type: "income_source",
        typeLabel: "Fuente de ingreso",
        title: source.name,
        context: compactContext([
          source.employer,
          source.kind,
          source.currency,
          source.active ? "Activa" : "Inactiva",
        ]),
        destination: {
          section: "ingresos",
          recordId: source.id,
          recordType: "income_source",
        },
        updatedAt: source.updatedAt,
        fields: [
          { label: "Nombre", value: source.name, weight: 120 },
          { label: "Empleador", value: source.employer, weight: 75 },
          { label: "Tipo", value: source.kind, weight: 55 },
        ],
      })),
      ...budgets.map((budget): SearchCandidate => ({
        recordId: budget.id,
        module: "Presupuestos",
        type: "budget",
        typeLabel: "Presupuesto",
        title: budget.category.name,
        context: compactContext([
          budget.currency,
          `${budget.periodStart} a ${budget.periodEnd}`,
          budget.status,
        ]),
        destination: {
          section: "presupuestos",
          recordId: budget.id,
          recordType: "budget",
        },
        updatedAt: budget.updatedAt,
        fields: [
          { label: "Nombre", value: budget.category.name, weight: 120 },
          { label: "Notas", value: budget.notes, weight: 45 },
          { label: "Período", value: `${budget.periodStart} ${budget.periodEnd}`, weight: 35 },
        ],
      })),
      ...goals.map((goal): SearchCandidate => ({
        recordId: goal.id,
        module: "Objetivos",
        type: "goal",
        typeLabel: "Objetivo",
        title: goal.name,
        context: compactContext([
          goal.currency,
          goal.status,
          goal.targetDate ? `Fecha objetivo ${goal.targetDate}` : null,
        ]),
        destination: {
          section: "objetivos",
          recordId: goal.id,
          recordType: "goal",
        },
        updatedAt: goal.updatedAt,
        fields: [
          { label: "Nombre", value: goal.name, weight: 120 },
          { label: "Notas", value: goal.notes, weight: 45 },
        ],
      })),
    ];


    const ranked = candidates
      .map((candidate) => rankSearchCandidate(candidate, query.q))
      .filter((result): result is GlobalSearchResult => result !== null)
      .sort(sortResults);


    const page = paginateSearchResults(ranked, query.page, query.limit);
    const sourceCounts = {
      manualMovements: manualCount,
      debitMovements: debitCount,
      cardStatements: statementCount,
      incomeSources: incomeCount,
      budgets: budgetCount,
      goals: goalCount,
    };
    const exhaustive = Object.values(sourceCounts).every((count) => count <= SOURCE_WINDOW);


    return {
      query: query.q,
      normalizedQuery: normalizeSearchText(query.q),
      ranking: "exact > prefix > token-prefix > contains; title/name fields have priority",
      pagination: {
        page: page.page,
        limit: page.limit,
        total: page.total,
        hasMore: page.hasMore,
      },
      exhaustive,
      sourceWindow: SOURCE_WINDOW,
      sourceCounts,
      items: page.items,
    };
  }
}


export const globalSearchService = new GlobalSearchService();