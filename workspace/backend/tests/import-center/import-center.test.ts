import { describe, expect, it } from "vitest";
import {
  applyImportCenterFilters,
  buildImportCenterSummary,
  normalizeImportCenterStatus,
  parsePreviewError,
  parseValidationMessages,
  type ImportCenterItem,
  type ImportCenterQuery,
} from "../../src/modules/import-center/import-center.service.js";

function item(
  patch: Partial<ImportCenterItem> = {},
): ImportCenterItem {
  return {
    id: "card_statement:00000000-0000-4000-8000-000000000001",
    kind: "card_statement",
    entityId: "00000000-0000-4000-8000-000000000001",
    documentId: "00000000-0000-4000-8000-000000000002",
    fileName: "resumen-junio.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2000,
    sha256: "abc",
    pageCount: 2,
    status: "accepted",
    title: "Banco Demo · Visa",
    subtitle: "Persona Demo · resumen-junio.pdf",
    periodKey: "2026-06",
    createdAt: "2026-07-15T10:00:00.000Z",
    updatedAt: "2026-07-15T11:00:00.000Z",
    completedAt: "2026-07-15T11:00:00.000Z",
    requiresAction: false,
    correctionCount: 0,
    version: 1,
    active: true,
    error: null,
    issues: [],
    ai: null,
    navigation: { section: "tarjetas", label: "Abrir en Tarjetas" },
    metadata: { banco: "Banco Demo" },
    ...patch,
  };
}

const allQuery: ImportCenterQuery = {
  kind: "all",
  status: "all",
  search: "",
  limit: 25,
  offset: 0,
};

describe("Import Center", () => {
  it("normaliza estados de los tres pipelines", () => {
    expect(
      normalizeImportCenterStatus("card_statement", "preview_ready"),
    ).toBe("needs_review");
    expect(
      normalizeImportCenterStatus("card_statement", "imported"),
    ).toBe("processing");
    expect(
      normalizeImportCenterStatus("salary_receipt", "superseded"),
    ).toBe("superseded");
    expect(
      normalizeImportCenterStatus("debit_csv", "draft"),
    ).toBe("needs_review");
    expect(
      normalizeImportCenterStatus(
        "card_statement",
        "accepted",
        new Date(),
      ),
    ).toBe("archived");
  });

  it("extrae errores y validaciones sin exponer el preview completo", () => {
    expect(
      parsePreviewError(
        JSON.stringify({
          stage: "failed",
          error: { message: "Proveedor no disponible", code: "AI_DOWN" },
        }),
      ),
    ).toEqual({
      message: "Proveedor no disponible",
      stage: "failed",
      details: ["Código: AI_DOWN"],
    });
    expect(
      parseValidationMessages(
        JSON.stringify([
          { message: "Confianza baja" },
          "Fecha incompleta",
        ]),
      ),
    ).toEqual(["Confianza baja", "Fecha incompleta"]);
  });

  it("calcula el resumen global incluyendo correcciones", () => {
    const items = [
      item(),
      item({
        id: "salary_receipt:2",
        kind: "salary_receipt",
        status: "needs_review",
        requiresAction: true,
      }),
      item({
        id: "card_statement:3",
        status: "superseded",
        correctionCount: 1,
      }),
      item({
        id: "debit_csv:4",
        kind: "debit_csv",
        status: "failed",
        requiresAction: true,
      }),
      item({
        id: "salary_receipt:5",
        kind: "salary_receipt",
        status: "reversed",
      }),
    ];

    expect(buildImportCenterSummary(items)).toEqual({
      total: 5,
      processing: 0,
      needsReview: 1,
      accepted: 1,
      failed: 1,
      corrected: 1,
      reversed: 1,
    });
  });

  it("filtra por tipo, estado y búsqueda sin tildes", () => {
    const items = [
      item(),
      item({
        id: "salary_receipt:2",
        kind: "salary_receipt",
        title: "Recibo 2026-06 · Compañía Demo",
        subtitle: "Empleado Demo",
        fileName: "sueldo.pdf",
        status: "needs_review",
        navigation: {
          section: "ingresos",
          label: "Abrir en Ingresos",
        },
      }),
    ];

    expect(
      applyImportCenterFilters(items, {
        ...allQuery,
        kind: "salary_receipt",
        status: "needs_review",
        search: "compania",
      }).map((entry) => entry.id),
    ).toEqual(["salary_receipt:2"]);
  });

  it("ordena por actualización descendente", () => {
    const items = [
      item({ id: "card_statement:older" }),
      item({
        id: "card_statement:newer",
        updatedAt: "2026-07-16T12:00:00.000Z",
      }),
    ];

    expect(
      applyImportCenterFilters(items, allQuery).map((entry) => entry.id),
    ).toEqual(["card_statement:newer", "card_statement:older"]);
  });
});
