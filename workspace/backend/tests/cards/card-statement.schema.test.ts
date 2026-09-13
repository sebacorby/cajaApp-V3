import { describe, it, expect } from "vitest";
import { parseArgentinePesos, parseDollars, formatArgentinePesos, formatDollars, isValidArgentineAmount, isValidDollarAmount } from "../../src/shared/money.js";

describe("Money utilities", () => {
  describe("parseArgentinePesos", () => {
    it("parses standard Argentine peso format", () => {
      expect(parseArgentinePesos("3.118.842,50")).toBe(311884250n);
    });

    it("parses simple format without thousands", () => {
      expect(parseArgentinePesos("1234,56")).toBe(123456n);
    });

    it("parses zero", () => {
      expect(parseArgentinePesos("0,00")).toBe(0n);
    });

    it("parses amounts with spaces", () => {
      expect(parseArgentinePesos("1 234 567,89")).toBe(123456789n);
    });

    it("throws on invalid input", () => {
      expect(() => parseArgentinePesos("invalid")).toThrow();
    });
  });

  describe("parseDollars", () => {
    it("parses dollar amount with comma", () => {
      expect(parseDollars("161,84")).toBe(16184n);
    });

    it("parses dollar amount with dot", () => {
      expect(parseDollars("1000.50")).toBe(100050n);
    });
  });

  describe("formatArgentinePesos", () => {
    it("formats cents to Argentine peso string", () => {
      expect(formatArgentinePesos(311884250n)).toBe("3.118.842,50");
    });

    it("formats zero correctly", () => {
      expect(formatArgentinePesos(0n)).toBe("0,00");
    });
  });

  describe("formatDollars", () => {
    it("formats cents to dollar string", () => {
      expect(formatDollars(16184n)).toBe("161.84");
    });
  });

  describe("isValidArgentineAmount", () => {
    it("returns true for valid amounts", () => {
      expect(isValidArgentineAmount("3.118.842,50")).toBe(true);
      expect(isValidArgentineAmount("0,00")).toBe(true);
    });

    it("returns false for invalid amounts", () => {
      expect(isValidArgentineAmount("invalid")).toBe(false);
    });
  });

  describe("isValidDollarAmount", () => {
    it("returns true for valid amounts", () => {
      expect(isValidDollarAmount("161,84")).toBe(true);
      expect(isValidDollarAmount("1000.00")).toBe(true);
    });

    it("returns false for invalid amounts", () => {
      expect(isValidDollarAmount("invalid")).toBe(false);
    });
  });
});
