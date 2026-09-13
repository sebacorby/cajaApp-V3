import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/errors.js";
import { env } from "../../config/env.js";
import type { AgentJsonValue } from "../ai/agent/agent-chat-provider.js";
import type { AgentApprovalStatus } from "./agent-types.js";

export class AgentApprovalError extends AppError {
  constructor(code: string, message: string, statusCode = 409) {
    super(code, message, statusCode);
    this.name = "AgentApprovalError";
  }
}

export interface AgentApprovalRequestInput {
  toolCallId: string;
  toolName: string;
  arguments: AgentJsonValue;
  impactSummary: unknown;
}

export interface AgentApprovalDto {
  id: string;
  toolCallId: string;
  status: AgentApprovalStatus;
  argumentsHash: string;
  impact: unknown;
  requestedAt: string;
  resolvedAt: string | null;
}

export interface AgentApprovalDecision {
  status: Extract<AgentApprovalStatus, "approved" | "rejected" | "expired">;
  argumentsHash: string;
  resolvedAt: string | null;
}

type Db = PrismaClient;

export function canonicalToolArguments(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalToolArguments).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value).sort();
    const body = keys
      .map((key) => `${JSON.stringify(key)}:${canonicalToolArguments((value as Record<string, unknown>)[key])}`)
      .join(",");
    return `{${body}}`;
  }
  if (typeof value === "number" && !Number.isFinite(value)) return "null";
  return JSON.stringify(value);
}

export function computeArgumentsHash(toolName: string, args: unknown): string {
  return createHash("sha256")
    .update(`${toolName}\0${canonicalToolArguments(args)}`, "utf8")
    .digest("hex");
}

function safeJson(raw: string | null | undefined): unknown {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return {};
  }
}

