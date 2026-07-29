type ClientErrorPayload = {
  event: string;
  message: string;
  stack?: string;
  url?: string;
  source?: string;
  timestamp: string;
};

function toErrorDetails(value: unknown): { message: string; stack?: string } {
  if (value instanceof Error) {
    return {
      message: value.message || value.name || "Unknown browser error",
      stack: value.stack,
    };
  }

  if (typeof value === "string") {
    return { message: value };
  }

  try {
    return { message: JSON.stringify(value) };
  } catch {
    return { message: String(value) };
  }
}

function reportClientError(payload: ClientErrorPayload): void {
  void fetch("/api/client-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Never let diagnostics interfere with the application.
  });
}

window.addEventListener("error", (event) => {
  const details = toErrorDetails(event.error ?? event.message);
  reportClientError({
    event: "frontend.window.error",
    message: details.message,
    stack: details.stack,
    url: window.location.href,
    source: event.filename || undefined,
    timestamp: new Date().toISOString(),
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const details = toErrorDetails(event.reason);
  reportClientError({
    event: "frontend.unhandledrejection",
    message: details.message,
    stack: details.stack,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  });
});
