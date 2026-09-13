"use client";


import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFinanceUI } from "@/lib/finance/ui-store";


export function SearchTargetBanner() {
  const target = useFinanceUI((state) => state.searchTarget);
  const clearSearchTarget = useFinanceUI((state) => state.clearSearchTarget);
  const bannerRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (!target) return;
    const frame = window.requestAnimationFrame(() => {
      bannerRef.current?.scrollIntoView({ block: "nearest" });
      bannerRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [target]);


  if (!target) return null;


  return (
    <div
      ref={bannerRef}
      tabIndex={-1}
      className="mb-5 flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      role="status"
      data-testid="global-search-target"
      data-record-id={target.recordId}
      data-record-type={target.recordType}
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
        <Search className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">Resultado localizado: {target.title}</p>
          <Badge variant="outline">{target.typeLabel}</Badge>
        </div>
        {target.context ? <p className="mt-1 text-sm text-muted-foreground">{target.context}</p> : null}
        <p className="mt-1 text-xs text-muted-foreground">Módulo: {target.module} · Registro {target.recordId}</p>
      </div>
      <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={clearSearchTarget} aria-label="Cerrar resultado seleccionado">
        <X className="size-4" />
      </Button>
    </div>
  );
}