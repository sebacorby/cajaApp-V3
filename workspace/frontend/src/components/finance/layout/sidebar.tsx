"use client";


import { NAV_ITEMS } from "@/lib/finance/nav";
import { useFinanceUI } from "@/lib/finance/ui-store";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { SidebarDataQuality } from "./sidebar-data-quality";


interface SidebarProps {
  onNavigate?: () => void;
}


export function Sidebar({ onNavigate }: SidebarProps) {
  const section = useFinanceUI((state) => state.section);
  const setSection = useFinanceUI((state) => state.setSection);


  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-2 pt-2"><Brand /></div>
      <nav className="flex flex-1 flex-col gap-1">
        <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Menú</p>
        {NAV_ITEMS.map((item) => {
          const active = item.id === section;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSection(item.id);
                onNavigate?.();
              }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {active && <span className="size-1.5 rounded-full bg-primary-foreground/80" />}
            </button>
          );
        })}
      </nav>
      <SidebarDataQuality onNavigate={onNavigate} />
      <div className="rounded-xl border bg-card p-3 text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Datos locales.</span> CajaApp no conecta cuentas bancarias ni toma decisiones financieras por vos.
      </div>
    </div>
  );
}