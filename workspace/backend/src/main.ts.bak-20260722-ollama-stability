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

async function main() {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  try {
    await connectDatabase();

    app = await buildApp();

    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    logger.info(
      `Server running on http://${env.HOST}:${env.PORT}`,
    );

    await preflightTextExtractionProvider();

    if (!isAiWorkerStarted()) {
      startAiProcessorWorker();
    }

    const shutdown = async (signal: string) => {
      logger.info(
        { signal },
        "Shutdown signal received",
      );
      await stopAiProcessorWorker(signal);
      await app!.close();
      await disconnectDatabase();
      process.exit(0);
    };

    process.on(
      "SIGTERM",
      () => void shutdown("SIGTERM"),
    );
    process.on(
      "SIGINT",
      () => void shutdown("SIGINT"),
    );
  } catch (error) {
    logger.error(
      { error },
      "Failed to start server",
    );
    await app?.close().catch(() => undefined);
    await disconnectDatabase().catch(() => undefined);
    process.exit(1);
  }
}

void main();
