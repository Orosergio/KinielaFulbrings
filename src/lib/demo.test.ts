import { describe, expect, it } from "vitest";
import { demoBootstrap } from "./demo";

describe("portfolio demo", () => {
  it("contains a complete final tournament without real participant data", () => {
    const data = demoBootstrap();

    expect(data.matches).toHaveLength(104);
    expect(data.matches.every((match) => match.status === "FINISHED")).toBe(true);
    expect(
      data.matches.filter((match) => match.homePenaltyScore !== null),
    ).toHaveLength(4);
    expect(data.members.map((member) => member.displayName)).toEqual([
      "Sergio",
      "Alex",
      "Camila",
      "Diego",
      "Nora",
    ]);
  });

  it("keeps every synthetic pick and leaderboard total internally consistent", () => {
    const data = demoBootstrap();

    expect(data.predictions).toHaveLength(
      data.matches.length * data.members.length,
    );
    for (const prediction of data.predictions) {
      expect(prediction.points).toBe(
        (prediction.scorePoints ?? 0) + (prediction.advancementPoints ?? 0),
      );
    }
    for (const row of data.leaderboard) {
      const picks = data.predictions.filter((pick) => pick.userId === row.userId);
      expect(row.pickCount).toBe(104);
      expect(row.points).toBe(
        picks.reduce((total, pick) => total + (pick.points ?? 0), 0),
      );
    }
  });
});
