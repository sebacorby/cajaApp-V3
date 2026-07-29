export type VisionExtractionRequest = {
  prompt: string;
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png";
};

export type VisionExtractionResult = {
  provider: "ollama" | "minimax";
  rawJson: unknown;
  durationMs: number;
};

export interface VisionExtractionProvider {
  extract(
    request: VisionExtractionRequest,
  ): Promise<VisionExtractionResult>;
}
