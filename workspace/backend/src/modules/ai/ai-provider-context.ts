import { AsyncLocalStorage } from "node:async_hooks";

import type {
  TextExtractionProgress,
} from "./text-extraction-provider.js";

export type AiProcessingStage =
  | "loading_document"
  | "extracting_raw_text"
  | "sending_raw_text_to_ai"
  | "receiving_ai_stream"
  | "validating_ai_response"
  | "persisting_preview";

export type AiRequestContext = {
  workerInstanceId?: string;
  draftId?: string;
  runId?: string;
  onRawExtractionCompleted?: (input: {
    pageCount: number;
    characterCount: number;
    durationMs: number;
  }) => Promise<void> | void;
  onProviderProgress?: (
    progress: TextExtractionProgress,
  ) => Promise<void> | void;
  onStageChanged?: (input: {
    stage: AiProcessingStage;
    message: string;
  }) => Promise<void> | void;
};

export const aiRequestContext =
  new AsyncLocalStorage<AiRequestContext>();
