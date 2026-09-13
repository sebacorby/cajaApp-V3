import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { importsService } from "./imports.service.js";
import { logger } from "../../shared/logger.js";

export const importsController: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post("/import", async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ code: "FILE_REQUIRED", message: "No file provided" });
    }

    const fileBuffer = await data.toBuffer();
    const fileUint8Array = new Uint8Array(fileBuffer);

    const fileData = {
      filename: data.filename,
      mimetype: data.mimetype,
      file: fileUint8Array,
    };

    logger.info(
      { filename: fileData.filename, size: fileData.file.length },
      "import.request.received"
    );

    const { draftId, pageCount } = await importsService.startImport(fileData);

    logger.info({ draftId, pageCount }, "import.request.started");

    return reply.send({ draftId, pageCount });
  });

  app.get("/import/:draftId/status", async (request, reply) => {
    const { draftId } = request.params as { draftId: string };
    const { startTime } = request.query as { startTime?: string };
    const start = startTime ? parseInt(startTime, 10) : Date.now();

    const status = await importsService.getImportStatus(draftId, start);

    logger.info({ draftId, status: status.status, stage: status.progress?.stage }, "import.status.polled");

    return reply.send(status);
  });
};
