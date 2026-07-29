"use client";

import { CardPaymentsWorkspace } from "@/components/finance/transactions/CardPaymentsWorkspace";

export function DeudaFuturaSection() {
  return (
    <div className="[&_[data-testid='card-payments-view']>div:nth-child(3)]:hidden">
      <CardPaymentsWorkspace />
    </div>
  );
}
