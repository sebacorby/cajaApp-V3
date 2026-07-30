import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("reconciliation current detection", () => {
  it("invalidates every previous current case before rebuilding the latest scan", async () => {
    const source = await fs.readFile(
      path.resolve(
        process.cwd(),
        "src/modules/reconciliation/reconciliation.service.ts",
      ),
      "utf8",
    );

    expect(source).toContain("where: { isCurrent: true }");
    expect(source).toContain("data: { isCurrent: false }");
    expect(source).toContain("await super.scan(input)");
    expect(source).not.toContain("occurredOn: { gte: input.from, lte: input.to }");
  });

  it("returns record-aware navigation instead of section-only destinations", async () => {
    const source = await fs.readFile(
      path.resolve(
        process.cwd(),
        "src/modules/reconciliation/reconciliation.service.ts",
      ),
      "utf8",
    );

    expect(source).toContain("recordId:");
    expect(source).toContain('recordType: "movement"');
    expect(source).toContain('recordType: "card_statement"');
    expect(source).toContain('recordType: "income_source"');
    expect(source).toContain("navigation: navigationTarget(participant)");
  });
});
