"use client";

import { CardStatementImporter } from "@/components/finance/imports/card-statement-importer";

export function TarjetasSection() {
  return (
    <div className="[&>section>div:first-child]:hidden">
      <CardStatementImporter />
    </div>
  );
}
