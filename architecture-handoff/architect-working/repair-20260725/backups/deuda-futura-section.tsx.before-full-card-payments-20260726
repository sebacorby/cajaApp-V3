// deuda-futura-section.tsx
//
// Per design decision 6 in specs/001-deuda-futura-de-tarjetas/code/design.md:
// "Replace deuda-futura-section.tsx with a new component."  The SDD implementation
// produced FutureDebtView.tsx which uses the correct fetchFutureDebt API.  This
// file wraps FutureDebtView with a QueryClientProvider because FutureDebtView
// uses TanStack Query hooks and the section router does not provide one.

"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { FutureDebtView } from "@/components/finance/transactions/FutureDebtView";

export function DeudaFuturaSection() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 0,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <FutureDebtView />
    </QueryClientProvider>
  );
}
