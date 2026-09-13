import { describe, expect, it } from "vitest";
import {
  buildDebitRowFingerprint,
  normalizeCsvDate,
  parseDebitCsv,
} from "../../src/modules/debit-imports/debit-imports.parser.js";

describe("debit CSV parser", () => {
  it("detecta CSV argentino con débito y crédito separados", () => {
    const csv = [
      "Fecha;Descripción;Débito;Crédito;Referencia",
      "11/07/2026;SUPERMERCADO NORTE;12.345,67;;A-100",
      "10/07/2026;TRANSFERENCIA RECIBIDA;;50.000,00;B-200",
    ].join("\r\n");

    const parsed = parseDebitCsv(Buffer.from(csv, "utf8"));

    expect(parsed.delimiter).toBe(";");
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({
      occurredOn: "2026-07-11",
      movementType: "expense",
      currency: "ARS",
      amount: "12.345,67",
      included: true,
    });
    expect(parsed.rows[1]).toMatchObject({
      occurredOn: "2026-07-10",
      movementType: "income",
      amount: "50.000,00",
    });
  });

  it("interpreta importe firmado y encabezados con metadata previa", () => {
    const csv = [
      "Banco Galicia",
      "Cuenta: 123",
      "Fecha,Concepto,Importe",
      "2026-07-09,COMPRA ONLINE,\"-1.250,50\"",
      "2026-07-08,REINTEGRO,\"500,00\"",
    ].join("\n");

    const parsed = parseDebitCsv(Buffer.from(csv, "utf8"));

    expect(parsed.headerRow).toBe(3);
    expect(parsed.rows[0].movementType).toBe("expense");
    expect(parsed.rows[0].amount).toBe("1.250,50");
    expect(parsed.rows[1].movementType).toBe("income");
  });

  it("marca filas inválidas sin inventar datos", () => {
    const csv = [
      "Fecha;Detalle;Monto",
      "fecha rota;SIN FECHA;-100",
    ].join("\n");

    const parsed = parseDebitCsv(Buffer.from(csv, "utf8"));

    expect(parsed.rows[0].included).toBe(false);
    expect(parsed.rows[0].validationError).toContain("Fecha inválida");
  });

  it("normaliza fechas y genera fingerprints estables", () => {
    expect(normalizeCsvDate("1/7/26")).toBe("2026-07-01");
    expect(normalizeCsvDate("2026-07-01 10:15")).toBe("2026-07-01");

    const input = {
      occurredOn: "2026-07-01",
      description: "Supermercado",
      reference: "ABC",
      movementType: "expense" as const,
      currency: "ARS" as const,
      amount: "1.000,00",
    };

    expect(buildDebitRowFingerprint(input)).toBe(
      buildDebitRowFingerprint({ ...input, description: "  SUPERMERCADO " }),
    );
  });
});
