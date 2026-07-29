import { z } from "zod";

export const backupParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createBackupSchema = z.object({
  label: z.string().trim().max(80).optional(),
});

export type CreateBackupInput = z.infer<typeof createBackupSchema>;
