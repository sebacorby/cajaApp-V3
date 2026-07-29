import type {
  FutureDebtReader,
  RawCardStatement,
  RawCardStatementGroup,
  RawCardStatementRow,
  RawManualPurchase,
  RawProjection,
} from "../../future.types.js";

export interface FutureFixture {
  projections: RawProjection[];
  statements: RawCardStatement[];
  groups: RawCardStatementGroup[];
  rows: RawCardStatementRow[];
  manualPurchases: RawManualPurchase[];
  expected: Record<string, unknown>;
}

export class FixtureReader implements FutureDebtReader {
  readonly writes: string[] = [];
  private fixture: FutureFixture = {
    projections: [],
    statements: [],
    groups: [],
    rows: [],
    manualPurchases: [],
    expected: {},
  };

  load(fixture: FutureFixture): void {
    this.fixture = structuredClone(fixture);
  }

  get projections(): RawProjection[] {
    return this.fixture.projections;
  }

  get statements(): RawCardStatement[] {
    return this.fixture.statements;
  }

  get groups(): RawCardStatementGroup[] {
    return this.fixture.groups;
  }

  get rows(): RawCardStatementRow[] {
    return this.fixture.rows;
  }

  get manualPurchases(): RawManualPurchase[] {
    return this.fixture.manualPurchases;
  }

  get expected(): Record<string, unknown> {
    return this.fixture.expected;
  }

  readonly cardInstallmentProjection = {
    findMany: async () => this.fixture.projections.map((row) => ({ ...row })),
  };

  readonly cardStatement = {
    findFirst: async () => this.fixture.statements.find(
      (statement) => statement.status === "accepted" && statement.isActiveForPeriod,
    ) ?? null,
    findMany: async () => this.fixture.statements.map((statement) => ({ ...statement })),
  };

  readonly cardStatementRow = {
    findMany: async () => this.fixture.rows.map((row) => ({ ...row })),
  };

  readonly cardStatementGroup = {
    findMany: async () => this.fixture.groups.map((group) => ({ ...group })),
  };

  readonly manualCardPurchase = {
    findMany: async () => this.fixture.manualPurchases.map((purchase) => ({ ...purchase })),
  };
}

export function baseFixture(): FutureFixture {
  return {
    projections: [],
    statements: [],
    groups: [],
    rows: [],
    manualPurchases: [],
    expected: {},
  };
}
