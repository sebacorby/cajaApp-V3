import { cn } from "@/lib/utils";

interface BrandProps {
  className?: string;
  showText?: boolean;
}

export function Brand({ className, showText = true }: BrandProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
          <path d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 16.5v-9Z" fill="currentColor" opacity="0.28" />
          <path d="M8 9.5h8M8 13h5M8 16.5h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight text-foreground">CajaApp</span>
          <span className="text-[11px] text-muted-foreground">Finanzas personales</span>
        </div>
      )}
    </div>
  );
}
