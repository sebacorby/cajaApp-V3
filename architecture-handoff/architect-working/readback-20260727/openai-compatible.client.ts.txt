import {
  createHash,
  randomUUID,
} from "node:crypto";

import { env } from "../../config/env.js";
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

type AssistantContentPart = {
  type?: string;
  text?: string;
};

type OpenAICompatibleResponse = {
  id?: string;
  model?: string;
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      role?: string;
      content?:
        | string
        | AssistantContentPart[]
        | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

type OpenAICompatibleErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: string | number;
  };
};

function joinUrl(
  baseUrl: string,
  pathValue: string,
): string {
  const base = baseUrl.replace(/\/+$/, "");
  const suffix = pathValue.startsWith("/")
    ? pathValue
    : `/${pathValue}`;

  return `${base}${suffix}`;
}

function sha256(value: string): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function extractAssistantText(
  response: OpenAICompatibleResponse,
): string {
  const content =
    response.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .filter(
        (
          part,
        ): part is AssistantContentPart & {
          text: string;
        } => typeof part?.text === "string",
      )
      .map((part) => part.text)
      .join("")
      .trim();
  }

  return "";
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
    Accept: "application/json",
  };

  if (env.AI_API_KEY) {
    headers.Authorization =
      `Bearer ${env.AI_API_KEY}`;
  }

  return headers;
}

function buildRequestBody(
  request: TextExtractionRequest,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: env.AI_MODEL,
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
    stream: false,
    temperature: env.AI_TEMPERATURE,
  };

  body[env.AI_TOKEN_PARAMETER] =
    env.AI_MAX_OUTPUT_TOKENS;

  if (env.AI_RESPONSE_FORMAT === "json_object") {
    body.response_format = {
      type: "json_object",
    };
  }

  return body;
}

async function readSafeProviderError(
  response: Response,
): Promise<string> {
  try {
    const payload =
      await response.json() as
        OpenAICompatibleErrorPayload;
    const message = payload.error?.message?.trim();

    if (message) {
      return message.slice(0, 500);
    }
  } catch {
    // Never log the complete provider body.
  }

  return (
    `OpenAI-compatible provider returned ` +
    `HTTP ${response.status}.`
  );
}

function serializeError(error: unknown): {
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

  if (error.cause instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      causeName: error.cause.name,
      causeCode: (() => {
        const code = (
          error.cause as Error & { code?: unknown }
        ).code;
        return typeof code === "string"
          ? code
          : undefined;
      })(),
      causeMessage: error.cause.message,
    };
  }

  return {
    errorName: error.name,
    errorMessage: error.message,
    causeMessage:
      error.cause === undefined
        ? undefined
        : String(error.cause).slice(0, 500),
  };
}

