import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const cwd = process.cwd();
const logPath = path.join(cwd, "frontend.log");
const nextCli = path.join(cwd, "node_modules", "next", "dist", "bin", "next");
const extraArgs = process.argv.slice(2);
const logStream = fs.createWriteStream(logPath, { flags: "w", encoding: "utf8" });

logStream.write(`[${new Date().toISOString()}] frontend dev start\n`);

const child = spawn(
  process.execPath,
  [nextCli, "dev", ...extraArgs],
  {
    cwd,
    env: { ...process.env, FORCE_COLOR: "0" },
    stdio: ["inherit", "pipe", "pipe"],
  },
);

function tee(source, target) {
  if (!source) return;
  source.on("data", (chunk) => {
    target.write(chunk);
    logStream.write(chunk);
  });
}

tee(child.stdout, process.stdout);
tee(child.stderr, process.stderr);

child.on("error", (error) => {
  const line = `[${new Date().toISOString()}] frontend launcher error: ${error.stack || error.message}\n`;
  process.stderr.write(line);
  logStream.write(line);
  process.exitCode = 1;
});

child.on("close", (code, signal) => {
  logStream.end(
    `[${new Date().toISOString()}] frontend dev stop code=${code ?? "null"} signal=${signal ?? "none"}\n`,
  );
  process.exitCode = typeof code === "number" ? code : signal ? 1 : 0;
});

function forwardSignal(signal) {
  if (!child.killed) child.kill(signal);
}

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));
