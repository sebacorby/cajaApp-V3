"use client";

import { CardImportLiveConsole } from "@/components/finance/imports/card-import-live-console";
import { CardStatementImporter } from "@/components/finance/imports/card-statement-importer";

export function TarjetasSection() {
  return (
    <div className="space-y-4 [&>section>div:first-child]:hidden">
      <CardStatementImporter />
      <CardImportLiveConsole />
    </div>
  );
}
