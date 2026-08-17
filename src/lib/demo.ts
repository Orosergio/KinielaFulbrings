import finalResults from "../../data/worldcup-2026-results.json";
import {
  isKnockoutStage,
  matchWinnerSide,
  predictionAdvancementPoints,
  predictionPoints,
} from "./game";
import type {
  BootstrapData,
  Match,
  MatchWinnerSide,
  Member,
  Prediction,
} from "../types";

const archivedMatches = finalResults as unknown as Match[];
const poolId = "7f1f21de-e32e-49c5-b4cb-98d212a69244";
const demoUserId = "demo-user";

const demoMembers: Member[] = [
  { id: demoUserId, displayName: "Sergio", role: "owner", joinedAt: "" },
  { id: "alex", displayName: "Alex", role: "member", joinedAt: "" },
  { id: "camila", displayName: "Camila", role: "member", joinedAt: "" },
  { id: "diego", displayName: "Diego", role: "member", joinedAt: "" },
  { id: "nora", displayName: "Nora", role: "member", joinedAt: "" },
];

function demoScore(match: Match, memberIndex: number): [number, number] {
  const home = match.homeScore ?? 0;
  const away = match.awayScore ?? 0;
  if (memberIndex === 0 && match.id >= 101) return [home, away];

  switch ((match.id + memberIndex * 2) % 6) {
    case 0:
      return [home, away];
    case 1:
      return [home + 1, away];
    case 2:
      return [home, away + 1];
    case 3:
      return [Math.max(0, home - 1), away];
    case 4:
      return [home, Math.max(0, away - 1)];
    default:
      return [away, home];
  }
}

function opposite(side: MatchWinnerSide): MatchWinnerSide {
  return side === "home" ? "away" : "home";
}

function demoPredictions(): Prediction[] {
  return demoMembers.flatMap((member, memberIndex) =>
    archivedMatches.map((match) => {
      const [homeScore, awayScore] = demoScore(match, memberIndex);
      const actualHome = match.homeScore ?? 0;
      const actualAway = match.awayScore ?? 0;
      const actualWinner = matchWinnerSide(match);
      const advancingSide =
        isKnockoutStage(match.stage) && actualWinner
          ? (match.id + memberIndex) % 5 === 0
            ? opposite(actualWinner)
            : actualWinner
          : null;
      const scorePoints = predictionPoints(
        homeScore,
        awayScore,
        actualHome,
        actualAway,
      );
      const advancementPoints = predictionAdvancementPoints(
        advancingSide,
        actualWinner,
        match.stage,
      );

      return {
        userId: member.id,
        matchId: match.id,
        homeScore,
        awayScore,
        advancingSide,
        scorePoints,
        advancementPoints,
        points: scorePoints + advancementPoints,
        updatedAt: match.updatedAt,
      };
    }),
  );
}

export function demoBootstrap(): BootstrapData {
  const now = new Date().toISOString();
  const predictions = demoPredictions();
  const leaderboard = demoMembers
    .map((member) => {
      const picks = predictions.filter((pick) => pick.userId === member.id);
      return {
        userId: member.id,
        displayName: member.displayName,
        points: picks.reduce((total, pick) => total + (pick.points ?? 0), 0),
        pickCount: picks.length,
        exacts: picks.filter((pick) => pick.scorePoints === 7).length,
      };
    })
    .sort(
      (left, right) =>
        right.points - left.points ||
        right.exacts - left.exacts ||
        left.displayName.localeCompare(right.displayName),
    );

  return {
    serverNow: now,
    currentUser: {
      id: demoUserId,
      email: "portfolio@example.com",
      displayName: "Sergio",
      roles: [],
    },
    selectedPoolId: poolId,
    pools: [
      {
        id: poolId,
        name: "Portfolio Cup",
        code: "DEMO26",
        role: "owner",
        ownerUserId: demoUserId,
        memberCount: demoMembers.length,
      },
    ],
    members: demoMembers,
    matches: archivedMatches,
    predictions,
    leaderboard,
    syncStatus: {
      provider: "static-archive",
      status: "SUCCESS",
      matchesSeen: archivedMatches.length,
      matchesUpdated: archivedMatches.length,
      detail: JSON.stringify({
        expectedMatches: archivedMatches.length,
        complete: true,
        archived: true,
      }),
      startedAt: now,
      finishedAt: now,
    },
  };
}
