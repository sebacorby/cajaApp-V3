import { describe, expect, it } from "vitest";
import {
  SalaryReceiptParserIncompleteError,
  SalaryReceiptTotalsMismatchError,
} from "./salary-receipt-parser.errors.js";
import { genericArgentinaSalaryReceiptParser } from "./generic-argentina.salary-receipt.parser.js";

const regularReceipt = `
RECIBO DE SUELDO
Razón social: Empresa Ejemplo SA
CUIT empleador: 30-12345678-9
Empleado: Persona Prueba
CUIL empleado: 20-12345678-3
Período: 2026-07
Fecha de pago: 31/07/2026
Haberes remunerativos
001 Sueldo básico 1.000.000,00
002 Antigüedad 100.000,00
Haberes no remunerativos
101 Bono 50.000,00
Descuentos
201 Jubilación 121.000,00
202 Obra social 33.000,00
Total haberes 1.150.000,00
Total descuentos 154.000,00
Neto a cobrar 996.000,00
`;

const aguinaldoReceipt = `
LIQUIDACIÓN DE HABERES
Empresa: Empresa Ejemplo SA
CUIT empresa: 30-12345678-9
Apellido y nombre: Persona Prueba
CUIL: 20-12345678-3
Período: junio 2026
Haberes remunerativos
001 Sueldo anual complementario 500.000,00
Descuentos
201 Jubilación 55.000,00
202 Obra social 15.000,00
Total haberes 500.000,00
Total descuentos 70.000,00
Total neto 430.000,00
`;

const vacationReceipt = `
RECIBO DE HABERES
Empleador: Empresa Ejemplo SA
CUIT: 30-12345678-9
Trabajador: Persona Prueba
CUIL trabajador: 20-12345678-3
Mes liquidado: 07/2026
Haberes remunerativos
001 Vacaciones 300.000,00
002 Plus vacacional 30.000,00
Descuentos
201 Jubilación 36.300,00
202 Obra social 9.900,00
Total remuneración bruta 330.000,00
Total retenciones 46.200,00
Neto pagado 283.800,00
`;

describe("GenericArgentinaSalaryReceiptParser", () => {
  it.each([
    ["regular", regularReceipt, "2026-07", "996000.00"],
    ["aguinaldo", aguinaldoReceipt, "2026-06", "430000.00"],
    ["vacaciones", vacationReceipt, "2026-07", "283800.00"],
  ])("parses an anonymized %s receipt deterministically", (_name, rawText, month, net) => {
    const input = { rawText, pageCount: 1, sourceFileName: "receipt.pdf" };
    expect(genericArgentinaSalaryReceiptParser.supports(input)).toBe(true);

    const first = genericArgentinaSalaryReceiptParser.parse(input);
    const second = genericArgentinaSalaryReceiptParser.parse(input);

    expect(first.preview).toEqual(second.preview);
    expect(first.preview.source.periodMonthKey).toBe(month);
    expect(first.preview.summary.netAmount).toBe(net);
    expect(first.diagnostics.unexplainedMonetaryLineCount).toBe(0);
  });

  it("fails closed when a required field is absent", () => {
    expect(() =>
      genericArgentinaSalaryReceiptParser.parse({
        rawText: regularReceipt.replace("Empleado: Persona Prueba", ""),
        pageCount: 1,
      }),
    ).toThrow(SalaryReceiptParserIncompleteError);
  });

  it("rejects totals that do not reconcile exactly", () => {
    expect(() =>
      genericArgentinaSalaryReceiptParser.parse({
        rawText: regularReceipt.replace("Neto a cobrar 996.000,00", "Neto a cobrar 996.000,01"),
        pageCount: 1,
      }),
    ).toThrow(SalaryReceiptTotalsMismatchError);
  });
});
