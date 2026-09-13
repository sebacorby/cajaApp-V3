import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  AgentToolRegistry,
  projectAgentResult,
  type AgentToolRegistryEntry,
} from "../../src/modules/agent-chat/agent-tool-registry.js";
import { AgentToolExecutor } from "../../src/modules/agent-chat/agent-tool-executor.js";

function readTool(overrides: Partial<AgentToolRegistryEntry> = {}): AgentToolRegistryEntry {
  return {
    name: "test.read",
    description: "read test data",
    inputSchema: z.object({ value: z.string() }),
    riskClass: "R0",
    parallelSafe: true,
    requiresExplicitIntent: false,
    handler: async (args) => ({ value: (args as { value: string }).value }),
    resultProjector: projectAgentResult,
    auditEntityRefs: () => [],
    ...overrides,
  };
}

function writeTool(overrides: Partial<AgentToolRegistryEntry> = {}): AgentToolRegistryEntry {
  return readTool({
    name: "test.write",
    riskClass: "R2",
    parallelSafe: false,
    requiresExplicitIntent: true,
    ...overrides,
  });
}

describe("AgentToolExecutor", () => {
  it("valida argumentos antes de invocar handler", async () => {
    const handler = vi.fn(async () => ({ ok: true }));
    const executor = new AgentToolExecutor(new AgentToolRegistry([
      readTool({ handler }),
    ]));
    await expect(executor.execute({ name: "test.read", arguments: { value: 7 } as never }))
      .rejects.toMatchObject({ code: "INVALID_TOOL_ARGUMENTS" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("sanitiza secretos y paths internos antes de volver al modelo", async () => {
    const executor = new AgentToolExecutor(new AgentToolRegistry([
      readTool({
        handler: async () => ({
          ok: true,
          storagePath: "I:/secret/private.pdf",
          apiKey: "secret-token",
          nested: { password: "hidden", visible: "yes" },
        }),
      }),
    ]));
    const executed = await executor.execute({ name: "test.read", arguments: { value: "x" } });
    expect(executed.result).toEqual({ ok: true, nested: { visible: "yes" } });
    expect(JSON.stringify(executed.result)).not.toContain("secret");
  });

  it("ejecuta en paralelo sólo reads parallelSafe", async () => {
    let active = 0;
    let maxActive = 0;
    const handler = async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 15));
      active -= 1;
      return { ok: true };
    };
    const registry = new AgentToolRegistry([
      readTool({ name: "test.a", handler }),
      readTool({ name: "test.b", handler }),
    ]);
    const executor = new AgentToolExecutor(registry);
    await executor.executeMany([
      { name: "test.a", arguments: { value: "a" } },
      { name: "test.b", arguments: { value: "b" } },
    ]);
    expect(maxActive).toBe(2);
  });

  it("serializa un lote si alguna tool no es parallelSafe", async () => {
    let active = 0;
    let maxActive = 0;
    const handler = async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return { ok: true };
    };
    const registry = new AgentToolRegistry([
      readTool({ name: "test.a", handler }),
      readTool({ name: "test.artifact", riskClass: "R1", parallelSafe: false, requiresExplicitIntent: true, handler }),
    ]);
    const executor = new AgentToolExecutor(registry);
    await executor.executeMany([
      { name: "test.a", arguments: { value: "a" } },
      { name: "test.artifact", arguments: { value: "b" }, explicitIntent: true },
    ]);
    expect(maxActive).toBe(1);
  });

  it("bloquea una R2 inferida o ambigua antes de mutar", async () => {
    const handler = vi.fn(async () => ({ id: "created" }));
    const executor = new AgentToolExecutor(new AgentToolRegistry([writeTool({ handler })]));
    await expect(executor.execute({
      name: "test.write",
      arguments: { value: "x" },
      explicitIntent: false,
      toolCallId: "tool-call-1",
      idempotencyKey: "run-1:provider-call-1",
    })).rejects.toMatchObject({ code: "EXPLICIT_INTENT_REQUIRED" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("persiste el resultado de una R2 explícita antes de devolverlo", async () => {
    const handler = vi.fn(async () => ({ id: "created-1", ok: true }));
    const markSucceeded = vi.fn(async () => undefined);
    const store = { findSucceeded: vi.fn(async () => null), markSucceeded };
    const executor = new AgentToolExecutor(new AgentToolRegistry([writeTool({ handler })]), store as never);
    const executed = await executor.execute({
      name: "test.write", arguments: { value: "x" }, explicitIntent: true,
      toolCallId: "tool-call-1", idempotencyKey: "run-1:provider-call-1",
    });
    expect(executed.result).toEqual({ id: "created-1", ok: true });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(markSucceeded).toHaveBeenCalledWith("tool-call-1", "run-1:provider-call-1", JSON.stringify(executed.result));
  });

  it("reutiliza una R2 succeeded por idempotencyKey sin ejecutar dos veces", async () => {
    const handler = vi.fn(async () => ({ id: "duplicate" }));
    const store = {
      findSucceeded: vi.fn(async () => ({ resultJson: JSON.stringify({ id: "created-1", ok: true }) })),
      markSucceeded: vi.fn(async () => undefined),
    };
    const executor = new AgentToolExecutor(new AgentToolRegistry([writeTool({ handler })]), store as never);
    const executed = await executor.execute({
      name: "test.write", arguments: { value: "x" }, explicitIntent: true,
      toolCallId: "tool-call-1", idempotencyKey: "run-1:provider-call-1",
    });
    expect(executed.result).toEqual({ id: "created-1", ok: true });
    expect(handler).not.toHaveBeenCalled();
    expect(store.markSucceeded).not.toHaveBeenCalled();
  });
});
