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
});
