import { AppError } from "../../shared/errors.js";

export class CardStatementDeleteConflictError extends AppError {
  constructor(status: string) {
    super(
      "STATEMENT_STATUS_NOT_DELETABLE",
      `Card statement cannot be deleted in status: ${status}`,
      409,
    );
    this.name = "CardStatementDeleteConflictError";
  }
}
