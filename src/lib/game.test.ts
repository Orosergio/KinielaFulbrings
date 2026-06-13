import { describe, expect, it } from "vitest";
import type { Match } from "../types";
import {
  calendarMatches,
  isLocked,
  predictionPoints,
  resolveProviderState,
  safeProviderState,
  scoreStateChanged,
  syncHealth,
} from "./game";
import type { SyncStatus } from "../types";

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

describe("calendarMatches", () => {
  it("keeps completed and past matches in the tournament calendar", () => {
    const completed = match({
      id: 1,
      status: "FINISHED",
      kickoffAt: "2026-06-11T19:00:00.000Z",
      homeScore: 2,
      awayScore: 1,
    });
    const upcoming = match({
      id: 2,
      kickoffAt: "2026-06-13T19:00:00.000Z",
    });

    expect(calendarMatches([upcoming, completed]).map((item) => item.id)).toEqual([
      1, 2,
    ]);
  });
});

describe("scoreStateChanged", () => {
  const finished = { status: "FINISHED", homeScore: 2, awayScore: 0 };

  it("skips scoring when a repeated provider update has the same result", () => {
    expect(scoreStateChanged(finished, { ...finished })).toBe(false);
  });

  it("recalculates scoring when the result changes", () => {
    expect(
      scoreStateChanged(finished, {
        status: "FINISHED",
        homeScore: 2,
        awayScore: 1,
      }),
    ).toBe(true);
  });
});

describe("safeProviderState", () => {
  it("does not regress a finished match when a provider sends stale data", () => {
    const current = { status: "FINISHED", homeScore: 2, awayScore: 0 };
    expect(
      safeProviderState(current, {
        status: "SCHEDULED",
        homeScore: null,
        awayScore: null,
      }),
    ).toEqual(current);
  });

  it("accepts a corrected final score", () => {
    expect(
      safeProviderState(
        { status: "FINISHED", homeScore: 2, awayScore: 0 },
        { status: "FINISHED", homeScore: 2, awayScore: 1 },
      ),
    ).toEqual({ status: "FINISHED", homeScore: 2, awayScore: 1 });
  });
});

describe("resolveProviderState", () => {
  const kickoffAt = "2026-06-12T23:00:00.000Z";
  const kickoff = Date.parse(kickoffAt);

  it("ignores a FINISHED report before the match could physically end", () => {
    expect(
      resolveProviderState(
        { status: "LIVE", homeScore: 0, awayScore: 0, kickoffAt },
        { status: "FINISHED", homeScore: 0, awayScore: 0 },
        kickoff + 30 * 60 * 1000,
      ),
    ).toEqual({ status: "LIVE", homeScore: 0, awayScore: 0 });
  });

  it("keeps tracking provider scores while rejecting a premature finish", () => {
    expect(
      resolveProviderState(
        { status: "LIVE", homeScore: 0, awayScore: 0, kickoffAt },
        { status: "FINISHED", homeScore: 1, awayScore: 0 },
        kickoff + 30 * 60 * 1000,
      ),
    ).toEqual({ status: "LIVE", homeScore: 1, awayScore: 0 });
  });

  it("leaves a scheduled match untouched on a premature finish", () => {
    expect(
      resolveProviderState(
        { status: "SCHEDULED", homeScore: null, awayScore: null, kickoffAt },
        { status: "FINISHED", homeScore: 0, awayScore: 0 },
        kickoff + 30 * 60 * 1000,
      ),
    ).toEqual({ status: "SCHEDULED", homeScore: null, awayScore: null });
  });

  it("accepts FINISHED once the match could really be over", () => {
    expect(
      resolveProviderState(
        { status: "LIVE", homeScore: 1, awayScore: 0, kickoffAt },
        { status: "FINISHED", homeScore: 1, awayScore: 0 },
        kickoff + 110 * 60 * 1000,
      ),
    ).toEqual({ status: "FINISHED", homeScore: 1, awayScore: 0 });
  });

  it("rolls a glitched FINISHED back to LIVE while the match can still run", () => {
    expect(
      resolveProviderState(
        { status: "FINISHED", homeScore: 0, awayScore: 0, kickoffAt },
        { status: "LIVE", homeScore: 1, awayScore: 0 },
        kickoff + 2 * 60 * 60 * 1000,
      ),
    ).toEqual({ status: "LIVE", homeScore: 1, awayScore: 0 });
  });

  it("keeps a final sticky once the match window has passed", () => {
    expect(
      resolveProviderState(
        { status: "FINISHED", homeScore: 1, awayScore: 0, kickoffAt },
        { status: "LIVE", homeScore: 2, awayScore: 0 },
        kickoff + 6 * 60 * 60 * 1000,
      ),
    ).toEqual({ status: "FINISHED", homeScore: 1, awayScore: 0 });
  });

  it("still blocks regressions to SCHEDULED on live matches", () => {
    expect(
      resolveProviderState(
        { status: "LIVE", homeScore: 1, awayScore: 0, kickoffAt },
        { status: "SCHEDULED", homeScore: null, awayScore: null },
        kickoff + 2 * 60 * 60 * 1000,
      ),
    ).toEqual({ status: "LIVE", homeScore: 1, awayScore: 0 });
  });
});

describe("syncHealth", () => {
  const serverNow = "2026-06-12T12:10:00.000Z";
  const sync: SyncStatus = {
    provider: "worldcup26.ir",
    status: "SUCCESS",
    matchesSeen: 104,
    matchesUpdated: 104,
    detail: JSON.stringify({ complete: true }),
    startedAt: "2026-06-12T12:07:00.000Z",
    finishedAt: "2026-06-12T12:07:04.000Z",
  };

  it("reports a recent complete synchronization as healthy", () => {
    expect(syncHealth(sync, serverNow, 104)).toEqual({
      state: "healthy",
      reason: "ok",
    });
  });

  it("reports failed and stale synchronizations as errors", () => {
    expect(syncHealth({ ...sync, status: "FAILED" }, serverNow, 104).state).toBe(
      "error",
    );
    expect(
      syncHealth(
        {
          ...sync,
          startedAt: "2026-06-12T11:50:00.000Z",
          finishedAt: "2026-06-12T11:50:04.000Z",
        },
        serverNow,
        104,
      ).reason,
    ).toBe("stale");
  });

  it("reports incomplete provider coverage as an error", () => {
    expect(
      syncHealth({ ...sync, matchesUpdated: 103 }, serverNow, 104).reason,
    ).toBe("incomplete");
  });
});
