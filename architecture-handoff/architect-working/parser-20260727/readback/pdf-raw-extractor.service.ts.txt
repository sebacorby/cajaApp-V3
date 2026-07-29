import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "path";
import { logger } from "../../shared/logger.js";
import { env } from "../../config/env.js";

export class PdfRawExtractionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PdfRawExtractionError";
  }
}

export interface PdfRawExtractionResult {
  ok: true;
  engine: string;
  engineVersion: string;
  pageCount: number;
  textPageCount: number;
  emptyPageCount: number;
  characterCount: number;
  rawSha256: string;
  rawText: string;
  durationMs: number;
}

type PythonSuccessOutput = {
  ok: true;
  engine: string;
  engineVersion: string;
  pageCount: number;
  textPageCount: number;
  emptyPageCount: number;
  characterCount: number;
  rawSha256: string;
  rawText: string;
};

type PythonErrorOutput = {
  ok: false;
  error: string;
  code: string;
};

function parsePythonOutput(stdout: string): PdfRawExtractionResult {
  let parsed: PythonSuccessOutput | PythonErrorOutput;

  try {
    parsed = JSON.parse(stdout) as PythonSuccessOutput | PythonErrorOutput;
  } catch {
    throw new PdfRawExtractionError(
      "PARSE_ERROR",
      "Failed to parse Python script output",
    );
  }

  if (!parsed.ok) {
    throw new PdfRawExtractionError(
      (parsed as PythonErrorOutput).code || "PYTHON_ERROR",
      (parsed as PythonErrorOutput).error || "Python script reported an error",
    );
  }

  const success = parsed as PythonSuccessOutput;

  let rawText = success.rawText;
  if (rawText.length > env.PDF_RAW_MAX_CHARACTERS) {
    const originalLength = rawText.length;
    rawText = rawText.slice(0, env.PDF_RAW_MAX_CHARACTERS);
    logger.warn({
      event: "pdf_raw_extraction.truncated",
      originalLength,
      truncatedLength: rawText.length,
      maxCharacters: env.PDF_RAW_MAX_CHARACTERS,
    });
  }

  return {
    ok: true,
    engine: success.engine,
    engineVersion: success.engineVersion,
    pageCount: success.pageCount,
    textPageCount: success.textPageCount,
    emptyPageCount: success.emptyPageCount,
    characterCount: rawText.length,
    rawSha256: success.rawSha256,
    rawText,
    durationMs: 0,
  };
}

export class PdfRawExtractorService {
  private pythonPath: string;
  private scriptPath: string;
  private timeoutMs: number;
  private maxOutputBytes: number;

  constructor() {
    this.pythonPath = env.PYTHON_EXECUTABLE;
    this.scriptPath = path.resolve(
      process.cwd(),
      env.PDF_RAW_EXTRACTOR_SCRIPT,
    );
    this.timeoutMs = env.PDF_RAW_EXTRACTION_TIMEOUT_MS;
    this.maxOutputBytes = env.PDF_RAW_MAX_OUTPUT_BYTES;
  }

  async extract(pdfPath: string): Promise<PdfRawExtractionResult> {
    const requestId = randomUUID();
    const startedAt = Date.now();

    logger.info({
      event: "pdf_raw_extraction.started",
      requestId,
      pdfPath,
      scriptPath: this.scriptPath,
      pythonPath: this.pythonPath,
    });

    return new Promise((resolve, reject) => {
      const proc = spawn(
        this.pythonPath,
        [this.scriptPath, "--pdf", pdfPath],
        {
          cwd: process.cwd(),
          shell: false,
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );

      let stdout = "";
      let stderr = "";
      let stdoutBytes = 0;
      let killed = false;

      const timeout = setTimeout(() => {
        if (!killed) {
          killed = true;
          proc.kill();
          logger.error({
            event: "pdf_raw_extraction.timeout",
            requestId,
            timeoutMs: this.timeoutMs,
          });
          reject(new PdfRawExtractionError(
            "TIMEOUT",
            `Python script exceeded ${this.timeoutMs}ms timeout`,
          ));
        }
      }, this.timeoutMs);

      proc.stdout?.on("data", (data: Buffer) => {
        stdoutBytes += data.length;
        if (stdoutBytes > this.maxOutputBytes) {
          if (!killed) {
            killed = true;
            proc.kill();
            clearTimeout(timeout);
            logger.error({
              event: "pdf_raw_extraction.output_too_large",
              requestId,
              maxOutputBytes: this.maxOutputBytes,
            });
            reject(new PdfRawExtractionError(
              "OUTPUT_TOO_LARGE",
              `Python script output exceeded ${this.maxOutputBytes} bytes`,
            ));
          }
          return;
        }
        stdout += data.toString();
      });

      proc.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on("error", (error) => {
        clearTimeout(timeout);
        if (killed) return;
        logger.error({
          event: "pdf_raw_extraction.spawn_error",
          requestId,
          error: error.message,
        });
        reject(new PdfRawExtractionError(
          "SPAWN_ERROR",
          `Failed to spawn Python: ${error.message}`,
        ));
      });

      proc.on("close", (code) => {
        clearTimeout(timeout);
        if (killed) return;

        const durationMs = Date.now() - startedAt;

        if (code !== 0) {
          logger.error({
            event: "pdf_raw_extraction.python_failed",
            requestId,
            exitCode: code,
            stderr: stderr.slice(0, 500),
          });

          try {
            const errorObj = JSON.parse(stdout) as { error?: string; code?: string };
            reject(new PdfRawExtractionError(
              errorObj.code || "PYTHON_ERROR",
              errorObj.error || `Python script failed with code ${code}`,
            ));
          } catch {
            reject(new PdfRawExtractionError(
              "PYTHON_ERROR",
              `Python script failed with code ${code}: ${stderr || stdout}`.slice(0, 500),
            ));
          }
          return;
        }

        try {
          const result = parsePythonOutput(stdout);
          result.durationMs = durationMs;

          logger.info({
            event: "pdf_raw_extraction.completed",
            requestId,
            engine: result.engine,
            engineVersion: result.engineVersion,
            pageCount: result.pageCount,
            textPageCount: result.textPageCount,
            emptyPageCount: result.emptyPageCount,
            characterCount: result.characterCount,
            rawSha256: result.rawSha256,
            durationMs,
          });

          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}

export function splitRawTextIntoPages(
  rawText: string,
): Array<{ pageNumber: number; text: string }> {
  const pages: Array<{ pageNumber: number; text: string }> = [];
  const regex = /--- PAGE (\d+) \/ \d+ ---\n([\s\S]*?)(?=\n--- PAGE \d+ \/ \d+ ---|$)/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(rawText)) !== null) {
    pages.push({
      pageNumber: parseInt(match[1], 10),
      text: match[2].trim(),
    });
  }

  return pages;
}

export const pdfRawExtractorService = new PdfRawExtractorService();
