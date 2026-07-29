"use client";

import { CardStatementHistoryPanelV2 } from "@/components/finance/imports/card-statement-history-panel-v2";
import { StateConsistencyBoundary } from "@/components/finance/states/async-state";
import { ImportacionesSection as LegacyImportacionesSection } from "./importaciones-section.legacy";

export function ImportacionesSection() {
  return (
    <StateConsistencyBoundary section="importaciones" label="Centro de importaciones">
      <div className="space-y-7">
        <CardStatementHistoryPanelV2 />
        <LegacyImportacionesSection />
      </div>
    </StateConsistencyBoundary>
  );
}
