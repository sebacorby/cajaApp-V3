import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";

describe("API Smoke Tests", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health returns 200", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ok");
    expect(body.service).toBe("cajaapp-v3-backend");
  });

  it("GET /api/card-statements/updated-values returns valid response", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/card-statements/updated-values?from=2026-07&to=2027-01",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(Array.isArray(body.months)).toBe(true);
  });

  it("GET /api/card-statements/updated-values requires from and to params", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/card-statements/updated-values",
    });

    expect(response.statusCode).toBe(400);
  });
});
