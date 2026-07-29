"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Download,
  FileSpreadsheet,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Tags,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { TransactionsList } from "../transactions/transactions-list";
import { DebitCsvImportSheet } from "../imports/debit-csv-import-sheet";
import { CategoryManagementSheet } from "../categories/category-management-sheet";
import { formatFinancialAmount } from "@/lib/finance/financial-amount";
import {
  assignMovementCategory,
  createManualMovement,
  deleteManualMovement,
  downloadMovementsCsv,
  getMovements,
  listMovementCategories,
  updateManualMovement,
  type CategoryAssignableSourceType,
  type ManualMovementPayload,
  type ManualMovementSourceType,
  type MovementCategory,
  type MovementCurrency,
  type MovementOverview,
  type MovementQuery,
  type MovementRecord,
  type MovementStatus,
  type MovementType,
} from "@/lib/finance/movements-api";
import {
  getPeriodRange,
  todayInUserTimezone,
  useFinanceUI,
} from "@/lib/finance/ui-store";

interface MovementFormState {
  occurredOn: string;
  type: MovementType;
  sourceType: ManualMovementSourceType;
  description: string;
  categoryId: string;
  currency: MovementCurrency;
  amount: string;
  status: "actual" | "pending";
  notes: string;
}

const SOURCE_TYPE_LABELS: Record<ManualMovementSourceType, string> = {
  manual_cash: "Gasto en efectivo",
  manual_income: "Cobro manual",
  manual_unexpected: "Imprevisto",
  manual_transfer: "Transferencia informativa",
  manual_adjustment: "Ajuste",
};

function emptyForm(): MovementFormState {
  return {
    occurredOn: todayInUserTimezone(),
    type: "expense",
    sourceType: "manual_cash",
    description: "",
    categoryId: "none",
    currency: "ARS",
    amount: "",
    status: "actual",
    notes: "",
  };
}

function formFromMovement(movement: MovementRecord): MovementFormState {
  const sourceType = movement.sourceType as ManualMovementSourceType;
  return {
    occurredOn: movement.occurredOn,
    type: movement.type,
    sourceType,
    description: movement.description,
    categoryId: movement.category.id ?? "none",
    currency: movement.currency,
    amount: movement.amount,
    status: movement.status === "pending" ? "pending" : "actual",
    notes: movement.notes ?? "",
  };
}

function validateForm(form: MovementFormState): string | null {
  if (!form.occurredOn) return "Seleccioná la fecha del movimiento.";
  if (!form.description.trim()) return "Ingresá una descripción.";
  if (!form.amount.trim()) return "Ingresá el monto.";
  const normalized = form.amount.trim().replaceAll(" ", "");
  if (!/^[0-9.,]+$/.test(normalized)) return "Ingresá un monto válido.";
  return null;
}

