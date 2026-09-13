"use client";

import { AppShell } from "@/components/finance/layout/app-shell";
import { SectionRouter } from "@/components/finance/sections/section-router";

export default function Home() {
  return (
    <AppShell>
      <SectionRouter />
    </AppShell>
  );
}
