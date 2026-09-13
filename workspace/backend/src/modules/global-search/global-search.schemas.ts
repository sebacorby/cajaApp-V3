import { z } from "zod";


export const globalSearchQuerySchema = z.object({
  q: z.string().trim().min(2, "Search query must contain at least 2 characters").max(120),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(5).max(50).default(10),
});


export type GlobalSearchQuery = z.infer<typeof globalSearchQuerySchema>;


export const GLOBAL_SEARCH_SECTIONS = [
  "movimientos",
  "tarjetas",
  "ingresos",
  "presupuestos",
  "objetivos",
] as const;


export type GlobalSearchSection = (typeof GLOBAL_SEARCH_SECTIONS)[number];


export const GLOBAL_SEARCH_RESULT_TYPES = [
  "movement",
  "card_statement",
  "income_source",
  "budget",
  "goal",
] as const;


export type GlobalSearchResultType = (typeof GLOBAL_SEARCH_RESULT_TYPES)[number];