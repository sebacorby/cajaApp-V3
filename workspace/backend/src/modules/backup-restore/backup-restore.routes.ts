import type { FastifyInstance } from "fastify";
import { backupRestoreController } from "./backup-restore.controller.js";

export async function backupRestoreRoutes(app: FastifyInstance): Promise<void> {
  await app.register(backupRestoreController, { prefix: "/api/backup-restore" });
}
