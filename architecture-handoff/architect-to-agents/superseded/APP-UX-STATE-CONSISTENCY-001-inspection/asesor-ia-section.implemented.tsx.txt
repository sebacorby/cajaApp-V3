"use client";

import { StateConsistencyBoundary } from "@/components/finance/states/async-state";
import { AsesorIaSection as LegacyAsesorIaSection } from "./asesor-ia-section.legacy";

export function AsesorIaSection() {
  return (
    <StateConsistencyBoundary section="asesor" label="Asesor IA">
      <LegacyAsesorIaSection />
    </StateConsistencyBoundary>
  );
}
