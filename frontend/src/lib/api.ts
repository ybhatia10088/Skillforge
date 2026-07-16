const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface SessionState {
  id: string;
  problem_id: string;
  statement: string;
  starter_code: string;
  status: string;
  language: string;
  latest_code: string;
  latest_snapshot_version: number;
}

export interface CreateSessionResponse {
  id: string;
  problem_id: string;
  statement: string;
  starter_code: string;
  language: string;
}

export interface RunResult {
  status: string;
  stdout: string;
  stderr: string;
  compile_output: string;
  tests: { name: string; passed: boolean; calls?: unknown[] }[];
  tests_passed: number;
  tests_total: number;
  all_passed: boolean;
}

export interface ReportData {
  session_id: string;
  status: string;
  final_code: string;
  scores: {
    technical_score?: number;
    debugging_score?: number;
    time_management_score?: number;
    strengths?: string[];
    weaknesses?: string[];
  };
  computed_metrics: Record<string, unknown>;
  evidence: { claim: string; timestamp: string }[];
  summary: string;
  limitations: string[];
  confidence: string;
  timeline: string[];
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  createSession: () => req<CreateSessionResponse>("/sessions", { method: "POST" }),

  getSession: (id: string) => req<SessionState>(`/sessions/${id}`),

  postEvents: (id: string, body: { events?: unknown[]; snapshots?: unknown[] }) =>
    req<{ ok: boolean }>(`/sessions/${id}/events`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  runCode: (id: string, source_code: string) =>
    req<RunResult>(`/sessions/${id}/run`, {
      method: "POST",
      body: JSON.stringify({ source_code }),
    }),

  endSession: (id: string, final_code: string) =>
    req<{ ok: boolean }>(`/sessions/${id}/end`, {
      method: "POST",
      body: JSON.stringify({ final_code }),
    }),

  getReport: (id: string) => req<ReportData>(`/sessions/${id}/report`),
};
