export * from "./card-import-api.base";

import { discardCardImport as discardCardImportBase } from "./card-import-api.base";

export const CARD_IMPORT_CLEAR_EVENT = "cajaapp:card-import-clear";

function emitCardImportClear(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CARD_IMPORT_CLEAR_EVENT));
}

export async function discardCardImport(draftId: string): Promise<void> {
  await discardCardImportBase(draftId);
  emitCardImportClear();
}
