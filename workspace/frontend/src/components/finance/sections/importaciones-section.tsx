"use client";

import { CardStatementHistoryPanelV2 } from "@/components/finance/imports/card-statement-history-panel-v2";
import { PendingSalaryReceiptDraftsCleanupPanel } from "@/components/finance/imports/pending-salary-receipt-drafts-cleanup-panel";
import { ReversedSalaryReceiptsCleanupPanel } from "@/components/finance/imports/reversed-salary-receipts-cleanup-panel";
import { StateConsistencyBoundary } from "@/components/finance/states/async-state";
import { ImportacionesSection as LegacyImportacionesSection } from "./importaciones-section.legacy";

export function ImportacionesSection() {
  return (
    <StateConsistencyBoundary section="importaciones" label="Centro de importaciones">
      <div className="space-y-7">
        <CardStatementHistoryPanelV2 />
        <PendingSalaryReceiptDraftsCleanupPanel />
        <ReversedSalaryReceiptsCleanupPanel />
        <LegacyImportacionesSection />
      </div>
    </StateConsistencyBoundary>
  );
}
