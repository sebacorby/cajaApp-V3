import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

const moduleDirectory = __dirname;
const defaultEnvironmentFile = path.resolve(moduleDirectory, "../../.env");
const environmentFile =
  process.env.CAJAAPP_ENV_FILE?.trim() || defaultEnvironmentFile;

dotenv.config({ path: environmentFile });

const localAppDataDirectory =
  process.env.LOCALAPPDATA?.trim() ||
  path.join(process.env.USERPROFILE?.trim() || ".", "AppData", "Local");
const defaultPythonExecutable = path.join(
  localAppDataDirectory,
  "CajaAppV3",
  "runtime",
  "python",
  ".venv",
  "Scripts",
  "python.exe",
);

const envBoolean = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

// For model output limits, 0 means "do not impose/send a limit".
// Returning undefined is intentional: JSON.stringify omits undefined object
// properties, so provider clients do not send max_tokens/num_predict.
const optionalModelOutputLimit = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    const numeric = Number(value);
    return numeric === 0 ? undefined : value;
  },
  z.coerce
    .number()
    .int()
    .min(1_000)
    .max(1_048_576)
    .optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("127.0.0.1"),
  DATABASE_URL: z.string().default("file:./dev.db"),
  STORAGE_DIR: z.string().default("./storage"),
  MAX_UPLOAD_BYTES: z.coerce.number().default(10485760),

  AI_PROVIDER: z
    .enum(["ollama", "openai-compatible"])
    .default("ollama"),

  OLLAMA_MODE: z
    .enum(["local-proxy", "cloud-direct"])
    .default("local-proxy"),
  OLLAMA_BASE_URL: z
    .string()
    .url()
    .default("http://127.0.0.1:11434"),
  OLLAMA_API_KEY: z.string().default(""),
  OLLAMA_MODEL: z.string().min(1).default("gemma4:31b-cloud"),
  // 0 disables the application-level response timeout.
  OLLAMA_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(0)
    .max(1_800_000)
    .default(0),
  OLLAMA_MAX_RETRIES: z.coerce
    .number()
    .int()
    .min(0)
    .max(3)
    .default(0),
  OLLAMA_PREFLIGHT_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  OLLAMA_PREFLIGHT_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(60_000)
    .default(15_000),
  OLLAMA_HEARTBEAT_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(30_000)
    .default(5_000),
  OLLAMA_KEEP_ALIVE: z
    .string()
    .trim()
    .default("5m"),
  OLLAMA_THINK: z
    .enum([
      "auto",
      "true",
      "false",
      "low",
      "medium",
      "high",
      "max",
    ])
    .default("auto"),
  OLLAMA_STRUCTURED_OUTPUT: z
    .enum(["none", "json"])
    .default("none"),
  // 0 means CajaApp does not send num_ctx to Ollama.
  OLLAMA_NUM_CTX: z.coerce
    .number()
    .int()
    .min(0)
    .max(1_048_576)
    .default(0),

  AI_BASE_URL: z
    .string()
    .trim()
    .url()
    .optional(),
  AI_CHAT_COMPLETIONS_PATH: z
    .string()
    .trim()
    .default("/chat/completions"),
  AI_API_KEY: z
    .string()
    .trim()
    .optional(),
  AI_MODEL: z
    .string()
    .trim()
    .min(1)
    .optional(),
  // 0 disables the application-level provider timeout.
  AI_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(0)
    .max(1_800_000)
    .default(0),
  AI_MAX_OUTPUT_TOKENS: optionalModelOutputLimit,
  AI_TEMPERATURE: z.coerce
    .number()
    .min(0)
    .max(2)
    .default(0),
  AI_TOKEN_PARAMETER: z
    .enum(["max_tokens", "max_completion_tokens"])
    .default("max_tokens"),
  AI_RESPONSE_FORMAT: z
    .enum(["none", "json_object"])
    .default("none"),

  // 0 disables the application-level total AI job timeout.
  AI_JOB_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(0)
    .max(1_920_000)
    .default(0),
  AI_PROCESSING_STALE_AFTER_MS: z.coerce
    .number()
    .int()
    .min(120_000)
    .max(2_100_000)
    .default(2_100_000),
  AI_WORKER_POLL_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(500)
    .max(30_000)
    .default(2_000),

  MINIMAX_BASE_URL: z
    .string()
    .url()
    .default("https://api.minimax.io"),
  MINIMAX_API_KEY: z
    .string()
    .trim()
    .optional(),
  MINIMAX_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(30_000)
    .max(420_000)
    .default(180_000),
  MINIMAX_MAX_RETRIES: z.coerce
    .number()
    .int()
    .min(0)
    .max(1)
    .default(0),

  PYTHON_EXECUTABLE: z
    .string()
    .trim()
    .default(defaultPythonExecutable),
  PDF_RAW_EXTRACTOR_SCRIPT: z
    .string()
    .trim()
    .default("python/pdf_to_raw.py"),
  PDF_RAW_EXTRACTION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(5_000)
    .max(300_000)
    .default(60_000),
  PDF_RAW_MAX_OUTPUT_BYTES: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(50_000_000)
    .default(8_000_000),
  PDF_RAW_MAX_CHARACTERS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(1_000_000)
    .default(250_000),

  AI_ADVISOR_PROMPTS_DIR: z.string().default("../../contracts/prompts/advisor"),
  AI_ADVISOR_MAX_QUESTION_CHARACTERS: z.coerce.number().int().min(100).max(10_000).default(1_200),
  AI_ADVISOR_MAX_CONTEXT_CHARACTERS: z.coerce.number().int().min(10_000).max(500_000).default(80_000),

  CARD_STATEMENT_PROMPTS_DIR: z.string().default("../../contracts/prompts/cards"),
  CARD_STATEMENT_SCHEMAS_DIR: z.string().default("../../contracts/schemas/cards"),
  SALARY_RECEIPT_PROMPTS_DIR: z.string().default("../../contracts/prompts/salary-receipts"),
  SALARY_RECEIPT_SCHEMAS_DIR: z.string().default("../../contracts/schemas/salary-receipts"),
  AI_MOCK_MODE: envBoolean,
  AI_DEBUG_CAPTURE_OLLAMA_REQUEST: envBoolean,
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

