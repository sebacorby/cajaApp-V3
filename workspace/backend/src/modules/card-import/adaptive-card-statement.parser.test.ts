import { describe, expect, it } from "vitest";
import { parseCardStatementRaw } from "./card-statement-parser.js";
import { scoreAdaptiveCardStatement } from "./adaptive-card-statement.parser.js";

const cases = [
  {
    name: "narrative account",
    text: `
Tu total a pagar es $134.992,72 y vence el 10/08/26.
LA MENOR ENTREGA $126.300,00
Detalle de consumos:
FECHA TARJETA CUPON DETALLE CUOTA/PLAN $ U$S
10/01/26 Digital 1582 SERVICIO MOVIL 07/12 103.379,60
27/06/26 Cuenta 154512 COMISION POR RENOVACION 02/03 8.967,43
Otros cargos:
27/07/26 COMISION POR MANTENIMIENTO 8.842,97
Total a pagar $134.992,72
El resumen actual cerró el 27/07. El próximo resumen cierra el 27/08/26 y vence el 10/09/26.
Cuotas futuras Septiembre/26 $112.347,03 Octubre/26 $103.379,60
`,
    total: "134.992,72",
    due: "2026-08-10",
  },
  {
    name: "classic text-month table",
    text: `
ESTADO DE CUENTA AL: 02-Jul-26 SALDO ACTUAL $ 5992,16 U$S 0,72
VENCIMIENTO ACTUAL 15-Jul-26 PAGO MINIMO $ 870,00
PROXIMO CIERRE: 30-Jul-26 PROXIMO VENCIMIENTO: 12-Ago-26
DETALLE DEL MES
FECHA COMPRAS DEL MES NRO CUPON PESOS DOLARES
05-Jun-26 SERVICIO CLOUD 00384 0,71
07-Jun-26 TRANSPORTE 04535 5399,00
SALDO ACTUAL 5992,16 0,72
`,
    total: "5992,16",
    due: "2026-07-15",
  },
  {
    name: "numeric-date multi-currency table",
    text: `
TOTAL A PAGAR 3.118.842,50 161,84
PAGO MINIMO $ 508.000,00 VENCIMIENTO 13-07-26
PROXIMO CIERRE: 30-07-26 PROXIMO VENCIMIENTO: 13-08-26
DETALLE DEL CONSUMO
FECHA REFERENCIA CUOTA COMPROBANTE PESOS DOLARES
04-06-26 TRANSPORTE 009169 1.348,25
10-06-26 COMERCIO 01/06 262500 38.833,00
02-07-26 IVA RG 4240 21% 15.362,45
TOTAL A PAGAR 3.118.842,50 161,84
`,
    total: "3.118.842,50",
    due: "2026-07-13",
  },
  {
    name: "master-style table",
    text: `
TOTAL A PAGAR 1.425.613,43 0,00
PAGO MINIMO $ 350.000,00 VENCIMIENTO ACTUAL 15-Jul-26
PROXIMO CIERRE: 30-Jul-26 PROXIMO VENCIMIENTO: 12-Ago-26
DETALLE DEL CONSUMO
FECHA REFERENCIA CUOTA COMPROBANTE PESOS DOLARES
13-Jun-26 COMERCIO UNO 01/03 09302 26.083,34
18-Jun-26 COMERCIO DOS 01/06 04700 28.316,70
TOTAL A PAGAR 1.425.613,43 0,00
CUOTAS A VENCER Julio-26 $955.818,67 Agosto-26 $955.818,67
`,
    total: "1.425.613,43",
    due: "2026-07-15",
  },
  {
    name: "generic issuer without bank vocabulary",
    text: `
ESTADO DE CUENTA AL 01/07/2026
TOTAL ADEUDADO $ 82.450,00
VENCIMIENTO 18/07/2026 PAGO MINIMO $ 22.000,00
PROXIMO CIERRE 01/08/2026
DETALLE DE CONSUMOS
FECHA DETALLE COMPROBANTE IMPORTE
12/06/26 SUPERMERCADO 445566 45.000,00
20/06/26 FARMACIA 778899 37.450,00
`,
    total: "82.450,00",
    due: "2026-07-18",
  },
  {
    name: "same semantics with changed spacing and wording",
    text: `
Estado de cuenta al: 02/07/2026
Saldo actual     $ 75.500,00
Fecha de vencimiento: 20/07/2026
Pago mínimo actual $ 10.000,00
Próximo cierre: 02/08/2026
Compras del mes
Fecha   Referencia   Comprobante   Pesos
01/07/26 SERVICIO A 100001 50.000,00
02/07/26 IMPUESTO DE SELLOS 25.500,00
`,
    total: "75.500,00",
    due: "2026-07-20",
  },
];

describe("adaptive structural card statement parser", () => {
  it.each(cases)("parses $name by financial structure", ({ text, total, due }) => {
    const score = scoreAdaptiveCardStatement(text);
    expect(score.score).toBeGreaterThanOrEqual(8);

    const result = parseCardStatementRaw(text, 1);
    expect(result.diagnostics.parserId).toBe("adaptive-structural-card-statement");
    expect(result.preview.summary.totalPesos).toBe(total);
    expect(result.preview.summary.currentDueDate).toBe(due);
    expect(result.preview.rows.some((row) => row.rowType === "transaction")).toBe(true);
    expect(result.diagnostics.unexplainedTransactionLines).toEqual([]);
  });

  it("does not require issuer, bank or card-brand names", () => {
    const source = cases[4].text;
    expect(source).not.toMatch(/visa|mastercard|galicia|icbc|naranja|banco/i);
    expect(parseCardStatementRaw(source, 1).preview.rows.length).toBeGreaterThan(1);
  });

  it("fails closed when a financial detail line cannot be explained", () => {
    const text = `${cases[4].text}\n21/06/26 MOVIMIENTO SIN IMPORTE`;
    expect(() => parseCardStatementRaw(text, 1)).toThrow(/no pudo interpretar/i);
  });
});
