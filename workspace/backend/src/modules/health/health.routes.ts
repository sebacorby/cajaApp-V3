import { FastifyInstance, FastifyPluginAsync } from "fastify";

interface HealthResponse {
  status: string;
  service: string;
  node: string;
}

export const healthRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get<{ Reply: HealthResponse }>("/health", {
    schema: {
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            service: { type: "string" },
            node: { type: "string" },
          },
        },
      },
    },
  }, async () => {
    return {
      status: "ok",
      service: "cajaapp-v3-backend",
      node: process.version,
    };
  });
};
