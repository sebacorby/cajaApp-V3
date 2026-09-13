export function getErrorMessage(
  value: unknown,
  fallback = "No se pudo procesar el resumen.",
): string {
  if (value instanceof Error && typeof value.message === "string" && value.message.trim()) {
    return value.message.trim();
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value !== "object" || value === null) {
    return fallback;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim();
  }

  const nested = record.error;

  if (typeof nested === "string" && nested.trim()) {
    return nested.trim();
  }

  if (typeof nested === "object" && nested !== null) {
    const nestedMessage = (nested as Record<string, unknown>).message;

    if (typeof nestedMessage === "string" && nestedMessage.trim()) {
      return nestedMessage.trim();
    }
  }

  return fallback;
}
