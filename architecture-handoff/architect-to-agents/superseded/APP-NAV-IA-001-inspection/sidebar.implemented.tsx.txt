"use client";

import { SidebarFinancialHealth } from "@/components/finance/financial-health/financial-health-compact-provider";
import { NAV_GROUPS, type NavItem } from "@/lib/finance/nav";
import { useFinanceUI } from "@/lib/finance/ui-store";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { SidebarDataQuality } from "./sidebar-data-quality";

interface SidebarProps {
  onNavigate?: () => void;
}

function NavigationItem({
  item,
  groupId,
  active,
  onSelect,
}: {
  item: NavItem;
  groupId: string;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      title={item.description}
      data-testid={`sidebar-nav-item-${item.id}`}
      data-section-id={item.id}
      data-nav-group={groupId}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      <span className="flex-1 text-left">{item.label}</span>
      {active ? (
        <span
          className="size-1.5 rounded-full bg-primary-foreground/80"
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const section = useFinanceUI((state) => state.section);
  const setSection = useFinanceUI((state) => state.setSection);

  return (
    <div className="flex h-full flex-col gap-5 p-4">
      <div className="px-2 pt-2">
        <Brand />
      </div>

      <nav
        className="flex flex-1 flex-col gap-4"
        aria-label="Navegación principal"
        data-testid="sidebar-navigation"
      >
        {NAV_GROUPS.map((group) => {
          const titleId = `sidebar-nav-group-${group.id}-title`;
          const descriptionId = `sidebar-nav-group-${group.id}-description`;

          return (
            <section
              key={group.id}
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
              data-testid={`sidebar-nav-group-${group.id}`}
              data-nav-group={group.id}
            >
              <p
                id={titleId}
                className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {group.label}
              </p>
              <p id={descriptionId} className="sr-only">
                {group.description}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <NavigationItem
                    key={item.id}
                    item={item}
                    groupId={group.id}
                    active={item.id === section}
                    onSelect={() => {
                      setSection(item.id);
                      onNavigate?.();
                    }}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </nav>

      <SidebarFinancialHealth onNavigate={onNavigate} />
      <SidebarDataQuality onNavigate={onNavigate} />
      <div className="rounded-xl border bg-card p-3 text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Datos locales.</span>{" "}
        CajaApp no conecta cuentas bancarias ni toma decisiones financieras por
        vos.
      </div>
    </div>
  );
}
