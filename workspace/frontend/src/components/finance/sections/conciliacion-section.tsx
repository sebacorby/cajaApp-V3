"use client";

import { StateConsistencyBoundary } from "@/components/finance/states/async-state";
import { ConciliacionSection as LegacyConciliacionSection } from "./conciliacion-section.legacy";

export function ConciliacionSection() {
  return (
    <StateConsistencyBoundary section="conciliacion" label="Conciliación">
      <LegacyConciliacionSection />
    </StateConsistencyBoundary>
  );
}
