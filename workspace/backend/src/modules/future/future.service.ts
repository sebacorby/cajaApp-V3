import {
  formatMovementAmount,
  movementsService,
  parseMovementAmount,
  type NormalizedMovement,
} from "../movements/movements.service.js";
import type { FutureOverviewQueryInput } from "./future.schemas.js";


type Currency = "ARS" | "USD";
type Certainty = "confirmed" | "projected";
type ComponentKind = "income" | "card_debt" | "other_commitment";
type OriginSection = "tarjetas" | "ingresos" | "movimientos";


type MoneyBucket = {
  ars: bigint;
  usd: bigint;
};


type FutureComponent = {
  id: string;
  monthKey: string;
  occurredOn: string;
  kind: ComponentKind;
  certainty: Certainty;
  movementStatus: "actual" | "pending" | "projected";
  sourceType: string;
  sourceId: string;
  description: string;
  sourceLabel: string;
  category: { id: string | null; name: string };
  currency: Currency;
  amount: string;
  notes: string | null;
  originSection: OriginSection;
  originReference: string;
  dueDateEstimated: boolean;
};


type MonthAccumulator = {
  monthKey: string;
  label: string;
  components: FutureComponent[];
  confirmedIncome: MoneyBucket;
  projectedIncome: MoneyBucket;
  confirmedCardDebt: MoneyBucket;
  projectedCardDebt: MoneyBucket;
  confirmedOtherCommitments: MoneyBucket;
  projectedOtherCommitments: MoneyBucket;
};


function emptyMoney(): MoneyBucket {
  return { ars: 0n, usd: 0n };
}


function addMoney(bucket: MoneyBucket, currency: Currency, cents: bigint): void {
  if (currency === "ARS") bucket.ars += cents;
  else bucket.usd += cents;
}


function addBuckets(...buckets: MoneyBucket[]): MoneyBucket {
  return buckets.reduce(
    (result, bucket) => ({ ars: result.ars + bucket.ars, usd: result.usd + bucket.usd }),
    emptyMoney(),
  );
}


function subtractBuckets(left: MoneyBucket, right: MoneyBucket): MoneyBucket {
  return { ars: left.ars - right.ars, usd: left.usd - right.usd };
}


function serializeMoney(bucket: MoneyBucket) {
  return {
    ars: formatMovementAmount(bucket.ars, "ARS"),
    usd: formatMovementAmount(bucket.usd, "USD"),
  };
}


