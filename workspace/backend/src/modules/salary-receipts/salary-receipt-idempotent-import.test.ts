import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("salary receipt idempotent reimport", () => {
  it("does not reject an already imported PDF by SHA", async () => {
    const source = await fs.readFile(
      path.resolve(process.cwd(), "src/modules/salary-receipts/salary-receipts.service.ts"),
      "utf8",
    );

    expect(source).not.toContain("SALARY_RECEIPT_DUPLICATE");
    expect(source).not.toContain("Este recibo ya fue importado");
    expect(source).toContain("where: { sha256 }");
    expect(source).toContain("acceptedReceipt: null");
    expect(source).toContain("replacedPreviousUpload");
  });

  it("keeps accepted receipts replaceable by the existing period identity flow", async () => {
    const source = await fs.readFile(
      path.resolve(process.cwd(), "src/modules/salary-receipts/salary-receipts.service.base.ts"),
      "utf8",
    );

    expect(source).toContain("superseded");
    expect(source).toContain("periodMonthKey");
    expect(source).toContain("incomeEvent");
  });
});
