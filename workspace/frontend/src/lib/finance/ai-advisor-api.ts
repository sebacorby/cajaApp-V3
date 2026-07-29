const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:11436";


export type AiAdvisorCurrency = "ARS" | "USD";
export type AiAdvisorMode = "analysis" | "simulation";
export type AiAdvisorSection =
  | "movimientos"
  | "ingresos"
  | "tarjetas"
  | "deuda"
  | "presupuestos"
  | "objetivos"
  | "reportes"
  | "salud";


export interface AiAdvisorAction {
  section: AiAdvisorSection;
  label: string;
  drilldown?: {
    from: string;
    to: string;
    label: string;
    type?: "income" | "expense";
    source?: string;
    category?: string;
    status?: "actual" | "pending" | "projected";
    includeProjected?: boolean;
  };
}


export interface AiAdvisorSource {
  id: string;
  kind: string;
  label: string;
  description: string;
  period: { from: string; to: string };
  currency: AiAdvisorCurrency | null;
  value: string;
  rule: string | null;
  action: AiAdvisorAction;
}


export interface AiAdvisorContext {
  schemaVersion: string;
  period: { from: string; to: string };
  financialHealthFormulaVersion: string;
  sourceFingerprint: string;
  sourceCount: number;
  summary: {
    currencies: Record<AiAdvisorCurrency, {
      financialHealthStatus: string;
      score: number | null;
      bandLabel: string;
      confidence: string;
      actualBalance: string;
      expectedBalance: string;
      futureExpectedResult: string;
      budgetUsagePercent: string;
      activeGoals: number;
    }>;
    alerts: number;
    criticalAlerts: number;
    unclassifiedRecords: number;
    latestDataAt: string | null;
  };
  sources: AiAdvisorSource[];
  suggestedQuestions: string[];
}


export interface AiAdvisorContextResponse {
  context: AiAdvisorContext;
  provider: { name: string; model: string; configured: boolean };
  promptVersion: string;
  limits: { maxQuestionCharacters: number; maxContextCharacters: number };
  disclaimer: string;
}


export interface AiAdvisorScenarioInput {
  label: string;
  currency: AiAdvisorCurrency;
  incomeDelta: string;
  expenseDelta: string;
  commitmentDelta: string;
  assumptions: string[];
}


export interface AiAdvisorSimulation extends AiAdvisorScenarioInput {
  baselineExpectedBalance: string;
  simulatedExpectedBalance: string;
  disclaimer: string;
}


export interface AiAdvisorQuestionInput {
  from: string;
  to: string;
  question: string;
  mode: AiAdvisorMode;
  currency?: AiAdvisorCurrency;
  scenario?: AiAdvisorScenarioInput;
}


export interface AiAdvisorClaim {
  id: string;
  text: string;
  kind: "fact" | "inference" | "simulation";
  sourceIds: string[];
}


export interface AiAdvisorRisk {
  title: string;
  explanation: string;
  severity: "info" | "attention";
  sourceIds: string[];
}


export interface AiAdvisorAlternative {
  title: string;
  description: string;
  kind: "simulation";
  assumptions: string[];
  sourceIds: string[];
}


export interface AiAdvisorAnswer {
  schemaVersion: string;
  title: string;
  answer: string;
  confidence: "high" | "medium" | "low";
  claims: AiAdvisorClaim[];
  risks: AiAdvisorRisk[];
  alternatives: AiAdvisorAlternative[];
  limitations: string[];
  followUpQuestions: string[];
  citations: AiAdvisorSource[];
}


export interface AiAdvisorInteraction {
  id: string;
  period: { from: string; to: string };
  mode: AiAdvisorMode;
  question: string;
  currency: AiAdvisorCurrency | null;
  scenario: AiAdvisorSimulation | null;
  context: {
    version: string;
    fingerprint: string;
    sourceCount: number;
    financialHealthFormulaVersion: string;
  };
  provider: { name: string; model: string; requestId: string; durationMs: number };
  prompt: { version: string; sha256: string };
  answer: AiAdvisorAnswer;
  createdAt: string;
  disclaimer: string;
}


export interface AiAdvisorHistoryItem {
  id: string;
  period: { from: string; to: string };
  mode: AiAdvisorMode;
  question: string;
  currency: AiAdvisorCurrency | null;
  title: string;
  confidence: string;
  provider: string;
  model: string;
  promptVersion: string;
  contextFingerprint: string;
  createdAt: string;
}


export class AiAdvisorApiError extends Error {
  constructor(message: string, public statusCode: number, public code?: string) {
    super(message);
    this.name = "AiAdvisorApiError";
  }
}


async function parseError(response: Response): Promise<AiAdvisorApiError> {
  let message = `HTTP ${response.status}`;
  let code: string | undefined;
  try {
    const body = await response.json() as { message?: string; error?: string; code?: string };
    message = body.message || body.error || message;
    code = body.code;
  } catch {
    message = (await response.text()) || message;
  }
  return new AiAdvisorApiError(message, response.status, code);
}


function rangeQuery(from: string, to: string): string {
  return new URLSearchParams({ from, to }).toString();
}


export async function getAiAdvisorContext(from: string, to: string): Promise<AiAdvisorContextResponse> {
  const response = await fetch(`${API_BASE_URL}/api/ai-advisor/context?${rangeQuery(from, to)}`, { cache: "no-store" });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<AiAdvisorContextResponse>;
}


export async function askAiAdvisor(input: AiAdvisorQuestionInput): Promise<AiAdvisorInteraction> {
  const response = await fetch(`${API_BASE_URL}/api/ai-advisor/ask`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<AiAdvisorInteraction>;
}


export async function getAiAdvisorHistory(limit = 20): Promise<AiAdvisorHistoryItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/ai-advisor/history?limit=${limit}`, { cache: "no-store" });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<AiAdvisorHistoryItem[]>;
}


export async function getAiAdvisorInteraction(interactionId: string): Promise<AiAdvisorInteraction> {
  const response = await fetch(`${API_BASE_URL}/api/ai-advisor/history/${interactionId}`, { cache: "no-store" });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<AiAdvisorInteraction>;
}


export async function deleteAiAdvisorInteraction(interactionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/ai-advisor/history/${interactionId}`, { method: "DELETE" });
  if (!response.ok) throw await parseError(response);
}