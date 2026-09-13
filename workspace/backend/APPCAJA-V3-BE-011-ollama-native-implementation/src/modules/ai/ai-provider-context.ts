import { AsyncLocalStorage } from "node:async_hooks";

import type {
  TextExtractionProgress,
} from "./text-extraction-provider.js";

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
};

export const aiRequestContext =
  new AsyncLocalStorage<AiRequestContext>();
