export type Language = "es" | "en";
export type Theme = "light" | "dark";
export type View = "home" | "picks" | "group" | "bracket";

export type User = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  roles: string[];
};

export type Pool = {
  id: string;
  name: string;
  code: string;
  role: "owner" | "admin" | "member";
  ownerUserId: string;
  memberCount: number;
};

export type Member = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
};

export type MatchStatus =
  | "SCHEDULED"
  | "LIVE"
  | "PAUSED"
  | "FINISHED"
  | "POSTPONED"
  | "CANCELLED";

export type MatchWinnerSide = "home" | "away";

export type Match = {
  id: number;
  providerMatchId: number | null;
  stage: string;
  groupName: string | null;
  matchday: number;
  kickoffAt: string;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeLabel: string | null;
  awayLabel: string | null;
  stadiumId: number | null;
  status: MatchStatus;
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  winnerSide: MatchWinnerSide | null;
  updatedAt: string;
};

export type Prediction = {
  userId: string;
  matchId: number;
  homeScore: number;
  awayScore: number;
  advancingSide: MatchWinnerSide | null;
  scorePoints: number | null;
  advancementPoints: number | null;
  points: number | null;
  updatedAt: string;
};

export type LeaderboardRow = {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  points: number;
  pickCount: number;
  exacts: number;
};

export type SyncStatus = {
  provider: string;
  status: "RUNNING" | "SUCCESS" | "FAILED";
  matchesSeen: number;
  matchesUpdated: number;
  detail: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type BootstrapData = {
  serverNow: string;
  currentUser: User;
  selectedPoolId?: string;
  pools: Pool[];
  members: Member[];
  matches: Match[];
  predictions: Prediction[];
  leaderboard: LeaderboardRow[];
  syncStatus: SyncStatus | null;
};

export type StaticTeam = {
  id: string;
  fifaCode: string;
  iso2: string;
  group: string;
  name: { en: string; es: string };
  flag: string;
  scouting: {
    rating: number;
    attack: number;
    midfield: number;
    defense: number;
    tempo: number;
    experience: number;
    style_en: string;
    style_es: string;
    players: [string, string, string][];
  };
};

export type StaticStadium = {
  id: string;
  name: string;
  fifaName: string;
  city: string;
  country: { en: string; es: string };
  capacity: number;
  region: string;
  timeZone: string;
};
