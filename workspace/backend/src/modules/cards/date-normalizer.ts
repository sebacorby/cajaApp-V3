/**
 * Date normalizer for non-ISO summary date fields.
 *
 * The AI extractor emits dates in several non-ISO formats that downstream code
 * (Zod schema, CardStatement storage, future-debt projection) expects as
 * `YYYY-MM-DD`. This module parses the most common observed formats into ISO
 * without throwing; the caller decides whether `null` is acceptable or should
 * trigger HTTP 400.
 *
 * Determinism: slash-separated forms (`"15/07/2026"`) are ALWAYS interpreted as
 * `DD/MM/YYYY` (Latin American convention) regardless of the runtime locale.
 * `Date.parse` is therefore NOT used for slash forms — a regex branch runs
 * before it.
 *
 * The current-year fallback for `"DD-Mon"` without a year (`"15-Jul"`) calls
 * `new Date().getFullYear()` per invocation, NOT at module load, so a
 * long-running process does not pin a stale year.
 */

const MONTH_NAMES: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

export function monthNameToIndex(name: string): number | null {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(MONTH_NAMES, key)) {
    return MONTH_NAMES[key];
  }
  return null;
}

export function toIsoYmd(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns a recognizable long-month token present in the input. Used as a
 * defense-in-depth guard before `Date.parse` (so slash forms never reach it).
 */
function looksLikeLongMonthName(input: string): boolean {
  return (
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(
      input,
    ) || /\b(jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(input)
  );
}

function normalizeYearToken(yy: string): number {
  if (yy.length === 2) {
    return 2000 + Number.parseInt(yy, 10);
  }
  return Number.parseInt(yy, 10);
}

export function parseAnyDateToISO(
  input: string | null | undefined,
): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  // 1. ISO passthrough + zero-pad (handles "2026-07-15" and "2026-7-15").
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    if (!Number.isNaN(date.getTime())) {
      return toIsoYmd(date);
    }
    return null;
  }

  // 2. Numeric DD<sep>MM<sep>(YY)YY — slash, dot, dash. Locale-independent.
  //    "15/07/2026" is ALWAYS DD/MM/YYYY per `specs.md` Rebound 2.
  const numericMatch = trimmed.match(
    /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/,
  );
  if (numericMatch) {
    const [, ddStr, mmStr, yyStr] = numericMatch;
    const dd = Number.parseInt(ddStr, 10);
    const mm = Number.parseInt(mmStr, 10);
    const year = normalizeYearToken(yyStr);
    const date = new Date(Date.UTC(year, mm - 1, dd));
    // `Date.UTC` silently rolls invalid values (e.g. month 13 → next year).
    // We must verify the constructed date still represents the requested day.
    if (
      !Number.isNaN(date.getTime()) &&
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === mm - 1 &&
      date.getUTCDate() === dd
    ) {
      return toIsoYmd(date);
    }
    return null;
  }

  // 3. DD-Mon(-YY(YY))?
  const monthNameMatch = trimmed.match(
    /^(\d{1,2})-([A-Za-z]{3,9})(?:-(\d{2,4}))?$/,
  );
  if (monthNameMatch) {
    const [, ddStr, monStr, yyStr] = monthNameMatch;
    const dd = Number.parseInt(ddStr, 10);
    const monthIdx = monthNameToIndex(monStr);
    if (monthIdx === null) return null;
    const year =
      yyStr !== undefined
        ? normalizeYearToken(yyStr)
        : new Date().getFullYear();
    const date = new Date(Date.UTC(year, monthIdx, dd));
    if (
      !Number.isNaN(date.getTime()) &&
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === monthIdx &&
      date.getUTCDate() === dd
    ) {
      return toIsoYmd(date);
    }
    return null;
  }

  // 4. "Month DD, YYYY" / "Mon DD, YYYY" / "DD Month YYYY" / "DD Mon YYYY".
  //    Only attempted for inputs that visibly contain a long month name, so
  //    slash/dot/dash numeric forms never reach `Date.parse`.
  if (looksLikeLongMonthName(trimmed)) {
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      return toIsoYmd(new Date(parsed));
    }
  }

  return null;
}
