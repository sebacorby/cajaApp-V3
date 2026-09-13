"use client";


import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Banknote,
  CreditCard,
  Loader2,
  Search,
  Target,
  Wallet,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  searchGlobal,
  type GlobalSearchResponse,
  type GlobalSearchResult,
  type GlobalSearchResultType,
} from "@/lib/finance/global-search-api";
import { useFinanceUI } from "@/lib/finance/ui-store";


const RESULT_LIMIT = 12;


const TYPE_ICONS: Record<GlobalSearchResultType, typeof Search> = {
  movement: Search,
  card_statement: CreditCard,
  income_source: Banknote,
  budget: Wallet,
  goal: Target,
};


interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const navigateToSearchResult = useFinanceUI((state) => state.navigateToSearchResult);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [response, setResponse] = useState<GlobalSearchResponse | null>(null);
  const [items, setItems] = useState<GlobalSearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);


  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);


  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResponse(null);
      setItems([]);
      setPage(1);
      setError(null);
      setLoading(false);
      return;
    }


    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setPage(1);


    void searchGlobal(debouncedQuery, 1, RESULT_LIMIT, controller.signal)
      .then((next) => {
        setResponse(next);
        setItems(next.items);
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "No se pudo realizar la búsqueda");
        setResponse(null);
        setItems([]);
      })
      .finally(() => setLoading(false));


    return () => controller.abort();
  }, [debouncedQuery]);


  const grouped = useMemo(() => {
    const groups = new Map<string, GlobalSearchResult[]>();
    for (const item of items) {
      const current = groups.get(item.module) ?? [];
      current.push(item);
      groups.set(item.module, current);
    }
    return Array.from(groups.entries());
  }, [items]);


  async function loadMore() {
    if (!response?.pagination.hasMore || loadingMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    setError(null);
    try {
      const next = await searchGlobal(debouncedQuery, nextPage, RESULT_LIMIT);
      setItems((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...next.items.filter((item) => !known.has(item.id))];
      });
      setResponse(next);
      setPage(nextPage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron cargar más resultados");
    } finally {
      setLoadingMore(false);
    }
  }


  function selectResult(result: GlobalSearchResult) {
    navigateToSearchResult({
      ...result.destination,
      module: result.module,
      typeLabel: result.typeLabel,
      title: result.title,
      context: result.context,
    });
    onOpenChange(false);
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="border-b px-5 py-4 pr-12">
          <DialogTitle>Buscar en CajaApp</DialogTitle>
          <DialogDescription>
            Encontrá movimientos, resúmenes, fuentes de ingreso, presupuestos y objetivos.
          </DialogDescription>
        </DialogHeader>


        <div className="border-b p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Escribí al menos 2 caracteres…"
              aria-label="Buscar en CajaApp"
              className="h-11 pl-10 pr-10"
              data-testid="global-search-input"
            />
            {query ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
                onClick={() => setQuery("")}
                aria-label="Limpiar búsqueda"
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>


        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4">
            {debouncedQuery.length < 2 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Buscá por descripción, categoría, fuente, banco, tarjeta, período, archivo o nombre.
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground" role="status">
                <Loader2 className="size-4 animate-spin" />
                Buscando…
              </div>
            ) : error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
                {error}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="font-medium">No encontramos resultados</p>
                <p className="mt-1 text-sm text-muted-foreground">Probá con otro término o una parte del nombre.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {grouped.map(([module, moduleItems]) => (
                  <section key={module} aria-labelledby={`search-group-${module}`}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 id={`search-group-${module}`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {module}
                      </h3>
                      <Badge variant="secondary">{moduleItems.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {moduleItems.map((item) => {
                        const Icon = TYPE_ICONS[item.type];
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className="group flex w-full items-start gap-3 rounded-xl border bg-card p-3 text-left transition hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => selectResult(item)}
                            data-testid={`global-search-result-${item.type}`}
                          >
                            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <Icon className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-foreground">{item.title}</span>
                                <Badge variant="outline" className="font-normal">{item.typeLabel}</Badge>
                              </span>
                              {item.context ? (
                                <span className="mt-1 block truncate text-sm text-muted-foreground">{item.context}</span>
                              ) : null}
                              <span className="mt-1 block text-xs text-muted-foreground">Coincidencia en {item.matchedField.toLocaleLowerCase("es")}</span>
                            </span>
                            <ArrowRight className="mt-2 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}


                {response?.pagination.hasMore ? (
                  <Button type="button" variant="outline" className="w-full" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Cargar más resultados
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </ScrollArea>


        {response && items.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-xs text-muted-foreground">
            <span>
              Mostrando {items.length} de {response.pagination.total} coincidencias
              {!response.exhaustive ? " dentro de la ventana local indexada" : ""}.
            </span>
            <span className="hidden sm:inline">Atajo: Ctrl/Cmd + K</span>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}