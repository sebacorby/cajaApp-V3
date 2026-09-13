import { createHash, randomUUID } from "node:crypto";

import { env } from "../../config/env.js";
import { logger } from "../../shared/logger.js";
import type { VisionExtractionProvider, VisionExtractionResult } from "./vision-provider.types.js";

type MiniMaxVlmResponse = {
  content?: unknown;
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
};

function extractJsonText(content: string): string {
  const trimmed = content.trim();

  if (
    trimmed.startsWith("```json") &&
    trimmed.endsWith("```")
  ) {
    return trimmed
      .slice("```json".length, -3)
      .trim();
  }

  if (
    trimmed.startsWith("```") &&
    trimmed.endsWith("```")
  ) {
    return trimmed
      .slice(3, -3)
      .trim();
  }

  return trimmed;
}

export class MiniMaxClient implements VisionExtractionProvider {
  async extract(input: {
    prompt: string;
    imageBase64: string;
    mimeType: "image/jpeg" | "image/png";
  }): Promise<VisionExtractionResult> {
    const requestId = randomUUID();
    const startedAt = Date.now();

    const endpoint =
      `${env.MINIMAX_BASE_URL.replace(/\/$/, "")}` +
      "/v1/coding_plan/vlm";

    const imageUrl =
      `data:${input.mimeType};base64,` +
      input.imageBase64;

    const requestBody = {
      prompt: input.prompt,
      image_url: imageUrl,
    };

    const requestBodyBytes = Buffer.byteLength(
      JSON.stringify(requestBody),
      "utf8",
    );

    const imageSha256 = createHash("sha256")
      .update(
        Buffer.from(input.imageBase64, "base64"),
      )
      .digest("hex");

    logger.info({
      event: "minimax.request.started",
      requestId,
      provider: "minimax",
      requestBodyBytes,
      promptBytes: Buffer.byteLength(
        input.prompt,
        "utf8",
      ),
      imageBytes: Buffer.byteLength(
        Buffer.from(input.imageBase64, "base64"),
      ),
      imageSha256,
    });

    let response: Response;

    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${env.MINIMAX_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(
          env.MINIMAX_TIMEOUT_MS,
        ),
      });
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      logger.error({
        event: "minimax.request.transport_failed",
        requestId,
        durationMs,
        errorName:
          error instanceof Error
            ? error.name
            : "UnknownError",
      });

      throw new Error(
        error instanceof DOMException &&
        error.name === "TimeoutError"
          ? "MiniMax extraction timed out."
          : "MiniMax request failed.",
      );
    }

    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      const safeResponseText =
        await response.text();

      logger.error({
        event: "minimax.request.http_failed",
        requestId,
        status: response.status,
        durationMs,
        responseBytes: Buffer.byteLength(
          safeResponseText,
          "utf8",
        ),
      });

      throw new Error(
        `MiniMax returned HTTP ${response.status}.`,
      );
    }

    const payload =
      (await response.json()) as MiniMaxVlmResponse;

    if (
      payload.base_resp?.status_code &&
      payload.base_resp.status_code !== 0
    ) {
      logger.error({
        event: "minimax.request.provider_failed",
        requestId,
        providerStatus:
          payload.base_resp.status_code,
        durationMs,
      });

      throw new Error(
        "MiniMax rejected the extraction request.",
      );
    }

    if (typeof payload.content !== "string") {
      throw new Error(
        "MiniMax response does not contain textual content.",
      );
    }

    let rawJson: unknown;

    try {
      rawJson = JSON.parse(
        extractJsonText(payload.content),
      );
    } catch {
      logger.error({
        event: "minimax.response.invalid_json",
        requestId,
        durationMs,
        contentBytes: Buffer.byteLength(
          payload.content,
          "utf8",
        ),
      });

      throw new Error(
        "MiniMax returned invalid JSON.",
      );
    }

    logger.info({
      event: "minimax.request.completed",
      requestId,
      durationMs,
      responseBytes: Buffer.byteLength(
        payload.content,
        "utf8",
      ),
    });

    return {
      provider: "minimax",
      rawJson,
      durationMs,
    };
  }
}
