import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("income source cascade deletion", () => {
  it("routes source deletion through the domain cascade", async () => {
    const controller = await fs.readFile(
      path.resolve(process.cwd(), "src/modules/incomes/incomes.controller.ts"),
      "utf8",
    );
    const cascade = await fs.readFile(
      path.resolve(
        process.cwd(),
        "src/modules/incomes/income-source-cascade-delete.service.ts",
      ),
      "utf8",
    );

    expect(controller).toContain("deleteIncomeSourceCascade(sourceId)");
    expect(cascade).toContain("salaryReceipt.deleteMany");
    expect(cascade).toContain("salaryReceiptDraft.deleteMany");
    expect(cascade).toContain("incomeSource.delete");
    expect(cascade).toContain("uploadedDocument.delete");
  });
});
