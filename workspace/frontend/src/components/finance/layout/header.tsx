"use client";


import { useEffect, useState } from "react";
import { Menu, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { Brand } from "./brand";
import {
  getPeriodRange,
  PERIOD_LABELS,
  useFinanceUI,
  type Period,
} from "@/lib/finance/ui-store";
import { useAppPreferences } from "@/components/finance/preferences/app-preferences-provider";
import { GlobalSearchDialog } from "@/components/finance/search/global-search-dialog";
import { AlertCenter } from "@/components/finance/alerts/alert-center";


const PERIODS: Period[] = ["mes", "trimestre", "semestre", "anio"];


export function Header() {
  const period = useFinanceUI((state) => state.period);
  const setPeriod = useFinanceUI((state) => state.setPeriod);
  const requestNewMovement = useFinanceUI((state) => state.requestNewMovement);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { settings } = useAppPreferences();
  const currentRange = getPeriodRange(period);


  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);


  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0" data-testid="finance-mobile-navigation">
            <SheetTitle className="sr-only">Navegación</SheetTitle>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>


        <div className="lg:hidden"><Brand showText={false} /></div>


        <div className="hidden flex-col leading-tight sm:flex">
          <span className="text-[13px] text-muted-foreground">CajaApp</span>
          <span className="text-base font-semibold text-foreground">Así están tus finanzas, {settings.displayName}</span>
        </div>


        <div className="ml-auto flex items-center gap-2">
          <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
            <SelectTrigger className="h-9 w-[168px] rounded-full border bg-card text-sm" aria-label="Seleccionar período">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {PERIODS.map((item) => (
                <SelectItem key={item} value={item}>
                  {PERIOD_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>


          <span className="hidden max-w-[220px] truncate text-xs text-muted-foreground xl:inline">
            {currentRange.label}
          </span>


          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-full px-3"
            onClick={() => setSearchOpen(true)}
            aria-label="Buscar en CajaApp"
            data-testid="header-global-search"
          >
            <Search className="size-4" />
            <span className="hidden xl:inline">Buscar</span>
            <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground 2xl:inline">Ctrl K</kbd>
          </Button>


          <AlertCenter />


          <Button
            size="sm"
            className="h-9 gap-1.5 rounded-full"
            onClick={requestNewMovement}
            data-testid="header-new-movement"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nuevo movimiento</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}