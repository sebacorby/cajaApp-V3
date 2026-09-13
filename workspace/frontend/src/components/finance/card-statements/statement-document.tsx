"use client";

import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { AlertCircle, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Amount } from "@/components/finance/shared/amount";
import type {
  CardStatementGroup,
  CardStatementPreview,
  CardStatementRow,
} from "@/lib/finance/card-statements-api";
import type { EditableRowField } from "./types";
import { cleanText, formatMoney, groupDescriptor, rowTone } from "./helpers";

interface StatementDocumentProps {
  preview: CardStatementPreview;
  onEdit: (rowId: string, field: EditableRowField, value: string) => void;
  readOnly?: boolean;
}

/** Documento completo del resumen, agrupado por secciones y con filas editables. */
export function StatementDocument({ preview, onEdit, readOnly = false }: StatementDocumentProps) {
  const visibleSections = preview.sections.filter((section) => {
    const normalizedLabel = section.label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    if (normalizedLabel.includes("legal")) return false;

    return preview.rows.some(
      (row) => row.sectionId === section.id && row.rowType !== "legal_text",
    );
  });

  return (
    <div className="space-y-5">
      {visibleSections.map((section) => (
        <StatementSection
          key={section.id}
          sectionId={section.id}
          label={section.label}
          rows={preview.rows}
          groups={preview.groups}
          onEdit={onEdit}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

function StatementSection({
  sectionId,
  label,
  rows,
  groups,
  onEdit,
  readOnly,
}: {
  sectionId: string;
  label: string;
  rows: CardStatementRow[];
  groups: CardStatementGroup[];
  onEdit: (rowId: string, field: EditableRowField, value: string) => void;
  readOnly: boolean;
}) {
  const sectionRows = rows.filter(
    (row) => row.sectionId === sectionId && row.rowType !== "legal_text",
  );
  const seenGroups = new Set<string>();
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);

  const syncHorizontalScroll = useCallback(
    (source: "top" | "table") => {
      if (syncingRef.current) return;
      syncingRef.current = true;

      const from = source === "top" ? topScrollRef.current : tableScrollRef.current;
      const to = source === "top" ? tableScrollRef.current : topScrollRef.current;

      if (from && to) to.scrollLeft = from.scrollLeft;
      window.requestAnimationFrame(() => {
        syncingRef.current = false;
      });
    },
    [],
  );

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="border-b bg-slate-950 py-4 text-slate-100">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Sección</p>
            <CardTitle className="mt-1 text-base text-slate-100">{label}</CardTitle>
          </div>
          <span className="rounded-full border border-slate-700 px-3 py-1 font-mono text-xs text-slate-300">
            {sectionRows.length} filas
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={topScrollRef}
          onScroll={() => syncHorizontalScroll("top")}
          className="sticky top-0 z-20 overflow-x-auto border-b bg-background/95"
          aria-label={`Desplazamiento horizontal superior de ${label}`}
        >
          <div className="h-3 min-w-[980px]" />
        </div>
        <div
          ref={tableScrollRef}
          onScroll={() => syncHorizontalScroll("table")}
          className="overflow-x-auto"
        >
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
              <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="w-[108px] px-3 py-3 font-medium">Fecha</th>
                <th className="w-[58px] px-3 py-3 font-medium">Marca</th>
                <th className="min-w-[280px] px-3 py-3 font-medium">Referencia</th>
                <th className="w-[90px] px-3 py-3 font-medium">Cuota</th>
                <th className="w-[120px] px-3 py-3 font-medium">Comprobante</th>
                <th className="w-[150px] px-3 py-3 text-right font-medium">Pesos</th>
                <th className="w-[130px] px-3 py-3 text-right font-medium">USD</th>
              </tr>
            </thead>
            <tbody>
              {sectionRows.map((row) => {
                const group = row.groupId
                  ? groups.find((candidate) => candidate.id === row.groupId)
                  : undefined;
                const shouldRenderGroup = Boolean(
                  group && row.groupId && !seenGroups.has(row.groupId),
                );

                if (row.groupId && shouldRenderGroup) seenGroups.add(row.groupId);

                return (
                  <FragmentRow
                    key={row.id}
                    row={row}
                    group={shouldRenderGroup ? group : undefined}
                    onEdit={onEdit}
                    readOnly={readOnly}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function FragmentRow({
  row,
  group,
  onEdit,
  readOnly,
}: {
  row: CardStatementRow;
  group?: CardStatementGroup;
  onEdit: (rowId: string, field: EditableRowField, value: string) => void;
  readOnly: boolean;
}) {
  return (
    <>
      {group ? (
        <tr className="border-b bg-slate-100/80 dark:bg-slate-900/80" data-testid="card-statement-group">
          <td colSpan={7} className="px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-primary shadow-sm">
                  <CreditCard className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{group.label}</p>
                  <p className="text-xs text-muted-foreground">{groupDescriptor(group)}</p>
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
      <StatementRow row={row} onEdit={onEdit} readOnly={readOnly} />
    </>
  );
}

function StatementRow({
  row,
  onEdit,
  readOnly,
}: {
  row: CardStatementRow;
  onEdit: (rowId: string, field: EditableRowField, value: string) => void;
  readOnly: boolean;
}) {
  if (row.rowType === "section_header" || row.rowType === "group_header") {
    return null;
  }

  return (
    <tr className={`border-b last:border-b-0 ${rowTone(row)}`} data-testid="card-statement-row">
      <EditableCell row={row} field="dateRaw" value={row.dateRaw} onEdit={onEdit} readOnly={readOnly} className="w-[108px]" />
      <EditableCell row={row} field="markerRaw" value={row.markerRaw} onEdit={onEdit} readOnly={readOnly} className="w-[58px]" />
      <EditableCell
        row={row}
        field="referenceRaw"
        value={row.referenceRaw}
        onEdit={onEdit} readOnly={readOnly}
        className="min-w-[280px]"
        warningCount={row.warnings.length}
      />
      <EditableCell row={row} field="installmentRaw" value={row.installmentRaw} onEdit={onEdit} readOnly={readOnly} className="w-[90px]" />
      <EditableCell row={row} field="receiptRaw" value={row.receiptRaw} onEdit={onEdit} readOnly={readOnly} className="w-[120px]" />
      <EditableCell row={row} field="amountPesos" value={row.amountPesos} onEdit={onEdit} readOnly={readOnly} className="w-[150px] text-right tabular-nums" currency="ARS" />
      <EditableCell row={row} field="amountDollars" value={row.amountDollars} onEdit={onEdit} readOnly={readOnly} className="w-[130px] text-right tabular-nums" currency="USD" />
    </tr>
  );
}

function EditableCell({
  row,
  field,
  value,
  onEdit,
  className,
  currency,
  warningCount = 0,
  readOnly = false,
}: {
  row: CardStatementRow;
  field: EditableRowField;
  value: string | null;
  onEdit: (rowId: string, field: EditableRowField, value: string) => void;
  className?: string;
  currency?: "ARS" | "USD";
  warningCount?: number;
  readOnly?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const displayedValue = currency && !isFocused
    ? (value ? formatMoney(value, currency) : "")
    : (value ?? "");

  if (!row.editable || readOnly) {
    return (
      <td className={`px-3 py-2.5 align-middle ${className ?? ""}`}>
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 whitespace-pre-wrap">
            {currency ? <Amount value={value} currency={currency} /> : cleanText(value)}
          </span>
          {warningCount > 0 ? (
            <span title={row.warnings.join(" · ")} className="shrink-0 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </div>
      </td>
    );
  }

  return (
    <td className={`px-2 py-1.5 align-middle ${className ?? ""}`}>
      <Input
        value={displayedValue}
        aria-label={`${field}-${row.id}`}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onEdit(row.id, field, event.target.value)}
        className={`h-8 border-border/60 bg-background px-2 text-xs shadow-none focus-visible:ring-1 ${currency ? "text-right tabular-nums" : ""}`}
      />
    </td>
  );
}
