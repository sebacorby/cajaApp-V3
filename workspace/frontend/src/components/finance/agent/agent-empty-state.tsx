"use client";

const STARTERS = [
  "Revisar mis gastos",
  "Registrar un movimiento",
  "Ver deuda futura",
  "Revisar presupuestos",
  "Importar un documento",
  "Buscar algo en CajaApp",
];

export function AgentEmptyState({ onSelect }: { onSelect: (value: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-5 py-8 text-center">
      <div className="max-w-sm">
        <p className="text-lg font-semibold">¿Qué querés hacer?</p>
        <p className="mt-1 text-sm text-muted-foreground">También podés hablar conmigo de cualquier otra cosa.</p>
      </div>
      <div className="mt-6 grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
        {STARTERS.map((starter) => (
          <button key={starter} type="button" onClick={() => onSelect(starter)} className="min-h-11 rounded-xl border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {starter}
          </button>
        ))}
      </div>
    </div>
  );
}
