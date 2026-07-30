import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("reconciliation redesigned screen", () => {
  it("replaces the legacy wrapper with a current-data workflow", async () => {
    const source = await fs.readFile(
      path.resolve(
        process.cwd(),
        "src/components/finance/sections/conciliacion-section.tsx",
      ),
      "utf8",
    );

    expect(source).not.toContain("conciliacion-section.legacy");
    expect(source).not.toContain("LegacyConciliacionSection");
    expect(source).toContain("reconciliation-redesigned-section");
    expect(source).toContain("scanReconciliation(scanRange())");
    expect(source).toContain("Sólo coincidencias de la última sincronización");
  });

  it("navigates with a record-aware target", async () => {
    const source = await fs.readFile(
      path.resolve(
        process.cwd(),
        "src/components/finance/sections/conciliacion-section.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("navigateToSearchResult");
    expect(source).toContain("recordId: participant.navigation.recordId");
    expect(source).toContain("recordType: participant.navigation.recordType");
    expect(source).toContain("participant.navigation.context");
  });
});
