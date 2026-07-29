import { describe, it, expect } from "vitest";
import { parseAnyDateToISO } from "../../src/modules/cards/date-normalizer.js";

describe("parseAnyDateToISO — AI extraction pipeline scenarios", () => {
  it("passthrough ISO 2026-07-15", () => {
    expect(parseAnyDateToISO("2026-07-15")).toBe("2026-07-15");
  });

  it('parses DD/MM/YYYY "15/07/2026" → 2026-07-15', () => {
    expect(parseAnyDateToISO("15/07/2026")).toBe("2026-07-15");
  });

  it('parses DD-Mon-YY "13-Jul-26" → 2026-07-13', () => {
    expect(parseAnyDateToISO("13-Jul-26")).toBe("2026-07-13");
  });

  it('parses "July 15, 2026" → 2026-07-15', () => {
    expect(parseAnyDateToISO("July 15, 2026")).toBe("2026-07-15");
  });

  it("returns null for null", () => {
    expect(parseAnyDateToISO(null)).toBeNull();
  });

  it("passthrough ISO 2026-07-15 (second entry)", () => {
    expect(parseAnyDateToISO("2026-07-15")).toBe("2026-07-15");
  });
});
