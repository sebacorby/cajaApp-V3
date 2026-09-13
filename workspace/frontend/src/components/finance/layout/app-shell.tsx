"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { NAV_ITEMS } from "@/lib/finance/nav";
import { useFinanceUI } from "@/lib/finance/ui-store";

interface AppShellProps { children: React.ReactNode }

export function AppShell({ children }: AppShellProps) {
  const section = useFinanceUI((state) => state.section);
  const activeLabel = NAV_ITEMS.find((item) => item.id === section)?.description ?? "CajaApp";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:block">
          <div className="sticky top-0 h-screen overflow-y-auto overscroll-contain"><Sidebar /></div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">
              <div className="mb-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{activeLabel}</p>
              </div>
              {children}
            </div>
          </main>
          <footer className="mt-auto border-t bg-card/50">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8">
              <p>© {new Date().getFullYear()} CajaApp.</p>
              <p>La información se procesa localmente en tu instalación.</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
