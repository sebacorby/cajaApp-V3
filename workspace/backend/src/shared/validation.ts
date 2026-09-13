import { z } from "zod";
import { AppError } from "./errors.js";

export function validateData<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
    throw new AppError("VALIDATION_ERROR", `Validation failed: ${errors}`, 400);
  }
  return result.data;
}

export function parseJsonSafe<T>(schema: z.ZodType<T>, jsonStr: string): { success: boolean; data?: T; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
      return { success: false, error: errors };
    }
    return { success: true, data: result.data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "JSON parse error" };
  }
}
