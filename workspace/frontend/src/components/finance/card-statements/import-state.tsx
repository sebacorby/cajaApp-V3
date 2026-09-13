"use client";

import type { ChangeEvent, RefObject } from "react";
import { AlertCircle, FileText, History, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AcceptedCardStatement } from "@/lib/finance/card-statements-api";

interface ImportStateProps {
  selectedFile: File | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
  savedStatement: AcceptedCardStatement | null;
  noticeMessage: string | null;
  onBackToSaved: () => void;
}

export function ImportState({
  selectedFile,
  fileInputRef,
  onFileChange,
  onImport,
  savedStatement,
  noticeMessage,
  onBackToSaved,
}: ImportStateProps) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Tarjetas</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Resúmenes de tarjeta
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Cargá el PDF del banco. CajaApp preserva el orden original y prepara una
            vista de revisión antes de guardar los datos.
          </p>
        </div>

        {savedStatement ? (
          <Button variant="outline" onClick={onBackToSaved}>
            <History className="mr-2 h-4 w-4" />
            Volver al último resumen
          </Button>
        ) : null}
      </header>

      {noticeMessage ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50/70 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{noticeMessage}</span>
        </div>
      ) : null}

      <Card className="overflow-hidden border-dashed shadow-sm">
        <CardContent className="p-0">
          <div className="grid min-h-[420px] lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col justify-center p-8 sm:p-12">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Upload className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-semibold">Importar un resumen</h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                El archivo se procesa localmente, se interpreta con IA y se presenta
                como una hoja continua de auditoría. Nada se confirma sin tu revisión.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                data-testid="card-statement-file-input"
                onChange={onFileChange}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-7 flex w-full max-w-xl items-center gap-4 rounded-2xl border border-dashed bg-muted/25 p-5 text-left transition hover:border-primary/50 hover:bg-primary/[0.03]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm">
                  <FileText className="h-5 w-5 text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {selectedFile?.name ?? "Seleccionar archivo PDF"}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toLocaleString("es-AR", { maximumFractionDigits: 0 })} KB listos para procesar`
                      : "PDF bancario · hasta 10 MB"}
                  </span>
                </span>
              </button>

              <Button
                className="mt-4 w-full max-w-xl"
                size="lg"
                data-testid="card-statement-import-submit"
                onClick={onImport}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                {selectedFile ? "Procesar resumen" : "Elegir PDF"}
              </Button>
            </div>

            <div className="border-t bg-slate-950 p-8 text-slate-100 lg:border-l lg:border-t-0 sm:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Flujo de revisión
              </p>
              <div className="mt-8 space-y-6">
                <ImportStep
                  number="01"
                  title="Extrae"
                  detail="Lee texto, páginas y estructura del PDF."
                />
                <ImportStep
                  number="02"
                  title="Interpreta"
                  detail="Organiza secciones, tarjetas, filas y totales."
                />
                <ImportStep
                  number="03"
                  title="Revisás"
                  detail="Editás datos puntuales sin alterar el orden del documento."
                />
                <ImportStep
                  number="04"
                  title="Confirmás"
                  detail="El backend persiste y actualiza las proyecciones."
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ImportStep({ number, title, detail }: { number: string; title: string; detail: string }) {
  return (
    <div className="flex gap-4">
      <span className="font-mono text-xs text-emerald-400">{number}</span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-400">{detail}</p>
      </div>
    </div>
  );
}
