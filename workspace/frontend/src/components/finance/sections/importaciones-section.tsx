"use client";

import { useState } from "react";
import { CardStatementHistoryPanelV2 } from "@/components/finance/imports/card-statement-history-panel-v2";
import { PendingSalaryReceiptDraftsCleanupPanel } from "@/components/finance/imports/pending-salary-receipt-drafts-cleanup-panel";
import { ReversedSalaryReceiptsCleanupPanel } from "@/components/finance/imports/reversed-salary-receipts-cleanup-panel";
import { StateConsistencyBoundary } from "@/components/finance/states/async-state";
import { ImportacionesSection as LegacyImportacionesSection } from "./importaciones-section.legacy";

export function ImportacionesSection() {
  const [historyRevision, setHistoryRevision] = useState(0);

  const refreshHistory = () => {
    setHistoryRevision((current) => current + 1);
  };

  return (
    <StateConsistencyBoundary section="importaciones" label="Centro de importaciones">
      <div className="space-y-7">
        <CardStatementHistoryPanelV2 />
        <PendingSalaryReceiptDraftsCleanupPanel onDeleted={refreshHistory} />
        <ReversedSalaryReceiptsCleanupPanel />
        <LegacyImportacionesSection key={historyRevision} />
      </div>
    </StateConsistencyBoundary>
  );
}
