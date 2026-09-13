"use client";

import { FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AttachmentUiStatus = "uploading" | "staged" | "consumed" | "error";

interface AttachmentChipProps {
  fileName: string;
  status: AttachmentUiStatus;
  error?: string;
  onRemove?: () => void;
}

const STATUS_LABEL: Record<Exclude<AttachmentUiStatus, "error">, string> = {
  uploading: "Subiendo…",
  staged: "Adjunto listo",
  consumed: "Procesado",
};

export function AttachmentChip({ fileName, status, error, onRemove }: AttachmentChipProps) {
  const removable = Boolean(onRemove) && status !== "uploading" && status !== "consumed";

  return (
    <div
      data-testid="agent-attachment-chip"
      data-status={status}
      className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/35 px-2.5 py-1.5 text-xs"
    >      {status === "uploading" ? <Loader2 className="size-3.5 shrink-0 animate-spin" /> : <FileText className="size-3.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{fileName}</p>
        <p className={status === "error" ? "text-destructive" : "text-muted-foreground"}>
          {status === "error" ? error ?? "No se pudo adjuntar el archivo" : STATUS_LABEL[status]}
        </p>
      </div>
      {removable ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          aria-label={`Quitar ${fileName}`}
          onClick={onRemove}
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}