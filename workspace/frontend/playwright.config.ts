import { defineConfig, devices } from "@playwright/test";


const FRONTEND_BASE_URL =
  process.env.CAJAAPP_FRONTEND_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  "http://127.0.0.1:11437";


export default defineConfig({
  testDir: "./tests",
  testMatch: ["**/*.spec.ts"],
  testIgnore: ["**/* (1).spec.ts", "**/* copy.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 12 * 60 * 1000,
  expect: {
    timeout: 30_000,
  },
  outputDir: "test-results",
  reporter: [
    ["list", { printSteps: true, printFailuresInline: true }],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: FRONTEND_BASE_URL,
    ...devices["Desktop Chrome"],
    headless: true,
    trace: "on",
    screenshot: "on",
    video: "on",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});