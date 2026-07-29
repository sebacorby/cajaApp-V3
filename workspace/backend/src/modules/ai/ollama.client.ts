import { env } from "../../config/env.js";
import { logger } from "../../shared/logger.js";
import { AiProviderError } from "../../shared/errors.js";
import crypto from "crypto";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function generateRequestId(): string {
  return crypto.randomUUID();
}

function nanosecondsToMilliseconds(
  value: number | undefined,
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.round(value / 1_000_000);
}

type OllamaDiagnosticMetadata = {
  requestId: string;
  model: string;
  createdAt: string;
  requestBodySha256: string;
  requestBodyBytes: number;
  promptSha256: string;
  promptBytes: number;
  imageCount: number;
  images: Array<{
    sha256: string;
    decodedBytes: number;
    base64Characters: number;
  }>;
  think: boolean;
  stream: boolean;
  format: string;
};

async function maybeCaptureDiagnosticMetadata(
  metadata: OllamaDiagnosticMetadata,
): Promise<void> {
  if (!env.AI_DEBUG_CAPTURE_OLLAMA_REQUEST) {
    return;
  }

  if (env.NODE_ENV === "production") {
    logger.warn(
      {
        event: "ollama.diagnostic_capture.blocked",
        requestId: metadata.requestId,
      },
      "Ollama diagnostic capture is disabled in production",
    );

    return;
  }

  const diagnosticsDirectory = path.resolve(
    process.cwd(),
    ".diagnostics",
    "ollama",
  );

  await fs.mkdir(diagnosticsDirectory, {
    recursive: true,
  });

  const destination = path.join(
    diagnosticsDirectory,
    `metadata-${metadata.requestId}.json`,
  );

  await fs.writeFile(
    destination,
    JSON.stringify(metadata, null, 2),
    {
      encoding: "utf8",
      flag: "wx",
    },
  );
}

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream: boolean;
}

export interface OllamaImageRequest {
  model: string;
  prompt: string;
  images: string[];
  stream: boolean;
}

export interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;
  private availableModels: string[] | null = null;

  constructor() {
    this.apiKey = env.OLLAMA_API_KEY;
    this.baseUrl = env.OLLAMA_BASE_URL;
    this.timeout = env.OLLAMA_TIMEOUT_MS;
    this.maxRetries = env.OLLAMA_MAX_RETRIES;
  }

  private async fetchAvailableModels(): Promise<string[]> {
    if (this.availableModels !== null) return this.availableModels;
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        logger.warn({ status: response.status }, "Failed to fetch available Ollama models");
        this.availableModels = [];
        return [];
      }
      const data = await response.json() as { models?: Array<{ name?: string }> };
      this.availableModels = (data.models || []).map((m) => m.name || "").filter(Boolean);
      logger.info({ models: this.availableModels }, "Ollama available models loaded");
    } catch (err) {
      logger.warn({ error: String(err) }, "Failed to fetch Ollama models");
      this.availableModels = [];
    }
    return this.availableModels;
  }

  private async validateModel(model: string): Promise<void> {
    const available = await this.fetchAvailableModels();
    if (available.length > 0 && !available.includes(model)) {
      throw new AiProviderError(
        `Configured Ollama model not available: ${model}. Available models: ${available.join(", ")}`
      );
    }
  }

  async generate(prompt: string, model?: string): Promise<OllamaResponse> {
    if (env.AI_MOCK_MODE) {
      throw new AiProviderError("AI_MOCK_MODE=true but OllamaClient.generate() was called. Use MockAiExtractionService instead.");
    }

    const targetModel = model || env.OLLAMA_MODEL;
    if (!targetModel) {
      throw new AiProviderError("OLLAMA_MODEL not configured and AI_MOCK_MODE is false");
    }

    const startTime = Date.now();
    let lastError: Error | null = null;
    let attempts = 0;

    for (attempts = 0; attempts <= this.maxRetries; attempts++) {
      try {
        const response = await this.doRequest(prompt, targetModel);
        const duration = Date.now() - startTime;

        logger.info({
          model: targetModel,
          duration,
          status: "success",
          promptHash: crypto.createHash("sha256").update(prompt).digest("hex").slice(0, 8),
          responseHash: crypto.createHash("sha256").update(response.response).digest("hex").slice(0, 8),
          retries: attempts,
        }, "Ollama request completed");

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn({ attempt: attempts + 1, maxRetries: this.maxRetries, error: lastError.message }, "Ollama request failed, retrying...");
      }
    }

    logger.error({
      model: targetModel,
      attempts,
      error: lastError?.message,
    }, "Ollama request failed after all retries");

    throw new AiProviderError(`Ollama request failed after ${attempts} attempts: ${lastError?.message}`);
  }

  async generateWithImages(prompt: string, images: string[], model?: string): Promise<OllamaResponse> {
    if (env.AI_MOCK_MODE) {
      throw new AiProviderError("AI_MOCK_MODE=true but OllamaClient.generateWithImages() was called. Use MockAiExtractionService instead.");
    }

    const targetModel = model || env.OLLAMA_MODEL;
    if (!targetModel) {
      throw new AiProviderError("OLLAMA_MODEL not configured and AI_MOCK_MODE is false");
    }

    await this.validateModel(targetModel);

    const startTime = Date.now();
    let lastError: Error | null = null;
    let attempts = 0;

    for (attempts = 0; attempts <= this.maxRetries; attempts++) {
      try {
        const response = await this.doImageRequest(prompt, images, targetModel);
        const duration = Date.now() - startTime;

        logger.info({
          model: targetModel,
          imageCount: images.length,
          duration,
          status: "success",
          promptHash: crypto.createHash("sha256").update(prompt).digest("hex").slice(0, 8),
          responseHash: crypto.createHash("sha256").update(response.response).digest("hex").slice(0, 8),
          retries: attempts,
        }, "Ollama image request completed");

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn({ attempt: attempts + 1, maxRetries: this.maxRetries, error: lastError.message }, "Ollama image request failed, retrying...");
      }
    }

    logger.error({
      model: targetModel,
      attempts,
      error: lastError?.message,
    }, "Ollama image request failed after all retries");

    throw new AiProviderError(`Ollama image request failed after ${attempts} attempts: ${lastError?.message}`);
  }

  private async doRequest(prompt: string, model: string): Promise<OllamaResponse> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = this.timeout > 0 ? setTimeout(() => controller.abort(), this.timeout) : null;

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
        } satisfies OllamaRequest),
        signal: controller.signal,
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new AiProviderError(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json() as OllamaResponse;
      return data;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new AiProviderError(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  private async doImageRequest(prompt: string, images: string[], model: string): Promise<OllamaResponse> {
    type OllamaChatResponse = {
      model?: string;
      message?: {
        role?: string;
        content?: string;
      };
      done?: boolean;
      done_reason?: string;
      total_duration?: number;
      load_duration?: number;
      prompt_eval_count?: number;
      prompt_eval_duration?: number;
      eval_count?: number;
      eval_duration?: number;
    };

    const requestId = generateRequestId();
    const startedAt = Date.now();
    const timeoutMs = this.timeout > 0 ? this.timeout : 300_000;

    const requestPayload = {
      model,
      messages: [
        {
          role: "user",
          content: prompt,
          images,
        },
      ],
      stream: false,
      format: "json",
      think: false,
    };

    const requestBody = JSON.stringify(requestPayload);

    logger.info(
      {
        event: "ollama.request.prepared",
        requestId,
        model,
        imageCount: images.length,
        timeoutMs,
        requestBodySha256: sha256(requestBody),
        requestBodyBytes: Buffer.byteLength(requestBody, "utf8"),
        promptCharacterCount: prompt.length,
        promptSha256: sha256(prompt),
        imageBase64CharacterCount: images.reduce((total, image) => total + image.length, 0),
        imageDecodedBytes: images.map(img => Buffer.from(img, "base64").length),
      },
      "Ollama image request prepared"
    );

    const imageMetadata = images.map((image) => {
      const decoded = Buffer.from(image, "base64");
      return {
        sha256: sha256(decoded),
        decodedBytes: decoded.length,
        base64Characters: image.length,
      };
    });

    await maybeCaptureDiagnosticMetadata({
      requestId,
      model,
      createdAt: new Date().toISOString(),
      requestBodySha256: sha256(requestBody),
      requestBodyBytes: Buffer.byteLength(requestBody, "utf8"),
      promptSha256: sha256(prompt),
      promptBytes: Buffer.byteLength(prompt, "utf8"),
      imageCount: images.length,
      images: imageMetadata,
      think: false,
      stream: false,
      format: "json",
    });

    let response: Response;

    try {
      logger.info(
        { event: "ollama.request.started", requestId, model },
        "Ollama image request started"
      );

      response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(timeoutMs),
        body: requestBody,
      });
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      logger.error(
        {
          event: "ollama.request.failed",
          requestId,
          model,
          durationMs,
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : "Unknown",
        },
        "Ollama image request failed"
      );

      if (
        error instanceof Error &&
        (
          error.name === "AbortError" ||
          error.name === "TimeoutError"
        )
      ) {
        throw new AiProviderError(
          `Ollama request timed out after ${timeoutMs}ms ` +
          `(model=${model}, durationMs=${durationMs}, requestId=${requestId})`
        );
      }

      throw new AiProviderError(
        `Ollama request failed before receiving an HTTP response ` +
        `(model=${model}, durationMs=${durationMs}, requestId=${requestId}): ` +
        `${error instanceof Error ? error.message : String(error)}`
      );
    }

    const responseText = await response.text();
    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      logger.error(
        {
          event: "ollama.request.http_error",
          requestId,
          model,
          durationMs,
          httpStatus: response.status,
          responsePreview: responseText.slice(0, 500),
        },
        "Ollama returned HTTP error"
      );

      throw new AiProviderError(
        `Ollama returned HTTP ${response.status} ${response.statusText} ` +
        `(model=${model}, durationMs=${durationMs}, requestId=${requestId}): ` +
        responseText.slice(0, 2_000)
      );
    }

    if (!responseText.trim()) {
      logger.error(
        { event: "ollama.request.empty", requestId, model, durationMs },
        "Ollama returned empty response"
      );

      throw new AiProviderError(
        `Ollama returned an empty response ` +
        `(model=${model}, durationMs=${durationMs}, requestId=${requestId})`
      );
    }

    let data: OllamaChatResponse;

    try {
      data = JSON.parse(responseText) as OllamaChatResponse;
    } catch (error) {
      logger.error(
        {
          event: "ollama.request.invalid_json",
          requestId,
          model,
          durationMs,
          parseError: error instanceof Error ? error.message : String(error),
        },
        "Ollama returned invalid JSON"
      );

      throw new AiProviderError(
        `Ollama returned invalid JSON at HTTP response level ` +
        `(model=${model}, durationMs=${durationMs}, requestId=${requestId}): ` +
        responseText.slice(0, 2_000)
      );
    }

    const content = data.message?.content?.trim();

    if (!content) {
      logger.error(
        {
          event: "ollama.request.no_content",
          requestId,
          model,
          durationMs,
          done: data.done,
          doneReason: data.done_reason,
        },
        "Ollama returned no message.content"
      );

      throw new AiProviderError(
        `Ollama returned no message.content ` +
        `(model=${model}, durationMs=${durationMs}, requestId=${requestId}, ` +
        `done=${String(data.done)}, doneReason=${String(data.done_reason)})`
      );
    }

    const ollamaTotalDurationMs = nanosecondsToMilliseconds(data.total_duration);
    const unaccountedDurationMs = ollamaTotalDurationMs ? durationMs - ollamaTotalDurationMs : null;

    logger.info(
      {
        event: "ollama.request.completed",
        requestId,
        model: data.model ?? model,
        wallClockDurationMs: durationMs,
        done: data.done,
        doneReason: data.done_reason,
        totalDurationMs: ollamaTotalDurationMs,
        loadDurationMs: nanosecondsToMilliseconds(data.load_duration),
        promptEvalCount: data.prompt_eval_count,
        promptEvalDurationMs: nanosecondsToMilliseconds(data.prompt_eval_duration),
        evalCount: data.eval_count,
        evalDurationMs: nanosecondsToMilliseconds(data.eval_duration),
        responseCharacterCount: content.length,
        unaccountedDurationMs,
      },
      "Ollama image request completed"
    );

    return {
      model: data.model ?? model,
      response: content,
      done: data.done ?? true,
    };
  }
}

export const ollamaClient = new OllamaClient();
