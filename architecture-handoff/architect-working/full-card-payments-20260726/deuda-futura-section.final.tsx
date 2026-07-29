"use client";

import { StateConsistencyBoundary } from "@/components/finance/states/async-state";
import { CardPaymentsView } from "@/components/finance/transactions/CardPaymentsView";

export function DeudaFuturaSection() {
  return (
    <StateConsistencyBoundary section="deuda" label="Pagos de tarjeta">
      <CardPaymentsView />
    </StateConsistencyBoundary>
  );
}
