import { describe, expect, it } from "vitest";
import { nttDataSalaryReceiptParser } from "./ntt-data.salary-receipt.parser.js";

const raw = `
EMPLEADOR:N TT DATA ARGENTINA S.A.
C.U.I.T.N°: 30-00000000-0
100001 PERSONA PRUEBA 20-00000000-0 DU 00000000
MEN 06 2026
12 S.A.C. 180,00 2.402.312,00
T O TALES 7.206.936,00 0,60 1.339.939,60
LUGAR Y FECHA DE PAGO CAP.FED. 30/06/2026 NETO A COBRAR 5.866.997,00
`;

describe("NTT Data SAC preservation", () => {
  it("keeps SAC as an explicit informational item", () => {
    const result = nttDataSalaryReceiptParser.parse({
      rawText: raw,
      pageCount: 1,
      sourceFileName: "ntt-june.pdf",
    });

    const sac = result.preview.items.find((item) => item.code === "SAC");
    expect(sac).toMatchObject({
      label: "Sueldo anual complementario (SAC)",
      amount: "2402312.00",
      kind: "information",
    });
    expect(result.preview.summary.netAmount).toBe("5866997.00");
  });
});
