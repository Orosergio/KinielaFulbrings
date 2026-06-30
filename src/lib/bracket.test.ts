import dataset from "../../data/worldcup-2026.json";
import type { Match } from "../types";
import {
  bracketMatches,
  bracketMatchLabel,
  bracketStages,
  type BracketStageGroup,
} from "./bracket";
import { describe, expect, it } from "vitest";

function datasetMatches(): Match[] {
  return dataset.matches.map((match) => ({
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
    status: "SCHEDULED",
    minute: null,
    homeScore: null,
    awayScore: null,
    homePenaltyScore: null,
    awayPenaltyScore: null,
    winnerSide: null,
    updatedAt: "",
  }));
}

describe("bracketStages", () => {
  it("groups every knockout stage that should appear in the bracket", () => {
    expect(bracketStages("en").map((stage) => stage.stageIds)).toEqual([
      ["r32"],
      ["r16"],
      ["qf"],
      ["sf"],
      ["third", "final"],
    ]);
  });

  it("covers all 32 knockout matches from the source dataset", () => {
    const matches = datasetMatches();
    const expectedIds = matches
      .filter((match) => match.stage !== "group")
      .map((match) => match.id)
      .sort((left, right) => left - right);
    const renderedIds = bracketStages("en")
      .flatMap((stage) => bracketMatches(matches, stage))
      .map((match) => match.id)
      .sort((left, right) => left - right);

    expect(renderedIds).toHaveLength(32);
    expect(renderedIds).toEqual(expectedIds);
  });

  it("sorts matches chronologically within each bracket stage", () => {
    const matches = datasetMatches();

    for (const stage of bracketStages("en")) {
      const times = bracketMatches(matches, stage).map((match) =>
        new Date(match.kickoffAt).getTime(),
      );

      expect(times).toEqual([...times].sort((left, right) => left - right));
    }
  });

  it("labels the third-place and final matches clearly", () => {
    const third = { stage: "third" } as Match;
    const final = { stage: "final" } as Match;
    const group = { stage: "r32" } as Match;

    expect(bracketMatchLabel(third, "es")).toBe("Tercer lugar");
    expect(bracketMatchLabel(third, "en")).toBe("Third place");
    expect(bracketMatchLabel(final, "es")).toBe("Final");
    expect(bracketMatchLabel(group, "en")).toBe("Knockout");
  });
});

describe("bracketMatches", () => {
  it("falls back to match id when kickoff times tie", () => {
    const stage: BracketStageGroup = {
      id: "r32",
      label: "Round of 32",
      stageIds: ["r32"],
    };
    const matches = [
      { id: 2, stage: "r32", kickoffAt: "2026-06-28T19:00:00.000Z" },
      { id: 1, stage: "r32", kickoffAt: "2026-06-28T19:00:00.000Z" },
    ] as Match[];

    expect(bracketMatches(matches, stage).map((match) => match.id)).toEqual([
      1, 2,
    ]);
  });
});
