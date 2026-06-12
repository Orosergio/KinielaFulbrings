import type { Match, Prediction, SyncStatus } from "../types";

export function outcome(home: number, away: number) {
  return Math.sign(home - away);
}

export function predictionPoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
) {
  if (predictedHome === actualHome && predictedAway === actualAway) return 7;
  const sameResult =
    outcome(predictedHome, predictedAway) === outcome(actualHome, actualAway);
  const oneGoalExact =
    predictedHome === actualHome || predictedAway === actualAway;
  if (sameResult && oneGoalExact) return 4;
  if (sameResult) return 3;
  if (oneGoalExact) return 1;
  return 0;
}

export function isLocked(match: Match, now = Date.now()) {
  return match.status !== "SCHEDULED" || new Date(match.kickoffAt).getTime() <= now;
}

export function isPickable(match: Match, now = Date.now()) {
  return (
    !isLocked(match, now) &&
    match.homeTeamId !== null &&
    match.awayTeamId !== null
  );
}

export function ownPrediction(
  predictions: Prediction[],
  matchId: number,
  userId: string,
) {
  return predictions.find(
    (prediction) =>
      prediction.matchId === matchId && prediction.userId === userId,
  );
}

export function pendingMatches(
  matches: Match[],
  predictions: Prediction[],
  userId: string,
  now = Date.now(),
) {
  const completed = new Set(
    predictions
      .filter((prediction) => prediction.userId === userId)
      .map((prediction) => prediction.matchId),
  );
  return matches.filter(
    (match) => isPickable(match, now) && !completed.has(match.id),
  );
}

export function calendarMatches(matches: Match[]) {
  return [...matches].sort(
    (left, right) =>
      new Date(left.kickoffAt).getTime() - new Date(right.kickoffAt).getTime() ||
      left.id - right.id,
  );
}

export function scoreStateChanged(
  current: { status: string; homeScore: number | null; awayScore: number | null },
  next: { status: string; homeScore: number | null; awayScore: number | null },
) {
  return (
    current.status !== next.status ||
    current.homeScore !== next.homeScore ||
    current.awayScore !== next.awayScore
  );
}

export function safeProviderState(
  current: { status: string; homeScore: number | null; awayScore: number | null },
  next: { status: string; homeScore: number | null; awayScore: number | null },
) {
  const wouldRegressFinished =
    current.status === "FINISHED" && next.status !== "FINISHED";
  const wouldRegressLive =
    (current.status === "LIVE" || current.status === "PAUSED") &&
    next.status === "SCHEDULED";

  return wouldRegressFinished || wouldRegressLive ? current : next;
}

export type SyncHealth = {
  state: "healthy" | "syncing" | "error";
  reason: "ok" | "missing" | "running" | "failed" | "stale" | "incomplete";
};

export function syncHealth(
  sync: SyncStatus | null,
  serverNow: string,
  expectedMatches: number,
  staleAfterMs = 8 * 60 * 1000,
): SyncHealth {
  if (!sync) return { state: "error", reason: "missing" };

  const now = new Date(serverNow).getTime();
  const reference = new Date(sync.finishedAt ?? sync.startedAt).getTime();
  const age = now - reference;

  if (sync.status === "RUNNING") {
    return age <= 60_000
      ? { state: "syncing", reason: "running" }
      : { state: "error", reason: "stale" };
  }
  if (sync.status === "FAILED") {
    return { state: "error", reason: "failed" };
  }
  if (!Number.isFinite(age) || age > staleAfterMs) {
    return { state: "error", reason: "stale" };
  }

  let detailComplete = true;
  if (sync.detail) {
    try {
      const detail = JSON.parse(sync.detail) as { complete?: boolean };
      detailComplete = detail.complete !== false;
    } catch {
      detailComplete = false;
    }
  }

  if (
    !detailComplete ||
    sync.matchesSeen < expectedMatches ||
    sync.matchesUpdated < expectedMatches
  ) {
    return { state: "error", reason: "incomplete" };
  }

  return { state: "healthy", reason: "ok" };
}
