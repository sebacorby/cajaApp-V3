export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, sortKeys(record[key])]),
    );
  }
  if (typeof value === "bigint") return value.toString();
  return value;
}

export function stableSerialize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

export function stableResponseObject<T>(value: T): T {
  return sortKeys(value) as T;
}
