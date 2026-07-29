export interface InstallmentSequence {
  raw: string;
  current: number;
  total: number;
}

/**
 * Resolve an installment sequence from normalized or source text.
 * Extraction models may preserve "09/12" in referenceRaw/originalText even
 * when installmentRaw is null, so callers must not depend on one field only.
 */
export function resolveInstallmentSequence(
  ...candidates: Array<string | null | undefined>
): InstallmentSequence | null {
  for (const candidate of candidates) {
    if (!candidate?.trim()) continue;

    const match = candidate.match(/(\d+)\s*\/\s*(\d+)/);
    if (!match) continue;

    const current = Number.parseInt(match[1], 10);
    const total = Number.parseInt(match[2], 10);
    if (!Number.isInteger(current) || !Number.isInteger(total) || current < 1 || total < current) {
      continue;
    }

    return {
      raw: `${current}/${total}`,
      current,
      total,
    };
  }

  return null;
}
