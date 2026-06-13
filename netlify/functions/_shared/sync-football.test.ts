import { describe, expect, it } from "vitest";
import {
  clampMinute,
  publicApiMinute,
  publicApiStatus,
  scoreValue,
  statusNeedsScores,
  type PublicApiMatch,
} from "./sync-football";

describe("clampMinute", () => {
  it("keeps integers within the matches_minute_valid range", () => {
    expect(clampMinute(0)).toBe(0);
    expect(clampMinute(45)).toBe(45);
    expect(clampMinute(180)).toBe(180);
  });

  it("drops out-of-range, fractional, or missing values to null", () => {
    // football-data.org can emit a minute past the CHECK ceiling; writing it
    // raw would abort the whole sync run, so it must clamp to null instead.
    expect(clampMinute(181)).toBeNull();
    expect(clampMinute(-1)).toBeNull();
    expect(clampMinute(45.5)).toBeNull();
    expect(clampMinute(Number.NaN)).toBeNull();
    expect(clampMinute(null)).toBeNull();
    expect(clampMinute(undefined)).toBeNull();
  });
});

describe("publicApiMinute", () => {
  it("reads added time as the base minute, never concatenated", () => {
    expect(publicApiMinute("45+2")).toBe(45);
    expect(publicApiMinute("90+5")).toBe(90);
    expect(publicApiMinute("120+3")).toBe(120);
  });

  it("returns null for non-numeric or out-of-range clocks", () => {
    expect(publicApiMinute("notstarted")).toBeNull();
    expect(publicApiMinute("")).toBeNull();
    expect(publicApiMinute(undefined)).toBeNull();
    expect(publicApiMinute("half time")).toBeNull();
    expect(publicApiMinute("185")).toBeNull();
  });
});

describe("publicApiStatus", () => {
  const game = (overrides: Partial<PublicApiMatch> = {}): PublicApiMatch => ({
    id: "1",
    ...overrides,
  });

  it("treats a finished flag as FINISHED regardless of casing", () => {
    expect(publicApiStatus(game({ finished: "TRUE" }))).toBe("FINISHED");
    expect(publicApiStatus(game({ finished: "true" }))).toBe("FINISHED");
  });

  it("maps the elapsed clock to a live status", () => {
    expect(publicApiStatus(game({ time_elapsed: "notstarted" }))).toBe(
      "SCHEDULED",
    );
    expect(publicApiStatus(game({ time_elapsed: "" }))).toBe("SCHEDULED");
    expect(publicApiStatus(game({ time_elapsed: "halftime" }))).toBe("PAUSED");
    expect(publicApiStatus(game({ time_elapsed: "postponed" }))).toBe(
      "POSTPONED",
    );
    expect(publicApiStatus(game({ time_elapsed: "cancelled" }))).toBe(
      "CANCELLED",
    );
    expect(publicApiStatus(game({ time_elapsed: "67" }))).toBe("LIVE");
  });
});

describe("scoreValue", () => {
  it("accepts zero and in-range integers from strings or numbers", () => {
    expect(scoreValue("0")).toBe(0);
    expect(scoreValue(0)).toBe(0);
    expect(scoreValue("3")).toBe(3);
  });

  it("rejects empty, fractional, negative, or oversized scores", () => {
    expect(scoreValue("")).toBeNull();
    expect(scoreValue(null)).toBeNull();
    expect(scoreValue(undefined)).toBeNull();
    expect(scoreValue("2.5")).toBeNull();
    expect(scoreValue("-1")).toBeNull();
    expect(scoreValue("31")).toBeNull();
    expect(scoreValue("abc")).toBeNull();
  });
});

describe("statusNeedsScores", () => {
  it("requires scores only for active statuses", () => {
    expect(statusNeedsScores("LIVE")).toBe(true);
    expect(statusNeedsScores("PAUSED")).toBe(true);
    expect(statusNeedsScores("FINISHED")).toBe(true);
    expect(statusNeedsScores("SCHEDULED")).toBe(false);
    expect(statusNeedsScores("POSTPONED")).toBe(false);
    expect(statusNeedsScores("CANCELLED")).toBe(false);
  });
});
