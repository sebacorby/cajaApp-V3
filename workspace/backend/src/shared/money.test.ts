import { describe, expect, it } from "vitest";
import {
  parseArgentinePesos,
  parseDollars,
  centsToString,
} from "./money.js";

describe("money parsing", () => {
  it.each([
    ["268333.33", 26833333n],
    ["268.333,33", 26833333n],
    ["268333,33", 26833333n],
    ["1.425.613,43", 142561343n],
    ["1425613.43", 142561343n],
  ])("parses ARS %s without inflating by x100", (input, expected) => {
    expect(parseArgentinePesos(input)).toBe(expected);
  });

  it("formats the canonical ARS amount correctly after parsing", () => {
    expect(centsToString(parseArgentinePesos("268333.33"), "ARS")).toBe(
      "268.333,33",
    );
  });

  it.each([
    ["1,234.56", 123456n],
    ["1234.56", 123456n],
    ["1234,56", 123456n],
  ])("parses USD %s consistently", (input, expected) => {
    expect(parseDollars(input)).toBe(expected);
  });
});