function monthLabel(monthKey: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${monthKey}-01T00:00:00Z`));
}


function monthKeyWithOffset(monthKey: string, offset: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}


function lastDateOfMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month, 0));
  return date.toISOString().slice(0, 10);
}


function currentDateInTucuman(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Tucuman",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}


function isCardSource(sourceType: string): boolean {
  return sourceType === "card_statement"
    || sourceType === "card_manual_purchase"
    || sourceType === "card_installment";
}


function originFor(movement: NormalizedMovement): {
  section: OriginSection;
  reference: string;
} {
  if (isCardSource(movement.sourceType)) {
    return {
      section: "tarjetas",
      reference: movement.trace.statementId ?? movement.sourceId,
    };
  }
  if (movement.sourceType === "income_recurring" || movement.sourceType === "income_one_off") {
    return {
      section: "ingresos",
      reference: movement.trace.incomeSourceId ?? movement.sourceId,
    };
  }
  return { section: "movimientos", reference: movement.sourceId };
}


function classifyMovement(
  movement: NormalizedMovement,
  today: string,
): Omit<FutureComponent, "id" | "monthKey" | "occurredOn" | "sourceType" | "sourceId" | "description" | "sourceLabel" | "category" | "currency" | "amount" | "notes" | "originSection" | "originReference"> | null {
  if (movement.status === "voided") return null;


  if (movement.type === "income") {
    return {
      kind: "income",
      certainty: movement.status === "projected" ? "projected" : "confirmed",
      movementStatus: movement.status as "actual" | "pending" | "projected",
      dueDateEstimated: false,
    };
  }


  if (isCardSource(movement.sourceType)) {
    return {
      kind: "card_debt",
      certainty: movement.sourceType === "card_installment" || movement.status !== "projected"
        ? "confirmed"
        : "projected",
      movementStatus: movement.status as "actual" | "pending" | "projected",
      dueDateEstimated: movement.sourceType === "card_installment" || movement.sourceType === "card_statement",
    };
  }


  if (movement.status === "pending") {
    return {
      kind: "other_commitment",
      certainty: "confirmed",
      movementStatus: "pending",
      dueDateEstimated: false,
    };
  }


  if (movement.status === "projected") {
    return {
      kind: "other_commitment",
      certainty: "projected",
      movementStatus: "projected",
      dueDateEstimated: false,
    };
  }


  // Un asiento manual fechado en el futuro representa un compromiso conocido,
  // aunque haya sido cargado como actual por el usuario.
  if (movement.sourceType.startsWith("manual_") && movement.occurredOn > today) {
    return {
      kind: "other_commitment",
      certainty: "confirmed",
      movementStatus: "actual",
      dueDateEstimated: false,
    };
  }


  // Los gastos cotidianos ya realizados no pertenecen a esta vista.
  return null;
}


function toComponent(movement: NormalizedMovement, today: string): FutureComponent | null {
  const classification = classifyMovement(movement, today);
  if (!classification) return null;
  const origin = originFor(movement);
  return {
    id: movement.id,
    monthKey: movement.effectiveMonthKey,
    occurredOn: movement.occurredOn,
    ...classification,
    sourceType: movement.sourceType,
    sourceId: movement.sourceId,
    description: movement.description,
    sourceLabel: movement.trace.sourceLabel,
    category: movement.category,
    currency: movement.currency,
    amount: movement.amount,
    notes: movement.notes,
    originSection: origin.section,
    originReference: origin.reference,
  };
}


function sourceGroupKey(component: FutureComponent): string {
  return `${component.kind}:${component.originSection}:${component.originReference}:${component.sourceLabel}`;
}


function sourceGroupLabel(component: FutureComponent): string {
  if (component.kind === "income") return component.sourceLabel || component.description;
  if (component.kind === "card_debt") return component.sourceLabel || "Tarjeta";
  return component.sourceLabel || component.category.name || "Otros compromisos";
}


export function buildFutureOverview(
  movements: NormalizedMovement[],
  query: FutureOverviewQueryInput,
  now = new Date(),
) {
  const today = currentDateInTucuman(now);
  const monthKeys = Array.from({ length: query.months }, (_, index) => monthKeyWithOffset(query.from, index));
  const monthSet = new Set(monthKeys);
  const months = new Map<string, MonthAccumulator>(
    monthKeys.map((monthKey) => [monthKey, {
      monthKey,
      label: monthLabel(monthKey),
      components: [],
      confirmedIncome: emptyMoney(),
      projectedIncome: emptyMoney(),
      confirmedCardDebt: emptyMoney(),
      projectedCardDebt: emptyMoney(),
      confirmedOtherCommitments: emptyMoney(),
      projectedOtherCommitments: emptyMoney(),
    }]),
  );


  for (const movement of movements) {
    if (!monthSet.has(movement.effectiveMonthKey)) continue;
    const component = toComponent(movement, today);
    if (!component) continue;
    const month = months.get(component.monthKey);
    if (!month) continue;
    month.components.push(component);
    const cents = parseMovementAmount(component.amount, component.currency, false);


    if (component.kind === "income") {
      addMoney(component.certainty === "confirmed" ? month.confirmedIncome : month.projectedIncome, component.currency, cents);
    } else if (component.kind === "card_debt") {
      addMoney(component.certainty === "confirmed" ? month.confirmedCardDebt : month.projectedCardDebt, component.currency, cents);
    } else {
      addMoney(
        component.certainty === "confirmed"
          ? month.confirmedOtherCommitments
          : month.projectedOtherCommitments,
        component.currency,
        cents,
      );
    }
  }


  const horizonConfirmedIncome = emptyMoney();
  const horizonProjectedIncome = emptyMoney();
  const horizonConfirmedCardDebt = emptyMoney();
  const horizonProjectedCardDebt = emptyMoney();
  const horizonConfirmedOther = emptyMoney();
  const horizonProjectedOther = emptyMoney();


  const responseMonths = monthKeys.map((monthKey) => {
    const month = months.get(monthKey)!;
    month.components.sort((left, right) => {
      const dateOrder = left.occurredOn.localeCompare(right.occurredOn);
      return dateOrder !== 0 ? dateOrder : left.description.localeCompare(right.description, "es");
    });


    addMoney(horizonConfirmedIncome, "ARS", month.confirmedIncome.ars);
    addMoney(horizonConfirmedIncome, "USD", month.confirmedIncome.usd);
    addMoney(horizonProjectedIncome, "ARS", month.projectedIncome.ars);
    addMoney(horizonProjectedIncome, "USD", month.projectedIncome.usd);
    addMoney(horizonConfirmedCardDebt, "ARS", month.confirmedCardDebt.ars);
    addMoney(horizonConfirmedCardDebt, "USD", month.confirmedCardDebt.usd);
    addMoney(horizonProjectedCardDebt, "ARS", month.projectedCardDebt.ars);
    addMoney(horizonProjectedCardDebt, "USD", month.projectedCardDebt.usd);
    addMoney(horizonConfirmedOther, "ARS", month.confirmedOtherCommitments.ars);
    addMoney(horizonConfirmedOther, "USD", month.confirmedOtherCommitments.usd);
    addMoney(horizonProjectedOther, "ARS", month.projectedOtherCommitments.ars);
    addMoney(horizonProjectedOther, "USD", month.projectedOtherCommitments.usd);


    const confirmedCommitments = addBuckets(month.confirmedCardDebt, month.confirmedOtherCommitments);
    const projectedCommitments = addBuckets(month.projectedCardDebt, month.projectedOtherCommitments);
    const confirmedResult = subtractBuckets(month.confirmedIncome, confirmedCommitments);
    const expectedIncome = addBuckets(month.confirmedIncome, month.projectedIncome);
    const expectedCommitments = addBuckets(confirmedCommitments, projectedCommitments);
    const expectedResult = subtractBuckets(expectedIncome, expectedCommitments);


    const groupMap = new Map<string, {
      key: string;
      label: string;
      kind: ComponentKind;
      originSection: OriginSection;
      originReference: string;
      confirmed: MoneyBucket;
      projected: MoneyBucket;
      items: FutureComponent[];
    }>();


    for (const component of month.components) {
      const key = sourceGroupKey(component);
      const group = groupMap.get(key) ?? {
        key,
        label: sourceGroupLabel(component),
        kind: component.kind,
        originSection: component.originSection,
        originReference: component.originReference,
        confirmed: emptyMoney(),
        projected: emptyMoney(),
        items: [],
      };
      addMoney(
        component.certainty === "confirmed" ? group.confirmed : group.projected,
        component.currency,
        parseMovementAmount(component.amount, component.currency, false),
      );
      group.items.push(component);
      groupMap.set(key, group);
    }


    const estimatedDueDateItems = month.components.filter((item) => item.dueDateEstimated).length;
    const unclassifiedItems = month.components.filter((item) => item.category.name === "Sin clasificar").length;
    const warnings: string[] = [];
    if (estimatedDueDateItems > 0) {
      warnings.push(`${estimatedDueDateItems} componente(s) de tarjeta tienen mes conocido pero día de vencimiento estimado.`);
    }
    if (unclassifiedItems > 0) {
      warnings.push(`${unclassifiedItems} componente(s) no tienen categoría asignada.`);
    }


    return {
      monthKey,
      label: month.label,
      totals: {
        confirmedIncome: serializeMoney(month.confirmedIncome),
        projectedIncome: serializeMoney(month.projectedIncome),
        confirmedCardDebt: serializeMoney(month.confirmedCardDebt),
        projectedCardDebt: serializeMoney(month.projectedCardDebt),
        confirmedOtherCommitments: serializeMoney(month.confirmedOtherCommitments),
        projectedOtherCommitments: serializeMoney(month.projectedOtherCommitments),
        confirmedCommitments: serializeMoney(confirmedCommitments),
        projectedCommitments: serializeMoney(projectedCommitments),
        confirmedResult: serializeMoney(confirmedResult),
        expectedIncome: serializeMoney(expectedIncome),
        expectedCommitments: serializeMoney(expectedCommitments),
        expectedResult: serializeMoney(expectedResult),
      },
      groups: [...groupMap.values()].map((group) => ({
        ...group,
        confirmed: serializeMoney(group.confirmed),
        projected: serializeMoney(group.projected),
      })),
      componentCount: month.components.length,
      dataQuality: {
        status: warnings.length > 0 ? "partial" : "complete",
        estimatedDueDateItems,
        unclassifiedItems,
        warnings,
      },
    };
  });


  const confirmedCommitments = addBuckets(horizonConfirmedCardDebt, horizonConfirmedOther);
  const projectedCommitments = addBuckets(horizonProjectedCardDebt, horizonProjectedOther);
  const expectedIncome = addBuckets(horizonConfirmedIncome, horizonProjectedIncome);
  const expectedCommitments = addBuckets(confirmedCommitments, projectedCommitments);


  return {
    range: {
      from: query.from,
      to: monthKeyWithOffset(query.from, query.months - 1),
      months: query.months,
    },
    summary: {
      confirmedIncome: serializeMoney(horizonConfirmedIncome),
      projectedIncome: serializeMoney(horizonProjectedIncome),
      confirmedCardDebt: serializeMoney(horizonConfirmedCardDebt),
      projectedCardDebt: serializeMoney(horizonProjectedCardDebt),
      confirmedOtherCommitments: serializeMoney(horizonConfirmedOther),
      projectedOtherCommitments: serializeMoney(horizonProjectedOther),
      confirmedCommitments: serializeMoney(confirmedCommitments),
      projectedCommitments: serializeMoney(projectedCommitments),
      expectedIncome: serializeMoney(expectedIncome),
      expectedCommitments: serializeMoney(expectedCommitments),
      expectedResult: serializeMoney(subtractBuckets(expectedIncome, expectedCommitments)),
    },
    months: responseMonths,
    dataQuality: {
      status: responseMonths.some((month) => month.dataQuality.status === "partial") ? "partial" : "complete",
      warnings: [...new Set(responseMonths.flatMap((month) => month.dataQuality.warnings))],
      note: "Los importes de tarjeta provienen de resúmenes aceptados. CajaApp todavía no registra pagos del resumen, por lo que no descuenta saldos cancelados automáticamente.",
    },
  };
}


export class FutureService {
  async getOverview(query: FutureOverviewQueryInput) {
    const toMonth = monthKeyWithOffset(query.from, query.months - 1);
    const movements = await movementsService.getAllMovements({
      from: `${query.from}-01`,
      to: lastDateOfMonth(toMonth),
      includeProjected: true,
    });
    return buildFutureOverview(movements, query);
  }
}


export const futureService = new FutureService();