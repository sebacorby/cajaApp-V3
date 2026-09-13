import { describe, expect, it } from "vitest";
import {
  AGENT_READ_TOOL_NAMES,
  agentToolRegistry,
} from "../../src/modules/agent-chat/agent-tool-registry.js";

const artifactTools = new Set([
  "movements.export_csv",
  "reports.export_csv",
  "backup.download",
]);

describe("AgentToolRegistry", () => {
  it("expone exactamente el catálogo cerrado de US2", () => {
    const names = agentToolRegistry.listPublic().map((tool) => tool.name);
    expect(names).toEqual([...AGENT_READ_TOOL_NAMES]);
    expect(new Set(names).size).toBe(names.length);
    expect(names).not.toContain("ai-advisor.ask");
  });

  it("congela risk class e intent policy en código", () => {
    for (const tool of agentToolRegistry.listPublic()) {
      const artifact = artifactTools.has(tool.name);
      expect(tool.riskClass).toBe(artifact ? "R1" : "R0");
      expect(tool.requiresExplicitIntent).toBe(artifact);
      expect(tool.parallelSafe).toBe(!artifact);
    }
  });

  it("rechaza tools inexistentes sin reflexión dinámica", () => {
    expect(agentToolRegistry.lookup("totally.dynamic.method")).toBeUndefined();
    expect(() => agentToolRegistry.require("totally.dynamic.method")).toThrowError(/Unknown agent tool/);
  });

  it("genera definiciones de provider sólo desde entradas registradas", () => {
    const providerTools = agentToolRegistry.listProviderTools();
    expect(providerTools).toHaveLength(AGENT_READ_TOOL_NAMES.length);
    expect(providerTools[0]).toEqual(expect.objectContaining({
      name: AGENT_READ_TOOL_NAMES[0],
      description: expect.any(String),
      inputSchema: expect.objectContaining({ type: "object" }),
    }));
  });
});
