"use client";

import { cn } from "@/lib/utils";

interface DashboardZoneProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Agrupa visualmente un conjunto de tarjetas del Dashboard bajo un
 * encabezado de nivel superior al de cada `CardTitle` interno. No agrega
 * ningún contenedor con estilos de `Card` (evita "tarjetas dentro de
 * tarjetas"); solo aporta jerarquía tipográfica y separación entre zonas.
 */
export function DashboardZone({ title, description, children, className }: DashboardZoneProps) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-baseline gap-3 border-b pb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/80">
          {title}
        </h3>
        {description ? (
          <p className="hidden text-xs text-muted-foreground sm:block">{description}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}
