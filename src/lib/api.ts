import type { BootstrapData, Prediction } from "../types";
import type { MatchWinnerSide } from "../types";

type ApiErrorBody = {
  error?: string;
  code?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new ApiError(
      body.error ?? `Request failed (${response.status})`,
      response.status,
      body.code,
    );
  }

  return response.json() as Promise<T>;
}

export function getBootstrap(poolId?: string) {
  const query = poolId ? `?pool=${encodeURIComponent(poolId)}` : "";
  return request<BootstrapData>(`/api/bootstrap${query}`);
}

export function savePrediction(payload: {
  poolId: string;
  matchId: number;
  homeScore: number;
  awayScore: number;
  advancingSide?: MatchWinnerSide | null;
}) {
  return request<{ prediction: Prediction }>("/api/predictions", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function createPool(name: string) {
  return request<{ pool: { id: string } }>("/api/pools", {
    method: "POST",
    body: JSON.stringify({ action: "create", name }),
  });
}

export function joinPool(code: string) {
  return request<{ pool: { id: string } }>("/api/pools", {
    method: "POST",
    body: JSON.stringify({ action: "join", code }),
  });
}
