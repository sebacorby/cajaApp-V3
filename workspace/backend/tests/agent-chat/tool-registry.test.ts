import { describe, expect, it } from "vitest";
import {
  AGENT_READ_TOOL_NAMES,
  AGENT_R2_TOOL_NAMES,
  AGENT_TOOL_NAMES,
  agentToolRegistry,
} from "../../src/modules/agent-chat/agent-tool-registry.js";

const artifactTools = new Set([
  "movements.export_csv",
  "reports.export_csv",
  "backup.download",
]);

describe("AgentToolRegistry", () => {
  it("expone exactamente el catálogo cerrado vigente", () => {
    const names = agentToolRegistry.listPublic().map((tool) => tool.name);
    expect(names).toEqual([...AGENT_TOOL_NAMES]);
    expect(names).toEqual([...AGENT_READ_TOOL_NAMES, ...AGENT_R2_TOOL_NAMES]);
    expect(new Set(names).size).toBe(names.length);
    expect(names).not.toContain("ai-advisor.ask");
  });

  it("congela risk class e intent policy en código", () => {
    const r2Tools = new Set(AGENT_R2_TOOL_NAMES);
    for (const tool of agentToolRegistry.listPublic()) {
      const artifact = artifactTools.has(tool.name);
      const r2 = r2Tools.has(tool.name as (typeof AGENT_R2_TOOL_NAMES)[number]);
      expect(tool.riskClass).toBe(r2 ? "R2" : artifact ? "R1" : "R0");
      expect(tool.requiresExplicitIntent).toBe(artifact || r2);
      expect(tool.parallelSafe).toBe(!artifact && !r2);
    }
  });

  it("rechaza tools inexistentes sin reflexión dinámica", () => {
    expect(agentToolRegistry.lookup("totally.dynamic.method")).toBeUndefined();
    expect(() => agentToolRegistry.require("totally.dynamic.method")).toThrowError(/Unknown agent tool/);
  });

  it("genera definiciones de provider sólo desde entradas registradas", () => {
    const providerTools = agentToolRegistry.listProviderTools();
    expect(providerTools).toHaveLength(AGENT_TOOL_NAMES.length);
    expect(providerTools[0]).toEqual(expect.objectContaining({
      name: AGENT_READ_TOOL_NAMES[0],
      description: expect.any(String),
      inputSchema: expect.objectContaining({ type: "object" }),
    }));
  });
});
