import { describe, expect, it } from "vitest";
import {
  applyReconciliationFilters,
  buildReconciliationFingerprint,
  buildReconciliationSummary,
  calculateDuplicateConfidence,
  reconciliationTextSimilarity,
  suggestExcludedMovementId,
  type ReconciliationItem,
  type ReconciliationQuery,
} from "../../src/modules/reconciliation/reconciliation.service.js";
import {
  filterReconciledMovements,
  type NormalizedMovement,
} from "../../src/modules/movements/movements.service.js";

function movement(
  patch: Partial<NormalizedMovement> = {},
): NormalizedMovement {
  return {
    id: "debit-csv:00000000-0000-4000-8000-000000000001",
    occurredOn: "2026-07-10",
    effectiveMonthKey: "2026-07",
    type: "expense",
    sourceType: "debit_csv",
    sourceId: "00000000-0000-4000-8000-000000000001",
    description: "Pago tarjeta Banco Demo",
    category: { id: null, name: "Tarjetas" },
    currency: "ARS",
    amount: "125.000,00",
    status: "actual",
    notes: null,
    editable: false,
    categoryEditable: true,
    createdAt: null,
    updatedAt: null,
    trace: { sourceLabel: "Banco Demo" },
    ...patch,
  };
}

function participant(
  role: "left" | "right",
  patch: Partial<ReconciliationItem["participants"][number]> = {},
): ReconciliationItem["participants"][number] {
  return {
    id: `participant-${role}`,
    role,
    entityKey: `movement:${role}`,
    entityType: "movement",
    sourceType: role === "left" ? "debit_csv" : "card_statement",
    sourceId: role,
    movementId: `movement-${role}`,
    description: role === "left" ? "Pago tarjeta" : "Resumen tarjeta",
    occurredOn: "2026-07-10",
    currency: "ARS",
    amount: "125.000,00",
    excluded: false,
    metadata: {},
    navigation: {
      section: role === "left" ? "movimientos" : "tarjetas",
      label: role === "left" ? "Abrir en Movimientos" : "Abrir en Tarjetas",
    },
    ...patch,
  };
}

function caseItem(
  patch: Partial<ReconciliationItem> = {},
): ReconciliationItem {
  return {
    id: "00000000-0000-4000-8000-000000000010",
    fingerprint: "fingerprint",
    relationType: "duplicate_movement",
    status: "open",
    resolution: null,
    confidence: 88,
    title: "Posible movimiento duplicado",
    rationale: ["Mismo importe", "Fechas cercanas"],
    suggestedResolution: "exclude_left",
    currency: "ARS",
    amount: "125.000,00",
    occurredOn: "2026-07-10",
    excludedMovementId: null,
    isCurrent: true,
    lastDetectedAt: "2026-07-16T12:00:00.000Z",
    resolvedAt: null,
    createdAt: "2026-07-16T12:00:00.000Z",
    updatedAt: "2026-07-16T12:00:00.000Z",
    participants: [participant("left"), participant("right")],
    ...patch,
  };
}

const allQuery: ReconciliationQuery = {
  status: "all",
  relationType: "all",
  scope: "all",
  search: "",
  limit: 25,
  offset: 0,
};

describe("Reconciliation", () => {
  it("normaliza texto y calcula similitud sin depender de tildes", () => {
    expect(
      reconciliationTextSimilarity(
        "Depósito de Compañía Álamo",
        "COMPANIA ALAMO deposito",
      ),
    ).toBe(1);
  });

  it("puntúa duplicados sólo con moneda, importe y fechas compatibles", () => {
    const left = movement();
    const right = movement({
      id: "manual:00000000-0000-4000-8000-000000000002",
      sourceType: "manual_transfer",
      sourceId: "00000000-0000-4000-8000-000000000002",
      occurredOn: "2026-07-11",
      description: "Pago de tarjeta Banco Demo",
    });

    expect(calculateDuplicateConfidence(left, right)).toBeGreaterThanOrEqual(80);
    expect(
      calculateDuplicateConfidence(left, {
        ...right,
        amount: "125.001,00",
      }),
    ).toBe(0);
    expect(
      calculateDuplicateConfidence(left, {
        ...right,
        occurredOn: "2026-07-20",
      }),
    ).toBe(0);
  });

  it("genera una huella estable y sugiere excluir la fuente menos autoritativa", () => {
    const first = buildReconciliationFingerprint("duplicate_movement", [
      "movement:b",
      "movement:a",
    ]);
    const second = buildReconciliationFingerprint("duplicate_movement", [
      "movement:a",
      "movement:b",
    ]);

    expect(first).toBe(second);
    expect(
      suggestExcludedMovementId(
        { sourceType: "debit_csv", movementId: "debit-csv:1" },
        { sourceType: "income_recurring", movementId: "income-recurring:1" },
      ),
    ).toBe("exclude_left");
  });

  it("resume, filtra y ordena casos abiertos antes que decisiones históricas", () => {
    const items = [
      caseItem({
        id: "resolved",
        status: "resolved",
        resolution: "exclude_left",
        excludedMovementId: "movement-left",
        confidence: 99,
        isCurrent: false,
        updatedAt: "2026-07-16T14:00:00.000Z",
      }),
      caseItem({
        id: "salary",
        relationType: "salary_deposit",
        title: "Depósito y recibo de Compañía Demo",
        confidence: 92,
        updatedAt: "2026-07-16T13:00:00.000Z",
      }),
      caseItem({
        id: "dismissed",
        status: "dismissed",
        resolution: "dismiss",
        confidence: 70,
      }),
    ];

    expect(buildReconciliationSummary(items)).toEqual({
      total: 3,
      open: 1,
      resolved: 1,
      dismissed: 1,
      duplicates: 2,
      relations: 1,
      excluded: 1,
      current: 2,
    });

    expect(
      applyReconciliationFilters(items, {
        ...allQuery,
        status: "open",
        relationType: "salary_deposit",
        scope: "current",
        search: "compania",
      }).map((item) => item.id),
    ).toEqual(["salary"]);
  });

  it("elimina del ledger sólo las representaciones conciliadas", () => {
    const movements = [
      movement({ id: "debit-csv:exclude" }),
      movement({ id: "income-recurring:keep", type: "income" }),
    ];

    expect(
      filterReconciledMovements(
        movements,
        new Set(["debit-csv:exclude"]),
      ).map((item) => item.id),
    ).toEqual(["income-recurring:keep"]);

    expect(filterReconciledMovements(movements, new Set())).toBe(movements);
  });
});
