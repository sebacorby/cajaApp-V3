export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: unknown) {
    super("VALIDATION_ERROR", message, 400);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`, 404);
    this.name = "NotFoundError";
  }
}

export class FileRequiredError extends AppError {
  constructor() {
    super("FILE_REQUIRED", "No file provided in request", 400);
    this.name = "FileRequiredError";
  }
}

export class FileTooLargeError extends AppError {
  constructor(maxBytes: number) {
    super("FILE_TOO_LARGE", `File exceeds maximum size of ${maxBytes} bytes`, 413);
    this.name = "FileTooLargeError";
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(mimeType: string) {
    super("UNSUPPORTED_MEDIA_TYPE", `Media type ${mimeType} is not supported`, 415);
    this.name = "UnsupportedMediaTypeError";
  }
}

export class UnsupportedDocumentTypeError extends AppError {
  constructor(detectedType: string) {
    super("UNSUPPORTED_DOCUMENT_TYPE", `Document type ${detectedType} is not supported`, 422);
    this.name = "UnsupportedDocumentTypeError";
  }
}

export class ScannedPdfNotSupportedError extends AppError {
  constructor() {
    super("SCANNED_PDF_NOT_SUPPORTED_YET", "Scanned PDFs are not supported yet. Please provide a text-based PDF.", 422);
    this.name = "ScannedPdfNotSupportedError";
  }
}

export class AiOutputSchemaInvalidError extends AppError {
  constructor(details: string) {
    super("AI_OUTPUT_SCHEMA_INVALID", `AI output validation failed: ${details}`, 422);
    this.name = "AiOutputSchemaInvalidError";
  }
}

export class AiProviderError extends AppError {
  constructor(details: string) {
    super("AI_PROVIDER_ERROR", `AI provider error: ${details}`, 502);
    this.name = "AiProviderError";
  }
}

export class AiExtractionFailedError extends AppError {
  constructor(details: string) {
    super("AI_EXTRACTION_FAILED", `AI extraction failed: ${details}`, 422);
    this.name = "AiExtractionFailedError";
  }
}

export class ImportConflictError extends AppError {
  constructor(input: {
    message: string;
    activeDraftId?: string;
    startedAt?: Date;
  }) {
    super("CARD_STATEMENT_IMPORT_ALREADY_RUNNING", input.message, 409);
    this.name = "ImportConflictError";
    this.activeDraftId = input.activeDraftId;
    this.startedAt = input.startedAt;
  }

  public activeDraftId?: string;
  public startedAt?: Date;
}


export class DuplicateCardStatementError extends AppError {
  constructor(message: string) {
    super("CARD_STATEMENT_DUPLICATE", message, 409);
    this.name = "DuplicateCardStatementError";
  }
}

export class CardStatementHistoryConflictError extends AppError {
  constructor(message: string) {
    super("CARD_STATEMENT_HISTORY_CONFLICT", message, 409);
    this.name = "CardStatementHistoryConflictError";
  }
}
