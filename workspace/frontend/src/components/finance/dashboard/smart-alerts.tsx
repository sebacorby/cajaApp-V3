"use client";

import type { SmartAlert, AlertSeverity } from "@/lib/finance/types";
import { getIcon } from "@/lib/finance/icons";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface SmartAlertsProps {
  alerts: SmartAlert[];
}

const SEVERITY: Record<
  AlertSeverity,
  { bg: string; icon: string; text: string; border: string; dot: string }
> = {
  info: {
    bg: "bg-sky-50",
    icon: "text-sky-600",
    text: "text-sky-900",
    border: "border-sky-100",
    dot: "bg-sky-500",
  },
  warning: {
    bg: "bg-amber-50",
    icon: "text-amber-600",
    text: "text-amber-900",
    border: "border-amber-100",
    dot: "bg-amber-500",
  },
  danger: {
    bg: "bg-rose-50",
    icon: "text-rose-600",
    text: "text-rose-900",
    border: "border-rose-100",
    dot: "bg-rose-500",
  },
  success: {
    bg: "bg-emerald-50",
    icon: "text-emerald-600",
    text: "text-emerald-900",
    border: "border-emerald-100",
    dot: "bg-emerald-500",
  },
};

const SEVERITY_ORDER: AlertSeverity[] = ["danger", "warning", "info", "success"];

export function SmartAlerts({ alerts }: SmartAlertsProps) {
  const sorted = [...alerts].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  return (
    <ul className="flex flex-col gap-2.5">
      {sorted.map((a) => {
        const s = SEVERITY[a.severity];
        const Icon = getIcon(a.icon);
        return (
          <li key={a.id}>
            <button
              type="button"
              className={cn(
                "group flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all hover:shadow-sm",
                s.bg,
                s.border
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white/70",
                  s.icon
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-semibold", s.text)}>
                    {a.title}
                  </span>
                  <span className={cn("size-1.5 rounded-full", s.dot)} />
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {a.detail}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
