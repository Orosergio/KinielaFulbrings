import { describe, expect, it } from "vitest";
import { predictionPoints } from "./game";

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
