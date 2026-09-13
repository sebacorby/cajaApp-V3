import { describe, expect, it } from "vitest";
import {
  formatMovementAmount,
  parseMovementAmount,
} from "../../src/modules/movements/movements.service.js";

describe("movement money helpers", () => {
  it("parses and formats ARS exactly", () => {
    expect(parseMovementAmount("1.234.567,89", "ARS")).toBe(123_456_789n);
    expect(formatMovementAmount(123_456_789n, "ARS")).toBe("1.234.567,89");
  });

  it("parses and formats USD exactly", () => {
    expect(parseMovementAmount("1,234,567.89", "USD")).toBe(123_456_789n);
    expect(formatMovementAmount(123_456_789n, "USD")).toBe("1,234,567.89");
  });

  it("supports signed imported card amounts", () => {
    expect(parseMovementAmount("-25.000,50", "ARS", true)).toBe(-2_500_050n);
  });

  it("rejects negative manual amounts", () => {
    expect(() => parseMovementAmount("-10,00", "ARS", false)).toThrow();
  });
});
