import { logger } from "../../shared/logger.js";
import { env } from "../../config/env.js";
import { aiExtractionService } from "../ai/ai-extraction.service.js";

export type DocumentType =
  | "credit_card_statement_pdf"
  | "bank_account_statement_pdf"
  | "invoice_pdf"
  | "receipt_pdf"
  | "csv"
  | "png"
  | "jpg"
  | "unknown";

export class DocumentDetectorService {
  detectMimeType(filename: string, mimeType: string): DocumentType {
    const ext = filename.toLowerCase().split(".").pop();

    if (mimeType === "text/csv" || ext === "csv") {
      return "csv";
    }
    if (mimeType === "image/png" || ext === "png") {
      return "png";
    }
    if (mimeType === "image/jpeg" || ext === "jpg" || ext === "jpeg") {
      return "jpg";
    }
    if (mimeType === "application/pdf" || ext === "pdf") {
      return "credit_card_statement_pdf";
    }

    return "unknown";
  }

  detectDocumentType(text: string): DocumentType {
    const lowerText = text.toLowerCase();

    const creditCardKeywords = [
      "tarjeta",
      "visa",
      "mastercard",
      "amex",
      "consumo",
      "resumen",
      "cierre",
      "vencimiento",
      "cuota",
      "total a pagar",
      "pago mínimo",
      "galicia",
      "bbva",
      "santander",
      "provincia",
      "macro",
    ];

    const bankAccountKeywords = [
      "cuenta corriente",
      "cuenta bancaria",
      "depósito",
      "extracción",
      "saldo disponible",
      "saldo anterior",
    ];

    const invoiceKeywords = [
      "factura",
      " IVA ",
      "cuit",
      "razón social",
      "condición fiscal",
      "subtotal",
    ];

    const receiptKeywords = [
      "recibo",
      "comprobante de pago",
      "pago realizado",
    ];

    let creditCardScore = 0;
    let bankAccountScore = 0;
    let invoiceScore = 0;
    let receiptScore = 0;

    for (const keyword of creditCardKeywords) {
      if (lowerText.includes(keyword)) creditCardScore++;
    }
    for (const keyword of bankAccountKeywords) {
      if (lowerText.includes(keyword)) bankAccountScore++;
    }
    for (const keyword of invoiceKeywords) {
      if (lowerText.includes(keyword)) invoiceScore++;
    }
    for (const keyword of receiptKeywords) {
      if (lowerText.includes(keyword)) receiptScore++;
    }

    if (creditCardScore >= 3) {
      logger.info({ creditCardScore, bankAccountScore, invoiceScore, receiptScore }, "Detected credit card statement (keyword)");
      return "credit_card_statement_pdf";
    }
    if (bankAccountScore >= 3) {
      logger.info({ creditCardScore, bankAccountScore, invoiceScore, receiptScore }, "Detected bank account statement (keyword)");
      return "bank_account_statement_pdf";
    }
    if (invoiceScore >= 3) {
      logger.info({ creditCardScore, bankAccountScore, invoiceScore, receiptScore }, "Detected invoice (keyword)");
      return "invoice_pdf";
    }
    if (receiptScore >= 2) {
      logger.info({ creditCardScore, bankAccountScore, invoiceScore, receiptScore }, "Detected receipt (keyword)");
      return "receipt_pdf";
    }

    logger.warn({ creditCardScore, bankAccountScore, invoiceScore, receiptScore }, "Unknown document type (keyword)");
    return "unknown";
  }

  async detectDocumentTypeWithAI(text: string, pageCount: number): Promise<DocumentType> {
    if (env.AI_MOCK_MODE) {
      logger.info({}, "AI_MOCK_MODE enabled, using keyword detection");
      return this.detectDocumentType(text);
    }

    try {
      const result = await aiExtractionService.detectDocumentType(text, pageCount);

      if (result.documentType === "credit_card_statement_pdf") {
        logger.info({ documentType: result.documentType }, "Detected credit card statement (AI)");
        return "credit_card_statement_pdf";
      }

      logger.warn({ documentType: result.documentType }, "AI detected non-credit-card document");
      return "unknown";
    } catch (error) {
      logger.error({ error }, "AI detection failed, falling back to keyword detection");
      return this.detectDocumentType(text);
    }
  }
}

export const documentDetectorService = new DocumentDetectorService();
