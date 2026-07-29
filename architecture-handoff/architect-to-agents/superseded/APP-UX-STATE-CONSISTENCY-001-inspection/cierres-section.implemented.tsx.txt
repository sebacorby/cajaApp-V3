"use client";
import { StateConsistencyBoundary } from "@/components/finance/states/async-state";
import { CierresSection as LegacyCierresSection } from "./cierres-section.legacy";
export function CierresSection() {
  return <StateConsistencyBoundary section="cierres" label="Cierres mensuales"><LegacyCierresSection /></StateConsistencyBoundary>;
}
