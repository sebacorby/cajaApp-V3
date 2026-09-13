import { describe, expect, it } from "vitest";
import { AgentEventsService } from "../../src/modules/agent-chat/agent-events.service.js";

describe("AgentEventsService", () => {
  it("asigna secuencia monótona y replay desde Last-Event-ID", () => {
    const service = new AgentEventsService({ heartbeatMs: 50 });
    const first = service.publish("run-1", "run.started", { status: "running" });
    const second = service.publish("run-1", "assistant.delta", { text: "hola" });

    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
    expect(service.replay("run-1", 0).map((event) => event.sequence)).toEqual([1, 2]);
    expect(service.replay("run-1", 1).map((event) => event.sequence)).toEqual([2]);
  });

  it("stream entrega primero replay pendiente y luego eventos vivos", async () => {
    const service = new AgentEventsService({ heartbeatMs: 100 });
    service.publish("run-2", "run.started", { status: "running" });
    service.publish("run-2", "assistant.delta", { text: "a" });
    const iterator = service.stream("run-2", { afterSequence: 1 })[Symbol.asyncIterator]();

    const replayed = await iterator.next();
    expect(replayed.value?.sequence).toBe(2);

    service.publish("run-2", "assistant.delta", { text: "b" });
    const live = await iterator.next();
    expect(live.value?.sequence).toBe(3);
    await iterator.return?.();
  });

  it("emite heartbeat cuando no hay actividad y mantiene secuencia", async () => {
    const service = new AgentEventsService({ heartbeatMs: 5 });
    const iterator = service.stream("run-3")[Symbol.asyncIterator]();
    const heartbeat = await iterator.next();
    expect(heartbeat.value?.type).toBe("heartbeat");
    expect(heartbeat.value?.sequence).toBe(1);
    expect(service.replay("run-3", 0)[0]?.type).toBe("heartbeat");
    await iterator.return?.();
  });
});
