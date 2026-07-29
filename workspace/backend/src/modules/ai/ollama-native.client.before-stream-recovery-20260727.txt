import {
  createHash,
  randomUUID,
} from "node:crypto";

import { env } from "../../config/env.js";
import { logger } from "../../shared/logger.js";

import { aiRequestContext } from "./ai-provider-context.js";
import type {
  TextExtractionMetrics,
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

type OllamaTagsResponse = {
  models?: Array<{
    name?: string;
    model?: string;
  }>;
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

  if (jsonFence?.[1]) {
    return jsonFence[1].trim();
  }

  const genericFence =
    /^```\s*([\s\S]*?)\s*```$/.exec(trimmed);

  if (genericFence?.[1]) {
    return genericFence[1].trim();
  }

  return trimmed;
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

function findContextLength(
  modelInfo: Record<string, unknown> | undefined,
): number | undefined {
  if (!modelInfo) {
    return undefined;
  }

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
    default:
      return "OLLAMA_HTTP_ERROR";
  }
}

async function readSafeError(response: Response): Promise<string> {
  try {
    const payload = await response.json() as {
      error?: unknown;
    };

    if (
      typeof payload.error === "string" &&
      payload.error.trim()
    ) {
      return payload.error.trim().slice(0, 500);
    }
  } catch {
    // Do not log response bodies containing document content.
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
    return {
      errorName: error.name,
      errorMessage: error.message,
      causeName: cause.name,
      causeCode: (() => {
        const code = (
          cause as Error & { code?: unknown }
        ).code;
        return typeof code === "string"
          ? code
          : undefined;
      })(),
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

export class OllamaNativeClient
  implements TextExtractionProvider {
  private readonly baseUrl = normalizeBaseUrl(
    env.OLLAMA_BASE_URL,
  );

  private modelProfilePromise?: Promise<OllamaModelProfile>;

  async preflight(): Promise<void> {
    await this.getModelProfile();
  }

  async extractJson(
    request: TextExtractionRequest,
  ): Promise<TextExtractionResult> {
    const requestId = randomUUID();
    const startedAt = Date.now();
    const context = aiRequestContext.getStore() ?? {};
    const endpoint = `${this.baseUrl}/api/chat`;
    const endpointHost = new URL(endpoint).host;
    const promptSha256 = sha256(request.systemPrompt);
    const documentSha256 = sha256(request.rawDocument);

    const profile = await this.getModelProfile();

    const body: Record<string, unknown> = {
      model: env.OLLAMA_MODEL,
      messages: [
        {
          role: "system",
          content: request.systemPrompt,
        },
        {
          role: "user",
          content: request.rawDocument,
        },
      ],
      stream: true,
      keep_alive: env.OLLAMA_KEEP_ALIVE,
      options: {
        temperature: env.AI_TEMPERATURE,
        num_predict: env.AI_MAX_OUTPUT_TOKENS,
      },
    };

    const options = body.options as Record<string, unknown>;

    if (!profile.isCloud && env.OLLAMA_NUM_CTX > 0) {
      options.num_ctx = env.OLLAMA_NUM_CTX;
    }

    const think = parseThinkValue();

    if (
      profile.supportsThinking &&
      think !== undefined
    ) {
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
      promptSha256,
      documentSha256,
      promptCharacters: request.systemPrompt.length,
      documentCharacters: request.rawDocument.length,
      requestBodyBytes: Buffer.byteLength(
        serializedBody,
        "utf8",
      ),
      isCloudModel: profile.isCloud,
      structuredOutput:
        body.format === "json" ? "json" : "none",
      thinkingEnabled: body.think !== undefined,
    }, "Ollama chat request started");

    await this.emitProgress(request, {
      phase: "connecting",
      chunkCount: 0,
      contentCharacters: 0,
      thinkingCharacters: 0,
      elapsedMs: 0,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, env.OLLAMA_TIMEOUT_MS);

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
      const durationMs = Date.now() - startedAt;
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
        durationMs,
        timedOut,
        ...details,
      }, "Ollama transport failed");

      throw new TextExtractionProviderError(
        timedOut
          ? "OLLAMA_TIMEOUT"
          : "OLLAMA_CONNECTION_FAILED",
        timedOut
          ? "Ollama exceeded the configured timeout."
          : "Ollama could not be reached.",
      );
    }

    try {
      if (!response.ok) {
        const message = await readSafeError(response);

        throw new TextExtractionProviderError(
          mapHttpErrorCode(response.status),
          message,
          response.status,
        );
      }

      if (!response.body) {
        throw new TextExtractionProviderError(
          "OLLAMA_EMPTY_STREAM",
          "Ollama returned an empty response stream.",
          response.status,
        );
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
        httpStatus: response.status,
        elapsedMs: Date.now() - startedAt,
      }, "Ollama response stream opened");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let content = "";
      let thinking = "";
      let chunkCount = 0;
      let finalChunk: OllamaChatChunk | undefined;
      let lastHeartbeatAt = 0;
      let firstChunkAt: number | undefined;

      const processLine = async (line: string): Promise<void> => {
        const trimmed = line.trim();

        if (!trimmed) {
          return;
        }

        let chunk: OllamaChatChunk;

        try {
          chunk = JSON.parse(trimmed) as OllamaChatChunk;
        } catch {
          throw new TextExtractionProviderError(
            "OLLAMA_INVALID_STREAM_CHUNK",
            "Ollama returned an invalid NDJSON stream chunk.",
            response.status,
          );
        }

        if (
          typeof chunk.error === "string" &&
          chunk.error.trim()
        ) {
          throw new TextExtractionProviderError(
            "OLLAMA_STREAM_ERROR",
            chunk.error.trim().slice(0, 500),
            response.status,
          );
        }

        chunkCount += 1;
        firstChunkAt ??= Date.now();

        if (typeof chunk.message?.content === "string") {
          content += chunk.message.content;
        }

        if (typeof chunk.message?.thinking === "string") {
          thinking += chunk.message.thinking;
        }

        if (chunk.done) {
          finalChunk = chunk;
        }

        const now = Date.now();
        const shouldHeartbeat =
          chunkCount === 1 ||
          chunk.done === true ||
          now - lastHeartbeatAt >=
            env.OLLAMA_HEARTBEAT_INTERVAL_MS;

        if (shouldHeartbeat) {
          lastHeartbeatAt = now;

          await this.emitProgress(request, {
            phase: chunk.done
              ? "completed"
              : "streaming",
            chunkCount,
            contentCharacters: content.length,
            thinkingCharacters: thinking.length,
            elapsedMs: now - startedAt,
          });
        }
      };

      while (true) {
        const readResult = await reader.read();

        if (readResult.done) {
          buffer += decoder.decode();
          break;
        }

        buffer += decoder.decode(
          readResult.value,
          { stream: true },
        );

        let newlineIndex = buffer.indexOf("\n");

        while (newlineIndex >= 0) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          await processLine(line);
          newlineIndex = buffer.indexOf("\n");
        }
      }

      if (buffer.trim()) {
        await processLine(buffer);
      }

      if (!finalChunk?.done) {
        throw new TextExtractionProviderError(
          "OLLAMA_INCOMPLETE_STREAM",
          "Ollama closed the stream before completing the response.",
          response.status,
        );
      }

      const finishReason =
        finalChunk.done_reason ?? null;

      if (finishReason === "length") {
        throw new TextExtractionProviderError(
          "OLLAMA_TRUNCATED_RESPONSE",
          "Ollama truncated the response because the token limit was reached.",
          response.status,
        );
      }

      if (!content.trim()) {
        throw new TextExtractionProviderError(
          "OLLAMA_EMPTY_CONTENT",
          "Ollama completed without returning assistant content.",
          response.status,
        );
      }

      let rawJson: unknown;

      try {
        rawJson = JSON.parse(
          stripJsonFence(content),
        );
      } catch {
        logger.error({
          event: "ollama.chat.invalid_json",
          requestId,
          workerInstanceId: context.workerInstanceId,
          draftId: context.draftId,
          runId: context.runId,
          provider: "ollama",
          model: env.OLLAMA_MODEL,
          endpointHost,
          httpStatus: response.status,
          finishReason,
          durationMs: Date.now() - startedAt,
          responseCharacters: content.length,
          thinkingCharacters: thinking.length,
          streamChunks: chunkCount,
        }, "Ollama returned invalid JSON");

        throw new TextExtractionProviderError(
          "OLLAMA_INVALID_JSON",
          "Ollama returned content that is not valid JSON.",
          response.status,
        );
      }

      const durationMs = Date.now() - startedAt;
      const metrics: TextExtractionMetrics = {
        httpStatus: response.status,
        finishReason,
        streamChunks: chunkCount,
        responseCharacters: content.length,
        thinkingCharacters: thinking.length,
        firstChunkLatencyMs:
          firstChunkAt === undefined
            ? undefined
            : firstChunkAt - startedAt,
        streamDurationMs:
          firstChunkAt === undefined
            ? undefined
            : Date.now() - firstChunkAt,
        totalDurationNs: finalChunk.total_duration,
        loadDurationNs: finalChunk.load_duration,
        promptEvalCount: finalChunk.prompt_eval_count,
        promptEvalDurationNs:
          finalChunk.prompt_eval_duration,
        evalCount: finalChunk.eval_count,
        evalDurationNs: finalChunk.eval_duration,
      };

      logger.info({
        event: "ollama.chat.completed",
        requestId,
        workerInstanceId: context.workerInstanceId,
        draftId: context.draftId,
        runId: context.runId,
        provider: "ollama",
        model: finalChunk.model ?? env.OLLAMA_MODEL,
        endpointHost,
        durationMs,
        ...metrics,
      }, "Ollama chat completed");

      return {
        provider: "ollama",
        model: finalChunk.model ?? env.OLLAMA_MODEL,
        requestId,
        rawJson,
        durationMs,
        promptSha256,
        documentSha256,
        usage: {
          promptTokens: finalChunk.prompt_eval_count,
          completionTokens: finalChunk.eval_count,
          totalTokens:
            (finalChunk.prompt_eval_count ?? 0) +
            (finalChunk.eval_count ?? 0),
        },
        metrics,
      };
    } catch (error) {
      if (error instanceof TextExtractionProviderError) {
        throw error;
      }

      const details = errorDetails(error);
      const timedOut = controller.signal.aborted;

      logger.error({
        event: "ollama.chat.stream_failed",
        requestId,
        workerInstanceId: context.workerInstanceId,
        draftId: context.draftId,
        runId: context.runId,
        provider: "ollama",
        mode: env.OLLAMA_MODE,
        model: env.OLLAMA_MODEL,
        endpointHost,
        durationMs: Date.now() - startedAt,
        timedOut,
        ...details,
      }, "Ollama response stream failed");

      throw new TextExtractionProviderError(
        timedOut
          ? "OLLAMA_TIMEOUT"
          : "OLLAMA_STREAM_READ_FAILED",
        timedOut
          ? "Ollama exceeded the configured timeout."
          : "Ollama response stream could not be read.",
        response.status,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async emitProgress(
    request: TextExtractionRequest,
    progress: Parameters<
      NonNullable<TextExtractionRequest["onProgress"]>
    >[0],
  ): Promise<void> {
    const context = aiRequestContext.getStore();
    const callback =
      request.onProgress ??
      context?.onProviderProgress;

    if (!callback) {
      return;
    }

    try {
      await callback(progress);
    } catch (error) {
      logger.warn({
        event: "ollama.progress_callback_failed",
        errorName:
          error instanceof Error
            ? error.name
            : "UnknownError",
        errorMessage:
          error instanceof Error
            ? error.message
            : String(error),
      }, "Ollama progress callback failed");
    }
  }

  private getModelProfile(): Promise<OllamaModelProfile> {
    if (!this.modelProfilePromise) {
      this.modelProfilePromise = this.inspectModel();
    }

    return this.modelProfilePromise;
  }

  private async inspectModel(): Promise<OllamaModelProfile> {
    if (!env.OLLAMA_PREFLIGHT_ENABLED) {
      return {
        model: env.OLLAMA_MODEL,
        isCloud:
          env.OLLAMA_MODE === "cloud-direct" ||
          env.OLLAMA_MODEL.endsWith(":cloud"),
        supportsCompletion: true,
        supportsThinking: false,
        supportsVision: false,
        supportsStructuredOutputs:
          !env.OLLAMA_MODEL.endsWith(":cloud"),
      };
    }

    const tagsEndpoint = `${this.baseUrl}/api/tags`;
    const showEndpoint = `${this.baseUrl}/api/show`;
    const startedAt = Date.now();

    const tagsResponse = await this.fetchPreflight(
      tagsEndpoint,
      {
        method: "GET",
        headers: buildHeaders(),
      },
    );

    if (!tagsResponse.ok) {
      throw new TextExtractionProviderError(
        mapHttpErrorCode(tagsResponse.status),
        await readSafeError(tagsResponse),
        tagsResponse.status,
      );
    }

    const tags = await tagsResponse.json() as OllamaTagsResponse;

    const showResponse = await this.fetchPreflight(
      showEndpoint,
      {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({
          model: env.OLLAMA_MODEL,
        }),
      },
    );

    if (!showResponse.ok) {
      throw new TextExtractionProviderError(
        mapHttpErrorCode(showResponse.status),
        await readSafeError(showResponse),
        showResponse.status,
      );
    }

    const show = await showResponse.json() as OllamaShowResponse;
    const capabilities = new Set(
      show.capabilities ?? [],
    );
    const isCloud =
      env.OLLAMA_MODE === "cloud-direct" ||
      env.OLLAMA_MODEL.endsWith(":cloud");
    const supportsCompletion =
      capabilities.size === 0 ||
      capabilities.has("completion");

    if (!supportsCompletion) {
      throw new TextExtractionProviderError(
        "OLLAMA_MODEL_UNSUPPORTED",
        "The configured Ollama model does not support completion.",
      );
    }

    const profile: OllamaModelProfile = {
      model: env.OLLAMA_MODEL,
      isCloud,
      supportsCompletion,
      supportsThinking: capabilities.has("thinking"),
      supportsVision: capabilities.has("vision"),
      supportsStructuredOutputs: !isCloud,
      contextLength: findContextLength(
        show.model_info,
      ),
    };

    const modelListed = (tags.models ?? []).some(
      (model) =>
        model.name === env.OLLAMA_MODEL ||
        model.model === env.OLLAMA_MODEL,
    );

    logger.info({
      event: "ollama.preflight.completed",
      provider: "ollama",
      mode: env.OLLAMA_MODE,
      model: env.OLLAMA_MODEL,
      endpointHost: new URL(this.baseUrl).host,
      durationMs: Date.now() - startedAt,
      modelListed,
      capabilities: Array.from(capabilities),
      isCloud,
      supportsThinking: profile.supportsThinking,
      supportsVision: profile.supportsVision,
      supportsStructuredOutputs:
        profile.supportsStructuredOutputs,
      contextLength: profile.contextLength,
    }, "Ollama preflight completed");

    return profile;
  }

  private async fetchPreflight(
    endpoint: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, env.OLLAMA_PREFLIGHT_TIMEOUT_MS);

    try {
      return await fetch(endpoint, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      throw new TextExtractionProviderError(
        controller.signal.aborted
          ? "OLLAMA_PREFLIGHT_TIMEOUT"
          : "OLLAMA_CONNECTION_FAILED",
        controller.signal.aborted
          ? "Ollama preflight timed out."
          : "Ollama could not be reached during preflight.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
