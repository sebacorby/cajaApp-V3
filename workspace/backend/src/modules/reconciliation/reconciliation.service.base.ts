import { createHash } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { NotFoundError, ValidationError } from "../../shared/errors.js";
import {
  movementsService,
  parseMovementAmount,
  type NormalizedMovement,
} from "../movements/movements.service.js";
import type {
  ResolveReconciliationInput,
  ScanReconciliationInput,
} from "./reconciliation.schemas.js";

export type ReconciliationRelationType =
  | "duplicate_movement"
  | "salary_deposit"
  | "card_payment";

export type ReconciliationStatus = "open" | "resolved" | "dismissed";
export type ReconciliationResolution =
  | "exclude_left"
  | "exclude_right"
  | "keep_both"
  | "link_only"
  | "dismiss";

export interface ReconciliationQuery {
  status: "all" | ReconciliationStatus;
  relationType: "all" | ReconciliationRelationType;
  scope: "all" | "current" | "historical";
  search: string;
  limit: number;
  offset: number;
}

export interface ReconciliationNavigation {
  section: "movimientos" | "tarjetas" | "ingresos";
  label: string;
}

export interface ReconciliationParticipant {
  id: string;
  role: "left" | "right";
  entityKey: string;
  entityType: "movement" | "salary_receipt" | "card_statement";
  sourceType: string;
  sourceId: string;
  movementId: string | null;
  description: string;
  occurredOn: string | null;
  currency: "ARS" | "USD" | null;
  amount: string | null;
  excluded: boolean;
  metadata: Record<string, string | number | boolean | null>;
  navigation: ReconciliationNavigation;
}

export interface ReconciliationItem {
  id: string;
  fingerprint: string;
  relationType: ReconciliationRelationType;
  status: ReconciliationStatus;
  resolution: ReconciliationResolution | null;
  confidence: number;
  title: string;
  rationale: string[];
  suggestedResolution: "exclude_left" | "exclude_right" | "review";
  currency: "ARS" | "USD" | null;
  amount: string | null;
  occurredOn: string | null;
  excludedMovementId: string | null;
  isCurrent: boolean;
  lastDetectedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  participants: ReconciliationParticipant[];
}

export interface ReconciliationSummary {
  total: number;
  open: number;
  resolved: number;
  dismissed: number;
  duplicates: number;
  relations: number;
  excluded: number;
  current: number;
}

interface CandidateParticipant {
  role: "left" | "right";
  entityKey: string;
  entityType: "movement" | "salary_receipt" | "card_statement";
  sourceType: string;
  sourceId: string;
  movementId: string | null;
  description: string;
  occurredOn: string | null;
  currency: "ARS" | "USD" | null;
  amountRaw: string | null;
  metadata: Record<string, string | number | boolean | null>;
}

interface ReconciliationCandidate {
  fingerprint: string;
  relationType: ReconciliationRelationType;
  confidence: number;
  title: string;
  rationale: string[];
  suggestedResolution: "exclude_left" | "exclude_right" | "review";
  currency: "ARS" | "USD" | null;
  amountRaw: string | null;
  occurredOn: string | null;
  participants: [CandidateParticipant, CandidateParticipant];
}

const SOURCE_AUTHORITY: Record<string, number> = {
  manual_cash: 10,
  manual_income: 10,
  manual_unexpected: 10,
  manual_transfer: 10,
  manual_adjustment: 10,
  debit_csv: 20,
  card_manual_purchase: 30,
  income_one_off: 40,
  income_recurring: 50,
  card_statement: 60,
};

const STOP_WORDS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "y",
  "en",
  "por",
  "para",
  "con",
  "pago",
  "compra",
  "movimiento",
  "transferencia",
]);

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function dateEpochDay(value: string): number {
  return Math.floor(Date.parse(`${value}T00:00:00Z`) / 86_400_000);
}

function dateDistanceDays(left: string, right: string): number {
  return Math.abs(dateEpochDay(left) - dateEpochDay(right));
}

function monthKey(value: string): string {
  return value.slice(0, 7);
}

function nextMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function safeJsonObject(
  value: string | null | undefined,
): Record<string, string | number | boolean | null> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>)
          .filter(([, entry]) =>
            entry === null ||
            typeof entry === "string" ||
            typeof entry === "number" ||
            typeof entry === "boolean",
          )
          .map(([key, entry]) => [key, entry as string | number | boolean | null]),
      );
    }
  } catch {
    return {};
  }
  return {};
}

function safeStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

export function normalizeReconciliationText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value: string): Set<string> {
  return new Set(
    normalizeReconciliationText(value)
      .split(/\s+/)
      .filter((token) => token.length >= 2 && !STOP_WORDS.has(token)),
  );
}

export function reconciliationTextSimilarity(
  left: string,
  right: string,
): number {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

export function calculateDuplicateConfidence(
  left: Pick<NormalizedMovement, "occurredOn" | "description" | "currency" | "amount">,
  right: Pick<NormalizedMovement, "occurredOn" | "description" | "currency" | "amount">,
): number {
  if (left.currency !== right.currency) return 0;

  const leftAmount = parseMovementAmount(left.amount, left.currency, false);
  const rightAmount = parseMovementAmount(right.amount, right.currency, false);
  if (leftAmount !== rightAmount) return 0;

  const distance = dateDistanceDays(left.occurredOn, right.occurredOn);
  if (distance > 3) return 0;

  const dateScore = distance === 0 ? 20 : distance === 1 ? 16 : distance === 2 ? 12 : 8;
  const textScore = Math.round(
    reconciliationTextSimilarity(left.description, right.description) * 30,
  );
  return Math.min(100, 50 + dateScore + textScore);
}

export function buildReconciliationFingerprint(
  relationType: ReconciliationRelationType,
  entityKeys: string[],
): string {
  const material = `${relationType}|${[...entityKeys].sort().join("|")}`;
  return createHash("sha256").update(material).digest("hex");
}

export function suggestExcludedMovementId(
  left: Pick<CandidateParticipant, "sourceType" | "movementId">,
  right: Pick<CandidateParticipant, "sourceType" | "movementId">,
): "exclude_left" | "exclude_right" | "review" {
  if (!left.movementId && !right.movementId) return "review";
  if (!left.movementId) return "exclude_right";
  if (!right.movementId) return "exclude_left";

  const leftAuthority = SOURCE_AUTHORITY[left.sourceType] ?? 30;
  const rightAuthority = SOURCE_AUTHORITY[right.sourceType] ?? 30;
  if (leftAuthority === rightAuthority) return "review";
  return leftAuthority < rightAuthority ? "exclude_left" : "exclude_right";
}

export function buildReconciliationSummary(
  items: ReconciliationItem[],
): ReconciliationSummary {
  return {
    total: items.length,
    open: items.filter((item) => item.status === "open").length,
    resolved: items.filter((item) => item.status === "resolved").length,
    dismissed: items.filter((item) => item.status === "dismissed").length,
    duplicates: items.filter(
      (item) => item.relationType === "duplicate_movement",
    ).length,
    relations: items.filter(
      (item) => item.relationType !== "duplicate_movement",
    ).length,
    excluded: items.filter((item) => Boolean(item.excludedMovementId)).length,
    current: items.filter((item) => item.isCurrent).length,
  };
}

function searchableText(item: ReconciliationItem): string {
  return normalizeReconciliationText(
    [
      item.title,
      item.relationType,
      item.status,
      ...item.rationale,
      ...item.participants.flatMap((participant) => [
        participant.description,
        participant.sourceType,
        participant.sourceId,
        participant.occurredOn,
        participant.amount,
        ...Object.values(participant.metadata),
      ]),
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(" "),
  );
}

export function applyReconciliationFilters(
  items: ReconciliationItem[],
  query: ReconciliationQuery,
): ReconciliationItem[] {
  const needle = normalizeReconciliationText(query.search);
  return items
    .filter((item) => query.status === "all" || item.status === query.status)
    .filter(
      (item) =>
        query.relationType === "all" || item.relationType === query.relationType,
    )
    .filter((item) =>
      query.scope === "all"
        ? true
        : query.scope === "current"
          ? item.isCurrent
          : !item.isCurrent,
    )
    .filter((item) => !needle || searchableText(item).includes(needle))
    .sort((left, right) => {
      if (left.status === "open" && right.status !== "open") return -1;
      if (right.status === "open" && left.status !== "open") return 1;
      if (left.confidence !== right.confidence) {
        return right.confidence - left.confidence;
      }
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    });
}

function navigationForParticipant(
  participant: Pick<CandidateParticipant, "entityType" | "sourceType">,
): ReconciliationNavigation {
  if (
    participant.entityType === "card_statement" ||
    participant.sourceType === "card_statement" ||
    participant.sourceType === "card_manual_purchase" ||
    participant.sourceType === "card_installment"
  ) {
    return { section: "tarjetas", label: "Abrir en Tarjetas" };
  }
  if (
    participant.entityType === "salary_receipt" ||
    participant.sourceType === "income_recurring" ||
    participant.sourceType === "income_one_off"
  ) {
    return { section: "ingresos", label: "Abrir en Ingresos" };
  }
  return { section: "movimientos", label: "Abrir en Movimientos" };
}

function movementParticipant(
  movement: NormalizedMovement,
  role: "left" | "right",
): CandidateParticipant {
  return {
    role,
    entityKey: `movement:${movement.id}`,
    entityType: "movement",
    sourceType: movement.sourceType,
    sourceId: movement.sourceId,
    movementId: movement.id,
    description: movement.description,
    occurredOn: movement.occurredOn,
    currency: movement.currency,
    amountRaw: movement.amount,
    metadata: {
      categoria: movement.category.name,
      tipo: movement.type,
      estado: movement.status,
      origen: movement.trace.sourceLabel,
      nota: movement.notes,
    },
  };
}

function candidate(
  relationType: ReconciliationRelationType,
  input: Omit<ReconciliationCandidate, "fingerprint" | "relationType">,
): ReconciliationCandidate {
  return {
    ...input,
    relationType,
    fingerprint: buildReconciliationFingerprint(
      relationType,
      input.participants.map((participant) => participant.entityKey),
    ),
  };
}

function pairKey(left: string, right: string): string {
  return [left, right].sort().join("|");
}

function specializedSalaryCandidates(
  movements: NormalizedMovement[],
  receipts: any[],
): { candidates: ReconciliationCandidate[]; coveredPairs: Set<string> } {
  const debitIncome = movements.filter(
    (movement) =>
      movement.sourceType === "debit_csv" &&
      movement.type === "income" &&
      movement.status === "actual",
  );
  const candidates: ReconciliationCandidate[] = [];
  const coveredPairs = new Set<string>();

  for (const receipt of receipts) {
    const currency = receipt.currency === "USD" ? "USD" : "ARS";
    const netAmount = parseMovementAmount(receipt.netAmountRaw, currency, false);
    const expectedMovementId = receipt.sourceId
      ? `income-recurring:${receipt.sourceId}:${receipt.periodMonthKey}`
      : null;

    for (const debit of debitIncome) {
      if (debit.currency !== currency) continue;
      if (parseMovementAmount(debit.amount, debit.currency, false) !== netAmount) continue;

      const sameMonth = monthKey(debit.occurredOn) === receipt.periodMonthKey;
      const distance = receipt.payDate
        ? dateDistanceDays(debit.occurredOn, receipt.payDate)
        : sameMonth
          ? 0
          : 99;
      if (!sameMonth && distance > 10) continue;

      const employerSimilarity = reconciliationTextSimilarity(
        debit.description,
        receipt.employerName,
      );
      const confidence = Math.min(
        100,
        70 +
          (distance <= 2 ? 15 : distance <= 5 ? 10 : sameMonth ? 7 : 4) +
          Math.round(employerSimilarity * 15),
      );

      const left = movementParticipant(debit, "left");
      const right: CandidateParticipant = {
        role: "right",
        entityKey: `salary-receipt:${receipt.id}`,
        entityType: "salary_receipt",
        sourceType: "salary_receipt",
        sourceId: receipt.id,
        movementId: expectedMovementId,
        description: `Recibo ${receipt.periodMonthKey} · ${receipt.employerName}`,
        occurredOn: receipt.payDate,
        currency,
        amountRaw: receipt.netAmountRaw,
        metadata: {
          empleador: receipt.employerName,
          empleado: receipt.employeeName,
          periodo: receipt.periodMonthKey,
          version: receipt.version,
        },
      };

      candidates.push(
        candidate("salary_deposit", {
          confidence,
          title: "Depósito bancario y recibo de sueldo con el mismo neto",
          rationale: [
            "El ingreso bancario coincide exactamente con el neto del recibo.",
            receipt.payDate
              ? `Las fechas están separadas por ${distance} día(s).`
              : "Ambos registros pertenecen al mismo período mensual.",
            "La sugerencia conserva el recibo como fuente autoritativa y evita contar dos veces el ingreso.",
          ],
          suggestedResolution: "exclude_left",
          currency,
          amountRaw: debit.amount,
          occurredOn: debit.occurredOn,
          participants: [left, right],
        }),
      );

      if (expectedMovementId) {
        coveredPairs.add(pairKey(debit.id, expectedMovementId));
      }
    }
  }

  return { candidates, coveredPairs };
}

function descriptionMentionsCard(
  description: string,
  statement: any,
): boolean {
  const normalized = normalizeReconciliationText(description);
  const hints = [
    "tarjeta",
    "card",
    statement.bankName,
    statement.brand,
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map(normalizeReconciliationText);
  return hints.some((hint) => hint && normalized.includes(hint));
}

function specializedCardCandidates(
  movements: NormalizedMovement[],
  statements: any[],
): ReconciliationCandidate[] {
  const debitExpenses = movements.filter(
    (movement) =>
      movement.sourceType === "debit_csv" &&
      movement.type === "expense" &&
      movement.status === "actual",
  );
  const candidates: ReconciliationCandidate[] = [];

  for (const statement of statements) {
    for (const currency of ["ARS", "USD"] as const) {
      const totalRaw =
        currency === "ARS" ? statement.totalPesosRaw : statement.totalDollarsRaw;
      if (!totalRaw) continue;
      const total = parseMovementAmount(totalRaw, currency, false);

      for (const debit of debitExpenses) {
        if (debit.currency !== currency) continue;
        if (parseMovementAmount(debit.amount, debit.currency, false) !== total) continue;

        const dueDistance = statement.currentDueDate
          ? dateDistanceDays(debit.occurredOn, statement.currentDueDate)
          : 99;
        const hint = descriptionMentionsCard(debit.description, statement);
        const periodRelated = statement.periodKey
          ? [statement.periodKey, nextMonth(statement.periodKey)].includes(
              monthKey(debit.occurredOn),
            )
          : false;
        if (dueDistance > 10 && !(hint && periodRelated)) continue;

        const sourceSimilarity = reconciliationTextSimilarity(
          debit.description,
          [statement.bankName, statement.brand].filter(Boolean).join(" "),
        );
        const confidence = Math.min(
          100,
          65 +
            (dueDistance <= 2 ? 18 : dueDistance <= 5 ? 13 : dueDistance <= 10 ? 8 : 4) +
            (hint ? 8 : 0) +
            Math.round(sourceSimilarity * 9),
        );

        const left = movementParticipant(debit, "left");
        const right: CandidateParticipant = {
          role: "right",
          entityKey: `card-statement:${statement.id}:${currency}`,
          entityType: "card_statement",
          sourceType: "card_statement",
          sourceId: statement.id,
          movementId: null,
          description:
            [statement.bankName, statement.brand, statement.periodLabel]
              .filter(Boolean)
              .join(" · ") || "Resumen de tarjeta",
          occurredOn: statement.currentDueDate,
          currency,
          amountRaw: totalRaw,
          metadata: {
            banco: statement.bankName,
            marca: statement.brand,
            periodo: statement.periodKey,
            vencimiento: statement.currentDueDate,
            version: statement.version,
          },
        };

        candidates.push(
          candidate("card_payment", {
            confidence,
            title: "Pago bancario relacionado con un resumen de tarjeta",
            rationale: [
              "El débito bancario coincide exactamente con el total del resumen.",
              statement.currentDueDate
                ? `La fecha está a ${dueDistance} día(s) del vencimiento.`
                : "La descripción y el período son compatibles con el resumen.",
              "Excluir el débito evita duplicar gastos ya registrados por los consumos del resumen.",
            ],
            suggestedResolution: "exclude_left",
            currency,
            amountRaw: debit.amount,
            occurredOn: debit.occurredOn,
            participants: [left, right],
          }),
        );
      }
    }
  }

  return candidates;
}

function genericMovementCandidates(
  movements: NormalizedMovement[],
  coveredPairs: Set<string>,
): ReconciliationCandidate[] {
  const buckets = new Map<string, NormalizedMovement[]>();
  for (const movement of movements) {
    if (movement.status !== "actual") continue;
    const cents = parseMovementAmount(
      movement.amount,
      movement.currency,
      false,
    );
    const key = `${movement.type}|${movement.currency}|${cents.toString()}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(movement);
    buckets.set(key, bucket);
  }

  const candidates: ReconciliationCandidate[] = [];
  for (const bucket of buckets.values()) {
    for (let leftIndex = 0; leftIndex < bucket.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < bucket.length;
        rightIndex += 1
      ) {
        const leftMovement = bucket[leftIndex];
        const rightMovement = bucket[rightIndex];
        if (
          leftMovement.sourceType === rightMovement.sourceType &&
          leftMovement.sourceId === rightMovement.sourceId
        ) {
          continue;
        }
        if (coveredPairs.has(pairKey(leftMovement.id, rightMovement.id))) continue;

        const confidence = calculateDuplicateConfidence(
          leftMovement,
          rightMovement,
        );
        if (confidence < 68) continue;

        const left = movementParticipant(leftMovement, "left");
        const right = movementParticipant(rightMovement, "right");
        const distance = dateDistanceDays(
          leftMovement.occurredOn,
          rightMovement.occurredOn,
        );
        const similarity = reconciliationTextSimilarity(
          leftMovement.description,
          rightMovement.description,
        );

        candidates.push(
          candidate("duplicate_movement", {
            confidence,
            title: "Dos fuentes podrían representar el mismo movimiento",
            rationale: [
              "El tipo, la moneda y el importe son idénticos.",
              `Las fechas están separadas por ${distance} día(s).`,
              `Similitud de descripción: ${Math.round(similarity * 100)}%.`,
            ],
            suggestedResolution: suggestExcludedMovementId(left, right),
            currency: leftMovement.currency,
            amountRaw: leftMovement.amount,
            occurredOn:
              leftMovement.occurredOn <= rightMovement.occurredOn
                ? leftMovement.occurredOn
                : rightMovement.occurredOn,
            participants: [left, right],
          }),
        );
      }
    }
  }
  return candidates;
}

function deduplicateCandidates(
  candidates: ReconciliationCandidate[],
): ReconciliationCandidate[] {
  const byFingerprint = new Map<string, ReconciliationCandidate>();
  for (const item of candidates) {
    const existing = byFingerprint.get(item.fingerprint);
    if (!existing || item.confidence > existing.confidence) {
      byFingerprint.set(item.fingerprint, item);
    }
  }
  return [...byFingerprint.values()];
}

function mapParticipant(
  participant: any,
  excludedMovementId: string | null,
): ReconciliationParticipant {
  const candidate: CandidateParticipant = {
    role: participant.role === "right" ? "right" : "left",
    entityKey: participant.entityKey,
    entityType: participant.entityType,
    sourceType: participant.sourceType,
    sourceId: participant.sourceId,
    movementId: participant.movementId,
    description: participant.description,
    occurredOn: participant.occurredOn,
    currency:
      participant.currency === "ARS" || participant.currency === "USD"
        ? participant.currency
        : null,
    amountRaw: participant.amountRaw,
    metadata: safeJsonObject(participant.metadataJson),
  };
  return {
    id: participant.id,
    role: candidate.role,
    entityKey: candidate.entityKey,
    entityType: candidate.entityType,
    sourceType: candidate.sourceType,
    sourceId: candidate.sourceId,
    movementId: candidate.movementId,
    description: candidate.description,
    occurredOn: candidate.occurredOn,
    currency: candidate.currency,
    amount: candidate.amountRaw,
    metadata: candidate.metadata,
    excluded:
      Boolean(candidate.movementId) &&
      candidate.movementId === excludedMovementId,
    navigation: navigationForParticipant(candidate),
  };
}

function mapCase(item: any): ReconciliationItem {
  const excludedMovementId = item.excludedMovementId ?? null;
  return {
    id: item.id,
    fingerprint: item.fingerprint,
    relationType: item.relationType,
    status: item.status,
    resolution: item.resolution ?? null,
    confidence: item.confidence,
    title: item.title,
    rationale: safeStringArray(item.rationaleJson),
    suggestedResolution: item.suggestedResolution,
    currency:
      item.currency === "ARS" || item.currency === "USD"
        ? item.currency
        : null,
    amount: item.amountRaw ?? null,
    occurredOn: item.occurredOn ?? null,
    excludedMovementId,
    isCurrent: Boolean(item.isCurrent),
    lastDetectedAt: item.lastDetectedAt.toISOString(),
    resolvedAt: iso(item.resolvedAt),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    participants: [...item.participants]
      .sort((left: any, right: any) => left.role.localeCompare(right.role))
      .map((participant: any) =>
        mapParticipant(participant, excludedMovementId),
      ),
  };
}

function assertScanRange(input: ScanReconciliationInput): void {
  const from = dateEpochDay(input.from);
  const to = dateEpochDay(input.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || input.to < input.from) {
    throw new ValidationError("El período de conciliación es inválido.");
  }
  if (to - from > 366) {
    throw new ValidationError(
      "La conciliación no puede analizar más de 367 días por ejecución.",
    );
  }
}

export class ReconciliationService {
  async scan(input: ScanReconciliationInput) {
    assertScanRange(input);
    const fromMonth = monthKey(input.from);
    const toMonth = monthKey(input.to);

    const [movements, receipts, statements] = await Promise.all([
      movementsService.getAllMovements(
        {
          from: input.from,
          to: input.to,
          includeProjected: false,
        },
        { includeReconciledExcluded: true },
      ),
      prisma.salaryReceipt.findMany({
        where: {
          status: "accepted",
          isActiveForPeriod: true,
          reversedAt: null,
          periodMonthKey: { gte: fromMonth, lte: toMonth },
        },
        orderBy: { acceptedAt: "desc" },
      }),
      prisma.cardStatement.findMany({
        where: {
          status: "accepted",
          isActiveForPeriod: true,
          archivedAt: null,
          OR: [
            { periodKey: { gte: fromMonth, lte: toMonth } },
            { currentDueDate: { gte: input.from, lte: input.to } },
          ],
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const salary = specializedSalaryCandidates(movements, receipts);
    const candidates = deduplicateCandidates([
      ...salary.candidates,
      ...specializedCardCandidates(movements, statements),
      ...genericMovementCandidates(movements, salary.coveredPairs),
    ]);

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.reconciliationCase.updateMany({
        where: {
          isCurrent: true,
          occurredOn: { gte: input.from, lte: input.to },
        },
        data: { isCurrent: false },
      });

      for (const item of candidates) {
        await tx.reconciliationCase.upsert({
          where: { fingerprint: item.fingerprint },
          create: {
            fingerprint: item.fingerprint,
            relationType: item.relationType,
            status: "open",
            confidence: item.confidence,
            title: item.title,
            rationaleJson: JSON.stringify(item.rationale),
            suggestedResolution: item.suggestedResolution,
            currency: item.currency,
            amountRaw: item.amountRaw,
            occurredOn: item.occurredOn,
            isCurrent: true,
            lastDetectedAt: now,
            participants: {
              create: item.participants.map((participant) => ({
                role: participant.role,
                entityKey: participant.entityKey,
                entityType: participant.entityType,
                sourceType: participant.sourceType,
                sourceId: participant.sourceId,
                movementId: participant.movementId,
                description: participant.description,
                occurredOn: participant.occurredOn,
                currency: participant.currency,
                amountRaw: participant.amountRaw,
                metadataJson: JSON.stringify(participant.metadata),
              })),
            },
          },
          update: {
            relationType: item.relationType,
            confidence: item.confidence,
            title: item.title,
            rationaleJson: JSON.stringify(item.rationale),
            suggestedResolution: item.suggestedResolution,
            currency: item.currency,
            amountRaw: item.amountRaw,
            occurredOn: item.occurredOn,
            isCurrent: true,
            lastDetectedAt: now,
            participants: {
              deleteMany: {},
              create: item.participants.map((participant) => ({
                role: participant.role,
                entityKey: participant.entityKey,
                entityType: participant.entityType,
                sourceType: participant.sourceType,
                sourceId: participant.sourceId,
                movementId: participant.movementId,
                description: participant.description,
                occurredOn: participant.occurredOn,
                currency: participant.currency,
                amountRaw: participant.amountRaw,
                metadataJson: JSON.stringify(participant.metadata),
              })),
            },
          },
        });
      }
    });

    const current = await this.list({
      status: "all",
      relationType: "all",
      scope: "current",
      search: "",
      limit: 100,
      offset: 0,
    });

    return {
      range: input,
      detected: candidates.length,
      summary: current.filteredSummary,
      items: current.items,
    };
  }

  async list(query: ReconciliationQuery) {
    const records = await prisma.reconciliationCase.findMany({
      take: 1000,
      orderBy: [{ updatedAt: "desc" }],
      include: { participants: true },
    });
    const allItems = records.map(mapCase);
    const filtered = applyReconciliationFilters(allItems, query);
    return {
      items: filtered.slice(query.offset, query.offset + query.limit),
      summary: buildReconciliationSummary(allItems),
      filteredSummary: buildReconciliationSummary(filtered),
      pagination: {
        limit: query.limit,
        offset: query.offset,
        total: filtered.length,
        hasMore: query.offset + query.limit < filtered.length,
      },
    };
  }

  async detail(caseId: string): Promise<ReconciliationItem> {
    const item = await prisma.reconciliationCase.findUnique({
      where: { id: caseId },
      include: { participants: true },
    });
    if (!item) throw new NotFoundError("Reconciliation case");
    return mapCase(item);
  }

  async resolve(
    caseId: string,
    action: ResolveReconciliationInput["action"],
  ): Promise<ReconciliationItem> {
    const item = await prisma.reconciliationCase.findUnique({
      where: { id: caseId },
      include: { participants: true },
    });
    if (!item) throw new NotFoundError("Reconciliation case");

    const left = item.participants.find(
      (participant: { role: string; movementId: string | null }) =>
        participant.role === "left",
    );
    const right = item.participants.find(
      (participant: { role: string; movementId: string | null }) =>
        participant.role === "right",
    );
    let excludedMovementId: string | null = null;
    if (action === "exclude_left") {
      if (!left?.movementId) {
        throw new ValidationError(
          "El registro izquierdo no es un movimiento que pueda excluirse.",
        );
      }
      excludedMovementId = left.movementId;
    } else if (action === "exclude_right") {
      if (!right?.movementId) {
        throw new ValidationError(
          "El registro derecho no es un movimiento que pueda excluirse.",
        );
      }
      excludedMovementId = right.movementId;
    }

    await prisma.reconciliationCase.update({
      where: { id: caseId },
      data: {
        status: action === "dismiss" ? "dismissed" : "resolved",
        resolution: action,
        excludedMovementId,
        resolvedAt: new Date(),
      },
    });
    return this.detail(caseId);
  }

  async reopen(caseId: string): Promise<ReconciliationItem> {
    const existing = await prisma.reconciliationCase.findUnique({
      where: { id: caseId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError("Reconciliation case");

    await prisma.reconciliationCase.update({
      where: { id: caseId },
      data: {
        status: "open",
        resolution: null,
        excludedMovementId: null,
        resolvedAt: null,
      },
    });
    return this.detail(caseId);
  }
}

export const reconciliationService = new ReconciliationService();
