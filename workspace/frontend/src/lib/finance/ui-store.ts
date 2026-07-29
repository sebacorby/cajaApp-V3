"use client";

import { create } from "zustand";

export type SectionId =
  | "dashboard"
  | "movimientos"
  | "ingresos"
  | "tarjetas"
  | "importaciones"
  | "conciliacion"
  | "cierres"
  | "respaldo"
  | "deuda"
  | "presupuestos"
  | "objetivos"
  | "reportes"
  | "salud"
  | "asesor"
  | "configuracion";

export type Period = "mes" | "trimestre" | "semestre" | "anio";

export type SearchRecordType =
  | "movement"
  | "card_statement"
  | "income_source"
  | "budget"
  | "goal";

export interface SearchNavigationTarget {
  section: Extract<
    SectionId,
    "movimientos" | "tarjetas" | "ingresos" | "presupuestos" | "objetivos"
  >;
  recordId: string;
  recordType: SearchRecordType;
  module: string;
  typeLabel: string;
  title: string;
  context: string;
}

export const USER_TIMEZONE = "America/Argentina/Tucuman";

export interface PeriodRange {
  from: string;
  to: string;
  label: string;
  timezone: string;
}

export interface MovementDrilldown {
  from: string;
  to: string;
  label: string;
  type?: "income" | "expense";
  source?: string;
  category?: string;
  status?: "actual" | "pending" | "projected";
  includeProjected?: boolean;
}

interface FinanceUIState {
  section: SectionId;
  period: Period;
  newMovementOpen: boolean;
  movementDrilldown: MovementDrilldown | null;
  searchTarget: SearchNavigationTarget | null;
  pendingCardStatementDraftId: string | null;
  setSection: (section: SectionId) => void;
  setPeriod: (period: Period) => void;
  requestNewMovement: () => void;
  closeNewMovement: () => void;
  openMovementDrilldown: (drilldown: MovementDrilldown) => void;
  clearMovementDrilldown: () => void;
  navigateToSearchResult: (target: SearchNavigationTarget) => void;
  clearSearchTarget: () => void;
  setPendingCardStatementDraft: (id: string) => void;
  clearPendingCardStatementDraft: () => void;
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function currentDateParts(): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: USER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function rangeLabel(from: string, to: string): string {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const formatter = new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  if (from === to) return formatter.format(start);
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function getPeriodRange(period: Period): PeriodRange {
  const now = currentDateParts();
  let startMonth = now.month;
  let endMonth = now.month;

  if (period === "trimestre") {
    startMonth = Math.floor((now.month - 1) / 3) * 3 + 1;
    endMonth = startMonth + 2;
  } else if (period === "semestre") {
    startMonth = now.month <= 6 ? 1 : 7;
    endMonth = startMonth + 5;
  } else if (period === "anio") {
    startMonth = 1;
    endMonth = 12;
  }

  const from = isoDate(now.year, startMonth, 1);
  const to = isoDate(
    now.year,
    endMonth,
    lastDayOfMonth(now.year, endMonth),
  );
  return {
    from,
    to,
    label: rangeLabel(from, to),
    timezone: USER_TIMEZONE,
  };
}

export function todayInUserTimezone(): string {
  const now = currentDateParts();
  return isoDate(now.year, now.month, now.day);
}

export const PERIOD_LABELS: Record<Period, string> = {
  mes: "Mes actual",
  trimestre: "Trimestre actual",
  semestre: "Semestre actual",
  anio: "Año actual",
};

export const useFinanceUI = create<FinanceUIState>((set) => ({
  section: "dashboard",
  period: "mes",
  newMovementOpen: false,
  movementDrilldown: null,
  searchTarget: null,
  pendingCardStatementDraftId: null,
  setSection: (section) =>
    set({
      section,
      searchTarget: null,
    }),
  setPeriod: (period) =>
    set({
      period,
      movementDrilldown: null,
      searchTarget: null,
    }),
  requestNewMovement: () =>
    set({
      section: "movimientos",
      newMovementOpen: true,
      searchTarget: null,
    }),
  closeNewMovement: () => set({ newMovementOpen: false }),
  openMovementDrilldown: (movementDrilldown) =>
    set({
      section: "movimientos",
      movementDrilldown,
      newMovementOpen: false,
      searchTarget: null,
    }),
  clearMovementDrilldown: () => set({ movementDrilldown: null }),
  navigateToSearchResult: (searchTarget) =>
    set({
      section: searchTarget.section,
      searchTarget,
      newMovementOpen: false,
      movementDrilldown: null,
    }),
  clearSearchTarget: () => set({ searchTarget: null }),
  setPendingCardStatementDraft: (id) =>
    set({ pendingCardStatementDraftId: id }),
  clearPendingCardStatementDraft: () =>
    set({ pendingCardStatementDraftId: null }),
}));
