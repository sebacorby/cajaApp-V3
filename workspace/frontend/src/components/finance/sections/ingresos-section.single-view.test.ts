import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("single income screen", () => {
  it("does not mount the legacy income section or duplicate the calendar", async () => {
    const source = await fs.readFile(
      path.resolve(
        process.cwd(),
        "src/components/finance/sections/ingresos-section.tsx",
      ),
      "utf8",
    );

    expect(source).not.toContain("ingresos-section.base");
    expect(source).not.toContain("IngresosSectionBase");
    expect(source).not.toContain("<details");
    expect(source.match(/<SalaryReceiptsPanel/g)?.length).toBe(1);
    expect(source.match(/Próximos ingresos/g)?.length).toBe(1);
    expect(source).toContain("incomes-single-view");
    expect(source).toContain("Cargar o reemplazar recibo");
  });
});
