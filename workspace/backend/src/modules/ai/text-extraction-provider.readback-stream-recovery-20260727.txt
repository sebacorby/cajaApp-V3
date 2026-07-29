export type TextExtractionProviderName =
  | "ollama"
  | "openai-compatible";

export type TextExtractionProgress = {
  phase: "connecting" | "streaming" | "completed";
  chunkCount: number;
  contentCharacters: number;
  thinkingCharacters: number;
  elapsedMs: number;
};

export type TextExtractionRequest = {
  systemPrompt: string;
  rawDocument: string;
  onProgress?: (
    progress: TextExtractionProgress,
  ) => Promise<void> | void;
};

export type TextExtractionUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type TextExtractionMetrics = {
  httpStatus?: number;
  finishReason?: string | null;
  streamChunks?: number;
  responseCharacters?: number;
  thinkingCharacters?: number;
  firstChunkLatencyMs?: number;
  streamDurationMs?: number;
  totalDurationNs?: number;
  loadDurationNs?: number;
  promptEvalCount?: number;
  promptEvalDurationNs?: number;
  evalCount?: number;
  evalDurationNs?: number;
};

export type TextExtractionResult = {
  provider: TextExtractionProviderName;
  model: string;
  requestId: string;
  rawJson: unknown;
  durationMs: number;
  promptSha256: string;
  documentSha256: string;
  usage?: TextExtractionUsage;
  metrics?: TextExtractionMetrics;
};

export class TextExtractionProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "TextExtractionProviderError";
  }
}

export interface TextExtractionProvider {
  preflight?(): Promise<void>;

  extractJson(
    request: TextExtractionRequest,
  ): Promise<TextExtractionResult>;
}