type Waiter = {
  promise: Promise<AgentApprovalDecision>;
  resolve: (decision: AgentApprovalDecision) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class AgentApprovalService {
  private readonly db: Db;
  private readonly approvalTtlMs: number;
  private readonly now: () => Date;
  private readonly waiters = new Map<string, Waiter>();

  constructor(db: Db = prisma, options: { approvalTtlMs?: number; now?: () => Date } = {}) {
    this.db = db;
    this.approvalTtlMs = options.approvalTtlMs ?? env.AGENT_APPROVAL_TTL_MS;
    this.now = options.now ?? (() => new Date());
  }

  async requestApproval(input: AgentApprovalRequestInput): Promise<AgentApprovalDto> {
    const argumentsHash = computeArgumentsHash(input.toolName, input.arguments);
    const existing = await this.db.agentApproval.findUnique({ where: { toolCallId: input.toolCallId } });
    if (existing) return this.toDto(existing);
    const row = await this.db.agentApproval.create({
      data: {
        toolCallId: input.toolCallId,
        status: "pending",
        argumentsHash,
        impactSummaryJson: JSON.stringify(input.impactSummary ?? {}),
      },
    });
    return this.toDto(row);
  }

  async getByToolCall(toolCallId: string): Promise<AgentApprovalDto | null> {
    const row = await this.db.agentApproval.findUnique({ where: { toolCallId } });
    return row ? this.toDto(row) : null;
  }

  async approve(toolCallId: string): Promise<AgentApprovalDto> {
    const row = await this.requirePending(toolCallId);
    if (this.isExpired(row.requestedAt)) {
      const updated = await this.transition(row, "expired");
      this.resolveWaiters(toolCallId, this.decision(updated));
      throw new AgentApprovalError("APPROVAL_EXPIRED", "La aprobación expiró y ya no puede confirmarse");
    }
    const toolCall = await this.db.agentToolCall.findUnique({
      where: { id: toolCallId },
      select: { toolName: true, argumentsJson: true },
    });
    if (toolCall) {
      let parsedArguments: unknown;
      try {
        parsedArguments = JSON.parse(toolCall.argumentsJson) as unknown;
      } catch {
        parsedArguments = null;
      }
      if (computeArgumentsHash(toolCall.toolName, parsedArguments) !== row.argumentsHash) {
        throw new AgentApprovalError(
          "APPROVAL_ARGUMENTS_MISMATCH",
          "Los argumentos de la acción cambiaron; la aprobación pendiente dejó de ser válida",
        );
      }
    }
    const updated = await this.transition(row, "approved");
    this.resolveWaiters(toolCallId, this.decision(updated));
    return updated;
  }

  async reject(toolCallId: string, reason?: string): Promise<AgentApprovalDto> {
    const row = await this.requirePending(toolCallId);
    void reason;
    const updated = await this.transition(row, "rejected");
    this.resolveWaiters(toolCallId, this.decision(updated));
    return updated;
  }

  async expireStale(): Promise<number> {
    const cutoff = new Date(this.now().getTime() - this.approvalTtlMs);
    const rows = await this.db.agentApproval.findMany({
      where: { status: "pending", requestedAt: { lt: cutoff } },
    });
    let expired = 0;
    for (const row of rows) {
      const updated = await this.transition(row, "expired");
      this.resolveWaiters(row.toolCallId, this.decision(updated));
      expired += 1;
    }
    return expired;
  }

  async waitForDecision(toolCallId: string, waitMs: number = this.approvalTtlMs): Promise<AgentApprovalDecision> {
    const terminal = await this.readTerminal(toolCallId);
    if (terminal) return terminal;
    const existing = this.waiters.get(toolCallId);
    if (existing) return existing.promise;
    let resolveWaiter!: (decision: AgentApprovalDecision) => void;
    const promise = new Promise<AgentApprovalDecision>((resolve) => {
      resolveWaiter = resolve;
    });
    const timer = setTimeout(() => {
      void this.expireThenResolve(toolCallId, resolveWaiter);
    }, Math.max(10, waitMs));
    this.waiters.set(toolCallId, { promise, resolve: resolveWaiter, timer });
    const after = await this.readTerminal(toolCallId);
    if (after) {
      this.clearWaiter(toolCallId);
      return after;
    }
    return promise;
  }

  private async expireThenResolve(toolCallId: string, resolve: (decision: AgentApprovalDecision) => void) {
    const row = await this.db.agentApproval.findUnique({ where: { toolCallId } });
    if (row && row.status === "pending") {
      const updated = await this.transition(row, "expired");
      this.clearWaiter(toolCallId);
      resolve(this.decision(updated));
    } else if (row) {
      this.clearWaiter(toolCallId);
      resolve(this.decision(row));
    }
  }

  private async readTerminal(toolCallId: string): Promise<AgentApprovalDecision | null> {
    const row = await this.db.agentApproval.findUnique({ where: { toolCallId } });
    if (row && row.status !== "pending") return this.decision(row);
    return null;
  }

  private clearWaiter(toolCallId: string) {
    const waiter = this.waiters.get(toolCallId);
    if (waiter) {
      clearTimeout(waiter.timer);
      this.waiters.delete(toolCallId);
    }
  }

  private resolveWaiters(toolCallId: string, decision: AgentApprovalDecision) {
    const waiter = this.waiters.get(toolCallId);
    if (!waiter) return;
    clearTimeout(waiter.timer);
    this.waiters.delete(toolCallId);
    waiter.resolve(decision);
  }

  private async requirePending(toolCallId: string) {
    const row = await this.db.agentApproval.findUnique({ where: { toolCallId } });
    if (!row) {
      throw new AgentApprovalError("APPROVAL_NOT_FOUND", "No existe una aprobación pendiente para esta tool call", 404);
    }
    if (row.status !== "pending") {
      throw new AgentApprovalError("APPROVAL_NOT_PENDING", `La aprobación ya fue ${this.describe(row.status)}`);
    }
    return row;
  }

  private describe(status: string): string {
    return status === "approved" ? "aprobada" : status === "rejected" ? "rechazada" : status === "expired" ? "expirada" : status;
  }

  private isExpired(requestedAt: Date): boolean {
    return this.now().getTime() - requestedAt.getTime() > this.approvalTtlMs;
  }

  private async transition(row: any, status: AgentApprovalStatus): Promise<any> {
    const resolvedAt = this.now();
    const updated = await this.db.agentApproval.updateMany({
      where: { id: row.id, status: "pending" },
      data: { status, resolvedAt },
    });
    if (updated.count !== 1) {
      throw new AgentApprovalError("APPROVAL_NOT_PENDING", "La aprobación ya fue resuelta por otra operación concurrente");
    }
    const current = await this.db.agentApproval.findUnique({ where: { toolCallId: row.toolCallId } });
    if (!current) {
      throw new AgentApprovalError("APPROVAL_NOT_FOUND", "La aprobación ya no existe", 404);
    }
    return current;
  }

  private decision(row: any): AgentApprovalDecision {
    return {
      status: row.status as AgentApprovalDecision["status"],
      argumentsHash: row.argumentsHash,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
    };
  }

  private toDto(row: any): AgentApprovalDto {
    return {
      id: row.id,
      toolCallId: row.toolCallId,
      status: row.status as AgentApprovalStatus,
      argumentsHash: row.argumentsHash,
      impact: safeJson(row.impactSummaryJson),
      requestedAt: row.requestedAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
    };
  }
}

export const agentApprovalService = new AgentApprovalService();