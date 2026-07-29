"use client";




import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Archive, Loader2, Pencil, Plus, RotateCcw, ShieldCheck, Tags, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  archiveMovementCategory,
  createMovementCategory,
  listMovementCategories,
  restoreMovementCategory,
  updateMovementCategory,
  type MovementCategory,
} from "@/lib/finance/movements-api";




interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void | Promise<void>;
}




interface CategoryForm {
  name: string;
  color: string;
  icon: string;
  keywords: string;
}


const EMPTY_FORM: CategoryForm = {
  name: "",
  color: "#64748b",
  icon: "circle",
  keywords: "",
};


function parseKeywords(value: string): string[] {
  const seen = new Set<string>();
  return value
    .replaceAll("\n", ",")
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter((item) => {
      const normalized = item.toLocaleLowerCase("es");
      if (item.length < 2 || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}




export function CategoryManagementSheet({ open, onOpenChange, onChanged }: Props) {
  const [categories, setCategories] = useState<MovementCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [editing, setEditing] = useState<MovementCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);




  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCategories(await listMovementCategories(true));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar las categorías.");
    } finally {
      setLoading(false);
    }
  }, []);




  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);




  const finishAction = useCallback(async () => {
    setEditing(null);
    setCreating(false);
    setForm(EMPTY_FORM);
    await refresh();
    await onChanged();
  }, [onChanged, refresh]);




  const startCreate = useCallback(() => {
    setEditing(null);
    setCreating(true);
    setForm(EMPTY_FORM);
    setError(null);
  }, []);


  const startEdit = useCallback((category: MovementCategory) => {
    setCreating(false);
    setEditing(category);
    setForm({
      name: category.name,
      color: category.color,
      icon: category.icon,
      keywords: category.keywords.join("\n"),
    });
    setError(null);
  }, []);


  const cancelForm = useCallback(() => {
    setCreating(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
  }, []);


  const submitForm = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Ingresá un nombre para la categoría.");
      return;
    }


    const payload = {
      name: form.name.trim(),
      color: form.color.trim(),
      icon: form.icon.trim(),
      keywords: parseKeywords(form.keywords),
    };


    setActionId(editing?.id ?? "new");
    setError(null);
    try {
      if (editing) {
        await updateMovementCategory(editing.id, {
          ...payload,
          name: editing.isSystem ? editing.name : payload.name,
        });
      } else {
        await createMovementCategory(payload);
      }
      await finishAction();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la categoría.");
    } finally {
      setActionId(null);
    }
  }, [editing, finishAction, form]);


  const archiveCategory = useCallback(async (category: MovementCategory) => {
    if (!window.confirm("Archivar " + category.name + " y reasignar sus movimientos a Sin clasificar?")) return;
    setActionId(category.id);
    setError(null);
    try {
      await archiveMovementCategory(category.id, null);
      await finishAction();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo archivar la categoría.");
    } finally {
      setActionId(null);
    }
  }, [finishAction]);




  const restoreCategory = useCallback(async (category: MovementCategory) => {
    setActionId(category.id);
    setError(null);
    try {
      await restoreMovementCategory(category.id);
      await finishAction();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo restaurar la categoría.");
    } finally {
      setActionId(null);
    }
  }, [finishAction]);




  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl" data-testid="category-management-sheet">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Tags className="size-5" /> Categorías</SheetTitle>
          <SheetDescription>Administrá categorías y palabras clave determinísticas. Las categorías del sistema no pueden archivarse.</SheetDescription>
        </SheetHeader>




        <div className="space-y-4 py-6">
          <div className="flex justify-end">
            <Button onClick={startCreate} disabled={actionId !== null} data-testid="create-category">
              <Plus className="mr-2 size-4" /> Nueva categoría
            </Button>
          </div>




          {(creating || editing) && (
            <form
              onSubmit={(event) => void submitForm(event)}
              className="space-y-4 rounded-xl border bg-muted/20 p-4"
              data-testid="category-form"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {editing ? `Editar ${editing.name}` : "Nueva categoría"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Las palabras clave se aplican de forma determinística, sin IA.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={cancelForm}
                  aria-label="Cerrar formulario"
                >
                  <X className="size-4" />
                </Button>
              </div>


              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="category-name">Nombre</Label>
                  <Input
                    id="category-name"
                    value={form.name}
                    disabled={Boolean(editing?.isSystem)}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                    maxLength={80}
                    required
                  />
                </div>


                <div className="space-y-2">
                  <Label htmlFor="category-color">Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="category-color"
                      type="color"
                      value={form.color}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, color: event.target.value }))
                      }
                      className="w-16 p-1"
                    />
                    <Input
                      value={form.color}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, color: event.target.value }))
                      }
                      pattern="^#[0-9a-fA-F]{6}$"
                      aria-label="Color hexadecimal"
                    />
                  </div>
                </div>


                <div className="space-y-2">
                  <Label htmlFor="category-icon">Ícono</Label>
                  <Input
                    id="category-icon"
                    value={form.icon}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, icon: event.target.value }))
                    }
                    maxLength={80}
                    required
                  />
                </div>


                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="category-keywords">Palabras clave</Label>
                  <Textarea
                    id="category-keywords"
                    value={form.keywords}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, keywords: event.target.value }))
                    }
                    placeholder="Una por línea o separadas por coma"
                    rows={4}
                  />
                </div>
              </div>


              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={cancelForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={actionId !== null}>
                  {actionId !== null && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Guardar categoría
                </Button>
              </div>
            </form>
          )}


          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          {loading ? (
            <div className="flex min-h-40 items-center justify-center"><Loader2 className="size-6 animate-spin" /></div>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div key={category.id} className="rounded-xl border p-4" data-testid={`category-row-${category.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="size-3 rounded-full" style={{ backgroundColor: category.color }} />
                        <p className="font-medium">{category.name}</p>
                        {category.isSystem && <ShieldCheck className="size-4 text-primary" aria-label="Categoría del sistema" />}
                        {!category.active && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Archivada</span>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{category.usageCount} movimientos · {category.keywords.length} reglas</p>
                      {category.keywords.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{category.keywords.join(", ")}</p>}
                    </div>
                    <div className="flex gap-1">
                      {category.active ? (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => startEdit(category)} disabled={actionId !== null} aria-label="Editar categoría"><Pencil className="size-4" /></Button>
                          {!category.isSystem && <Button variant="ghost" size="icon" onClick={() => void archiveCategory(category)} disabled={actionId !== null} aria-label="Archivar categoría"><Archive className="size-4" /></Button>}
                        </>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => void restoreCategory(category)} disabled={actionId !== null} aria-label="Restaurar categoría"><RotateCcw className="size-4" /></Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}