/**
 * Unit tests for `parseAnyDateToISO`.
 *
 * IMPORTANT: the test for `DD-Mon` without year (e.g. "15-Jul") computes the
 * expected ISO string from the REAL clock at the top of the `it()` block.
 * Do NOT hard-code the year — `parseAnyDateToISO` must use
 * `new Date().getFullYear()` per call so a long-running process does not
 * pin a stale year.
 */
import { describe, it, expect } from "vitest";
import { parseAnyDateToISO } from "../../src/modules/cards/date-normalizer.js";

describe("parseAnyDateToISO", () => {
  it('passthrough ISO "2026-07-15"', () => {
    expect(parseAnyDateToISO("2026-07-15")).toBe("2026-07-15");
  });

  it('zero-pads single-digit month "2026-7-15"', () => {
    expect(parseAnyDateToISO("2026-7-15")).toBe("2026-07-15");
  });

  it('parses DD/MM/YYYY "15/07/2026"', () => {
    expect(parseAnyDateToISO("15/07/2026")).toBe("2026-07-15");
  });

  it('parses DD-MM-YYYY "15-07-2026"', () => {
    expect(parseAnyDateToISO("15-07-2026")).toBe("2026-07-15");
  });

  it('parses DD.MM.YYYY "15.07.2026"', () => {
    expect(parseAnyDateToISO("15.07.2026")).toBe("2026-07-15");
  });

  it('parses DD-Mon-YY "13-Jul-26" → 20YY', () => {
    expect(parseAnyDateToISO("13-Jul-26")).toBe("2026-07-13");
  });

  it('parses DD-Mon-YYYY "13-Jul-2026"', () => {
    expect(parseAnyDateToISO("13-Jul-2026")).toBe("2026-07-13");
  });

  it("parses DD-Mon no-year using current year", () => {
    const expected = `${new Date().getFullYear()}-07-15`;
    expect(parseAnyDateToISO("15-Jul")).toBe(expected);
  });

  it('parses "July 15, 2026"', () => {
    expect(parseAnyDateToISO("July 15, 2026")).toBe("2026-07-15");
  });

  it('parses "Jul 15, 2026"', () => {
    expect(parseAnyDateToISO("Jul 15, 2026")).toBe("2026-07-15");
  });

  it('parses "15 July 2026"', () => {
    expect(parseAnyDateToISO("15 July 2026")).toBe("2026-07-15");
  });

  it('parses "15 Jul 2026"', () => {
    expect(parseAnyDateToISO("15 Jul 2026")).toBe("2026-07-15");
  });

  it("returns null for null", () => {
    expect(parseAnyDateToISO(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseAnyDateToISO(undefined)).toBeNull();
  });

  it('returns null for empty string ""', () => {
    expect(parseAnyDateToISO("")).toBeNull();
  });

  it('returns null for whitespace-only "   "', () => {
    expect(parseAnyDateToISO("   ")).toBeNull();
  });

  it('returns null for "not a date" without throwing', () => {
    expect(() => parseAnyDateToISO("not a date")).not.toThrow();
    expect(parseAnyDateToISO("not a date")).toBeNull();
  });

  it('returns null for impossible date "2026-13-40"', () => {
    expect(parseAnyDateToISO("2026-13-40")).toBeNull();
  });

  it('parses "31-Jul-26" → "2026-07-31"', () => {
    expect(parseAnyDateToISO("31-Jul-26")).toBe("2026-07-31");
  });

  it('trims surrounding whitespace "  15-Jul-26  "', () => {
    expect(parseAnyDateToISO("  15-Jul-26  ")).toBe("2026-07-15");
  });
});
