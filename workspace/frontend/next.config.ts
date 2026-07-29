import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  // Allow the dev server to be reached from 127.0.0.1 (Playwright default).
  // Without this, Next.js 16 blocks hydration resources from the test runner.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
