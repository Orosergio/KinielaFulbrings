import type { Match, Prediction } from "../types";

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
