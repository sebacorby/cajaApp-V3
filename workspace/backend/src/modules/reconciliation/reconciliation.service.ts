import { prisma } from "../../db/prisma.js";
import {
  ReconciliationService as BaseReconciliationService,
  type ReconciliationItem,
  type ReconciliationParticipant,
  type ReconciliationQuery,
} from "./reconciliation.service.base.js";
import type {
  ResolveReconciliationInput,
  ScanReconciliationInput,
} from "./reconciliation.schemas.js";

export * from "./reconciliation.service.base.js";

export interface ReconciliationNavigationTarget {
  section: "movimientos" | "tarjetas" | "ingresos";
  label: string;
  recordId: string;
  recordType: "movement" | "card_statement" | "income_source";
  module: string;
  typeLabel: string;
  title: string;
  context: string;
}

function incomeSourceId(participant: ReconciliationParticipant): string {
  const movementId = participant.movementId ?? "";
  const match = movementId.match(/^income-recurring:(.+):\d{4}-\d{2}$/);
  return match?.[1] ?? participant.sourceId;
}

function navigationTarget(
  participant: ReconciliationParticipant,
): ReconciliationNavigationTarget {
  const context = [
    participant.occurredOn,
    participant.currency && participant.amount
      ? `${participant.currency} ${participant.amount}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (
    participant.entityType === "card_statement" ||
    participant.sourceType === "card_statement" ||
    participant.sourceType === "card_manual_purchase" ||
    participant.sourceType === "card_installment"
  ) {
    return {
      section: "tarjetas",
      label: "Abrir resumen",
      recordId: participant.sourceId,
      recordType: "card_statement",
      module: "Tarjetas",
      typeLabel: "Resumen de tarjeta",
      title: participant.description,
      context,
    };
  }

  if (
    participant.entityType === "salary_receipt" ||
    participant.sourceType === "income_recurring" ||
    participant.sourceType === "income_one_off"
  ) {
    return {
      section: "ingresos",
      label: "Abrir ingreso",
      recordId: incomeSourceId(participant),
      recordType: "income_source",
      module: "Ingresos",
      typeLabel: "Fuente de ingreso",
      title: participant.description,
      context,
    };
  }

  return {
    section: "movimientos",
    label: "Abrir movimiento",
    recordId: participant.movementId ?? participant.sourceId,
    recordType: "movement",
    module: "Movimientos",
    typeLabel: "Movimiento",
    title: participant.description,
    context,
  };
}

function enrichItem(item: ReconciliationItem): ReconciliationItem {
  return {
    ...item,
    participants: item.participants.map((participant) => ({
      ...participant,
      navigation: navigationTarget(participant),
    })),
  };
}

export class ReconciliationService extends BaseReconciliationService {
  override async scan(input: ScanReconciliationInput) {
    const scanStartedAt = new Date();
    const result = await super.scan(input);

    // Los casos que no fueron redetectados por la última ejecución dejan de ser
    // vigentes, aunque correspondan a otro rango histórico. Si el scan falla,
    // esta limpieza nunca se ejecuta y la bandeja anterior permanece intacta.
    await prisma.reconciliationCase.updateMany({
      where: {
        isCurrent: true,
        lastDetectedAt: { lt: scanStartedAt },
      },
      data: { isCurrent: false },
    });

    const current = await this.list({
      status: "all",
      relationType: "all",
      scope: "current",
      search: "",
      limit: 100,
      offset: 0,
    });

    return {
      ...result,
      summary: current.filteredSummary,
      items: current.items,
      refreshedAt: new Date().toISOString(),
    };
  }

  override async list(query: ReconciliationQuery) {
    const result = await super.list(query);
    return {
      ...result,
      items: result.items.map(enrichItem),
    };
  }

  override async detail(caseId: string) {
    return enrichItem(await super.detail(caseId));
  }

  override async resolve(
    caseId: string,
    action: ResolveReconciliationInput["action"],
  ) {
    return enrichItem(await super.resolve(caseId, action));
  }

  override async reopen(caseId: string) {
    return enrichItem(await super.reopen(caseId));
  }
}

export const reconciliationService = new ReconciliationService();
