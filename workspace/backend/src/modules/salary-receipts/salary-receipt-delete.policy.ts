export function canDeleteSalaryReceiptStatus(status: string): boolean {
  return status === "reversed";
}

export function canDeleteSalaryReceiptDraftStatus(status: string): boolean {
  return ["preview_ready", "failed", "draft"].includes(status);
}