if (
  parsed.data.AI_PROVIDER === "openai-compatible" &&
  !parsed.data.AI_BASE_URL
) {
  console.error(
    "AI_BASE_URL is required when AI_PROVIDER=openai-compatible.",
  );
  process.exit(1);
}

if (
  parsed.data.AI_PROVIDER === "openai-compatible" &&
  !parsed.data.AI_MODEL
) {
  console.error(
    "AI_MODEL is required when AI_PROVIDER=openai-compatible.",
  );
  process.exit(1);
}

if (
  parsed.data.AI_PROVIDER === "ollama" &&
  !parsed.data.OLLAMA_MODEL
) {
  console.error(
    "OLLAMA_MODEL is required when AI_PROVIDER=ollama.",
  );
  process.exit(1);
}

if (
  parsed.data.AI_PROVIDER === "ollama" &&
  parsed.data.OLLAMA_MODE === "cloud-direct" &&
  !parsed.data.OLLAMA_API_KEY
) {
  console.error(
    "OLLAMA_API_KEY is required when OLLAMA_MODE=cloud-direct.",
  );
  process.exit(1);
}

// The worker's legacy runWithTimeout guard rejects zero before it creates its
// timer. Preserve the configured meaning (0 = disabled) separately and pass a
// positive compatibility sentinel to that legacy guard. The execution policy
// suppresses the timeout callback completely when this flag is true, so no
// application-level job timeout is actually scheduled.
export const aiJobTimeoutDisabled = parsed.data.AI_JOB_TIMEOUT_MS === 0;
if (aiJobTimeoutDisabled) {
  parsed.data.AI_JOB_TIMEOUT_MS = 1;
}

const providerTimeout =
  parsed.data.AI_PROVIDER === "ollama"
    ? parsed.data.OLLAMA_TIMEOUT_MS
    : parsed.data.AI_TIMEOUT_MS;

if (
  providerTimeout > 0 &&
  !aiJobTimeoutDisabled &&
  providerTimeout >= parsed.data.AI_JOB_TIMEOUT_MS
) {
  console.error(
    "Provider timeout must be lower than AI_JOB_TIMEOUT_MS.",
  );
  process.exit(1);
}

if (
  !aiJobTimeoutDisabled &&
  parsed.data.AI_PROCESSING_STALE_AFTER_MS > 0 &&
  parsed.data.AI_JOB_TIMEOUT_MS >=
    parsed.data.AI_PROCESSING_STALE_AFTER_MS
) {
  console.error(
    "AI_JOB_TIMEOUT_MS must be lower than AI_PROCESSING_STALE_AFTER_MS.",
  );
  process.exit(1);
}

const nodeVersion = process.version;
const requiredNodeVersion = "v24.18.0";
const isTestEnv = process.env.NODE_ENV === "test" || process.env.VITEST === "true" || process.env.npm_lifecycle_event === "test";

if (nodeVersion !== requiredNodeVersion) {
  if (isTestEnv) {
    console.warn(
      `Node.js ${requiredNodeVersion} expected, running on ${nodeVersion}; tests continue.`,
    );
  } else {
    console.error(
      `Node.js ${requiredNodeVersion} required, found ${nodeVersion}`,
    );
    process.exit(1);
  }
}

export const env = parsed.data;

export const isDev = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";
export const isProd = env.NODE_ENV === "production";
