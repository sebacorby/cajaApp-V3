import fs from "fs/promises";
import path from "path";
import { logger } from "../../shared/logger.js";
import { ScannedPdfNotSupportedError } from "../../shared/errors.js";

async function loadCanvas() {
  const canvasMod = await import("@napi-rs/canvas") as any;
  (global as any).ImageData = canvasMod.ImageData;
  return { createCanvas: canvasMod.createCanvas };
}

export interface PdfPage {
  pageNumber: number;
  text: string;
  items?: Array<{
    text: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }>;
}

export interface ExtractedPdfText {
  pageCount: number;
  pages: PdfPage[];
  fullTextWithPageMarkers: string;
}

export class PdfTextExtractorService {
  private pdfJs: typeof import("pdfjs-dist") | null = null;

  private async loadPdfJs() {
    if (!this.pdfJs) {
      this.pdfJs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    }
    return this.pdfJs;
  }

  async extractText(pdfPath: string): Promise<ExtractedPdfText> {
    const pdfjs = await this.loadPdfJs();

    const data = await fs.readFile(pdfPath);
    const pdf = await pdfjs.getDocument({ data }).promise;

    const pageCount = pdf.numPages;
    const pages: PdfPage[] = [];
    const pageTexts: string[] = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      if (!content.items || content.items.length === 0) {
        throw new ScannedPdfNotSupportedError();
      }

      const text = content.items
        .map((item: any) => item.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (text.length < 10) {
        throw new ScannedPdfNotSupportedError();
      }

      pages.push({
        pageNumber: i,
        text,
        items: content.items.map((item: any) => ({
          text: item.str,
          x: item.transform?.[4],
          y: item.transform?.[5],
          width: item.width,
          height: item.height,
        })),
      });

      pageTexts.push(`--- PAGE ${i} / ${pageCount} ---\n${text}`);
    }

    const fullTextWithPageMarkers = pageTexts.join("\n\n");

    logger.info({ pdfPath, pageCount }, "PDF text extracted successfully");

    return {
      pageCount,
      pages,
      fullTextWithPageMarkers,
    };
  }

  async extractFromBuffer(buffer: Buffer | Uint8Array): Promise<ExtractedPdfText> {
    const pdfjs = await this.loadPdfJs();

    const pdfData = buffer instanceof Buffer ? new Uint8Array(buffer) : buffer;
    const pdf = await pdfjs.getDocument({ data: pdfData }).promise;

    const pageCount = pdf.numPages;
    const pages: PdfPage[] = [];
    const pageTexts: string[] = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      if (!content.items || content.items.length === 0) {
        throw new ScannedPdfNotSupportedError();
      }

      const text = content.items
        .map((item: any) => item.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (text.length < 10) {
        throw new ScannedPdfNotSupportedError();
      }

      pages.push({
        pageNumber: i,
        text,
        items: content.items.map((item: any) => ({
          text: item.str,
          x: item.transform?.[4],
          y: item.transform?.[5],
          width: item.width,
          height: item.height,
        })),
      });

      pageTexts.push(`--- PAGE ${i} / ${pageCount} ---\n${text}`);
    }

    const fullTextWithPageMarkers = pageTexts.join("\n\n");

    logger.info({ pageCount }, "PDF text extracted from buffer");

    return {
      pageCount,
      pages,
      fullTextWithPageMarkers,
    };
  }

  async renderPageToImage(buffer: Buffer | Uint8Array, pageNumber: number, maxWidth: number = 1024, jpegQuality: number = 0.70): Promise<string> {
    const { createCanvas } = await loadCanvas();

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const pdfData = buffer instanceof Buffer ? new Uint8Array(buffer) : buffer;
    const pdf = await pdfjs.getDocument({ data: pdfData }).promise;

    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      throw new Error(`Invalid page number: ${pageNumber}`);
    }

    const page = await pdf.getPage(pageNumber);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = unscaledViewport.width > maxWidth ? maxWidth / unscaledViewport.width : 1;
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    return canvas.toDataURL("image/jpeg", jpegQuality).split(",")[1];
  }

  async renderAllPagesToImages(buffer: Buffer | Uint8Array, maxWidth: number = 1024, jpegQuality: number = 0.70): Promise<string[]> {
    const pdfjs = await this.loadPdfJs();

    const pdfData = buffer instanceof Buffer ? new Uint8Array(buffer) : buffer;
    const pdf = await pdfjs.getDocument({ data: pdfData }).promise;

    const images: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const image = await this.renderPageToImage(buffer, i, maxWidth, jpegQuality);
      images.push(image);
    }

    logger.info({ pageCount: pdf.numPages, maxWidth, jpegQuality }, "PDF rendered to images");

    return images;
  }

  async renderPdfToSingleImage(buffer: Buffer | Uint8Array, maxWidth: number = 512, jpegQuality: number = 0.50): Promise<string> {
    const { createCanvas } = await loadCanvas();

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const pdfData = buffer instanceof Buffer ? new Uint8Array(buffer) : buffer;
    const pdf = await pdfjs.getDocument({ data: pdfData }).promise;

    const pageWidths: number[] = [];
    const pageHeights: number[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = unscaledViewport.width > maxWidth ? maxWidth / unscaledViewport.width : 0.5;
      const viewport = page.getViewport({ scale });
      pageWidths.push(viewport.width);
      pageHeights.push(viewport.height);
    }

    const totalHeight = pageHeights.reduce((sum, h) => sum + h, 0);
    const canvasWidth = Math.max(...pageWidths);

    const canvas = createCanvas(canvasWidth, totalHeight);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let yOffset = 0;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = unscaledViewport.width > maxWidth ? maxWidth / unscaledViewport.width : 0.5;
      const viewport = page.getViewport({ scale });

      const pageCanvas = createCanvas(viewport.width, viewport.height);
      const pageCtx = pageCanvas.getContext("2d");
      pageCtx.fillStyle = "white";
      pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

      await page.render({
        canvasContext: pageCtx,
        viewport,
      }).promise;

      ctx.drawImage(pageCanvas, 0, yOffset);
      yOffset += viewport.height;
    }

    logger.info({ pageCount: pdf.numPages, totalHeight, canvasWidth }, "PDF rendered to single image");

    return canvas.toDataURL("image/jpeg", jpegQuality).split(",")[1];
  }
}

export const pdfTextExtractorService = new PdfTextExtractorService();