export class OpenAICompatibleClient
  implements TextExtractionProvider {
  async extractJson(
    request: TextExtractionRequest,
  ): Promise<TextExtractionResult> {
    if (!env.AI_BASE_URL || !env.AI_MODEL) {
      throw new TextExtractionProviderError(
        "OPENAI_COMPATIBLE_MISSING_CONFIG",
        "AI_BASE_URL and AI_MODEL are required.",
      );
    }

    const requestId = randomUUID();
    const startedAt = Date.now();
    const context = aiRequestContext.getStore() ?? {};
    const endpoint = joinUrl(
      env.AI_BASE_URL,
      env.AI_CHAT_COMPLETIONS_PATH,
    );
    const endpointHost = new URL(endpoint).host;
    const promptSha256 = sha256(request.systemPrompt);
    const documentSha256 = sha256(request.rawDocument);
    const serializedBody = JSON.stringify(
      buildRequestBody(request),
    );

    logger.info({
      event: "openai_compatible.chat.started",
      requestId,
      workerInstanceId: context.workerInstanceId,
      draftId: context.draftId,
      runId: context.runId,
      provider: "openai-compatible",
      model: env.AI_MODEL,
      endpointHost,
      promptSha256,
      documentSha256,
      promptCharacters: request.systemPrompt.length,
      documentCharacters: request.rawDocument.length,
      requestBodyBytes: Buffer.byteLength(
        serializedBody,
        "utf8",
      ),
    }, "OpenAI-compatible request started");

    await request.onProgress?.({
      phase: "connecting",
      chunkCount: 0,
      contentCharacters: 0,
      thinkingCharacters: 0,
      elapsedMs: 0,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, env.AI_TIMEOUT_MS);

    let response: Response;

    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: buildHeaders(),
        body: serializedBody,
        signal: controller.signal,
      });
    } catch (error) {
      const details = serializeError(error);
      const timedOut = controller.signal.aborted;
      const durationMs = Date.now() - startedAt;

      logger.error({
        event: "openai_compatible.chat.transport_failed",
        requestId,
        workerInstanceId: context.workerInstanceId,
        draftId: context.draftId,
        runId: context.runId,
        provider: "openai-compatible",
        model: env.AI_MODEL,
        endpointHost,
        durationMs,
        timedOut,
        ...details,
      }, "OpenAI-compatible transport failed");

      throw new TextExtractionProviderError(
        timedOut
          ? "OPENAI_COMPATIBLE_TIMEOUT"
          : "OPENAI_COMPATIBLE_CONNECTION_FAILED",
        timedOut
          ? "The AI provider exceeded the configured timeout."
          : "The AI provider could not be reached.",
      );
    } finally {
      clearTimeout(timeout);
    }

    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      throw new TextExtractionProviderError(
        response.status === 500
          ? "OPENAI_COMPATIBLE_HTTP_500"
          : "OPENAI_COMPATIBLE_HTTP_ERROR",
        await readSafeProviderError(response),
        response.status,
      );
    }

    let payload: OpenAICompatibleResponse;

    try {
      payload =
        await response.json() as
          OpenAICompatibleResponse;
    } catch {
      throw new TextExtractionProviderError(
        "OPENAI_COMPATIBLE_INVALID_RESPONSE",
        "The AI provider returned a non-JSON HTTP response.",
        response.status,
      );
    }

    const content = extractAssistantText(payload);
    const finishReason =
      payload.choices?.[0]?.finish_reason ?? null;

    if (finishReason === "length") {
      throw new TextExtractionProviderError(
        "OPENAI_COMPATIBLE_TRUNCATED_RESPONSE",
        "The AI provider response was truncated.",
        response.status,
      );
    }

    if (!content) {
      throw new TextExtractionProviderError(
        "OPENAI_COMPATIBLE_EMPTY_CONTENT",
        "The AI provider did not return assistant content.",
        response.status,
      );
    }

    let rawJson: unknown;

    try {
      rawJson = JSON.parse(stripJsonFence(content));
    } catch {
      throw new TextExtractionProviderError(
        "OPENAI_COMPATIBLE_INVALID_JSON",
        "The AI provider returned content that is not valid JSON.",
        response.status,
      );
    }

    await request.onProgress?.({
      phase: "completed",
      chunkCount: 1,
      contentCharacters: content.length,
      thinkingCharacters: 0,
      elapsedMs: durationMs,
    });

    logger.info({
      event: "openai_compatible.chat.completed",
      requestId,
      workerInstanceId: context.workerInstanceId,
      draftId: context.draftId,
      runId: context.runId,
      provider: "openai-compatible",
      model: payload.model ?? env.AI_MODEL,
      endpointHost,
      httpStatus: response.status,
      finishReason,
      durationMs,
      responseCharacters: content.length,
      promptTokens: payload.usage?.prompt_tokens,
      completionTokens:
        payload.usage?.completion_tokens,
      totalTokens: payload.usage?.total_tokens,
      providerRequestId: payload.id,
    }, "OpenAI-compatible request completed");

    return {
      provider: "openai-compatible",
      model: payload.model ?? env.AI_MODEL,
      requestId,
      rawJson,
      durationMs,
      promptSha256,
      documentSha256,
      usage: {
        promptTokens: payload.usage?.prompt_tokens,
        completionTokens:
          payload.usage?.completion_tokens,
        totalTokens: payload.usage?.total_tokens,
      },
      metrics: {
        httpStatus: response.status,
        finishReason,
        streamChunks: 1,
        responseCharacters: content.length,
        thinkingCharacters: 0,
      },
    };
  }
}
