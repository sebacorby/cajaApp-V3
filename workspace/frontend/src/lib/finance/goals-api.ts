const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";


export type GoalCurrency = "ARS" | "USD";
export type GoalStatus = "active" | "paused" | "completed" | "closed";


export interface GoalContribution {
  id: string;
  goalId: string;
  contributedOn: string;
  amount: string;
  notes: string | null;
  referenceType: string | null;
  referenceId: string | null;
  referenceLabel: string | null;
  createdAt: string;
  updatedAt: string;
}


export interface GoalActivity {
  id: string;
  kind: string;
  detail: unknown;
  createdAt: string;
}


export interface GoalRecord {
  id: string;
  name: string;
  targetAmount: string;
  contributedAmount: string;
  remainingAmount: string;
  progressBasisPoints: number;
  progressPercent: string;
  currency: GoalCurrency;
  targetDate: string | null;
  status: GoalStatus;
  notes: string | null;
  completedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contributions: GoalContribution[];
  history: GoalActivity[];
}


export interface GoalPayload {
  name: string;
  targetAmount: string;
  currency: GoalCurrency;
  targetDate?: string | null;
  status?: "active" | "paused";
  notes?: string | null;
}


export interface GoalOverviewCurrency {
  goalCount: number;
  targetAmount: string;
  contributedAmount: string;
  remainingAmount: string;
  progressBasisPoints: number;
  progressPercent: string;
}


export interface GoalOverviewFeatured {
  id: string;
  name: string;
  currency: GoalCurrency;
  targetAmount: string;
  contributedAmount: string;
  remainingAmount: string;
  progressBasisPoints: number;
  progressPercent: string;
  targetDate: string | null;
  status: GoalStatus;
}


export interface GoalsOverview {
  filter: {
    status: GoalStatus | null;
    limit: number;
  };
  participantCount: number;
  statusCounts: Record<GoalStatus, number>;
  nearestActiveTargetDate: string | null;
  currencies: Record<GoalCurrency, GoalOverviewCurrency>;
  featuredGoals: GoalOverviewFeatured[];
}


export interface GoalsOverviewQuery {
  status?: GoalStatus;
  limit?: number;
}


export interface GoalContributionPayload {
  contributedOn: string;
  amount: string;
  notes?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  referenceLabel?: string | null;
}


export class GoalsApiError extends Error {
  constructor(message: string, public statusCode: number, public code?: string) {
    super(message);
    this.name = "GoalsApiError";
  }
}


async function parseError(response: Response): Promise<GoalsApiError> {
  let message = `HTTP ${response.status}`;
  let code: string | undefined;
  try {
    const body = (await response.json()) as { message?: string; error?: string; code?: string };
    message = body.message || body.error || message;
    code = body.code;
  } catch {
    message = (await response.text()) || message;
  }
  return new GoalsApiError(message, response.status, code);
}


async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<T>;
}


export async function listGoals(status?: GoalStatus): Promise<GoalRecord[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const suffix = params.size ? `?${params.toString()}` : "";
  return handleResponse(await fetch(`${API_BASE_URL}/api/goals${suffix}`, { cache: "no-store" }));
}


export async function getGoalsOverview(
  query: GoalsOverviewQuery = {},
): Promise<GoalsOverview> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  const suffix = params.size ? `?${params.toString()}` : "";
  return handleResponse(await fetch(
    `${API_BASE_URL}/api/goals/overview${suffix}`,
    { cache: "no-store" },
  ));
}


export async function createGoal(payload: GoalPayload): Promise<GoalRecord> {
  return handleResponse(await fetch(`${API_BASE_URL}/api/goals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }));
}


export async function updateGoal(goalId: string, payload: Partial<GoalPayload>): Promise<GoalRecord> {
  return handleResponse(await fetch(`${API_BASE_URL}/api/goals/${encodeURIComponent(goalId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }));
}


export async function changeGoalStatus(goalId: string, status: GoalStatus, note?: string): Promise<GoalRecord> {
  return handleResponse(await fetch(`${API_BASE_URL}/api/goals/${encodeURIComponent(goalId)}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, note: note || null }),
  }));
}


export async function addGoalContribution(goalId: string, payload: GoalContributionPayload): Promise<GoalRecord> {
  return handleResponse(await fetch(`${API_BASE_URL}/api/goals/${encodeURIComponent(goalId)}/contributions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }));
}


export async function deleteGoalContribution(goalId: string, contributionId: string): Promise<GoalRecord> {
  return handleResponse(await fetch(`${API_BASE_URL}/api/goals/${encodeURIComponent(goalId)}/contributions/${encodeURIComponent(contributionId)}`, {
    method: "DELETE",
  }));
}


export async function deleteGoal(goalId: string): Promise<{ success: boolean }> {
  return handleResponse(await fetch(`${API_BASE_URL}/api/goals/${encodeURIComponent(goalId)}`, { method: "DELETE" }));
}