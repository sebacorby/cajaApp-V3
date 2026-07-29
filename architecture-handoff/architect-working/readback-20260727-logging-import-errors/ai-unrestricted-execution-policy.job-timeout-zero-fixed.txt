import { aiJobTimeoutDisabled, env } from "../../config/env.js";

let installed = false;

/**
 * Compatibility policy for AI calls configured with a timeout value of 0.
 *
 * The current provider client and worker create their timeout timers internally.
 * Until those internals expose a native "disabled" branch, this hook suppresses
 * only those two known AI timeout callbacks. Every other application timer keeps
 * using the original Node.js setTimeout unchanged.
 */
export function installAiUnrestrictedExecutionPolicy(): void {
  if (installed) {
    return;
  }

  installed = true;
  const originalSetTimeout = globalThis.setTimeout;

  globalThis.setTimeout = ((
    handler: (...args: unknown[]) => void,
    timeout?: number,
    ...args: unknown[]
  ) => {
    if (typeof handler === "function") {
      const callbackSource = Function.prototype.toString.call(handler);

      const providerTimeoutDisabled =
        timeout === 0 &&
        callbackSource.includes("controller.abort") &&
        (env.OLLAMA_TIMEOUT_MS === 0 || env.AI_TIMEOUT_MS === 0);

      const jobTimeoutDisabled =
        aiJobTimeoutDisabled &&
        callbackSource.includes("AiJobTimeoutError");

      if (providerTimeoutDisabled || jobTimeoutDisabled) {
        // The callers only keep this handle to clear it later. Returning an
        // undefined-compatible handle means no timer is scheduled at all.
        return undefined as unknown as ReturnType<typeof globalThis.setTimeout>;
      }
    }

    return originalSetTimeout(
      handler as (...callbackArgs: unknown[]) => void,
      timeout,
      ...args,
    );
  }) as typeof globalThis.setTimeout;
}
