import { describe, expect, it } from "vitest";
import { fluxitSalaryReceiptParser } from "./fluxit.salary-receipt.parser.js";
import { nttDataSalaryReceiptParser } from "./ntt-data.salary-receipt.parser.js";

const fluxitRaw = `
FLUXIT
C.U.I.T. 30-00000000-0
Legajo 00001 - PERSONA PRUEBA
CUIL 20-00000000-0 Fecha de ingreso 02/10/2024
Periodo 01/02/2026 -28/02/2026 Categoria Fuera de Convenio
Fecha de pago 05/03/2026 Puesto Technical Leader
Haberes con Haberes sin
Codigo Concepto Unidades Descuentos
aportes aportes
1000 Sueldo 30.00 5595932.50
2799 Crédito Conectividad 40000.00
3000 Jubilación 11.00 432557.30
Totales 5595932.50 40000.67 1163403.17
Neto 4472530.00
`;

const nttRaw = `
EMPLEADOR:N TT DATA ARGENTINA S.A. EMPLEADOR:N TT DATA ARGENTINA S.A.
C.U.I.T.N°: 30-00000000-0 C.U.I.T. Nº: 30-00000000-0
LEGAJO Nº APELLIDO Y NOMBRES C.U.I.L. DOCUMENTO
100001 PERSONA PRUEBA 20-00000000-0 DU 00000000
FECHA PERIODO BANCO DIA MES AÑO QUIN. MES AÑO
09/06/2026 05/2026 INTERBANKING 01 04 2012 MEN 06 2026
HABERES
1 SUELDO BASICO 4.490.303,00
12 S.A.C. 180,00 2.402.312,00
100 JUBILACION 728.417,64
T O TALES 7.206.936,00 0,60 1.339.939,60
LUGAR Y FECHA DE PAGO CAP.FED. 30/06/2026 NETO A COBRAR 5.866.997,00
`;

describe("real salary receipt layouts", () => {
  it("imports FluxIT using net in hand as the required value", () => {
    const input = { rawText: fluxitRaw, pageCount: 1, sourceFileName: "fluxit.pdf" };
    expect(fluxitSalaryReceiptParser.supports(input)).toBe(true);

    const result = fluxitSalaryReceiptParser.parse(input);

    expect(result.preview.source.periodMonthKey).toBe("2026-02");
    expect(result.preview.source.payDate).toBe("2026-03-05");
    expect(result.preview.summary).toEqual({
      grossAmount: "5635933.17",
      deductionsAmount: "1163403.17",
      netAmount: "4472530.00",
    });
    expect(result.preview.items.at(-1)?.label).toBe("Neto en mano");
    expect(result.preview.items.at(-1)?.amount).toBe("4472530.00");
  });

  it("imports duplicated NTT Data text using net in hand as the required value", () => {
    const input = { rawText: nttRaw, pageCount: 1, sourceFileName: "ntt.pdf" };
    expect(nttDataSalaryReceiptParser.supports(input)).toBe(true);

    const result = nttDataSalaryReceiptParser.parse(input);

    expect(result.preview.source.periodMonthKey).toBe("2026-06");
    expect(result.preview.source.payDate).toBe("2026-06-30");
    expect(result.preview.summary).toEqual({
      grossAmount: "7206936.60",
      deductionsAmount: "1339939.60",
      netAmount: "5866997.00",
    });
    expect(result.preview.items.at(-1)?.label).toBe("Neto en mano");
    expect(result.preview.items.at(-1)?.amount).toBe("5866997.00");
  });

  it("keeps the import deterministic", () => {
    const input = { rawText: nttRaw, pageCount: 1 };
    expect(nttDataSalaryReceiptParser.parse(input).preview).toEqual(
      nttDataSalaryReceiptParser.parse(input).preview,
    );
  });
});
