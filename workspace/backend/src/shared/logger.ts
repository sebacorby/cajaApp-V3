import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  transport: env.NODE_ENV === "development"
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
});

export function sanitizeForLog(str: string, maxLen = 100): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "...";
}
