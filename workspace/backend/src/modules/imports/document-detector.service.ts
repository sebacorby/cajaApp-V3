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

function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

export class DocumentDetectorService {
  detectMimeType(filename: string, mimeType: string): DocumentType {
    const ext = filename.toLowerCase().split(".").pop();
    if (mimeType === "text/csv" || ext === "csv") return "csv";
    if (mimeType === "image/png" || ext === "png") return "png";
    if (mimeType === "image/jpeg" || ext === "jpg" || ext === "jpeg") return "jpg";
    if (mimeType === "application/pdf" || ext === "pdf") return "credit_card_statement_pdf";
    return "unknown";
  }

  detectDocumentType(text: string): DocumentType {
    const normalized = text.normalize("NFKC").replace(/\s+/g, " ").toLowerCase();

    const cardSignals = [
      has(normalized, /total\s+a\s+pagar|saldo\s+actual|total\s+adeudado/),
      has(normalized, /vencimiento|vence\s+el/),
      has(normalized, /cierre|estado\s+de\s+cuenta\s+al|emitido\s+el/),
      has(normalized, /detalle\s+(?:del\s+)?(?:consumo|mes)|compras\s+del\s+mes|fecha\s+.*(?:detalle|referencia)/),
      has(normalized, /pago\s+m[ií]nimo|menor\s+entrega/),
      has(normalized, /cuotas?\s+a\s+vencer|saldo\s+financiable|tasa\s+de\s+inter[eé]s/),
    ].filter(Boolean).length;

    const bankSignals = [
      has(normalized, /saldo\s+disponible/),
      has(normalized, /dep[oó]sito|extracci[oó]n/),
      has(normalized, /cuenta\s+corriente|caja\s+de\s+ahorro/),
      has(normalized, /cbu|alias/),
    ].filter(Boolean).length;

    const invoiceSignals = [
      has(normalized, /factura/),
      has(normalized, /raz[oó]n\s+social/),
      has(normalized, /condici[oó]n\s+fiscal/),
      has(normalized, /subtotal.*iva.*total/),
    ].filter(Boolean).length;

    const receiptSignals = [
      has(normalized, /recibo\s+de\s+sueldo|liquidaci[oó]n\s+de\s+haberes/),
      has(normalized, /haberes.*descuentos/),
      has(normalized, /neto\s+(?:a\s+cobrar|en\s+mano)/),
    ].filter(Boolean).length;

    if (cardSignals >= 4) {
      logger.info({ cardSignals, bankSignals, invoiceSignals, receiptSignals }, "Detected credit card statement structurally");
      return "credit_card_statement_pdf";
    }
    if (bankSignals >= 3) return "bank_account_statement_pdf";
    if (invoiceSignals >= 3) return "invoice_pdf";
    if (receiptSignals >= 2) return "receipt_pdf";
    logger.warn({ cardSignals, bankSignals, invoiceSignals, receiptSignals }, "Unknown document type by structural evidence");
    return "unknown";
  }

  async detectDocumentTypeWithAI(text: string, pageCount: number): Promise<DocumentType> {
    if (env.AI_MOCK_MODE) return this.detectDocumentType(text);
    try {
      const result = await aiExtractionService.detectDocumentType(text, pageCount);
      return result.documentType === "credit_card_statement_pdf"
        ? "credit_card_statement_pdf"
        : "unknown";
    } catch (error) {
      logger.error({ error }, "AI detection failed, falling back to structural detection");
      return this.detectDocumentType(text);
    }
  }
}

export const documentDetectorService = new DocumentDetectorService();
