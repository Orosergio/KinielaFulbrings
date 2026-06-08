import { describe, expect, it } from "vitest";
import type { Match } from "../types";
import { isLocked, predictionPoints } from "./game";

function match(overrides: Partial<Match> = {}): Match {
  return {
    id: 1,
    providerMatchId: 1,
    stage: "group",
    groupName: "A",
    matchday: 1,
    kickoffAt: "2026-06-11T19:00:00.000Z",
    homeTeamId: 1,
    awayTeamId: 2,
    homeLabel: null,
    awayLabel: null,
    stadiumId: 1,
    status: "SCHEDULED",
    minute: null,
    homeScore: null,
    awayScore: null,
    updatedAt: "2026-06-09T00:00:00.000Z",
    ...overrides,
  };
}

describe("predictionPoints", () => {
  it("awards 7 for an exact score", () => {
    expect(predictionPoints(2, 1, 2, 1)).toBe(7);
  });

  it("awards 4 for the result and one exact goal count", () => {
    expect(predictionPoints(2, 0, 2, 1)).toBe(4);
  });

  it("awards 3 for only the correct result", () => {
    expect(predictionPoints(3, 1, 2, 0)).toBe(3);
  });

  it("awards 1 for one goal count without the result", () => {
    expect(predictionPoints(1, 0, 1, 2)).toBe(1);
  });

  it("awards 0 when nothing matches", () => {
    expect(predictionPoints(0, 3, 2, 1)).toBe(0);
  });
});

describe("isLocked", () => {
  const kickoff = Date.parse("2026-06-11T19:00:00.000Z");

  it("allows picks before kickoff while scheduled", () => {
    expect(isLocked(match(), kickoff - 1)).toBe(false);
  });

  it("locks picks at kickoff", () => {
    expect(isLocked(match(), kickoff)).toBe(true);
  });

  it("locks picks whenever the provider marks the match as live", () => {
    expect(
      isLocked(
        match({
          status: "LIVE",
          kickoffAt: "2026-06-12T19:00:00.000Z",
        }),
        kickoff,
      ),
    ).toBe(true);
  });
});
