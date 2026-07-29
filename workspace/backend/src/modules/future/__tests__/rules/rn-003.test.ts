import { describe, expect, it } from "vitest";
import {
  isFinalInstallment,
  isValidInstallment,
  parseInstallment,
} from "../../rules/exclusion.js";

describe("RN-003 — final installment exclusion", () => {
  it.each(["1/1", "2/2", "6/6", "12/12"])("recognizes %s as final", (label) => {
    const parsed = parseInstallment(label);
    expect(isFinalInstallment(parsed)).toBe(true);
  });

  it("rejects an impossible 7/6 sequence", () => {
    expect(() => parseInstallment("7/6")).toThrow();
    expect(isValidInstallment({ current: 7, total: 6 })).toBe(false);
  });

  it("parses whitespace and zero-padded labels without changing the numbers", () => {
    expect(parseInstallment(" 02 / 06 ")).toEqual({ current: 2, total: 6 });
  });
});
