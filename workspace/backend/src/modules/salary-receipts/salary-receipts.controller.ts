import "@fastify/multipart";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { validateData } from "../../shared/validation.js";
import {
  acceptSalaryReceiptSchema,
  listSalaryReceiptsQuerySchema,
  salaryReceiptDraftIdSchema,
  salaryReceiptIdSchema,
  salaryReceiptPreviewSchema,
} from "./salary-receipts.schemas.js";
import { salaryReceiptsService } from "./salary-receipts.service.js";
import type { AcceptSalaryReceiptInput, SalaryReceiptPreview } from "./salary-receipts.types.js";

export const salaryReceiptsController: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post("/import", async (request, reply) => {
    const upload = await request.file();
    if (!upload) return reply.status(400).send({ code: "FILE_REQUIRED", message: "No file provided" });
    const result = await salaryReceiptsService.importPdf({
      filename: upload.filename,
      mimetype: upload.mimetype,
      file: new Uint8Array(await upload.toBuffer()),
    });
    return reply.status(201).send(result);
  });

  app.get("/drafts/:draftId", async (request, reply) => {
    const draftId = validateData(
      salaryReceiptDraftIdSchema,
      (request.params as { draftId: string }).draftId,
    );
    return reply.send(await salaryReceiptsService.getDraft(draftId));
  });

  app.put("/drafts/:draftId", async (request, reply) => {
    const draftId = validateData(
      salaryReceiptDraftIdSchema,
      (request.params as { draftId: string }).draftId,
    );
    const preview = validateData(salaryReceiptPreviewSchema, request.body) as SalaryReceiptPreview;
    return reply.send(await salaryReceiptsService.updateDraft(draftId, preview));
  });

  app.post("/drafts/:draftId/accept", async (request, reply) => {
    const draftId = validateData(
      salaryReceiptDraftIdSchema,
      (request.params as { draftId: string }).draftId,
    );
    const payload = validateData(acceptSalaryReceiptSchema, request.body);
    const input: AcceptSalaryReceiptInput = {
      sourceId: payload.sourceId ?? null,
      useAsFutureBase: payload.useAsFutureBase ?? true,
    };
    return reply.status(201).send(await salaryReceiptsService.acceptDraft(draftId, input));
  });

  app.get("/", async (request, reply) => {
    const queryInput = validateData(listSalaryReceiptsQuerySchema, request.query);
    const query = {
      limit: queryInput.limit === undefined ? 20 : Number(queryInput.limit),
      includeReversed: queryInput.includeReversed === "true",
    };
    return reply.send(await salaryReceiptsService.list(query));
  });

  app.get("/:receiptId", async (request, reply) => {
    const receiptId = validateData(
      salaryReceiptIdSchema,
      (request.params as { receiptId: string }).receiptId,
    );
    return reply.send(await salaryReceiptsService.get(receiptId));
  });

  app.post("/:receiptId/reverse", async (request, reply) => {
    const receiptId = validateData(
      salaryReceiptIdSchema,
      (request.params as { receiptId: string }).receiptId,
    );
    return reply.send(await salaryReceiptsService.reverse(receiptId));
  });
};
