import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  createHash,
  randomUUID,
} from "node:crypto";

import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../shared/logger.js";

import { aiRequestContext } from "./ai-provider-context.js";
import type {
  TextExtractionProvider,
  TextExtractionRequest,
  TextExtractionResult,
} from "./text-extraction-provider.js";
import {
  TextExtractionProviderError,
} from "./text-extraction-provider.js";

type OllamaChatChunk = {
  model?: string;
  created_at?: string;
  message?: {
    role?: string;
    content?: string;
    thinking?: string;
  };
  done?: boolean;
  done_reason?: string;
  error?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
};

type OllamaShowResponse = {
  capabilities?: string[];
  model_info?: Record<string, unknown>;
  parameters?: string;
};

type OllamaModelProfile = {
  model: string;
  isCloud: boolean;
  supportsCompletion: boolean;
  supportsThinking: boolean;
  supportsVision: boolean;
  supportsStructuredOutputs: boolean;
  contextLength?: number;
};

type RecoveryState =
  | "stream_error"
  | "checking_partial"
  | "partial_valid"
  | "partial_invalid"
  | "retrying";

type RecoveryProgress = {
  state: RecoveryState;
  attempt: number;
  maxAttempts: number;
  partialCharacters?: number;
  errorMessage?: string;
  errorRef?: string;
  nextAttempt?: number;
  savedPartialPath?: string;
};

type ObservableProviderProgress = {
  phase: "connecting" | "streaming" | "completed";
  chunkCount: number;
  contentCharacters: number;
  thinkingCharacters: number;
  elapsedMs: number;
  attempt?: number;
  maxAttempts?: number;
  recovery?: RecoveryProgress;
};

type AttemptFailureOptions = {
  code: string;
  message: string;
  httpStatus?: number;
  partialContent?: string;
  partialThinking?: string;
  chunkCount?: number;
  finalChunk?: OllamaChatChunk;
};

class OllamaAttemptFailure extends Error {
  readonly code: string;
  readonly httpStatus?: number;
  readonly partialContent: string;
  readonly partialThinking: string;
  readonly chunkCount: number;
  readonly finalChunk?: OllamaChatChunk;

  constructor(options: AttemptFailureOptions) {
    super(options.message);
    this.name = "OllamaAttemptFailure";
    this.code = options.code;
    this.httpStatus = options.httpStatus;
    this.partialContent = options.partialContent ?? "";
    this.partialThinking = options.partialThinking ?? "";
    this.chunkCount = options.chunkCount ?? 0;
    this.finalChunk = options.finalChunk;
  }
}

const RETRYABLE_CODES = new Set([
  "OLLAMA_INTERNAL_ERROR",
  "OLLAMA_CLOUD_UNREACHABLE",
  "OLLAMA_SERVICE_UNAVAILABLE",
  "OLLAMA_GATEWAY_TIMEOUT",
  "OLLAMA_RATE_LIMITED",
  "OLLAMA_CONNECTION_FAILED",
  "OLLAMA_TIMEOUT",
  "OLLAMA_STREAM_ERROR",
  "OLLAMA_STREAM_DISCONNECTED",
  "OLLAMA_STREAM_ENDED_EARLY",
  "OLLAMA_INVALID_STREAM_CHUNK",
  "OLLAMA_EMPTY_STREAM",
  "OLLAMA_EMPTY_CONTENT",
  "OLLAMA_INVALID_JSON",
]);

function sha256(value: string): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function normalizeBaseUrl(value: string): string {
  return value
    .replace(/\/api\/?$/i, "")
    .replace(/\/+$/, "");
}

