import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { FileRequiredError, FileTooLargeError, ValidationError } from "../../shared/errors.js";
import { validateData } from "../../shared/validation.js";
import { backupParamsSchema, createBackupSchema } from "./backup-restore.schemas.js";
import { backupRestoreService } from "./backup-restore.service.js";

export const backupRestoreController: FastifyPluginAsync = async (
  app: FastifyInstance,
) => {
  app.get("/", async (_request, reply) => {
    return reply.send(await backupRestoreService.list());
  });

  app.post("/", async (request, reply) => {
    const input = validateData(createBackupSchema, request.body ?? {});
    return reply.status(201).send(await backupRestoreService.create(input.label));
  });

  app.get("/:id/download", async (request, reply) => {
    const params = validateData(backupParamsSchema, request.params);
    const download = await backupRestoreService.download(params.id);
    reply.header("Content-Type", "application/octet-stream");
    reply.header("Content-Disposition", `attachment; filename="${download.fileName}"`);
    return reply.send(download.buffer);
  });

  app.post("/:id/validate", async (request, reply) => {
    const params = validateData(backupParamsSchema, request.params);
    return reply.send(await backupRestoreService.validateStored(params.id));
  });

  app.post("/restore", async (request, reply) => {
    const part = await request.file({ limits: { fileSize: 256 * 1024 * 1024 } });
    if (!part) throw new FileRequiredError();
    if (!part.filename.toLowerCase().endsWith(".cajaapp-backup")) {
      throw new ValidationError("El archivo debe usar la extensión .cajaapp-backup.");
    }
    const maxRestoreBytes = 256 * 1024 * 1024;
    let buffer: Buffer;
    try {
      buffer = await part.toBuffer();
    } catch (error) {
      if (part.file.truncated) throw new FileTooLargeError(maxRestoreBytes);
      throw error;
    }
    if (part.file.truncated) throw new FileTooLargeError(maxRestoreBytes);
    return reply.send(await backupRestoreService.restore(part.filename, buffer));
  });
};
