import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { AppError } from "../../shared/errors.js";
import { stableSerialize } from "./serializers/response.js";
import {
  futureDebtQuerySchema,
  futureDebtResponseSchema,
  type FutureDebtQueryInput,
} from "./future.schemas.js";
import { futureDebtService, type FutureDebtService } from "./future.service.js";
import { resolveRecognizableCardReferences } from "./helpers/recognizable-card-reference.js";

export interface FutureControllerOptions {
  service?: FutureDebtService;
}

function invalidQueryMessage(error: {
  issues?: Array<{ path: (string | number)[]; message: string }>;
}): string {
  const issues = error.issues ?? [];
  return issues.length > 0
    ? `Invalid query: ${issues.map((issue) => `${issue.path.join(".") || "query"}: ${issue.message}`).join(", ")}`
    : "Invalid query";
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEGACY_CUID_REGEX = /^c[0-9a-z]{23,24}$/i;

function isProjectionId(id: string): boolean {
  // CardInstallmentProjection.id is generated with Prisma uuid().
  // Keep CUID compatibility for historical/test data created before this contract was corrected.
  return UUID_REGEX.test(id) || LEGACY_CUID_REGEX.test(id);
}

export const futureController: FastifyPluginAsync<
  FutureControllerOptions
> = async (app: FastifyInstance, options) => {
  const service = options.service ?? futureDebtService;

  app.get("/", async (request, reply) => {
    const parsed = futureDebtQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new AppError(
        "INVALID_QUERY",
        invalidQueryMessage(parsed.error),
        400,
      );
    }

    const query = parsed.data as FutureDebtQueryInput;
    const rawResponse = await service.getFutureDebt(query);
    const response = resolveRecognizableCardReferences(rawResponse);
    const responseValidation = futureDebtResponseSchema.safeParse(response);
    if (!responseValidation.success) {
      const issues = responseValidation.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new AppError(
        "INTERNAL_ERROR",
        `Future-debt response failed contract validation: ${issues}`,
        500,
      );
    }

    return reply
      .type("application/json; charset=utf-8")
      .send(stableSerialize(responseValidation.data));
  });

  app.delete("/rows/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!isProjectionId(id)) {
      throw new AppError("INVALID_ID", "Invalid projection ID format", 400);
    }

    await service.deleteProjectionRow(id);
    return reply.status(204).send();
  });
};