function stripJsonFence(content: string): string {
  const trimmed = content.trim();

  const jsonFence =
    /^```json\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  if (jsonFence?.[1]) return jsonFence[1].trim();

  const genericFence =
    /^```\s*([\s\S]*?)\s*```$/.exec(trimmed);
  if (genericFence?.[1]) return genericFence[1].trim();

  return trimmed;
}

function tryParseAssistantJson(content: string): unknown | undefined {
  const stripped = stripJsonFence(content);
  if (!stripped) return undefined;

  try {
    return JSON.parse(stripped) as unknown;
  } catch {
    // Some models occasionally add a short sentence before/after the JSON.
  }

  const objectStart = stripped.indexOf("{");
  const objectEnd = stripped.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    try {
      return JSON.parse(stripped.slice(objectStart, objectEnd + 1)) as unknown;
    } catch {
      // Continue with array candidate.
    }
  }

  const arrayStart = stripped.indexOf("[");
  const arrayEnd = stripped.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    try {
      return JSON.parse(stripped.slice(arrayStart, arrayEnd + 1)) as unknown;
    } catch {
      // Not complete JSON.
    }
  }

  return undefined;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/x-ndjson, application/json",
  };

  if (env.OLLAMA_API_KEY) {
    headers.Authorization = `Bearer ${env.OLLAMA_API_KEY}`;
  }

  return headers;
}

function parseThinkValue():
  | boolean
  | "low"
  | "medium"
  | "high"
  | "max"
  | undefined {
  switch (env.OLLAMA_THINK) {
    case "true":
      return true;
    case "false":
      return false;
    case "low":
    case "medium":
    case "high":
    case "max":
      return env.OLLAMA_THINK;
    case "auto":
    default:
      return undefined;
  }
}

function isCloudModelName(model: string): boolean {
  return /(?:^|[:/_-])cloud$/i.test(model.trim());
}

function findContextLength(
  modelInfo: Record<string, unknown> | undefined,
): number | undefined {
  if (!modelInfo) return undefined;

  for (const [key, value] of Object.entries(modelInfo)) {
    if (
      key.toLowerCase().endsWith("context_length") &&
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return value;
    }
  }

  return undefined;
}

function mapHttpErrorCode(status: number): string {
  switch (status) {
    case 400:
      return "OLLAMA_BAD_REQUEST";
    case 401:
    case 403:
      return "OLLAMA_AUTHENTICATION_FAILED";
    case 404:
      return "OLLAMA_MODEL_NOT_FOUND";
    case 429:
      return "OLLAMA_RATE_LIMITED";
    case 500:
      return "OLLAMA_INTERNAL_ERROR";
    case 502:
      return "OLLAMA_CLOUD_UNREACHABLE";
    case 503:
      return "OLLAMA_SERVICE_UNAVAILABLE";
    case 504:
      return "OLLAMA_GATEWAY_TIMEOUT";
    default:
      return "OLLAMA_HTTP_ERROR";
  }
}

function extractErrorRef(message: string): string | undefined {
  const match = /\bref:\s*([0-9a-f-]{8,})/i.exec(message);
  return match?.[1];
}

async function readSafeError(response: Response): Promise<string> {
  try {
    const payload = await response.json() as { error?: unknown };
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error.trim().slice(0, 500);
    }
  } catch {
    // Never log provider bodies that could include document content.
  }

  return `Ollama returned HTTP ${response.status}.`;
}

function errorDetails(error: unknown): {
  errorName: string;
  errorMessage: string;
  causeName?: string;
  causeCode?: string;
  causeMessage?: string;
} {
  if (!(error instanceof Error)) {
    return {
      errorName: "UnknownError",
      errorMessage: String(error).slice(0, 500),
    };
  }

  const cause = error.cause;
  if (cause instanceof Error) {
    const code = (cause as Error & { code?: unknown }).code;
    return {
      errorName: error.name,
      errorMessage: error.message,
      causeName: cause.name,
      causeCode: typeof code === "string" ? code : undefined,
      causeMessage: cause.message,
    };
  }

  return {
    errorName: error.name,
    errorMessage: error.message,
    causeMessage:
      cause === undefined
        ? undefined
        : String(cause).slice(0, 500),
  };
}

function retryDelayMs(attempt: number): number {
  return Math.min(5_000, Math.max(1, attempt) * 2_000);
}

async function delay(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function usageFromChunk(chunk: OllamaChatChunk | undefined): {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
} {
  const promptTokens = chunk?.prompt_eval_count;
  const completionTokens = chunk?.eval_count;
  const totalTokens =
    typeof promptTokens === "number" && typeof completionTokens === "number"
      ? promptTokens + completionTokens
      : undefined;

  return { promptTokens, completionTokens, totalTokens };
}

export class OllamaNativeClient implements TextExtractionProvider {
  private readonly baseUrl = normalizeBaseUrl(env.OLLAMA_BASE_URL);
  private modelProfilePromise?: Promise<OllamaModelProfile>;

  async preflight(): Promise<void> {
    if (!env.OLLAMA_PREFLIGHT_ENABLED) return;
    await this.getModelProfile();
  }

  async extractJson(
    request: TextExtractionRequest,
  ): Promise<TextExtractionResult> {
    const overallStartedAt = Date.now();
    const promptSha256 = sha256(request.systemPrompt);
    const documentSha256 = sha256(request.rawDocument);
    const maxAttempts = env.OLLAMA_MAX_RETRIES + 1;
    let lastFailure: OllamaAttemptFailure | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.extractJsonAttempt({
          request,
          attempt,
          maxAttempts,
          overallStartedAt,
          promptSha256,
          documentSha256,
        });
      } catch (error) {
        const failure = this.normalizeAttemptFailure(error);
        lastFailure = failure;

        const canRetry =
          attempt < maxAttempts &&
          RETRYABLE_CODES.has(failure.code);

        if (!canRetry) {
          throw new TextExtractionProviderError(
            failure.code,
            failure.message,
            failure.httpStatus,
          );
        }

        await this.emitProgress(request, {
          phase: "connecting",
          chunkCount: failure.chunkCount,
          contentCharacters: failure.partialContent.length,
          thinkingCharacters: failure.partialThinking.length,
          elapsedMs: Date.now() - overallStartedAt,
          attempt,
          maxAttempts,
          recovery: {
            state: "retrying",
            attempt,
            maxAttempts,
            nextAttempt: attempt + 1,
            partialCharacters: failure.partialContent.length,
            errorMessage: failure.message,
            errorRef: extractErrorRef(failure.message),
          },
        });

        logger.warn({
          event: "ollama.chat.retrying",
          workerInstanceId: aiRequestContext.getStore()?.workerInstanceId,
          draftId: aiRequestContext.getStore()?.draftId,
          runId: aiRequestContext.getStore()?.runId,
          model: env.OLLAMA_MODEL,
          attempt,
          nextAttempt: attempt + 1,
          maxAttempts,
          errorCode: failure.code,
          errorMessage: failure.message.slice(0, 500),
          partialCharacters: failure.partialContent.length,
        }, "Retrying recoverable Ollama failure");

        await delay(retryDelayMs(attempt));
      }
    }

    throw new TextExtractionProviderError(
      lastFailure?.code ?? "OLLAMA_UNKNOWN_ERROR",
      lastFailure?.message ?? "Ollama extraction failed.",
      lastFailure?.httpStatus,
    );
  }

  private async extractJsonAttempt(input: {
    request: TextExtractionRequest;
    attempt: number;
    maxAttempts: number;
    overallStartedAt: number;
    promptSha256: string;
    documentSha256: string;
  }): Promise<TextExtractionResult> {
    const {
      request,
      attempt,
      maxAttempts,
      overallStartedAt,
      promptSha256,
      documentSha256,
    } = input;
    const attemptStartedAt = Date.now();
    const requestId = randomUUID();
    const context = aiRequestContext.getStore() ?? {};
    const endpoint = `${this.baseUrl}/api/chat`;
    const endpointHost = new URL(endpoint).host;
    const profile = await this.getModelProfile();

    const options: Record<string, unknown> = {
      temperature: env.AI_TEMPERATURE,
    };

    if (env.AI_MAX_OUTPUT_TOKENS !== undefined) {
      options.num_predict = env.AI_MAX_OUTPUT_TOKENS;
    }

    if (!profile.isCloud && env.OLLAMA_NUM_CTX > 0) {
      options.num_ctx = env.OLLAMA_NUM_CTX;
    }

    const body: Record<string, unknown> = {
      model: env.OLLAMA_MODEL,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.rawDocument },
      ],
      stream: true,
      keep_alive: env.OLLAMA_KEEP_ALIVE,
      options,
    };

    const think = parseThinkValue();
    if (profile.supportsThinking && think !== undefined) {
      body.think = think;
    }

    if (
      env.OLLAMA_STRUCTURED_OUTPUT === "json" &&
      profile.supportsStructuredOutputs
    ) {
      body.format = "json";
    }

    const serializedBody = JSON.stringify(body);

    logger.info({
      event: "ollama.chat.started",
      requestId,
      workerInstanceId: context.workerInstanceId,
      draftId: context.draftId,
      runId: context.runId,
      provider: "ollama",
      mode: env.OLLAMA_MODE,
      model: env.OLLAMA_MODEL,
      endpointHost,
      attempt,
      maxAttempts,
      promptSha256,
      documentSha256,
      promptCharacters: request.systemPrompt.length,
      documentCharacters: request.rawDocument.length,
      requestBodyBytes: Buffer.byteLength(serializedBody, "utf8"),
      isCloudModel: profile.isCloud,
      structuredOutput: body.format === "json" ? "json" : "none",
      thinkingEnabled: body.think !== undefined,
      modelOutputLimitSent: options.num_predict !== undefined,
      modelContextLimitSent: options.num_ctx !== undefined,
    }, "Ollama chat request started");

    await this.emitProgress(request, {
      phase: "connecting",
      chunkCount: 0,
      contentCharacters: 0,
      thinkingCharacters: 0,
      elapsedMs: Date.now() - overallStartedAt,
      attempt,
      maxAttempts,
    });

    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (env.OLLAMA_TIMEOUT_MS > 0) {
      timeout = setTimeout(() => controller.abort(), env.OLLAMA_TIMEOUT_MS);
    }

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: buildHeaders(),
        body: serializedBody,
        signal: controller.signal,
      });
    } catch (error) {
      const details = errorDetails(error);
      const timedOut = controller.signal.aborted;
      logger.error({
        event: "ollama.chat.transport_failed",
        requestId,
        workerInstanceId: context.workerInstanceId,
        draftId: context.draftId,
        runId: context.runId,
        provider: "ollama",
        model: env.OLLAMA_MODEL,
        endpointHost,
        attempt,
        maxAttempts,
        durationMs: Date.now() - attemptStartedAt,
        timedOut,
        ...details,
      }, "Ollama transport failed");

      throw new OllamaAttemptFailure({
        code: timedOut ? "OLLAMA_TIMEOUT" : "OLLAMA_CONNECTION_FAILED",
        message: timedOut
          ? "Ollama exceeded the configured timeout."
          : "Ollama could not be reached.",
      });
    }

    let content = "";
    let thinking = "";
    let chunkCount = 0;
    let finalChunk: OllamaChatChunk | undefined;
    let lastHeartbeatAt = 0;

    try {
      if (!response.ok) {
        throw new OllamaAttemptFailure({
          code: mapHttpErrorCode(response.status),
          message: await readSafeError(response),
          httpStatus: response.status,
        });
      }

      if (!response.body) {
        throw new OllamaAttemptFailure({
          code: "OLLAMA_EMPTY_STREAM",
          message: "Ollama returned an empty response stream.",
          httpStatus: response.status,
        });
      }

      logger.info({
        event: "ollama.chat.response_received",
        requestId,
        workerInstanceId: context.workerInstanceId,
        draftId: context.draftId,
        runId: context.runId,
        provider: "ollama",
        model: env.OLLAMA_MODEL,
        endpointHost,
        attempt,
        maxAttempts,
        httpStatus: response.status,
        elapsedMs: Date.now() - attemptStartedAt,
      }, "Ollama response stream opened");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processLine = async (line: string): Promise<void> => {
        const trimmed = line.trim();
        if (!trimmed) return;

        let chunk: OllamaChatChunk;
        try {
          chunk = JSON.parse(trimmed) as OllamaChatChunk;
        } catch {
          throw new OllamaAttemptFailure({
            code: "OLLAMA_INVALID_STREAM_CHUNK",
            message: "Ollama returned an invalid NDJSON stream chunk.",
            httpStatus: response.status,
            partialContent: content,
            partialThinking: thinking,
            chunkCount,
            finalChunk,
          });
        }

        if (typeof chunk.error === "string" && chunk.error.trim()) {
          throw new OllamaAttemptFailure({
            code: "OLLAMA_STREAM_ERROR",
            message: chunk.error.trim().slice(0, 500),
            httpStatus: response.status,
            partialContent: content,
            partialThinking: thinking,
            chunkCount,
            finalChunk,
          });
        }

        chunkCount += 1;

        if (typeof chunk.message?.content === "string") {
          content += chunk.message.content;
        }
        if (typeof chunk.message?.thinking === "string") {
          thinking += chunk.message.thinking;
        }
        if (chunk.done) finalChunk = chunk;

        const now = Date.now();
        const shouldHeartbeat =
          chunkCount === 1 ||
          chunk.done === true ||
          now - lastHeartbeatAt >= env.OLLAMA_HEARTBEAT_INTERVAL_MS;

        if (shouldHeartbeat) {
          lastHeartbeatAt = now;
          await this.emitProgress(request, {
            phase: chunk.done ? "completed" : "streaming",
            chunkCount,
            contentCharacters: content.length,
            thinkingCharacters: thinking.length,
            elapsedMs: now - overallStartedAt,
            attempt,
            maxAttempts,
          });
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            await processLine(line);
          }
        }

        buffer += decoder.decode();
        if (buffer.trim()) await processLine(buffer);
      } catch (error) {
        if (error instanceof OllamaAttemptFailure) throw error;

        const details = errorDetails(error);
        logger.warn({
          event: "ollama.chat.stream_disconnected",
          requestId,
          workerInstanceId: context.workerInstanceId,
          draftId: context.draftId,
          runId: context.runId,
          attempt,
          maxAttempts,
          chunkCount,
          contentCharacters: content.length,
          ...details,
        }, "Ollama response stream disconnected");

        throw new OllamaAttemptFailure({
          code: "OLLAMA_STREAM_DISCONNECTED",
          message: "The Ollama response stream disconnected before completion.",
          httpStatus: response.status,
          partialContent: content,
          partialThinking: thinking,
          chunkCount,
          finalChunk,
        });
      }

      if (!finalChunk?.done) {
        throw new OllamaAttemptFailure({
          code: "OLLAMA_STREAM_ENDED_EARLY",
          message: "The Ollama response stream ended before a final chunk was received.",
          httpStatus: response.status,
          partialContent: content,
          partialThinking: thinking,
          chunkCount,
          finalChunk,
        });
      }

      if (finalChunk.done_reason === "length") {
        throw new OllamaAttemptFailure({
          code: "OLLAMA_TRUNCATED_RESPONSE",
          message: "Ollama truncated the response because the token limit was reached.",
          httpStatus: response.status,
          partialContent: content,
          partialThinking: thinking,
          chunkCount,
          finalChunk,
        });
      }

      if (!content.trim()) {
        throw new OllamaAttemptFailure({
          code: "OLLAMA_EMPTY_CONTENT",
          message: "Ollama did not return assistant content.",
          httpStatus: response.status,
          partialContent: content,
          partialThinking: thinking,
          chunkCount,
          finalChunk,
        });
      }

      const rawJson = tryParseAssistantJson(content);
      if (rawJson === undefined) {
        throw new OllamaAttemptFailure({
          code: "OLLAMA_INVALID_JSON",
          message: "Ollama returned assistant content that is not valid JSON.",
          httpStatus: response.status,
          partialContent: content,
          partialThinking: thinking,
          chunkCount,
          finalChunk,
        });
      }

      const durationMs = Date.now() - overallStartedAt;
      await this.emitProgress(request, {
        phase: "completed",
        chunkCount,
        contentCharacters: content.length,
        thinkingCharacters: thinking.length,
        elapsedMs: durationMs,
        attempt,
        maxAttempts,
      });

      logger.info({
        event: "ollama.chat.completed",
        requestId,
        workerInstanceId: context.workerInstanceId,
        draftId: context.draftId,
        runId: context.runId,
        provider: "ollama",
        model: finalChunk.model ?? env.OLLAMA_MODEL,
        endpointHost,
        attempt,
        maxAttempts,
        httpStatus: response.status,
        finishReason: finalChunk.done_reason ?? null,
        durationMs,
        responseCharacters: content.length,
        thinkingCharacters: thinking.length,
        streamChunks: chunkCount,
      }, "Ollama chat request completed");

      return this.buildResult({
        requestId,
        rawJson,
        durationMs,
        promptSha256,
        documentSha256,
        content,
        thinking,
        chunkCount,
        finalChunk,
        httpStatus: response.status,
        finishReason: finalChunk.done_reason ?? null,
      });
    } catch (error) {
      const failure = this.normalizeAttemptFailure(error, {
        httpStatus: response.status,
        partialContent: content,
        partialThinking: thinking,
        chunkCount,
        finalChunk,
      });

      if (failure.partialContent.trim()) {
        const recovered = await this.tryRecoverPartial({
          request,
          requestId,
          attempt,
          maxAttempts,
          overallStartedAt,
          promptSha256,
          documentSha256,
          failure,
        });
        if (recovered) return recovered;
      }

      throw failure;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private async tryRecoverPartial(input: {
    request: TextExtractionRequest;
    requestId: string;
    attempt: number;
    maxAttempts: number;
    overallStartedAt: number;
    promptSha256: string;
    documentSha256: string;
    failure: OllamaAttemptFailure;
  }): Promise<TextExtractionResult | undefined> {
    const {
      request,
      requestId,
      attempt,
      maxAttempts,
      overallStartedAt,
      promptSha256,
      documentSha256,
      failure,
    } = input;

    const errorRef = extractErrorRef(failure.message);
    const savedPartialPath = await this.persistPartialResponse(
      failure.partialContent,
      attempt,
      failure.code,
    );

    await this.emitProgress(request, {
      phase: "connecting",
      chunkCount: failure.chunkCount,
      contentCharacters: failure.partialContent.length,
      thinkingCharacters: failure.partialThinking.length,
      elapsedMs: Date.now() - overallStartedAt,
      attempt,
      maxAttempts,
      recovery: {
        state: "stream_error",
        attempt,
        maxAttempts,
        partialCharacters: failure.partialContent.length,
        errorMessage: failure.message,
        errorRef,
        savedPartialPath,
      },
    });

    await this.emitProgress(request, {
      phase: "connecting",
      chunkCount: failure.chunkCount,
      contentCharacters: failure.partialContent.length,
      thinkingCharacters: failure.partialThinking.length,
      elapsedMs: Date.now() - overallStartedAt,
      attempt,
      maxAttempts,
      recovery: {
        state: "checking_partial",
        attempt,
        maxAttempts,
        partialCharacters: failure.partialContent.length,
        errorRef,
        savedPartialPath,
      },
    });

    // Keep the recovery state observable for the 1.5s frontend polling loop.
    await delay(2_000);

    const rawJson = tryParseAssistantJson(failure.partialContent);
    if (rawJson === undefined) {
      await this.emitProgress(request, {
        phase: "connecting",
        chunkCount: failure.chunkCount,
        contentCharacters: failure.partialContent.length,
        thinkingCharacters: failure.partialThinking.length,
        elapsedMs: Date.now() - overallStartedAt,
        attempt,
        maxAttempts,
        recovery: {
          state: "partial_invalid",
          attempt,
          maxAttempts,
          partialCharacters: failure.partialContent.length,
          errorRef,
          savedPartialPath,
        },
      });
      return undefined;
    }

    const durationMs = Date.now() - overallStartedAt;
    await this.emitProgress(request, {
      phase: "completed",
      chunkCount: failure.chunkCount,
      contentCharacters: failure.partialContent.length,
      thinkingCharacters: failure.partialThinking.length,
      elapsedMs: durationMs,
      attempt,
      maxAttempts,
      recovery: {
        state: "partial_valid",
        attempt,
        maxAttempts,
        partialCharacters: failure.partialContent.length,
        errorRef,
        savedPartialPath,
      },
    });

    logger.warn({
      event: "ollama.chat.partial_recovered",
      workerInstanceId: aiRequestContext.getStore()?.workerInstanceId,
      draftId: aiRequestContext.getStore()?.draftId,
      runId: aiRequestContext.getStore()?.runId,
      requestId,
      model: env.OLLAMA_MODEL,
      attempt,
      maxAttempts,
      originalErrorCode: failure.code,
      originalErrorRef: errorRef,
      partialCharacters: failure.partialContent.length,
      streamChunks: failure.chunkCount,
      savedPartialPath,
    }, "Recovered complete JSON from interrupted Ollama stream");

    return this.buildResult({
      requestId,
      rawJson,
      durationMs,
      promptSha256,
      documentSha256,
      content: failure.partialContent,
      thinking: failure.partialThinking,
      chunkCount: failure.chunkCount,
      finalChunk: failure.finalChunk,
      httpStatus: failure.httpStatus ?? 200,
      finishReason: "recovered_stream_error",
    });
  }

  private buildResult(input: {
    requestId: string;
    rawJson: unknown;
    durationMs: number;
    promptSha256: string;
    documentSha256: string;
    content: string;
    thinking: string;
    chunkCount: number;
    finalChunk?: OllamaChatChunk;
    httpStatus: number;
    finishReason: string | null;
  }): TextExtractionResult {
    const usage = usageFromChunk(input.finalChunk);

    return {
      provider: "ollama",
      model: input.finalChunk?.model ?? env.OLLAMA_MODEL,
      requestId: input.requestId,
      rawJson: input.rawJson,
      durationMs: input.durationMs,
      promptSha256: input.promptSha256,
      documentSha256: input.documentSha256,
      usage,
      metrics: {
        httpStatus: input.httpStatus,
        finishReason: input.finishReason,
        streamChunks: input.chunkCount,
        responseCharacters: input.content.length,
        thinkingCharacters: input.thinking.length,
        totalDurationNs: input.finalChunk?.total_duration,
        loadDurationNs: input.finalChunk?.load_duration,
        promptEvalCount: input.finalChunk?.prompt_eval_count,
        promptEvalDurationNs: input.finalChunk?.prompt_eval_duration,
        evalCount: input.finalChunk?.eval_count,
        evalDurationNs: input.finalChunk?.eval_duration,
      },
    };
  }

  private normalizeAttemptFailure(
    error: unknown,
    defaults?: Partial<AttemptFailureOptions>,
  ): OllamaAttemptFailure {
    if (error instanceof OllamaAttemptFailure) return error;

    if (error instanceof TextExtractionProviderError) {
      return new OllamaAttemptFailure({
        code: error.code,
        message: error.message || "Ollama request failed.",
        httpStatus: error.httpStatus ?? defaults?.httpStatus,
        partialContent: defaults?.partialContent,
        partialThinking: defaults?.partialThinking,
        chunkCount: defaults?.chunkCount,
        finalChunk: defaults?.finalChunk,
      });
    }

    const details = errorDetails(error);
    return new OllamaAttemptFailure({
      code: "OLLAMA_STREAM_DISCONNECTED",
      message: details.errorMessage || "Ollama stream failed.",
      httpStatus: defaults?.httpStatus,
      partialContent: defaults?.partialContent,
      partialThinking: defaults?.partialThinking,
      chunkCount: defaults?.chunkCount,
      finalChunk: defaults?.finalChunk,
    });
  }

  private async emitProgress(
    request: TextExtractionRequest,
    progress: ObservableProviderProgress,
  ): Promise<void> {
    if (!request.onProgress) return;
    await request.onProgress(progress as Parameters<NonNullable<typeof request.onProgress>>[0]);
  }

  private async persistPartialResponse(
    content: string,
    attempt: number,
    errorCode: string,
  ): Promise<string | undefined> {
    const context = aiRequestContext.getStore();
    const runId = context?.runId;
    if (!runId || !content.trim()) return undefined;

    try {
      const directory = path.resolve(env.STORAGE_DIR, "ai-partials");
      await fs.mkdir(directory, { recursive: true });

      const safeRunId = runId.replace(/[^a-zA-Z0-9_-]/g, "_");
      const filePath = path.join(
        directory,
        `${safeRunId}-attempt-${attempt}-${errorCode.toLowerCase()}.partial.txt`,
      );
      await fs.writeFile(filePath, content, "utf8");
      const contentHash = sha256(content);

      try {
        await prisma.aiExtractionRun.update({
          where: { id: runId },
          data: {
            rawResponsePath: filePath,
            rawResponseHash: contentHash,
          },
        });
      } catch (databaseError) {
        logger.warn({
          event: "ollama.partial_response.db_link_failed",
          runId,
          attempt,
          errorCode,
          ...errorDetails(databaseError),
        }, "Partial Ollama response was saved but could not be linked to AI run");
      }

      logger.warn({
        event: "ollama.partial_response.saved",
        workerInstanceId: context.workerInstanceId,
        draftId: context.draftId,
        runId,
        attempt,
        errorCode,
        partialCharacters: content.length,
        rawResponsePath: filePath,
        rawResponseHash: contentHash,
      }, "Saved interrupted Ollama response for recovery diagnostics");

      return filePath;
    } catch (error) {
      logger.warn({
        event: "ollama.partial_response.save_failed",
        workerInstanceId: context.workerInstanceId,
        draftId: context.draftId,
        runId,
        attempt,
        errorCode,
        ...errorDetails(error),
      }, "Could not persist interrupted Ollama response");
      return undefined;
    }
  }

  private async getModelProfile(): Promise<OllamaModelProfile> {
    if (!this.modelProfilePromise) {
      this.modelProfilePromise = this.loadModelProfile().catch((error) => {
        this.modelProfilePromise = undefined;
        throw error;
      });
    }
    return this.modelProfilePromise;
  }

  private async loadModelProfile(): Promise<OllamaModelProfile> {
    const endpoint = `${this.baseUrl}/api/show`;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      env.OLLAMA_PREFLIGHT_TIMEOUT_MS,
    );

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({ model: env.OLLAMA_MODEL }),
        signal: controller.signal,
      });
    } catch (error) {
      const timedOut = controller.signal.aborted;
      throw new TextExtractionProviderError(
        timedOut ? "OLLAMA_PREFLIGHT_TIMEOUT" : "OLLAMA_CONNECTION_FAILED",
        timedOut
          ? "Ollama preflight exceeded the configured timeout."
          : "Ollama could not be reached during preflight.",
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new TextExtractionProviderError(
        mapHttpErrorCode(response.status),
        await readSafeError(response),
        response.status,
      );
    }

    let payload: OllamaShowResponse;
    try {
      payload = await response.json() as OllamaShowResponse;
    } catch {
      throw new TextExtractionProviderError(
        "OLLAMA_PREFLIGHT_INVALID_RESPONSE",
        "Ollama returned an invalid model profile.",
        response.status,
      );
    }

    const capabilities = new Set(
      (payload.capabilities ?? []).map((value) => value.toLowerCase()),
    );
    const isCloud = isCloudModelName(env.OLLAMA_MODEL);
    const supportsCompletion =
      capabilities.size === 0 || capabilities.has("completion");

    const profile: OllamaModelProfile = {
      model: env.OLLAMA_MODEL,
      isCloud,
      supportsCompletion,
      supportsThinking: capabilities.has("thinking"),
      supportsVision: capabilities.has("vision"),
      // CajaApp intentionally avoids forcing structured output on cloud models.
      supportsStructuredOutputs: !isCloud && supportsCompletion,
      contextLength: findContextLength(payload.model_info),
    };

    if (!profile.supportsCompletion) {
      throw new TextExtractionProviderError(
        "OLLAMA_MODEL_NO_COMPLETION",
        `Ollama model ${env.OLLAMA_MODEL} does not advertise completion capability.`,
        response.status,
      );
    }

    logger.info({
      event: "ollama.preflight.completed",
      provider: "ollama",
      mode: env.OLLAMA_MODE,
      model: env.OLLAMA_MODEL,
      isCloudModel: profile.isCloud,
      supportsThinking: profile.supportsThinking,
      supportsVision: profile.supportsVision,
      supportsStructuredOutputs: profile.supportsStructuredOutputs,
      contextLength: profile.contextLength,
    }, "Ollama model preflight completed");

    return profile;
  }
}
