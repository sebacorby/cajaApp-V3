import { env } from "../../config/env.js";
import type { AgentEvent, AgentEventType } from "./agent-types.js";
import type { AgentJsonValue } from "../ai/agent/agent-chat-provider.js";

interface RunEventState {
  sequence: number;
  events: AgentEvent[];
  listeners: Set<(event: AgentEvent) => void>;
}

export interface AgentEventsServiceOptions {
  heartbeatMs?: number;
  maxBufferedEvents?: number;
}

export interface AgentEventStreamOptions {
  afterSequence?: number;
  signal?: AbortSignal;
}

export class AgentEventsService {
  private readonly runs = new Map<string, RunEventState>();
  private readonly heartbeatMs: number;
  private readonly maxBufferedEvents: number;

  constructor(options: AgentEventsServiceOptions = {}) {
    this.heartbeatMs = options.heartbeatMs ?? env.AGENT_STREAM_HEARTBEAT_MS;
    this.maxBufferedEvents = options.maxBufferedEvents ?? 2_000;
  }

  private state(runId: string): RunEventState {
    let state = this.runs.get(runId);
    if (!state) {
      state = { sequence: 0, events: [], listeners: new Set() };
      this.runs.set(runId, state);
    }
    return state;
  }
  publish(runId: string, type: AgentEventType, payload: AgentJsonValue): AgentEvent {
    const state = this.state(runId);
    const event: AgentEvent = {
      runId,
      sequence: state.sequence + 1,
      timestamp: new Date().toISOString(),
      type,
      payload,
    };
    state.sequence = event.sequence;
    state.events.push(event);
    if (state.events.length > this.maxBufferedEvents) {
      state.events.splice(0, state.events.length - this.maxBufferedEvents);
    }
    for (const listener of state.listeners) listener(event);
    return event;
  }

  replay(runId: string, afterSequence = 0): AgentEvent[] {
    return this.state(runId).events.filter((event) => event.sequence > afterSequence);
  }

  lastSequence(runId: string): number {
    return this.state(runId).sequence;
  }

  clear(runId: string): void {
    this.runs.delete(runId);
  }

  async *stream(
    runId: string,
    options: AgentEventStreamOptions = {},
  ): AsyncIterable<AgentEvent> {
    const state = this.state(runId);
    let cursor = options.afterSequence ?? 0;
    const queue = this.replay(runId, cursor);
    let wake: (() => void) | undefined;
    const listener = (event: AgentEvent) => {
      if (event.sequence <= cursor) return;
      queue.push(event);
      wake?.();
      wake = undefined;
    };
    state.listeners.add(listener);

    try {
      while (!options.signal?.aborted) {
        if (queue.length > 0) {
          const event = queue.shift()!;
          cursor = event.sequence;
          yield event;
          continue;
        }

        let timedOut = false;
        await new Promise<void>((resolve) => {
          wake = resolve;
          const timer = setTimeout(() => {
            timedOut = true;
            wake = undefined;
            resolve();
          }, this.heartbeatMs);
          const abort = () => {
            clearTimeout(timer);
            wake = undefined;
            resolve();
          };
          options.signal?.addEventListener("abort", abort, { once: true });
          const originalResolve = resolve;
          wake = () => {
            clearTimeout(timer);
            options.signal?.removeEventListener("abort", abort);
            originalResolve();
          };
        });

        if (options.signal?.aborted) break;
        if (timedOut && queue.length === 0) this.publish(runId, "heartbeat", {});
      }
    } finally {
      state.listeners.delete(listener);
    }
  }
}

export const agentEventsService = new AgentEventsService();