function SummaryValue({
  title,
  ars,
  usd,
  tone = "default",
}: {
  title: string;
  ars: string;
  usd: string;
  tone?: "default" | "income" | "expense";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className={
          `mt-1 text-lg font-semibold tabular-nums ${tone === "income" ? "text-emerald-700" : tone === "expense" ? "text-rose-700" : "text-foreground"}`
        }>
          {formatFinancialAmount(ars, "ARS")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{formatFinancialAmount(usd, "USD")}</p>
      </CardContent>
    </Card>
  );
}

export function MovimientosSection() {
  const period = useFinanceUI((state) => state.period);
  const newMovementOpen = useFinanceUI((state) => state.newMovementOpen);
  const requestNewMovement = useFinanceUI((state) => state.requestNewMovement);
  const closeNewMovement = useFinanceUI((state) => state.closeNewMovement);
  const movementDrilldown = useFinanceUI((state) => state.movementDrilldown);
  const clearMovementDrilldown = useFinanceUI((state) => state.clearMovementDrilldown);
  const range = useMemo(() => getPeriodRange(period), [period]);
  const effectiveRange = movementDrilldown
    ? { from: movementDrilldown.from, to: movementDrilldown.to, label: movementDrilldown.label }
    : range;

  const [overview, setOverview] = useState<MovementOverview | null>(null);
  const [categories, setCategories] = useState<MovementCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MovementType | "all">("all");
  const [currencyFilter, setCurrencyFilter] = useState<MovementCurrency | "all">("all");
  const [statusFilter, setStatusFilter] = useState<MovementStatus | "all">("all");
  const [includeProjected, setIncludeProjected] = useState(false);

  const [csvOpen, setCsvOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [editing, setEditing] = useState<MovementRecord | null>(null);
  const [form, setForm] = useState<MovementFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assigningCategoryId, setAssigningCategoryId] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await listMovementCategories());
    } catch {
      setCategories([]);
    }
  }, []);

  const activeQuery = useMemo<MovementQuery>(() => ({
    from: effectiveRange.from,
    to: effectiveRange.to,
    q: search || undefined,
    type: movementDrilldown?.type ?? (typeFilter === "all" ? undefined : typeFilter),
    source: movementDrilldown?.source,
    category: movementDrilldown?.category,
    currency: currencyFilter === "all" ? undefined : currencyFilter,
    status: movementDrilldown?.status ?? (statusFilter === "all" ? undefined : statusFilter),
    includeProjected: movementDrilldown?.includeProjected ?? (statusFilter === "projected" || includeProjected),
  }), [currencyFilter, effectiveRange.from, effectiveRange.to, includeProjected, movementDrilldown, search, statusFilter, typeFilter]);

  const loadMovements = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setErrorMessage(null);

    try {
      const result = await getMovements({
        ...activeQuery,
        page,
        pageSize: 25,
      });
      setOverview(result);
      if (result.pagination.page !== page) setPage(result.pagination.page);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar los movimientos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeQuery, page]);

  useEffect(() => {
    void loadMovements();
  }, [loadMovements]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    setPage(1);
  }, [period, movementDrilldown, typeFilter, currencyFilter, statusFilter, includeProjected, search]);

  useEffect(() => {
    if (newMovementOpen && !editing) {
      setForm(emptyForm());
      setFormError(null);
    }
  }, [editing, newMovementOpen]);

  const closeForm = useCallback(() => {
    closeNewMovement();
    setEditing(null);
    setFormError(null);
  }, [closeNewMovement]);

  const openEdit = useCallback((movement: MovementRecord) => {
    setEditing(movement);
    setForm(formFromMovement(movement));
    setFormError(null);
    requestNewMovement();
  }, [requestNewMovement]);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateForm(form);
    if (validation) {
      setFormError(validation);
      return;
    }

    const payload: ManualMovementPayload = {
      occurredOn: form.occurredOn,
      type: form.type,
      sourceType: form.sourceType,
      description: form.description.trim(),
      categoryId: form.categoryId === "none" ? null : form.categoryId,
      currency: form.currency,
      amount: form.amount.trim(),
      status: form.status,
      notes: form.notes.trim() || null,
    };

    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) await updateManualMovement(editing.sourceId, payload);
      else await createManualMovement(payload);
      closeForm();
      await loadMovements(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo guardar el movimiento.");
    } finally {
      setSubmitting(false);
    }
  }, [closeForm, editing, form, loadMovements]);

  const handleDelete = useCallback(async (movement: MovementRecord) => {
    if (!window.confirm("¿Anular el movimiento " + movement.description + "?")) return;
    setDeletingId(movement.sourceId);
    setErrorMessage(null);
    try {
      await deleteManualMovement(movement.sourceId);
      await loadMovements(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo anular el movimiento.");
    } finally {
      setDeletingId(null);
    }
  }, [loadMovements]);

  const handleCategoryChange = useCallback(async (
    movement: MovementRecord,
    categoryId: string | null,
  ) => {
    if (!movement.categoryEditable) return;
    setAssigningCategoryId(movement.sourceId);
    setErrorMessage(null);
    try {
      await assignMovementCategory({
        sourceType: movement.sourceType as CategoryAssignableSourceType,
        sourceId: movement.sourceId,
        categoryId,
      });
      await loadMovements(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo cambiar la categoría.",
      );
    } finally {
      setAssigningCategoryId(null);
    }
  }, [loadMovements]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setErrorMessage(null);
    try {
      await downloadMovementsCsv(activeQuery);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo exportar el filtro actual.");
    } finally {
      setExporting(false);
    }
  }, [activeQuery]);

  const applySearch = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  }, [searchInput]);

  const summary = overview?.summary;

  return (
    <div className="flex flex-col gap-5" data-testid="movements-section">
      {movementDrilldown ? (
        <div className="flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/20 sm:flex-row sm:items-center sm:justify-between" data-testid="movement-drilldown-banner">
          <div>
            <p className="font-medium">Detalle abierto desde Reportes</p>
            <p className="text-xs text-muted-foreground">{movementDrilldown.label} · {movementDrilldown.from} a {movementDrilldown.to}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={clearMovementDrilldown}><X className="mr-1 size-3" />Volver al período global</Button>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryValue title="Ingresos" ars={summary?.incomeArs ?? "0,00"} usd={summary?.incomeUsd ?? "0.00"} tone="income" />
        <SummaryValue title="Egresos" ars={summary?.expenseArs ?? "0,00"} usd={summary?.expenseUsd ?? "0.00"} tone="expense" />
        <SummaryValue title="Balance" ars={summary?.balanceArs ?? "0,00"} usd={summary?.balanceUsd ?? "0.00"} />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <form className="flex min-w-0 flex-1 gap-2" onSubmit={applySearch}>
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="pl-9" placeholder="Buscar descripción, categoría u origen" data-testid="movement-search" />
              </div>
              <Button type="submit" variant="outline">Buscar</Button>
            </form>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as MovementType | "all")}>
                <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos los tipos</SelectItem><SelectItem value="income">Ingresos</SelectItem><SelectItem value="expense">Egresos</SelectItem></SelectContent>
              </Select>
              <Select value={currencyFilter} onValueChange={(value) => setCurrencyFilter(value as MovementCurrency | "all")}>
                <SelectTrigger className="sm:w-28"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">ARS + USD</SelectItem><SelectItem value="ARS">ARS</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as MovementStatus | "all")}>
                <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="actual">Reales</SelectItem><SelectItem value="pending">Pendientes</SelectItem><SelectItem value="projected">Proyectados</SelectItem></SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => void loadMovements(true)} disabled={refreshing} aria-label="Actualizar movimientos">
                <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={includeProjected} onChange={(event) => setIncludeProjected(event.target.checked)} className="size-4 rounded border" />
              Incluir proyecciones de ingresos y cuotas
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleExport()}
                disabled={exporting}
                className="gap-1.5"
                data-testid="export-movements-csv"
              >
                {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Exportar filtro CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCategoriesOpen(true)}
                className="gap-1.5"
                data-testid="open-category-management"
              >
                <Tags className="size-4" />
                Categorías
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCsvOpen(true)}
                className="gap-1.5"
                data-testid="open-debit-csv-import"
              >
                <FileSpreadsheet className="size-4" />
                Importar CSV débito
              </Button>
              <Button onClick={requestNewMovement} className="gap-1.5" data-testid="add-manual-movement"><Plus className="size-4" /> Nuevo movimiento</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /><span>{errorMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : (
        <TransactionsList
          movements={overview?.items ?? []}
          categories={categories}
          onEdit={openEdit}
          onDelete={(movement) => void handleDelete(movement)}
          onCategoryChange={(movement, categoryId) => void handleCategoryChange(movement, categoryId)}
          deletingId={deletingId}
          assigningCategoryId={assigningCategoryId}
        />
      )}

      {overview && overview.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Página {overview.pagination.page} de {overview.pagination.totalPages} · {overview.pagination.total} movimientos</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!overview.pagination.hasPreviousPage} onClick={() => setPage((value) => Math.max(1, value - 1))}><ArrowLeft className="mr-1 size-4" /> Anterior</Button>
            <Button variant="outline" size="sm" disabled={!overview.pagination.hasNextPage} onClick={() => setPage((value) => value + 1)}>Siguiente <ArrowRight className="ml-1 size-4" /></Button>
          </div>
        </div>
      )}

      <DebitCsvImportSheet
        open={csvOpen}
        onOpenChange={setCsvOpen}
        categories={categories}
        onAccepted={() => loadMovements(true)}
      />

      <CategoryManagementSheet
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        onChanged={async () => {
          await loadCategories();
          await loadMovements(true);
        }}
      />

      <Sheet open={newMovementOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <form onSubmit={handleSubmit} className="flex min-h-full flex-col">
            <SheetHeader>
              <SheetTitle>{editing ? "Editar movimiento" : "Nuevo movimiento"}</SheetTitle>
              <SheetDescription>Registrá un cobro, gasto en efectivo, imprevisto, transferencia o ajuste.</SheetDescription>
            </SheetHeader>

            <div className="grid flex-1 gap-5 py-6">
              {formError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{formError}</div>}

              <div className="grid gap-2"><Label htmlFor="movement-description">Descripción</Label><Input id="movement-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} data-testid="movement-description" /></div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><Label>Clase de carga</Label><Select value={form.sourceType} onValueChange={(value) => {
                  const sourceType = value as ManualMovementSourceType;
                  setForm((current) => ({ ...current, sourceType, type: sourceType === "manual_income" ? "income" : sourceType === "manual_cash" || sourceType === "manual_unexpected" ? "expense" : current.type }));
                }}><SelectTrigger data-testid="movement-source-type"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2"><Label>Tipo contable</Label><Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as MovementType }))}><SelectTrigger data-testid="movement-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="expense">Egreso</SelectItem><SelectItem value="income">Ingreso</SelectItem></SelectContent></Select></div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><Label htmlFor="movement-date">Fecha</Label><Input id="movement-date" type="date" value={form.occurredOn} onChange={(event) => setForm((current) => ({ ...current, occurredOn: event.target.value }))} data-testid="movement-date" /></div>
                <div className="grid gap-2"><Label>Categoría</Label><Select value={form.categoryId} onValueChange={(value) => setForm((current) => ({ ...current, categoryId: value }))}><SelectTrigger data-testid="movement-category"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin clasificar</SelectItem>{categories.filter((category) => category.name !== "Sin clasificar").map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2"><Label>Moneda</Label><Select value={form.currency} onValueChange={(value) => setForm((current) => ({ ...current, currency: value as MovementCurrency }))}><SelectTrigger data-testid="movement-currency"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ARS">ARS</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select></div>
                <div className="grid gap-2 sm:col-span-2"><Label htmlFor="movement-amount">Monto</Label><Input id="movement-amount" inputMode="decimal" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder={form.currency === "ARS" ? "25.000,00" : "250.00"} data-testid="movement-amount" /></div>
              </div>

              <div className="grid gap-2"><Label>Estado</Label><Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as "actual" | "pending" }))}><SelectTrigger data-testid="movement-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="actual">Real / acreditado</SelectItem><SelectItem value="pending">Pendiente</SelectItem></SelectContent></Select></div>

              <div className="grid gap-2"><Label htmlFor="movement-notes">Notas</Label><Textarea id="movement-notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={4} /></div>
            </div>

            <SheetFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={closeForm} disabled={submitting}>Cancelar</Button>
              <Button type="submit" disabled={submitting} data-testid="save-manual-movement">{submitting && <Loader2 className="mr-2 size-4 animate-spin" />}{editing ? "Guardar cambios" : "Crear movimiento"}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
