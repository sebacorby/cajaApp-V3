"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Eye,
  Loader2,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import {
  createMonthClose,
  getMonthCloseDetail,
  listMonthCloses,
  reopenMonthClose,
  type MonthCloseItem,
} from "@/lib/finance/month-close-api";
import { USER_TIMEZONE } from "@/lib/finance/ui-store";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950";

function previousMonthInTucuman(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: USER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const date = new Date(
    Date.UTC(Number(values.year), Number(values.month) - 2, 1),
  );
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function money(cents: string, currency: "ARS" | "USD"): string {
  const raw = BigInt(cents);
  const negative = raw < 0n;
  const absolute = negative ? -raw : raw;
  const units = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  const grouped = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(units);
  const symbol = currency === "ARS" ? "$" : "US$";
  return `${negative ? "-" : ""}${symbol} ${grouped},${fraction}`;
}

function dateTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: USER_TIMEZONE,
  }).format(new Date(value));
}

function statusLabel(item: MonthCloseItem): string {
  return item.status === "closed" ? "Cerrado" : "Reabierto";
}

function statusClass(item: MonthCloseItem): string {
  return item.status === "closed"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-amber-100 text-amber-800";
}

export function CierresSection() {
  const [monthKey, setMonthKey] = useState(previousMonthInTucuman);
  const [items, setItems] = useState<MonthCloseItem[]>([]);
  const [detail, setDetail] = useState<MonthCloseItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await listMonthCloses({ limit: 100 });
      setItems(response.items);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeMonths = useMemo(
    () =>
      new Set(
        items.filter((item) => item.active).map((item) => item.monthKey),
      ),
    [items],
  );

  async function closeMonth() {
    setWorking("create");
    setMessage(null);
    try {
      const created = await createMonthClose(monthKey);
      setMessage({
        kind: "success",
        text: `Cierre ${created.monthKey} v${created.version} creado correctamente.`,
      });
      setDetail(created);
      await load();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setWorking(null);
    }
  }

  async function openDetail(id: string) {
    setWorking(`detail:${id}`);
    setMessage(null);
    try {
      setDetail(await getMonthCloseDetail(id));
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setWorking(null);
    }
  }

  async function reopen(item: MonthCloseItem) {
    const confirmed = window.confirm(
      `¿Reabrir ${item.monthKey} v${item.version}? El snapshot queda en el historial y el mes vuelve a admitir cambios.`,
    );
    if (!confirmed) return;

    setWorking(`reopen:${item.id}`);
    setMessage(null);
    try {
      const reopened = await reopenMonthClose(item.id);
      setDetail(reopened);
      setMessage({
        kind: "success",
        text: `El cierre ${item.monthKey} v${item.version} fue reabierto.`,
      });
      await load();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setWorking(null);
    }
  }

  function actions(item: MonthCloseItem, surface: "desktop" | "mobile") {
    const detailWorking = working === `detail:${item.id}`;
    const reopenWorking = working === `reopen:${item.id}`;
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(working)}
          aria-label={`Ver detalle del cierre ${item.monthKey} versión ${item.version}`}
          aria-busy={detailWorking}
          onClick={() => void openDetail(item.id)}
          className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border p-2 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900 ${FOCUS_RING}`}
        >
          {detailWorking ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Eye aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
        {item.canReopen ? (
          <button
            data-testid={surface === "desktop" ? `reopen-${item.monthKey}` : `reopen-mobile-${item.monthKey}`}
            type="button"
            disabled={Boolean(working)}
            aria-label={`Reabrir cierre ${item.monthKey} versión ${item.version}`}
            aria-busy={reopenWorking}
            onClick={() => void reopen(item)}
            className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border p-2 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900 ${FOCUS_RING}`}
          >
            {reopenWorking ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>
    );
  }

  const retryButton = (
    <button
      data-testid="retry-month-closes"
      type="button"
      onClick={() => void load()}
      className={`mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-950 dark:text-rose-200 dark:hover:bg-rose-950/30 ${FOCUS_RING}`}
    >
      <RefreshCw aria-hidden="true" className="h-4 w-4" />
      Reintentar carga de cierres
    </button>
  );

  return (
    <section
      className="space-y-6"
      data-testid="month-close-section"
      aria-busy={loading || Boolean(working)}
    >
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between dark:border-slate-800 dark:bg-slate-950">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <Archive aria-hidden="true" className="h-4 w-4" /> Historial contable local
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
            Cierres mensuales
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            Congelá un snapshot determinístico del mes. Los importes se guardan
            por moneda y estado, y el cierre se bloquea mientras Conciliación
            tenga casos actuales abiertos.
          </p>
        </div>
        <button
          type="button"
          aria-label="Actualizar cierres mensuales"
          disabled={loading}
          onClick={() => void load()}
          className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-900 ${FOCUS_RING}`}
        >
          <RefreshCw
            aria-hidden="true"
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Actualizar
        </button>
      </header>

      {message ? (
        <div
          role={message.kind === "error" ? "alert" : "status"}
          aria-live={message.kind === "error" ? "assertive" : "polite"}
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {loadError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          <p>No se pudieron cargar los cierres. {loadError}</p>
          {retryButton}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-end dark:border-slate-800">
            <label
              htmlFor="month-close-input"
              className="grid gap-1 text-sm font-medium"
            >
              Mes a cerrar
              <input
                id="month-close-input"
                data-testid="month-close-input"
                type="month"
                value={monthKey}
                onChange={(event) => setMonthKey(event.target.value)}
                className={`rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700 ${FOCUS_RING}`}
              />
            </label>
            <button
              data-testid="create-month-close"
              type="button"
              disabled={
                !monthKey || Boolean(working) || activeMonths.has(monthKey)
              }
              aria-busy={working === "create"}
              onClick={() => void closeMonth()}
              className={`inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 ${FOCUS_RING}`}
            >
              {working === "create" ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <LockKeyhole aria-hidden="true" className="h-4 w-4" />
              )}
              {activeMonths.has(monthKey) ? "Mes ya cerrado" : "Cerrar mes"}
            </button>
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table
              className="min-w-full text-sm"
              aria-label="Historial de cierres mensuales"
            >
              <caption className="sr-only">
                Versiones de cierres mensuales con saldos separados por moneda y
                acciones disponibles.
              </caption>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
                <tr>
                  <th scope="col" className="px-5 py-3">Mes / versión</th>
                  <th scope="col" className="px-5 py-3">Estado</th>
                  <th scope="col" className="px-5 py-3">Saldo ARS</th>
                  <th scope="col" className="px-5 py-3">Saldo USD</th>
                  <th scope="col" className="px-5 py-3">Mov.</th>
                  <th scope="col" className="px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      role="status"
                      aria-live="polite"
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Cargando cierres…
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-8 text-center text-rose-800"
                    >
                      No se pudieron cargar los cierres.
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Todavía no hay cierres mensuales.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.id}
                      data-testid={`month-close-row-${item.monthKey}`}
                    >
                      <td className="px-5 py-4 font-medium">
                        {item.monthKey} · v{item.version}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(item)}`}
                        >
                          {statusLabel(item)}
                        </span>
                      </td>
                      <td className="px-5 py-4 tabular-nums">
                        {money(item.summary.balance.all.ARS, "ARS")}
                      </td>
                      <td className="px-5 py-4 tabular-nums">
                        {money(item.summary.balance.all.USD, "USD")}
                      </td>
                      <td className="px-5 py-4">{item.summary.movements}</td>
                      <td className="px-5 py-4">{actions(item, "desktop")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <ul
            className="divide-y dark:divide-slate-800 sm:hidden"
            aria-label="Historial móvil de cierres mensuales"
          >
            {loading ? (
              <li
                role="status"
                aria-live="polite"
                className="p-6 text-center text-sm text-slate-500"
              >
                Cargando cierres…
              </li>
            ) : loadError ? (
              <li className="p-6 text-center text-sm text-rose-800">
                No se pudieron cargar los cierres.
              </li>
            ) : items.length === 0 ? (
              <li className="p-6 text-center text-sm text-slate-500">
                Todavía no hay cierres mensuales.
              </li>
            ) : (
              items.map((item) => (
                <li
                  key={item.id}
                  data-testid={`month-close-card-${item.id}`}
                  className="space-y-4 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {item.monthKey} · versión {item.version}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.summary.movements} movimientos
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(item)}`}
                    >
                      {statusLabel(item)}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                      <dt className="text-xs text-slate-500">Saldo ARS</dt>
                      <dd className="mt-1 font-semibold tabular-nums">
                        {money(item.summary.balance.all.ARS, "ARS")}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                      <dt className="text-xs text-slate-500">Saldo USD</dt>
                      <dd className="mt-1 font-semibold tabular-nums">
                        {money(item.summary.balance.all.USD, "USD")}
                      </dd>
                    </div>
                  </dl>
                  {actions(item, "mobile")}
                </li>
              ))
            )}
          </ul>
        </div>

        <aside
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          data-testid="month-close-detail"
          aria-live="polite"
          aria-busy={Boolean(working?.startsWith("detail:"))}
        >
          {!detail ? (
            <div className="grid min-h-64 place-items-center text-center text-sm text-slate-500">
              <div>
                <Eye aria-hidden="true" className="mx-auto mb-3 h-8 w-8" />
                Seleccioná un cierre para inspeccionar el snapshot.
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Detalle histórico
                </p>
                <h2 className="text-xl font-semibold">
                  {detail.monthKey} · versión {detail.version}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Huella {detail.sourceFingerprint.slice(0, 16)}…
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                {(["ARS", "USD"] as const).map((currency) => (
                  <div
                    key={currency}
                    className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"
                  >
                    <p className="text-xs text-slate-500">Saldo {currency}</p>
                    <p className="mt-1 font-semibold tabular-nums">
                      {money(detail.summary.balance.all[currency], currency)}
                    </p>
                    <p className="mt-2 text-xs">
                      Ingresos {money(detail.summary.income.all[currency], currency)}
                    </p>
                    <p className="text-xs">
                      Egresos {money(detail.summary.expense.all[currency], currency)}
                    </p>
                  </div>
                ))}
              </div>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4"><dt>Movimientos</dt><dd>{detail.summary.movements}</dd></div>
                <div className="flex justify-between gap-4"><dt>Objetivos</dt><dd>{detail.snapshot?.goals.length ?? "—"}</dd></div>
                <div className="flex justify-between gap-4"><dt>Presupuestos</dt><dd>{detail.snapshot?.budgets.length ?? "—"}</dd></div>
                <div className="flex justify-between gap-4"><dt>Resúmenes</dt><dd>{detail.snapshot?.cardStatements.length ?? "—"}</dd></div>
                <div className="flex justify-between gap-4"><dt>Recibos</dt><dd>{detail.snapshot?.salaryReceipts.length ?? "—"}</dd></div>
              </dl>
              <div className="rounded-xl border p-3 text-xs dark:border-slate-800">
                <p>Cerrado: {dateTime(detail.closedAt)}</p>
                <p>Reabierto: {dateTime(detail.reopenedAt)}</p>
              </div>
              {detail.status === "closed" ? (
                <p className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  Snapshot activo
                </p>
              ) : (
                <p className="flex items-center gap-2 text-sm text-amber-700">
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  Snapshot histórico reabierto
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
