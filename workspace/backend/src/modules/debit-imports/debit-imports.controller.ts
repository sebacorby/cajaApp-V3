import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
  FileRequiredError,
  FileTooLargeError,
} from "../../shared/errors.js";
import { validateData } from "../../shared/validation.js";
import {
  acceptDebitImportSchema,
  debitImportEntityIdSchema,
  debitImportRowUpdateSchema,
  listDebitImportsQuerySchema,
  type AcceptDebitImportInput,
  type DebitImportRowUpdateInput,
  type ListDebitImportsQueryInput,
} from "./debit-imports.schemas.js";
import { debitImportsService } from "./debit-imports.service.js";

export const debitImportsController: FastifyPluginAsync = async (
  app: FastifyInstance,
) => {
  app.post("/preview", async (request, reply) => {
    const file = await request.file();
    if (!file) throw new FileRequiredError();

    let buffer: Buffer;
    try {
      buffer = await file.toBuffer();
    } catch (error) {
      if (
        error instanceof Error &&
        /file too large|request file too large/i.test(error.message)
      ) {
        throw new FileTooLargeError(10 * 1024 * 1024);
      }
      throw error;
    }

    return reply.status(201).send(
      await debitImportsService.createPreview({
        fileName: file.filename,
        mimeType: file.mimetype,
        buffer,
      }),
    );
  });

  app.get("/", async (request, reply) => {
    const query = validateData(
      listDebitImportsQuerySchema,
      request.query,
    ) as ListDebitImportsQueryInput;
    return reply.send(await debitImportsService.listImports(query));
  });

  app.get("/:importId", async (request, reply) => {
    const params = request.params as { importId: string };
    const importId = validateData(debitImportEntityIdSchema, params.importId);
    return reply.send(await debitImportsService.getImport(importId));
  });

  app.put("/:importId/rows/:rowId", async (request, reply) => {
    const params = request.params as { importId: string; rowId: string };
    const importId = validateData(debitImportEntityIdSchema, params.importId);
    const rowId = validateData(debitImportEntityIdSchema, params.rowId);
    const input = validateData(
      debitImportRowUpdateSchema,
      request.body,
    ) as DebitImportRowUpdateInput;
    return reply.send(await debitImportsService.updateRow(importId, rowId, input));
  });

  app.post("/:importId/accept", async (request, reply) => {
    const params = request.params as { importId: string };
    const importId = validateData(debitImportEntityIdSchema, params.importId);
    const input = validateData(
      acceptDebitImportSchema,
      request.body ?? {},
    ) as AcceptDebitImportInput;
    return reply.send(await debitImportsService.acceptImport(importId, input));
  });

  app.delete("/:importId", async (request, reply) => {
    const params = request.params as { importId: string };
    const importId = validateData(debitImportEntityIdSchema, params.importId);
    return reply.send(await debitImportsService.deleteDraft(importId));
  });

  app.post("/:importId/reverse", async (request, reply) => {
    const params = request.params as { importId: string };
    const importId = validateData(debitImportEntityIdSchema, params.importId);
    return reply.send(await debitImportsService.reverseImport(importId));
  });
};
