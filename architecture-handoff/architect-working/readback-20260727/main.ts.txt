import { buildApp } from "./app.js";
import {
  connectDatabase,
  disconnectDatabase,
} from "./db/prisma.js";
import { env } from "./config/env.js";
import { logger } from "./shared/logger.js";
import {
  startAiProcessorWorker,
  stopAiProcessorWorker,
  isAiWorkerStarted,
} from "./modules/ai/ai-processor-worker.js";
import {
  preflightTextExtractionProvider,
} from "./modules/ai/text-extraction-provider.factory.js";
import { repairStatementProjectionLinks } from "./modules/cards/legacy-projection-rowid-repair.js";

async function main() {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  try {
    logger.info(
      {
        provider: env.AI_PROVIDER,
        ollamaBaseUrl: env.OLLAMA_BASE_URL,
        ollamaModel: env.OLLAMA_MODEL,
      },
      "Validating AI provider before starting server",
    );

    // The AI provider must be valid before the HTTP port is opened. Previously
    // Fastify started listening first and a failed Ollama preflight shut the
    // process down seconds later, leaving E2E tests connected to a dead backend.
    await preflightTextExtractionProvider();

    await connectDatabase();

    // Historical accepted summaries may contain two broken joins created by
    // earlier acceptance logic: CardStatementRow.groupKey can point to the row
    // itself instead of its card group, and projections can point to another
    // valid CardStatementRow UUID. Repair those links before serving requests.
    try {
      const projectionLinkRepair = await repairStatementProjectionLinks();
      logger.info(
        { projectionLinkRepair },
        "Persisted card statement projection links verified",
      );
    } catch (error) {
      logger.error(
        { error },
        "Persisted card statement projection link repair failed",
      );
    }

    app = await buildApp();

    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    logger.info(
      {
        provider: env.AI_PROVIDER,
        ollamaBaseUrl: env.OLLAMA_BASE_URL,
        ollamaModel: env.OLLAMA_MODEL,
      },
      `Server running on http://${env.HOST}:${env.PORT}`,
    );

    if (!isAiWorkerStarted()) {
      startAiProcessorWorker();
    }

    let shuttingDown = false;
    const shutdown = async (signal: string) => {
      if (shuttingDown) {
        return;
      }
      shuttingDown = true;

      logger.info(
        { signal },
        "Shutdown signal received",
      );

      await stopAiProcessorWorker(signal).catch((error) => {
        logger.error({ error, signal }, "Failed to stop AI worker cleanly");
      });
      await app?.close().catch((error) => {
        logger.error({ error, signal }, "Failed to close HTTP server cleanly");
      });
      await disconnectDatabase().catch((error) => {
        logger.error({ error, signal }, "Failed to disconnect database cleanly");
      });

      process.exit(0);
    };

    process.once("SIGTERM", () => void shutdown("SIGTERM"));
    process.once("SIGINT", () => void shutdown("SIGINT"));
  } catch (error) {
    logger.error(
      {
        error,
        provider: env.AI_PROVIDER,
        ollamaBaseUrl: env.OLLAMA_BASE_URL,
        ollamaModel: env.OLLAMA_MODEL,
      },
      "Failed to start server",
    );
    await app?.close().catch(() => undefined);
    await disconnectDatabase().catch(() => undefined);
    process.exit(1);
  }
}

void main();
