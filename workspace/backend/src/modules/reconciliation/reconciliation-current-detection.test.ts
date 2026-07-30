import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("reconciliation current detection", () => {
  it("expires cases not redetected only after a successful scan", async () => {
    const source = await fs.readFile(
      path.resolve(
        process.cwd(),
        "src/modules/reconciliation/reconciliation.service.ts",
      ),
      "utf8",
    );

    expect(source).toContain("const result = await super.scan(input)");
    expect(source).toContain("lastDetectedAt: { lt: scanStartedAt }");
    expect(source).toContain("data: { isCurrent: false }");
    expect(source.indexOf("await super.scan(input)")).toBeLessThan(
      source.indexOf("lastDetectedAt: { lt: scanStartedAt }"),
    );
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
