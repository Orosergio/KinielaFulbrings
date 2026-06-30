import dataset from "../../data/worldcup-2026.json";
import type { BootstrapData, Match } from "../types";

const mapStatus = (value: string): Match["status"] => {
  if (value.toLowerCase().includes("finish")) return "FINISHED";
  if (value.toLowerCase().includes("live")) return "LIVE";
  return "SCHEDULED";
};

export function demoBootstrap(): BootstrapData {
  const user = {
    id: "demo-user",
    email: "kike@example.com",
    displayName: "Kike",
    roles: [],
  };
  const poolId = "7f1f21de-e32e-49c5-b4cb-98d212a69244";

  return {
    serverNow: new Date().toISOString(),
    currentUser: user,
    selectedPoolId: poolId,
    pools: [
      {
        id: poolId,
        name: "Los de siempre",
        code: "MUNDIAL26",
        role: "owner",
        ownerUserId: user.id,
        memberCount: 5,
      },
    ],
    members: [
      { id: "bryan", displayName: "Bryan", role: "member", joinedAt: "" },
      { id: "chipa", displayName: "Chipa", role: "member", joinedAt: "" },
      { id: user.id, displayName: "Kike", role: "owner", joinedAt: "" },
      { id: "laib", displayName: "Laib", role: "member", joinedAt: "" },
      { id: "richi", displayName: "Richi", role: "member", joinedAt: "" },
    ],
    matches: dataset.matches.map((match) => {
      const source = match as typeof match & {
        homePenaltyScore?: number | null;
        awayPenaltyScore?: number | null;
        winnerSide?: "home" | "away" | null;
      };
      return {
        id: match.id,
        providerMatchId: null,
        stage: match.type,
        groupName: match.group,
        matchday: match.matchday,
        kickoffAt: match.kickoffUtc,
        homeTeamId: match.homeTeamId ? Number(match.homeTeamId) : null,
        awayTeamId: match.awayTeamId ? Number(match.awayTeamId) : null,
        homeLabel: match.homeLabel,
        awayLabel: match.awayLabel,
        stadiumId: match.stadiumId ? Number(match.stadiumId) : null,
        status: mapStatus(match.status),
        minute: null,
        homeScore: null,
        awayScore: null,
        homePenaltyScore: source.homePenaltyScore ?? null,
        awayPenaltyScore: source.awayPenaltyScore ?? null,
        winnerSide: source.winnerSide ?? null,
        updatedAt: new Date().toISOString(),
      };
    }),
    predictions: [
      {
        userId: user.id,
        matchId: 1,
        homeScore: 2,
        awayScore: 1,
        points: null,
        updatedAt: new Date().toISOString(),
      },
      {
        userId: user.id,
        matchId: 2,
        homeScore: 1,
        awayScore: 1,
        points: null,
        updatedAt: new Date().toISOString(),
      },
    ],
    leaderboard: [
      { userId: "bryan", displayName: "Bryan", points: 14, pickCount: 4, exacts: 1 },
      { userId: "chipa", displayName: "Chipa", points: 12, pickCount: 4, exacts: 1 },
      { userId: user.id, displayName: "Kike", points: 11, pickCount: 4, exacts: 1 },
      { userId: "laib", displayName: "Laib", points: 9, pickCount: 4, exacts: 0 },
      { userId: "richi", displayName: "Richi", points: 7, pickCount: 4, exacts: 1 },
    ],
    syncStatus: {
      provider: "worldcup26.ir",
      status: "SUCCESS",
      matchesSeen: 104,
      matchesUpdated: 104,
      detail: JSON.stringify({ expectedMatches: 104, complete: true }),
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    },
  };
}
