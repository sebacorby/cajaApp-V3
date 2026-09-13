import { afterEach, describe, expect, it, vi } from "vitest";
import { agentToolRegistry } from "../../src/modules/agent-chat/agent-tool-registry.js";
import { agentChatService } from "../../src/modules/agent-chat/agent-chat.service.js";
import { importsService } from "../../src/modules/imports/imports.service.js";
import { debitImportsService } from "../../src/modules/debit-imports/debit-imports.service.js";
import { salaryReceiptsService } from "../../src/modules/salary-receipts/salary-receipts.service.js";

const ATTACHMENT_ID = "11111111-1111-4111-8111-111111111111";
const CONVERSATION_ID = "22222222-2222-4222-8222-222222222222";

const attachmentTools = [
  "card_import.upload_attachment",
  "debit_import.preview_attachment",
  "salary_receipt.import_attachment",
] as const;

const phaseFTools = [
  ...attachmentTools,
  "card_import.update_draft",
  "debit_import.update_row",
  "salary_receipt.update_draft",
  "backup.validate",
  "reconciliation.scan",
  "financial_health.create_snapshot",
] as const;

describe("Agent import tools — draft first", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registra exactamente las tools Phase F autorizadas sin paths arbitrarios", () => {
    for (const name of phaseFTools) {
      const tool = agentToolRegistry.lookup(name);
      expect(tool, name).toBeDefined();
      expect(tool?.riskClass, name).toBe("R2");
      expect(tool?.requiresExplicitIntent, name).toBe(true);
    }
  });

  it("las tools basadas en archivo aceptan sólo attachmentId y nunca un path", () => {
    for (const name of attachmentTools) {
      const schema = agentToolRegistry.require(name).inputSchema;
      expect(schema.safeParse({ attachmentId: ATTACHMENT_ID }).success, name).toBe(true);
      expect(schema.safeParse({ path: "C:\\Users\\Public\\documento.pdf" }).success, name).toBe(false);
      expect(schema.safeParse({ attachmentId: "../documento.pdf" }).success, name).toBe(false);
      expect(schema.safeParse({ attachmentId: ATTACHMENT_ID, path: "C:\\escape.pdf" }).success, name).toBe(false);
    }
  });

  it("mantiene aceptación definitiva como R3 separada del prepare/import", () => {
    expect(agentToolRegistry.require("card_import.accept_draft").riskClass).toBe("R3");
    expect(agentToolRegistry.require("debit_import.accept").riskClass).toBe("R3");
    expect(agentToolRegistry.require("salary_receipt.accept_draft").riskClass).toBe("R3");
    expect(agentToolRegistry.require("card_import.upload_attachment").riskClass).toBe("R2");
    expect(agentToolRegistry.require("debit_import.preview_attachment").riskClass).toBe("R2");
    expect(agentToolRegistry.require("salary_receipt.import_attachment").riskClass).toBe("R2");
  });

  it("requiere conversationId runtime antes de resolver cualquier attachment", async () => {
    const resolve = vi.spyOn(agentChatService, "resolveAttachment");
    for (const name of attachmentTools) {
      await expect(agentToolRegistry.require(name).handler({ attachmentId: ATTACHMENT_ID }, {}))
        .rejects.toMatchObject({ code: "AGENT_TOOL_CONTEXT_REQUIRED" });
    }
    expect(resolve).not.toHaveBeenCalled();
  });

  it("si el dominio falla conserva el attachment staged para retry", async () => {
    vi.spyOn(agentChatService, "resolveAttachment").mockResolvedValue({
      id: ATTACHMENT_ID, fileName: "movimientos.csv", mimeType: "text/csv",
      sizeBytes: 10, sha256: "abc", buffer: Buffer.from("x"),
    });
    const consume = vi.spyOn(agentChatService, "consumeAttachment").mockResolvedValue(undefined);
    vi.spyOn(debitImportsService, "createPreview").mockRejectedValue(new Error("parser rejected csv"));

    await expect(agentToolRegistry.require("debit_import.preview_attachment").handler(
      { attachmentId: ATTACHMENT_ID }, { conversationId: CONVERSATION_ID },
    )).rejects.toThrow("parser rejected csv");
    expect(consume).not.toHaveBeenCalled();
  });

  it("consume staging sólo después de que el dominio devuelve estado recuperable", async () => {
    const resolve = vi.spyOn(agentChatService, "resolveAttachment").mockResolvedValue({
      id: ATTACHMENT_ID, fileName: "resumen.pdf", mimeType: "application/pdf",
      sizeBytes: 10, sha256: "abc", buffer: Buffer.from("%PDF-test"),
    });
    const consume = vi.spyOn(agentChatService, "consumeAttachment").mockResolvedValue(undefined);
    const card = vi.spyOn(importsService, "startImport").mockResolvedValue({ draftId: "card-draft" } as never);
    const salary = vi.spyOn(salaryReceiptsService, "importPdf").mockResolvedValue({ draftId: "salary-draft" } as never);

    await agentToolRegistry.require("card_import.upload_attachment").handler(
      { attachmentId: ATTACHMENT_ID }, { conversationId: CONVERSATION_ID },
    );
    await agentToolRegistry.require("salary_receipt.import_attachment").handler(
      { attachmentId: ATTACHMENT_ID }, { conversationId: CONVERSATION_ID },
    );

    expect(resolve).toHaveBeenCalledTimes(2);
    expect(card).toHaveBeenCalledTimes(1);
    expect(salary).toHaveBeenCalledTimes(1);
    expect(consume).toHaveBeenCalledTimes(2);
    expect(consume).toHaveBeenNthCalledWith(1, CONVERSATION_ID, ATTACHMENT_ID);
    expect(consume).toHaveBeenNthCalledWith(2, CONVERSATION_ID, ATTACHMENT_ID);
  });
});