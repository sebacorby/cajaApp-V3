import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { env } from "./config/env.js";
import { logger } from "./shared/logger.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { cardsRoutes } from "./modules/cards/cards.routes.js";
import { importsRoutes } from "./modules/imports/imports.routes.js";
import { importCenterRoutes } from "./modules/import-center/import-center.routes.js";
import { reconciliationRoutes } from "./modules/reconciliation/reconciliation.routes.js";
import { manualPurchasesRoutes } from "./modules/manual-purchases/manual-purchases.routes.js";
import { incomesRoutes } from "./modules/incomes/incomes.routes.js";
import { movementsRoutes } from "./modules/movements/movements.routes.js";
import { debitImportsRoutes } from "./modules/debit-imports/debit-imports.routes.js";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes.js";
import { futureRoutes } from "./modules/future/future.routes.js";
import type { FutureDebtService } from "./modules/future/future.service.js";
import { reportsRoutes } from "./modules/reports/reports.routes.js";
import { settingsRoutes } from "./modules/settings/settings.routes.js";
import { goalsRoutes } from "./modules/goals/goals.routes.js";
import { budgetsRoutes } from "./modules/budgets/budgets.routes.js";
import { globalSearchRoutes } from "./modules/global-search/global-search.routes.js";
import { financialHealthRoutes } from "./modules/financial-health/financial-health.routes.js";
import { aiAdvisorRoutes } from "./modules/ai-advisor/ai-advisor.routes.js";
import { salaryReceiptsRoutes } from "./modules/salary-receipts/salary-receipts.routes.js";
import { monthCloseRoutes } from "./modules/month-close/month-close.routes.js";
import { backupRestoreRoutes } from "./modules/backup-restore/backup-restore.routes.js";
import { AppError } from "./shared/errors.js";

export interface BuildAppOptions {
  futureDebtService?: FutureDebtService;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: env.MAX_UPLOAD_BYTES,
    },
  });

  app.setErrorHandler((error, request, reply) => {
    logger.error(
      {
        error: String(error),
        url: request.url,
        method: request.method,
      },
      "Request error",
    );

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
      });
    }

    const validationError = error as {
      validation?: unknown;
      message?: string;
    };
    if (validationError.validation) {
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: validationError.message || "Validation error",
      });
    }

    return reply.status(500).send({
      code: "INTERNAL_ERROR",
      message:
        env.NODE_ENV === "development"
          ? String((error as { message?: string }).message || error)
          : "Internal server error",
    });
  });

  await app.register(healthRoutes);
  await app.register(cardsRoutes);
  await app.register(importsRoutes);
  await app.register(importCenterRoutes);
  await app.register(reconciliationRoutes);
  await app.register(manualPurchasesRoutes);
  await app.register(incomesRoutes);
  await app.register(movementsRoutes);
  await app.register(debitImportsRoutes);
  await app.register(dashboardRoutes);
  await app.register(futureRoutes, {
    service: options.futureDebtService,
  });
  await app.register(reportsRoutes);
  await app.register(settingsRoutes);
  await app.register(goalsRoutes);
  await app.register(budgetsRoutes);
  await app.register(globalSearchRoutes);
  await app.register(financialHealthRoutes);
  await app.register(aiAdvisorRoutes);
  await app.register(salaryReceiptsRoutes);
  await app.register(monthCloseRoutes);
  await app.register(backupRestoreRoutes);

  return app;
}
